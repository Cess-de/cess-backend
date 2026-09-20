// supabase/functions/public/index.ts

import { getServiceClient } from "../_shared/db.ts";
import { successResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { userError } from "../_shared/crypto.ts";

const db = getServiceClient();

// =========================================================
// OFFICES — المكاتب النشطة
// =========================================================

async function getOffices() {
  const { data, error } = await db
    .from("offices")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

// =========================================================
// ACTIVITIES — الأنشطة المنشورة أو المكتملة
// =========================================================

async function getActivities(input: any) {
  let query = db
    .from("activities")
    .select("*")
    .in("status", ["published", "completed"])
    .order("activity_date", { ascending: false });

  if (input && input.office_id) {
    query = query.eq("organizer_office_id", input.office_id);
  }
  if (input && input.category) {
    query = query.eq("category", input.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// =========================================================
// SINGLE ACTIVITY
// =========================================================

async function getActivityById(input: any) {
  if (!input || !input.activity_id) throw userError("activity_id is required.");

  const { data, error } = await db
    .from("activities")
    .select("*")
    .eq("activity_id", input.activity_id)
    .in("status", ["published", "completed"])
    .maybeSingle();

  if (error) throw error;
  if (!data) throw userError("Activity not found.");
  return data;
}

// =========================================================
// RESOURCES — الموارد النشطة (مع التصنيفات)
// =========================================================

async function getResources(input: any) {
  let query = db.from("resources").select("*").eq("status", "active");

  if (input && input.category_id) {
    query = query.eq("category_id", input.category_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getResourceCategories() {
  const { data, error } = await db
    .from("resource_categories")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

// =========================================================
// TIMELINE — الجدول الزمني
// =========================================================

async function getTimeline() {
  const { data, error } = await db
    .from("timeline")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

// =========================================================
// ACHIEVEMENTS — إنجازات الأعضاء المنشورة
// =========================================================

async function getAchievements(input: any) {
  let query = db.from("achievements").select("*").eq("status", "active");

  if (input && input.member_id) {
    query = query.eq("member_id", input.member_id);
  }

  const { data, error } = await query.order("achievement_date", { ascending: false });
  if (error) throw error;
  return data;
}

// =========================================================
// OBJECTIVES — الأهداف الإستراتيجية
// =========================================================

async function getObjectives() {
  const { data, error } = await db
    .from("objectives")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

// =========================================================
// INITIATIVES — المبادرات
// =========================================================

async function getInitiatives() {
  const { data, error } = await db.from("initiatives").select("*");
  if (error) throw error;
  return data;
}

// =========================================================
// ANNOUNCEMENTS — الإعلانات المنشورة
// =========================================================

async function getAnnouncements() {
  const { data, error } = await db
    .from("announcements")
    .select("*")
    .eq("published", true)
    .order("announcement_date", { ascending: false });
  if (error) throw error;
  return data;
}

// =========================================================
// OFFICE MEMBERS — أعضاء مكتب معين (للعرض العام، بيانات محدودة)
// =========================================================

async function getOfficeMembers(input: any) {
  if (!input || !input.office_id) throw userError("office_id is required.");

  const { data, error } = await db
    .from("office_members")
    .select(`
      is_leader,
      term_year,
      members ( member_id, full_name, profile_photo_url, visibility_profile )
    `)
    .eq("office_id", input.office_id)
    .eq("status", "active");

  if (error) throw error;

  // Only expose members whose profile visibility is public
  return (data || [])
    .filter((row: any) => row.members && row.members.visibility_profile === "public")
    .map((row: any) => ({
      member_id: row.members.member_id,
      full_name: row.members.full_name,
      profile_photo_url: row.members.profile_photo_url,
      is_leader: row.is_leader,
      term_year: row.term_year,
    }));
}

// =========================================================
// ROUTER
// =========================================================

const ACTIONS: Record<string, (input: any) => Promise<unknown>> = {
  getOffices,
  getActivities,
  getActivityById,
  getResources,
  getResourceCategories,
  getTimeline,
  getAchievements,
  getObjectives,
  getInitiatives,
  getAnnouncements,
  getOfficeMembers,
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
