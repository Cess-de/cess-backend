// supabase/functions/_shared/db.ts

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  userError,
  bytesToBase64Url,
  randomBytes,
  hmacSha256Bytes,
  utf8ToBytes,
  constantTimeEquals,
} from "./crypto.ts";

// =========================================================
// SUPABASE CLIENT (service_role — bypasses RLS)
// =========================================================

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

// =========================================================
// SECRETS (from environment / Supabase secrets)
// =========================================================

export function getSessionSecret(): string {
  return Deno.env.get("SESSION_SECRET") || "";
}

export function getVerificationSecret(): string {
  return Deno.env.get("VERIFICATION_SECRET") || "";
}

export function getRecoverySecret(): string {
  return Deno.env.get("RECOVERY_SECRET") || "";
}

// =========================================================
// STUDENT / MEMBER LOOKUPS
// =========================================================

export async function findStudentById(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("students")
    .select("*")
    .eq("student_id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findMemberByStudentId(db: SupabaseClient, studentId: string) {
  const { data, error } = await db
    .from("members")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findMemberById(db: SupabaseClient, memberId: string) {
  const { data, error } = await db
    .from("members")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function isActiveMember(member: any): boolean {
  return !!(
    member &&
    String(member.activation_status || "").trim() === "active" &&
    String(member.membership_status || "").trim() === "active"
  );
}

export async function emailInUse(
  db: SupabaseClient,
  email: string,
  exceptMemberId?: string,
): Promise<boolean> {
  let query = db.from("members").select("member_id", { count: "exact", head: true }).eq(
    "verified_email",
    email,
  );
  if (exceptMemberId) {
    query = query.neq("member_id", exceptMemberId);
  }
  const { count, error } = await query;
  if (error) throw error;
  return (count || 0) > 0;
}

export async function updateMember(
  db: SupabaseClient,
  memberId: string,
  data: Record<string, unknown>,
) {
  const { error } = await db.from("members").update(data).eq("member_id", memberId);
  if (error) throw error;
}

// =========================================================
// RATE LIMITING (Postgres-backed, atomic via RPC)
// =========================================================

/*
 * Requires the SQL function `rate_limit_check_and_consume`
 * (see accompanying SQL migration) which does the
 * check + increment atomically in one round trip,
 * avoiding the race conditions a naive select+update would have.
 */
export async function rateLimitCheckAndConsume(
  db: SupabaseClient,
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const { data, error } = await db.rpc("rate_limit_check_and_consume", {
    p_scope: scope,
    p_subject: subject,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return { allowed: !!data.allowed, remaining: Number(data.remaining) };
}

// =========================================================
// VERIFICATION CODES (OTP) — otp_codes table
// =========================================================

export async function storeVerificationCode(
  db: SupabaseClient,
  scope: string,
  subject: string,
  code: string,
  ttlSeconds: number,
  maxAttempts: number,
) {
  const secret = getVerificationSecret();
  const codeHash = bytesToBase64Url(await hmacSha256Bytes(secret, utf8ToBytes(code)));
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  // Replace any existing code for the same scope+subject
  await db.from("otp_codes").delete().eq("scope", scope).eq("subject", subject);

  const { error } = await db.from("otp_codes").insert({
    scope,
    subject,
    code_hash: codeHash,
    attempts: 0,
    max_attempts: maxAttempts,
    expires_at: expiresAt,
  });
  if (error) throw error;
}

export async function consumeVerificationCode(
  db: SupabaseClient,
  scope: string,
  subject: string,
  code: string,
): Promise<{ ok: boolean }> {
  const { data: rec, error } = await db
    .from("otp_codes")
    .select("*")
    .eq("scope", scope)
    .eq("subject", subject)
    .maybeSingle();

  if (error) throw error;
  if (!rec) return { ok: false };

  if (new Date(rec.expires_at).getTime() < Date.now()) {
    await db.from("otp_codes").delete().eq("id", rec.id);
    return { ok: false };
  }

  const secret = getVerificationSecret();
  const actual = bytesToBase64Url(await hmacSha256Bytes(secret, utf8ToBytes(code)));
  const newAttempts = Number(rec.attempts || 0) + 1;

  if (newAttempts > Number(rec.max_attempts) || !constantTimeEquals(actual, rec.code_hash)) {
    if (newAttempts >= Number(rec.max_attempts)) {
      await db.from("otp_codes").delete().eq("id", rec.id);
    } else {
      await db.from("otp_codes").update({ attempts: newAttempts }).eq("id", rec.id);
    }
    return { ok: false };
  }

  await db.from("otp_codes").delete().eq("id", rec.id);
  return { ok: true };
}

// =========================================================
// ACTIVATION TOKENS — activation_tokens table
// =========================================================

export async function storeActivationTokenRecord(
  db: SupabaseClient,
  tokenId: string,
  memberId: string,
  studentId: string,
  state: string,
  expiresAtMs: number,
) {
  const { error } = await db.from("activation_tokens").insert({
    token_id: tokenId,
    member_id: memberId,
    student_id: studentId,
    state,
    expires_at: new Date(expiresAtMs).toISOString(),
    consumed: false,
  });
  if (error) throw error;
}

export async function consumeActivationTokenRecord(
  db: SupabaseClient,
  tokenId: string,
): Promise<{ member_id: string; student_id: string; state: string } | null> {
  // Atomic consume via RPC to avoid double-spend races
  const { data, error } = await db.rpc("consume_activation_token", { p_token_id: tokenId });
  if (error) throw error;
  if (!data || !data.member_id) return null;
  return data;
}

// =========================================================
// RECOVERY TOKENS — recovery_tokens table
// =========================================================

export async function storeRecoveryTokenRecord(
  db: SupabaseClient,
  tokenId: string,
  memberId: string,
  purpose: string,
  sessionVersion: number,
  expiresAtMs: number,
) {
  const { error } = await db.from("recovery_tokens").insert({
    token_id: tokenId,
    member_id: memberId,
    purpose,
    session_version: sessionVersion,
    expires_at: new Date(expiresAtMs).toISOString(),
    consumed: false,
  });
  if (error) throw error;
}

export async function consumeRecoveryTokenRecord(
  db: SupabaseClient,
  tokenId: string,
): Promise<{ member_id: string; purpose: string; session_version: number } | null> {
  const { data, error } = await db.rpc("consume_recovery_token", { p_token_id: tokenId });
  if (error) throw error;
  if (!data || !data.member_id) return null;
  return data;
}

// =========================================================
// AUDIT LOG
// =========================================================

export async function logAuthEvent(
  db: SupabaseClient,
  action: string,
  memberId: string,
  result: string,
  details: Record<string, unknown> = {},
) {
  try {
    await db.from("audit_log").insert({
      admin_id: "AUTH",
      action,
      target_table: "members",
      target_id: String(memberId || ""),
      details_json: { result, details },
    });
  } catch (e) {
    console.error("Auth audit failed:", e);
  }
}

// =========================================================
// SESSION TOKENS
// =========================================================

import { tokenEncode, tokenDecode, SESSION_TTL_MS } from "./crypto.ts";

export async function signSessionToken(data: {
  member_id: string;
  session_version: number;
}): Promise<string> {
  const now = Date.now();
  const payload = {
    v: 1,
    purpose: "session",
    iat: now,
    exp: now + SESSION_TTL_MS,
    nonce: bytesToBase64Url(randomBytes(16)),
    member_id: String(data.member_id),
    session_version: Number(data.session_version),
  };
  return tokenEncode(payload, getSessionSecret());
}

export async function verifySessionToken(token: string) {
  const p = await tokenDecode(token, getSessionSecret());
  if (p.v !== 1 || p.purpose !== "session") throw userError("Invalid session.");
  if (!p.member_id || Number(p.session_version) < 1) throw userError("Invalid session.");
  return p;
}

export async function requireSession(db: SupabaseClient, token: string) {
  const p = await verifySessionToken(token);
  const member = await findMemberById(db, p.member_id);

  if (
    !member ||
    String(member.activation_status) !== "active" ||
    String(member.membership_status) !== "active"
  ) {
    throw userError("Session invalid.");
  }

  if (Number(member.session_version) !== Number(p.session_version)) {
    throw userError("Session expired.");
  }

  const { data: admin } = await db
    .from("admins")
    .select("*")
    .eq("member_id", member.member_id)
    .eq("status", "active")
    .maybeSingle();

  let permissions: string[] = [];
  if (admin) {
    const { data: role } = await db
      .from("roles")
      .select("permissions_json")
      .eq("role_id", admin.role_id)
      .maybeSingle();
    if (role && Array.isArray(role.permissions_json)) {
      permissions = role.permissions_json;
    }
  }

  return {
    member_id: member.member_id,
    student_id: member.student_id,
    session_version: Number(p.session_version),
    isAdmin: !!admin,
    admin_id: admin ? admin.admin_id : null,
    role_id: admin ? admin.role_id : null,
    permissions,
  };
}
