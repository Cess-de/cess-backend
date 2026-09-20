// supabase/functions/_shared/crypto.ts

// =========================================================
// CONSTANTS
// =========================================================

export const PBKDF2_DKLEN = 32;
export const PBKDF2_MIN_ITERATIONS = 5000;

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RECOVERY_TTL_MS = 15 * 60 * 1000;
export const ACTIVATION_TTL_MS = 15 * 60 * 1000;

export const VERIFICATION_TTL_SECONDS = 600;
export const VERIFICATION_MAX_ATTEMPTS = 5;

export const ACTIVATION_STATES = {
  PASSWORD: "password",
  QUESTIONS: "questions",
} as const;

export const RECOVERY_PURPOSES = {
  RECOVERY: "recovery",
  EMAIL_RECOVERY: "email_recovery",
} as const;

export const SECURITY_QUESTIONS = [
  { id: "q1", en: "What was the name of your first school?", ar: "ما اسم أول مدرسة درست فيها؟" },
  { id: "q2", en: "What is the name of a city you remember well?", ar: "ما اسم مدينة تتذكرها جيدًا؟" },
  { id: "q3", en: "What was your childhood nickname?", ar: "ما لقبك في طفولتك؟" },
  { id: "q4", en: "What was your favorite school subject?", ar: "ما مادتك الدراسية المفضلة؟" },
  { id: "q5", en: "What was the first book you remember reading?", ar: "ما أول كتاب تتذكر أنك قرأته؟" },
  { id: "q6", en: "What is the name of a teacher you remember?", ar: "ما اسم معلم تتذكره؟" },
];

// =========================================================
// ERROR HELPER
// =========================================================

export class UserError extends Error {
  userSafe = true;
  constructor(message: string) {
    super(message);
  }
}

export function userError(message: string): UserError {
  return new UserError(message);
}

export function safeErrorMessage(err: unknown): string {
  if (err instanceof UserError) return err.message;
  return "Request could not be completed.";
}

// =========================================================
// ENCODING HELPERS
// =========================================================

export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function bytesToUtf8(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(s: string): Uint8Array {
  let str = s.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// =========================================================
// RANDOMNESS
// =========================================================

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export function generateSalt(n = 16): string {
  return bytesToBase64Url(randomBytes(n));
}

export function generateVerificationCode(length = 6): string {
  const max = Math.pow(10, length);
  const range = 4294967296;
  const limit = Math.floor(range / max) * max;

  while (true) {
    const b = randomBytes(4);
    const x = (b[0] * 16777216) + (b[1] * 65536) + (b[2] * 256) + b[3];
    if (x < limit) {
      return String(x % max).padStart(length, "0");
    }
  }
}

// =========================================================
// HMAC-SHA256
// =========================================================

async function hmacKey(secret: string | Uint8Array): Promise<CryptoKey> {
  const keyBytes = typeof secret === "string" ? utf8ToBytes(secret) : secret;
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hmacSha256Bytes(
  secret: string | Uint8Array,
  message: string | Uint8Array,
): Promise<Uint8Array> {
  const key = await hmacKey(secret);
  const msgBytes = typeof message === "string" ? utf8ToBytes(message) : message;
  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return new Uint8Array(sig);
}

// =========================================================
// PBKDF2-HMAC-SHA256
// =========================================================

export async function pbkdf2HmacSha256(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const passKey = await crypto.subtle.importKey(
    "raw",
    utf8ToBytes(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    passKey,
    PBKDF2_DKLEN * 8,
  );

  return new Uint8Array(derived);
}

function getApprovedKdfIterations(): number {
  const value = Deno.env.get("PBKDF2_ITERATIONS");
  const n = Number(value || 0);
  if (!n || n < PBKDF2_MIN_ITERATIONS) {
    throw new Error("PBKDF2_ITERATIONS is not configured (env var missing or too low).");
  }
  return Math.floor(n);
}

export async function hashPassword(
  password: string,
  salt: string,
  iterations?: number,
): Promise<string> {
  const it = Number(iterations || getApprovedKdfIterations());
  if (!isFinite(it) || it < 1 || Math.floor(it) !== it) {
    throw new Error("Invalid PBKDF2 iterations.");
  }
  const derived = await pbkdf2HmacSha256(password, base64UrlToBytes(salt), it);
  return `${bytesToBase64Url(derived)}$${it}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
  salt: string,
): Promise<boolean> {
  const parts = String(stored || "").split("$");
  const expected = parts[0];
  const it = Number(parts[1] || 0);
  if (!expected || !it || !salt) return false;

  const derived = await pbkdf2HmacSha256(password, base64UrlToBytes(salt), it);
  const actual = bytesToBase64Url(derived);
  return constantTimeEquals(actual, expected);
}

export function constantTimeEquals(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (i < a.length ? a.charCodeAt(i) : 0) ^ (i < b.length ? b.charCodeAt(i) : 0);
  }
  return diff === 0;
}

// =========================================================
// GENERIC SIGNED TOKENS
// =========================================================

export async function tokenEncode(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  if (!secret) throw new Error("Token signing secret is not configured.");
  const body = bytesToBase64Url(utf8ToBytes(JSON.stringify(payload)));
  const sig = bytesToBase64Url(await hmacSha256Bytes(secret, body));
  return `${body}.${sig}`;
}

export async function tokenDecode(
  token: string,
  secret: string,
): Promise<Record<string, any>> {
  if (!secret) throw userError("Token service is not configured.");
  const parts = String(token || "").split(".");
  if (parts.length !== 2) throw userError("Invalid token.");

  const expected = bytesToBase64Url(await hmacSha256Bytes(secret, parts[0]));
  if (!constantTimeEquals(expected, parts[1])) throw userError("Invalid token.");

  let payload: any;
  try {
    payload = JSON.parse(bytesToUtf8(base64UrlToBytes(parts[0])));
  } catch {
    throw userError("Invalid token.");
  }

  if (!payload || !payload.exp || Number(payload.exp) < Date.now()) {
    throw userError("Token expired.");
  }

  return payload;
}

// =========================================================
// VALIDATION
// =========================================================

export function requireFields(input: any, fields: string[]) {
  if (!input) throw userError("Invalid request.");
  for (const field of fields) {
    const v = input[field];
    if (v === undefined || v === null || String(v).trim() === "") {
      throw userError(`Missing required field: ${field}`);
    }
  }
}

export function normalizeEmail(v: unknown): string {
  return String(v || "").trim().toLowerCase();
}

export function validateStudentId(v: unknown): string {
  const s = String(v || "").trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(s)) throw userError("Invalid student ID.");
  return s;
}

export function validateEmail(v: unknown): string {
  const s = normalizeEmail(v);
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    throw userError("Invalid email.");
  }
  return s;
}

export function validateVerificationCode(v: unknown): string {
  const s = String(v || "").trim();
  if (!/^\d{6}$/.test(s)) throw userError("Invalid verification code.");
  return s;
}

export function validatePasswordPolicy(v: unknown): string {
  const s = String(v || "");
  if (s.length < 10 || s.length > 128) throw userError("Password must be 10–128 characters.");
  if (/^\s+$/.test(s)) throw userError("Invalid password.");
  return s;
}

export function normalizeForAnswer(v: unknown): string {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateQuestionId(v: unknown): string {
  const s = String(v || "");
  if (!SECURITY_QUESTIONS.some((q) => q.id === s)) throw userError("Invalid security question.");
  return s;
}

export function getQuestion(id: string) {
  return SECURITY_QUESTIONS.find((q) => q.id === id) || null;
}
