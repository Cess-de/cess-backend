// supabase/functions/admin/index.ts

import { getServiceClient, requireSession } from "../_shared/db.ts";
import { successResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { userError, requireFields, validateStudentId } from "../_shared/crypto.ts";

const db = getServiceClient();

// =========================================================
// PERMISSION HELPERS
// =========================================================

function requirePermission(session: any, permission: string) {
  if (!session || !session.isAdmin) throw userError("Permission denied.");
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  if (
    permissions.indexOf("SUPER_ADMIN_ALL") === -1 &&
    permissions.indexOf(permission) === -1
  ) {
    throw userError("Permission denied.");
  }
}

function isSuperAdmin(session: any): boolean {
  return !!(
    session &&
    session.isAdmin &&
    Array.isArray(session.permissions) &&
    session.permissions.indexOf("SUPER_ADMIN_ALL") !== -1
  );
}

async function requireAdminSession(token: string) {
  const session = await requireSession(db, token);
  if (!session.isAdmin) throw userError("Permission denied.");
  return session;
}

async function logAction(
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  try {
    await db.from("audit_log").insert({
      admin_id: String(adminId || ""),
      action,
      target_table: targetTable,
      target_id: String(targetId || ""),
      details_json: details,
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

// =========================================================
// STUDENTS — إضافة طلاب جدد (سوبر أدمن فقط)
// =========================================================

async function addStudent(input: any) {
  requireFields(input, ["token", "student_id"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  const studentId = validateStudentId(input.student_id);

  const { data: existing } = await db
    .from("students")
    .select("student_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) throw userError("This student ID already exists.");

  const { error } = await db.from("students").insert({
    student_id: studentId,
    status: "active",
  });
  if (error) throw error;

  await logAction(session.admin_id, "admin.addStudent", "students", studentId);

  return { added: true, student_id: studentId };
}

async function addStudentBatch(input: any) {
  requireFields(input, ["token", "student_ids"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  if (!Array.isArray(input.student_ids)) {
    throw userError("student_ids must be an array.");
  }

  const results: { student_id: string; added: boolean; reason?: string }[] = [];

  for (const raw of input.student_ids) {
    try {
      const studentId = validateStudentId(raw);
      const { data: existing } = await db
        .from("students")
        .select("student_id")
        .eq("student_id", studentId)
        .maybeSingle();

      if (existing) {
        results.push({ student_id: studentId, added: false, reason: "already_exists" });
        continue;
      }

      const { error } = await db.from("students").insert({
        student_id: studentId,
        status: "active",
      });

      if (error) {
        results.push({ student_id: studentId, added: false, reason: "db_error" });
      } else {
        results.push({ student_id: studentId, added: true });
      }
    } catch {
      results.push({ student_id: String(raw), added: false, reason: "invalid_format" });
    }
  }

  await logAction(session.admin_id, "admin.addStudentBatch", "students", "", {
    count: results.length,
  });

  return { results };
}

async function createMemberForStudent(input: any) {
  requireFields(input, ["token", "student_id", "full_name", "email", "batch"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  const studentId = validateStudentId(input.student_id);

  const { data: student } = await db
    .from("students")
    .select("student_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!student) throw userError("Student ID not found. Add the student first.");

  const { data: existingMember } = await db
    .from("members")
    .select("member_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingMember) throw userError("A member already exists for this student.");

  const { data: inserted, error } = await db
    .from("members")
    .insert({
      student_id: studentId,
      full_name: String(input.full_name).slice(0, 200),
      verified_email: String(input.email).trim().toLowerCase(),
      batch: String(input.batch).slice(0, 20),
      activation_status: "pending",
      membership_status: "pending",
    })
    .select("member_id")
    .single();

  if (error) throw error;

  await logAction(session.admin_id, "admin.createMemberForStudent", "members", inserted.member_id);

  return { created: true, member_id: inserted.member_id, student_id: studentId };
}

// =========================================================
// ADMINS MANAGEMENT (سوبر أدمن فقط)
// =========================================================

async function assignAdmin(input: any) {
  requireFields(input, ["token", "member_id", "role_id"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  const { data: existing } = await db
    .from("admins")
    .select("admin_id")
    .eq("member_id", input.member_id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) throw userError("This member is already an active admin.");

  const { data: role } = await db
    .from("roles")
    .select("role_id")
    .eq("role_id", input.role_id)
    .maybeSingle();

  if (!role) throw userError("Invalid role_id.");

  const { data: inserted, error } = await db
    .from("admins")
    .insert({
      member_id: input.member_id,
      role_id: input.role_id,
      office_id: input.office_id || null,
      status: "active",
      assigned_by: session.member_id,
    })
    .select("admin_id")
    .single();

  if (error) throw error;

  await logAction(session.admin_id, "admin.assignAdmin", "admins", inserted.admin_id, {
    member_id: input.member_id,
    role_id: input.role_id,
  });

  return { assigned: true, admin_id: inserted.admin_id };
}

async function revokeAdmin(input: any) {
  requireFields(input, ["token", "admin_id"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  const { error } = await db
    .from("admins")
    .update({ status: "inactive" })
    .eq("admin_id", input.admin_id);

  if (error) throw error;

  await logAction(session.admin_id, "admin.revokeAdmin", "admins", input.admin_id);

  return { revoked: true };
}
// =========================================================
// OFFICE PERMISSION CHECK — رئيس مكتب يقدر يعدل مكتبه فقط
// =========================================================

async function requireOfficeAccess(session: any, officeId: string) {
  if (isSuperAdmin(session)) return;

  if (!session.isAdmin || session.role_id !== "ROLE_OFFICE_LEADER") {
    throw userError("Permission denied.");
  }

  const { data: admin } = await db
    .from("admins")
    .select("office_id")
    .eq("admin_id", session.admin_id)
    .maybeSingle();

  if (!admin || String(admin.office_id) !== String(officeId)) {
    throw userError("Permission denied.");
  }
}

// =========================================================
// OFFICES MANAGEMENT
// =========================================================

async function createOffice(input: any) {
  requireFields(input, ["token", "name_ar"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  const { data: inserted, error } = await db
    .from("offices")
    .insert({
      name_ar: String(input.name_ar).slice(0, 200),
      name_en: input.name_en ? String(input.name_en).slice(0, 200) : null,
      description_ar: input.description_ar || null,
      description_en: input.description_en || null,
      responsibilities_ar: input.responsibilities_ar || null,
      responsibilities_en: input.responsibilities_en || null,
      contact_whatsapp: input.contact_whatsapp || null,
      contact_email: input.contact_email || null,
      order_index: Number(input.order_index || 0),
      term_year: input.term_year || null,
      status: "active",
    })
    .select("office_id")
    .single();

  if (error) throw error;

  await logAction(session.admin_id, "admin.createOffice", "offices", inserted.office_id);

  return { created: true, office_id: inserted.office_id };
}

async function updateOffice(input: any) {
  requireFields(input, ["token", "office_id"]);
  const session = await requireAdminSession(input.token);
  await requireOfficeAccess(session, input.office_id);

  const editable = [
    "name_ar", "name_en", "description_ar", "description_en",
    "responsibilities_ar", "responsibilities_en", "contact_whatsapp",
    "contact_email", "order_index", "status", "term_year",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of editable) {
    if (input[field] !== undefined) updates[field] = input[field];
  }

  if (Object.keys(updates).length === 0) throw userError("No fields to update.");

  const { error } = await db.from("offices").update(updates).eq("office_id", input.office_id);
  if (error) throw error;

  await logAction(session.admin_id, "admin.updateOffice", "offices", input.office_id);

  return { updated: true };
}

// =========================================================
// ACTIVITIES MANAGEMENT
// =========================================================

async function createActivity(input: any) {
  requireFields(input, ["token", "title_ar", "organizer_office_id"]);
  const session = await requireAdminSession(input.token);
  await requireOfficeAccess(session, input.organizer_office_id);

  const { data: inserted, error } = await db
    .from("activities")
    .insert({
      title_ar: String(input.title_ar).slice(0, 300),
      title_en: input.title_en || null,
      description_ar: input.description_ar || null,
      description_en: input.description_en || null,
      category: input.category || null,
      activity_date: input.activity_date || null,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      location: input.location || null,
      cover_image_url: input.cover_image_url || null,
      target_batches: input.target_batches || null,
      registration_whatsapp_link: input.registration_whatsapp_link || null,
      registration_deadline: input.registration_deadline || null,
      capacity: input.capacity ? Number(input.capacity) : null,
      organizer_office_id: input.organizer_office_id,
      status: input.status || "draft",
    })
    .select("activity_id")
    .single();

  if (error) throw error;

  await logAction(session.admin_id, "admin.createActivity", "activities", inserted.activity_id);

  return { created: true, activity_id: inserted.activity_id };
}

async function updateActivity(input: any) {
  requireFields(input, ["token", "activity_id"]);
  const session = await requireAdminSession(input.token);

  const { data: activity } = await db
    .from("activities")
    .select("organizer_office_id")
    .eq("activity_id", input.activity_id)
    .maybeSingle();

  if (!activity) throw userError("Activity not found.");
  await requireOfficeAccess(session, activity.organizer_office_id);

  const editable = [
    "title_ar", "title_en", "description_ar", "description_en", "category",
    "activity_date", "start_time", "end_time", "location", "cover_image_url",
    "target_batches", "registration_whatsapp_link", "registration_deadline",
    "capacity", "status", "gallery_folder_url", "report_link",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of editable) {
    if (input[field] !== undefined) updates[field] = input[field];
  }

  if (Object.keys(updates).length === 0) throw userError("No fields to update.");

  const { error } = await db.from("activities").update(updates).eq("activity_id", input.activity_id);
  if (error) throw error;

  await logAction(session.admin_id, "admin.updateActivity", "activities", input.activity_id);

  return { updated: true };
}

async function deleteActivity(input: any) {
  requireFields(input, ["token", "activity_id"]);
  const session = await requireAdminSession(input.token);

  const { data: activity } = await db
    .from("activities")
    .select("organizer_office_id")
    .eq("activity_id", input.activity_id)
    .maybeSingle();

  if (!activity) throw userError("Activity not found.");
  await requireOfficeAccess(session, activity.organizer_office_id);

  const { error } = await db
    .from("activities")
    .update({ status: "cancelled" })
    .eq("activity_id", input.activity_id);

  if (error) throw error;

  await logAction(session.admin_id, "admin.deleteActivity", "activities", input.activity_id);

  return { cancelled: true };
}

// =========================================================
// ANNOUNCEMENTS — إرسال إعلانات
// =========================================================

async function createAnnouncement(input: any) {
  requireFields(input, ["token", "title_ar", "body_ar"]);
  const session = await requireAdminSession(input.token);
  requirePermission(session, "ANNOUNCEMENTS_MANAGE");

  const { data: inserted, error } = await db
    .from("announcements")
    .insert({
      title_ar: String(input.title_ar).slice(0, 300),
      title_en: input.title_en || null,
      body_ar: String(input.body_ar),
      body_en: input.body_en || null,
      target_type: input.target_type || "all",
      target_batches: input.target_batches || null,
      target_member_ids: input.target_member_ids || null,
      published: !!input.published,
      email_notify: !!input.email_notify,
      client_request_id: input.client_request_id || null,
    })
    .select("announcement_id")
    .single();

  if (error) throw error;

  // إنشاء إشعارات داخلية للأعضاء المستهدفين
  if (input.published) {
    await fanOutNotifications(inserted.announcement_id, "announcement", input);
  }

  await logAction(session.admin_id, "admin.createAnnouncement", "announcements", inserted.announcement_id);

  return { created: true, announcement_id: inserted.announcement_id };
}

async function fanOutNotifications(sourceId: string, sourceType: string, input: any) {
  let memberQuery = db.from("members").select("member_id").eq("membership_status", "active");

  if (input.target_type === "batch" && input.target_batches) {
    memberQuery = memberQuery.eq("batch", input.target_batches);
  } else if (input.target_type === "members" && Array.isArray(input.target_member_ids)) {
    memberQuery = memberQuery.in("member_id", input.target_member_ids);
  }

  const { data: members, error } = await memberQuery;
  if (error || !members) return;

  const rows = members.map((m: any) => ({
    member_id: m.member_id,
    source_type: sourceType,
    source_id: sourceId,
    is_read: false,
  }));

  if (rows.length > 0) {
    await db.from("notifications").insert(rows);
  }
}

// =========================================================
// AUDIT LOG VIEW (سوبر أدمن فقط)
// =========================================================

async function getAuditLog(input: any) {
  requireFields(input, ["token"]);
  const session = await requireAdminSession(input.token);
  if (!isSuperAdmin(session)) throw userError("Permission denied.");

  let query = db.from("audit_log").select("*").order("logged_at", { ascending: false }).limit(100);

  if (input.target_table) query = query.eq("target_table", input.target_table);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// =========================================================
// ROUTER
// =========================================================

const ACTIONS: Record<string, (input: any) => Promise<unknown>> = {
  addStudent,
  addStudentBatch,
  createMemberForStudent,
  assignAdmin,
  revokeAdmin,
  createOffice,
  updateOffice,
  createActivity,
  updateActivity,
  deleteActivity,
  createAnnouncement,
  getAuditLog,
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
