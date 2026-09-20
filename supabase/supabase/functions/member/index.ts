// supabase/functions/member/index.ts

import { getServiceClient, requireSession, findMemberById } from "../_shared/db.ts";
import { successResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { userError, requireFields } from "../_shared/crypto.ts";

const db = getServiceClient();

// =========================================================
// GET MY PROFILE
// =========================================================

async function getMyProfile(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);
  const member = await findMemberById(db, session.member_id);

  if (!member) throw userError("Member not found.");

  return {
    member_id: member.member_id,
    student_id: member.student_id,
    full_name: member.full_name,
    verified_email: member.verified_email,
    batch: member.batch,
    profile_photo_url: member.profile_photo_url,
    bio_ar: member.bio_ar,
    bio_en: member.bio_en,
    interests: member.interests,
    hobbies: member.hobbies,
    permanent_residence: member.permanent_residence,
    whatsapp: member.whatsapp,
    facebook: member.facebook,
    visibility_whatsapp: member.visibility_whatsapp,
    visibility_facebook: member.visibility_facebook,
    visibility_email: member.visibility_email,
    visibility_profile: member.visibility_profile,
    membership_status: member.membership_status,
    join_date: member.join_date,
  };
}

// =========================================================
// UPDATE MY PROFILE
// =========================================================

const EDITABLE_PROFILE_FIELDS = [
  "profile_photo_url",
  "bio_ar",
  "bio_en",
  "interests",
  "hobbies",
  "permanent_residence",
  "whatsapp",
  "facebook",
  "visibility_whatsapp",
  "visibility_facebook",
  "visibility_email",
  "visibility_profile",
];

const VISIBILITY_FIELDS = [
  "visibility_whatsapp",
  "visibility_facebook",
  "visibility_email",
  "visibility_profile",
];

async function updateMyProfile(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);

  const updates: Record<string, unknown> = {};

  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (input[field] !== undefined) {
      if (VISIBILITY_FIELDS.includes(field)) {
        const v = String(input[field]);
        if (v !== "public" && v !== "private") {
          throw userError(`Invalid value for ${field}.`);
        }
        updates[field] = v;
      } else {
        updates[field] = String(input[field] ?? "").slice(0, 2000);
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    throw userError("No fields to update.");
  }

  const { error } = await db.from("members").update(updates).eq("member_id", session.member_id);
  if (error) throw error;

  return { updated: true };
}

// =========================================================
// MEMBER DIRECTORY — دليل الأعضاء (يحترم إعدادات الخصوصية)
// =========================================================

async function getMemberDirectory(input: any) {
  requireFields(input, ["token"]);
  await requireSession(db, input.token); // must be logged in to view directory

  let query = db
    .from("members")
    .select(`
      member_id, full_name, batch, profile_photo_url, bio_ar, bio_en,
      interests, hobbies, whatsapp, facebook, verified_email,
      visibility_whatsapp, visibility_facebook, visibility_email, visibility_profile
    `)
    .eq("membership_status", "active")
    .eq("visibility_profile", "public");

  if (input && input.batch) {
    query = query.eq("batch", input.batch);
  }
  if (input && input.search) {
    query = query.ilike("full_name", `%${input.search}%`);
  }

  const { data, error } = await query.order("full_name", { ascending: true });
  if (error) throw error;

  // Apply per-field visibility rules
  return (data || []).map((m: any) => ({
    member_id: m.member_id,
    full_name: m.full_name,
    batch: m.batch,
    profile_photo_url: m.profile_photo_url,
    bio_ar: m.bio_ar,
    bio_en: m.bio_en,
    interests: m.interests,
    hobbies: m.hobbies,
    whatsapp: m.visibility_whatsapp === "public" ? m.whatsapp : null,
    facebook: m.visibility_facebook === "public" ? m.facebook : null,
    email: m.visibility_email === "public" ? m.verified_email : null,
  }));
}

// =========================================================
// GET SINGLE MEMBER PROFILE (respecting visibility)
// =========================================================

async function getMemberProfile(input: any) {
  requireFields(input, ["token", "member_id"]);
  await requireSession(db, input.token);

  const { data: m, error } = await db
    .from("members")
    .select(`
      member_id, full_name, batch, profile_photo_url, bio_ar, bio_en,
      interests, hobbies, whatsapp, facebook, verified_email,
      visibility_whatsapp, visibility_facebook, visibility_email, visibility_profile,
      membership_status
    `)
    .eq("member_id", input.member_id)
    .maybeSingle();

  if (error) throw error;
  if (!m || m.membership_status !== "active" || m.visibility_profile !== "public") {
    throw userError("Profile not found or not public.");
  }

  return {
    member_id: m.member_id,
    full_name: m.full_name,
    batch: m.batch,
    profile_photo_url: m.profile_photo_url,
    bio_ar: m.bio_ar,
    bio_en: m.bio_en,
    interests: m.interests,
    hobbies: m.hobbies,
    whatsapp: m.visibility_whatsapp === "public" ? m.whatsapp : null,
    facebook: m.visibility_facebook === "public" ? m.facebook : null,
    email: m.visibility_email === "public" ? m.verified_email : null,
  };
}

// =========================================================
// NOTIFICATIONS
// =========================================================

async function getMyNotifications(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);

  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("member_id", session.member_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

async function markNotificationRead(input: any) {
  requireFields(input, ["token", "notification_id"]);
  const session = await requireSession(db, input.token);

  const { error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("notification_id", input.notification_id)
    .eq("member_id", session.member_id);

  if (error) throw error;
  return { marked_read: true };
}

async function markAllNotificationsRead(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);

  const { error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("member_id", session.member_id)
    .eq("is_read", false);

  if (error) throw error;
  return { marked_read: true };
}

// =========================================================
// MY ACHIEVEMENTS
// =========================================================

async function getMyAchievements(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);

  const { data, error } = await db
    .from("achievements")
    .select("*")
    .eq("member_id", session.member_id)
    .eq("status", "active")
    .order("achievement_date", { ascending: false });

  if (error) throw error;
  return data;
}

// =========================================================
// ROUTER
// =========================================================

const ACTIONS: Record<string, (input: any) => Promise<unknown>> = {
  getMyProfile,
  updateMyProfile,
  getMemberDirectory,
  getMemberProfile,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getMyAchievements,
};

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const input = body?.input || {};

    const handler = ACTIONS[action];
    if (!handler) {
      return errorResponse(userError(`Unknown action: ${action}`));
    }

    const result = await handler(input);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
});
