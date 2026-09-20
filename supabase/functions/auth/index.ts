// supabase/functions/auth/index.ts

import {
  userError,
  requireFields,
  validateStudentId,
  validateEmail,
  normalizeEmail,
  validateVerificationCode,
  validatePasswordPolicy,
  normalizeForAnswer,
  validateQuestionId,
  getQuestion,
  generateVerificationCode,
  generateSalt,
  hashPassword,
  verifyPassword,
  bytesToBase64Url,
  randomBytes,
  tokenEncode,
  tokenDecode,
  ACTIVATION_STATES,
  RECOVERY_PURPOSES,
  ACTIVATION_TTL_MS,
  RECOVERY_TTL_MS,
} from "../_shared/crypto.ts";

import {
  getServiceClient,
  findStudentById,
  findMemberByStudentId,
  findMemberById,
  isActiveMember,
  emailInUse,
  updateMember,
  rateLimitCheckAndConsume,
  storeVerificationCode,
  consumeVerificationCode,
  storeActivationTokenRecord,
  consumeActivationTokenRecord,
  storeRecoveryTokenRecord,
  consumeRecoveryTokenRecord,
  logAuthEvent,
  signSessionToken,
  verifySessionToken,
  requireSession,
  getVerificationSecret,
  getRecoverySecret,
} from "../_shared/db.ts";

import { sendEmail } from "../_shared/email.ts";
import { successResponse, errorResponse, handleCors } from "../_shared/response.ts";

const db = getServiceClient();

// =========================================================
// TOKEN ISSUERS (activation + recovery)
// =========================================================

async function issueActivationToken(
  memberId: string,
  studentId: string,
  state: string,
): Promise<{ token: string; expires_at: string }> {
  const tokenId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + ACTIVATION_TTL_MS;

  await storeActivationTokenRecord(db, tokenId, memberId, studentId, state, expiresAt);

  const token = await tokenEncode(
    {
      v: 1,
      purpose: "activation",
      iat: now,
      exp: expiresAt,
      nonce: tokenId,
      member_id: memberId,
      student_id: studentId,
      state,
    },
    getVerificationSecret(),
  );

  return { token, expires_at: new Date(expiresAt).toISOString() };
}

async function verifyActivationTokenPreview(token: string, expectedState?: string) {
  const p = await tokenDecode(token, getVerificationSecret());
  if (p.v !== 1 || p.purpose !== "activation") throw userError("Invalid activation token.");
  if (!p.member_id || !p.student_id || !p.state || !p.nonce) {
    throw userError("Invalid activation token.");
  }
  p.token_id = p.nonce;
  if (expectedState && String(p.state) !== String(expectedState)) {
    throw userError("Invalid activation token.");
  }
  return p;
}

async function issueRecoveryToken(
  memberId: string,
  purpose: string,
  sessionVersion: number,
): Promise<{ token: string; expires_at: string }> {
  if (Number(sessionVersion) < 1) throw userError("Invalid recovery session.");

  const tokenId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + RECOVERY_TTL_MS;

  await storeRecoveryTokenRecord(db, tokenId, memberId, purpose, sessionVersion, expiresAt);

  const token = await tokenEncode(
    {
      v: 1,
      purpose,
      iat: now,
      exp: expiresAt,
      nonce: tokenId,
      member_id: memberId,
      session_version: sessionVersion,
    },
    getRecoverySecret(),
  );

  return { token, expires_at: new Date(expiresAt).toISOString() };
}

async function verifyRecoveryTokenPreview(token: string, purpose: string) {
  const p = await tokenDecode(token, getRecoverySecret());
  if (p.v !== 1 || p.purpose !== purpose) throw userError("Invalid recovery token.");
  if (!p.member_id || !p.nonce || Number(p.session_version) < 1) {
    throw userError("Invalid recovery token.");
  }
  p.token_id = p.nonce;
  return p;
}

function verifyRecoveryVersion(payload: any, member: any): boolean {
  return (
    Number(payload.session_version) >= 1 &&
    Number(member.session_version) === Number(payload.session_version)
  );
}

// =========================================================
// ACTIVATION — START (Phase 1 & 2)
// =========================================================

async function authStartActivation(input: any) {
  const hasEmail = !!(input && String(input.email || "").trim() !== "");
  return hasEmail ? startActivationPhase2(input) : startActivationPhase1(input);
}

async function startActivationPhase1(input: any) {
  let studentId: string;
  try {
    studentId = validateStudentId(input && input.student_id);
  } catch {
    throw userError("Please enter a valid student ID.");
  }

  const rl = await rateLimitCheckAndConsume(db, "activation.start", studentId, 3, 900);
  if (!rl.allowed) throw userError("Too many activation attempts. Please try again later.");

  const student = await findStudentById(db, studentId);
  if (!student) {
    throw userError(
      "عذراً، الرقم الجامعي غير موجود في سجلات الجمعية. الرجاء التواصل مع بريد الموقع للمساعدة.",
    );
  }
  if (String(student.status || "").trim() !== "active") {
    throw userError("الطالب موجود في السجلات، لكن حالته غير نشطة حالياً. الرجاء التواصل مع الجمعية.");
  }

  const member = await findMemberByStudentId(db, studentId);
  if (!member) {
    throw userError(
      "يوجد الطالب في السجلات، لكن لا يوجد حساب عضو مرتبط به. الرجاء التواصل مع إدارة الجمعية للمساعدة.",
    );
  }
  if (isActiveMember(member)) {
    throw userError("هذا الحساب مفعّل بالفعل. الرجاء تسجيل الدخول بدلاً من إعادة التفعيل.");
  }

  const currentStatus = String(member.activation_status || "").trim();
  if (currentStatus !== "" && currentStatus !== "pending") {
    throw userError("هذا الحساب بدأ عملية التفعيل بالفعل. الرجاء إكمال خطوات التفعيل السابقة أو التواصل مع الدعم.");
  }

  return { student_valid: true, email_required: true };
}

async function startActivationPhase2(input: any) {
  let studentId: string, email: string;
  try {
    studentId = validateStudentId(input && input.student_id);
    email = validateEmail(input && input.email);
  } catch {
    throw userError("Please enter a valid student ID and email address.");
  }

  const normalizedEmail = normalizeEmail(email);

  const rl1 = await rateLimitCheckAndConsume(db, "activation.start", studentId, 3, 900);
  if (!rl1.allowed) throw userError("Too many activation attempts. Please try again later.");

  const rl2 = await rateLimitCheckAndConsume(
    db,
    "activation.start.email",
    normalizedEmail,
    3,
    900,
  );
  if (!rl2.allowed) throw userError("Too many activation attempts. Please try again later.");

  const student = await findStudentById(db, studentId);
  if (!student) {
    throw userError(
      "عذراً، الرقم الجامعي غير موجود في سجلات الجمعية. الرجاء التواصل مع بريد الموقع للمساعدة.",
    );
  }
  if (String(student.status || "").trim() !== "active") {
    throw userError("الطالب موجود في السجلات، لكن حالته غير نشطة حالياً. الرجاء التواصل مع الجمعية.");
  }

  const member = await findMemberByStudentId(db, studentId);
  if (!member) {
    throw userError(
      "يوجد الطالب في السجلات، لكن لا يوجد حساب عضو مرتبط به. الرجاء التواصل مع إدارة الجمعية للمساعدة.",
    );
  }
  if (isActiveMember(member)) {
    throw userError("هذا الحساب مفعّل بالفعل. الرجاء تسجيل الدخول بدلاً من إعادة التفعيل.");
  }

  const currentStatus = String(member.activation_status || "").trim();
  if (currentStatus !== "" && currentStatus !== "pending") {
    throw userError("هذا الحساب بدأ عملية التفعيل بالفعل. الرجاء إكمال خطوات التفعيل السابقة أو التواصل مع الدعم.");
  }

  if (await emailInUse(db, normalizedEmail, member.member_id)) {
    throw userError("هذا البريد الإلكتروني مستخدم بالفعل من حساب آخر.");
  }

  const code = generateVerificationCode(6);
  await storeVerificationCode(db, "activation_email", studentId, code, 600, 5);

  await updateMember(db, member.member_id, {
    verified_email: normalizedEmail,
    activation_status: "pending",
  });

  const emailSent = await sendEmail(
    normalizedEmail,
    "CESS activation code",
    `Your CESS activation code is: ${code}\n\nIt expires in 10 minutes.`,
  );

  if (!emailSent) {
    throw userError("تعذر إرسال رسالة التحقق إلى بريدك الإلكتروني. الرجاء المحاولة مرة أخرى.");
  }

  await logAuthEvent(db, "auth.startActivation", member.member_id, "activation_code_requested");

  return { acknowledged: true };
}
// =========================================================
// ACTIVATION — VERIFY EMAIL CODE
// =========================================================

async function authVerifyActivationCode(input: any) {
  requireFields(input, ["student_id", "code"]);

  const studentId = validateStudentId(input.student_id);
  const code = validateVerificationCode(input.code);

  const rl = await rateLimitCheckAndConsume(db, "activation.verify", studentId, 10, 900);
  if (!rl.allowed) throw userError("Too many attempts. Try again later.");

  const member = await findMemberByStudentId(db, studentId);
  if (!member || isActiveMember(member)) {
    throw userError("Invalid or expired code.");
  }

  const consumed = await consumeVerificationCode(db, "activation_email", studentId, code);
  if (!consumed.ok) throw userError("Invalid or expired code.");

  const issued = await issueActivationToken(
    member.member_id,
    member.student_id,
    ACTIVATION_STATES.PASSWORD,
  );

  return { activation_token: issued.token, expires_at: issued.expires_at };
}

// =========================================================
// ACTIVATION — SET PASSWORD
// =========================================================

async function authSetPassword(input: any) {
  requireFields(input, ["activation_token", "password", "confirm_password"]);

  if (input.password !== input.confirm_password) {
    throw userError("Passwords do not match.");
  }

  const password = validatePasswordPolicy(input.password);
  const preview = await verifyActivationTokenPreview(
    input.activation_token,
    ACTIVATION_STATES.PASSWORD,
  );

  const member = await findMemberById(db, preview.member_id);
  if (
    !member ||
    String(member.student_id) !== String(preview.student_id) ||
    String(member.activation_status || "") === "active"
  ) {
    throw userError("Invalid activation token.");
  }

  const currentStatus = String(member.activation_status || "").trim();
  if (currentStatus !== "" && currentStatus !== "pending") {
    throw userError("Invalid activation token.");
  }

  const salt = generateSalt(16);
  const passwordHash = await hashPassword(password, salt);

  const consumed = await consumeActivationTokenRecord(db, preview.token_id);
  if (!consumed) throw userError("Invalid or expired activation token.");

  await updateMember(db, member.member_id, {
    password_hash: passwordHash,
    password_salt: salt,
    password_updated_at: new Date().toISOString(),
    activation_status: "password_set",
  });

  const nextToken = await issueActivationToken(
    member.member_id,
    member.student_id,
    ACTIVATION_STATES.QUESTIONS,
  );

  await logAuthEvent(db, "auth.setPassword", member.member_id, "password_set");

  return {
    password_set: true,
    activation_token: nextToken.token,
    expires_at: nextToken.expires_at,
  };
}

// =========================================================
// ACTIVATION — SECURITY QUESTIONS
// =========================================================

async function authSetSecurityQuestions(input: any) {
  requireFields(input, ["activation_token", "q1_id", "a1", "q2_id", "a2"]);

  const q1 = validateQuestionId(input.q1_id);
  const q2 = validateQuestionId(input.q2_id);
  if (q1 === q2) throw userError("Please choose two different questions.");

  const answer1 = normalizeForAnswer(input.a1);
  const answer2 = normalizeForAnswer(input.a2);
  if (!answer1 || !answer2) throw userError("Answers must not be empty.");

  const preview = await verifyActivationTokenPreview(
    input.activation_token,
    ACTIVATION_STATES.QUESTIONS,
  );

  const member = await findMemberById(db, preview.member_id);
  if (
    !member ||
    String(member.student_id) !== String(preview.student_id) ||
    String(member.activation_status || "") !== "password_set"
  ) {
    throw userError("Invalid activation token.");
  }

  const salt1 = generateSalt(16);
  const salt2 = generateSalt(16);
  const hash1 = await hashPassword(answer1, salt1);
  const hash2 = await hashPassword(answer2, salt2);

  const consumed = await consumeActivationTokenRecord(db, preview.token_id);
  if (!consumed) throw userError("Invalid or expired activation token.");

  const now = new Date().toISOString();

  await updateMember(db, member.member_id, {
    security_question_1: q1,
    security_answer_1_hash: hash1,
    security_answer_1_salt: salt1,
    security_question_2: q2,
    security_answer_2_hash: hash2,
    security_answer_2_salt: salt2,
    activation_status: "active",
    activated_at: now,
    session_version: 1,
    membership_status: "active",
    email_verified_at: now,
  });

  await logAuthEvent(db, "auth.setSecurityQuestions", member.member_id, "activated");

  return { activated: true, member_id: member.member_id };
}

// =========================================================
// LOGIN
// =========================================================

async function authLogin(input: any) {
  requireFields(input, ["student_id", "password"]);

  const studentId = validateStudentId(input.student_id);

  const rl = await rateLimitCheckAndConsume(db, "login", studentId, 10, 900);
  if (!rl.allowed) throw userError("Too many attempts. Try again later.");

  const member = await findMemberByStudentId(db, studentId);

  if (
    !member ||
    !isActiveMember(member) ||
    !member.password_hash ||
    !member.password_salt ||
    !(await verifyPassword(String(input.password), member.password_hash, member.password_salt))
  ) {
    throw userError("Invalid student ID or password.");
  }

  const sessionVersion = Number(member.session_version);
  if (sessionVersion < 1) throw userError("Invalid student ID or password.");

  const token = await signSessionToken({
    member_id: member.member_id,
    session_version: sessionVersion,
  });

  await logAuthEvent(db, "auth.login", member.member_id, "success");

  return {
    token,
    member: {
      member_id: member.member_id,
      student_id: member.student_id,
      membership_status: member.membership_status,
    },
  };
}

// =========================================================
// REFRESH SESSION
// =========================================================

async function authRefreshSession(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);
  return {
    token: await signSessionToken({
      member_id: session.member_id,
      session_version: session.session_version,
    }),
  };
}

// =========================================================
// GET SESSION
// =========================================================

async function authGetSession(input: any) {
  requireFields(input, ["token"]);
  const session = await requireSession(db, input.token);
  const member = await findMemberById(db, session.member_id);

  return {
    member_id: session.member_id,
    student_id: session.student_id,
    isAdmin: session.isAdmin,
    membership_status: member ? member.membership_status : null,
  };
}
// =========================================================
// FORGOT PASSWORD — START / VERIFY
// =========================================================

async function authForgotPasswordStart(input: any) {
  // Phase 1: send code to current verified email
  if (input && input.student_id && !input.email_code) {
    let studentId: string;
    try {
      studentId = validateStudentId(input.student_id);
    } catch {
      return { acknowledged: true };
    }

    try {
      const rl = await rateLimitCheckAndConsume(db, "recovery.start", studentId, 3, 900);
      if (!rl.allowed) return { acknowledged: true };
    } catch {
      return { acknowledged: true };
    }

    const member = await findMemberByStudentId(db, studentId);

    if (member && isActiveMember(member) && normalizeEmail(member.verified_email)) {
      const code = generateVerificationCode(6);
      await storeVerificationCode(db, "recovery_email", studentId, code, 600, 5);
      await sendEmail(
        normalizeEmail(member.verified_email),
        "CESS password recovery code",
        `Your CESS password recovery code is: ${code}\n\nIt expires in 10 minutes.`,
      );
    }

    return { acknowledged: true };
  }

  // Phase 2: verify email code
  requireFields(input, ["student_id", "email_code"]);

  const studentIdB = validateStudentId(input.student_id);
  const codeB = validateVerificationCode(input.email_code);

  const rl = await rateLimitCheckAndConsume(db, "recovery.email", studentIdB, 10, 900);
  if (!rl.allowed) throw userError("Too many attempts. Try again later.");

  const memberB = await findMemberByStudentId(db, studentIdB);

  const consumed = memberB
    ? await consumeVerificationCode(db, "recovery_email", studentIdB, codeB)
    : { ok: false };

  if (!memberB || !isActiveMember(memberB) || !consumed.ok) {
    throw userError("Invalid or expired code.");
  }

  const q1 = getQuestion(memberB.security_question_1);
  const q2 = getQuestion(memberB.security_question_2);

  if (!q1 || !q2) throw userError("Recovery is not available for this account.");

  const issued = await issueRecoveryToken(
    memberB.member_id,
    RECOVERY_PURPOSES.RECOVERY,
    Number(memberB.session_version),
  );

  return {
    questions: [
      { id: q1.id, en: q1.en, ar: q1.ar },
      { id: q2.id, en: q2.en, ar: q2.ar },
    ],
    recovery_token: issued.token,
    expires_at: issued.expires_at,
  };
}

// =========================================================
// RESET PASSWORD
// =========================================================

async function authResetPassword(input: any) {
  requireFields(input, ["recovery_token", "a1", "a2", "new_password", "confirm_password"]);

  if (input.new_password !== input.confirm_password) {
    throw userError("Passwords do not match.");
  }

  const newPassword = validatePasswordPolicy(input.new_password);
  const answer1 = normalizeForAnswer(input.a1);
  const answer2 = normalizeForAnswer(input.a2);
  if (!answer1 || !answer2) throw userError("Answers must not be empty.");

  const preview = await verifyRecoveryTokenPreview(
    input.recovery_token,
    RECOVERY_PURPOSES.RECOVERY,
  );

  const member = await findMemberById(db, preview.member_id);
  if (!member || !isActiveMember(member) || !verifyRecoveryVersion(preview, member)) {
    throw userError("Recovery session is invalid.");
  }

  const rl = await rateLimitCheckAndConsume(db, "recovery.reset", member.member_id, 5, 1800);
  if (!rl.allowed) throw userError("Too many attempts. Try again later.");

  if (
    !(await verifyPassword(answer1, member.security_answer_1_hash, member.security_answer_1_salt)) ||
    !(await verifyPassword(answer2, member.security_answer_2_hash, member.security_answer_2_salt))
  ) {
    throw userError("Security answers are incorrect.");
  }

  const salt = generateSalt(16);
  const passwordHash = await hashPassword(newPassword, salt);

  const consumed = await consumeRecoveryTokenRecord(db, preview.token_id);
  if (!consumed) throw userError("Recovery session is invalid.");

  const currentVersion = Number(member.session_version);
  if (currentVersion < 1) throw userError("Recovery session is invalid.");

  await updateMember(db, member.member_id, {
    password_hash: passwordHash,
    password_salt: salt,
    password_updated_at: new Date().toISOString(),
    session_version: currentVersion + 1,
  });

  await logAuthEvent(db, "auth.resetPassword", member.member_id, "success");

  return { reset: true };
}

// =========================================================
// CHANGE EMAIL
// =========================================================

async function authChangeEmail(input: any) {
  requireFields(input, ["token", "new_email"]);

  const session = await requireSession(db, input.token);
  const newEmail = validateEmail(input.new_email);

  const member = await findMemberById(db, session.member_id);
  if (!member || !isActiveMember(member)) throw userError("Session invalid.");

  if (await emailInUse(db, newEmail, session.member_id)) {
    throw userError("This email is already in use.");
  }

  // Phase 1: send verification code
  if (!input.code) {
    const rl = await rateLimitCheckAndConsume(db, "emailchange.send", session.member_id, 3, 3600);
    if (!rl.allowed) throw userError("Too many attempts. Try again later.");

    const code = generateVerificationCode(6);
    await storeVerificationCode(db, "email_change", `${session.member_id}|${newEmail}`, code, 600, 5);

    const sent = await sendEmail(
      newEmail,
      "CESS email verification",
      `Your CESS email verification code is: ${code}\n\nIt expires in 10 minutes.`,
    );
    if (!sent) throw userError("Could not send the verification email. Please try again.");

    return { code_sent: true };
  }

  // Phase 2: verify and update
  const codeB = validateVerificationCode(input.code);

  const rl2 = await rateLimitCheckAndConsume(db, "emailchange.verify", session.member_id, 10, 900);
  if (!rl2.allowed) throw userError("Too many attempts. Try again later.");

  const consumed = await consumeVerificationCode(
    db,
    "email_change",
    `${session.member_id}|${newEmail}`,
    codeB,
  );
  if (!consumed.ok) throw userError("Invalid or expired code.");

  const freshMember = await findMemberById(db, session.member_id);
  if (!freshMember || !isActiveMember(freshMember)) throw userError("Session invalid.");
  if (Number(freshMember.session_version) !== Number(session.session_version)) {
    throw userError("Session invalid.");
  }
  if (await emailInUse(db, newEmail, session.member_id)) {
    throw userError("This email is already in use.");
  }

  await updateMember(db, session.member_id, {
    verified_email: newEmail,
    email_verified_at: new Date().toISOString(),
    session_version: Number(freshMember.session_version) + 1,
  });

  await logAuthEvent(db, "auth.changeEmail", freshMember.member_id, "success");

  return { email_changed: true };
}

// =========================================================
// RECOVER EMAIL
// =========================================================

async function authRecoverEmail(input: any) {
  // Phase 3: verify new email code and complete recovery
  if (input && input.recovery_token) {
    requireFields(input, ["recovery_token", "new_email", "verification_code"]);

    const newEmail = validateEmail(input.new_email);
    const verificationCode = validateVerificationCode(input.verification_code);

    const preview = await verifyRecoveryTokenPreview(
      input.recovery_token,
      RECOVERY_PURPOSES.EMAIL_RECOVERY,
    );

    const member = await findMemberById(db, preview.member_id);
    if (
      !member ||
      !isActiveMember(member) ||
      !verifyRecoveryVersion(preview, member) ||
      (await emailInUse(db, newEmail, member.member_id))
    ) {
      throw userError("Recovery session is invalid.");
    }

    const rl = await rateLimitCheckAndConsume(db, "emailrecover.complete", member.member_id, 10, 900);
    if (!rl.allowed) throw userError("Too many attempts. Try again later.");

    const consumed = await consumeVerificationCode(
      db,
      "email_recovery_new",
      `${member.member_id}|${newEmail}`,
      verificationCode,
    );
    if (!consumed.ok) throw userError("Invalid or expired code.");

    if (await emailInUse(db, newEmail, member.member_id)) {
      throw userError("This email is already in use.");
    }

    const consumedToken = await consumeRecoveryTokenRecord(db, preview.token_id);
    if (!consumedToken) throw userError("Recovery session is invalid.");

    await updateMember(db, member.member_id, {
      verified_email: newEmail,
      email_verified_at: new Date().toISOString(),
      session_version: Number(member.session_version) + 1,
    });

    await logAuthEvent(db, "auth.recoverEmail", member.member_id, "email_recovered");

    return { email_recovered: true };
  }

  // Phase 2: verify current email + security answers
  if (input && input.email_code) {
    requireFields(input, ["student_id", "email_code", "a1", "a2", "new_email"]);

    const studentId = validateStudentId(input.student_id);
    const currentEmailCode = validateVerificationCode(input.email_code);
    const answer1 = normalizeForAnswer(input.a1);
    const answer2 = normalizeForAnswer(input.a2);
    const newEmailB = validateEmail(input.new_email);

    if (!answer1 || !answer2) throw userError("Answers must not be empty.");

    const rl = await rateLimitCheckAndConsume(db, "emailrecover.verify", studentId, 10, 1800);
    if (!rl.allowed) throw userError("Too many attempts. Try again later.");

    const memberB = await findMemberByStudentId(db, studentId);
    if (!memberB || !isActiveMember(memberB)) throw userError("Invalid or expired code.");

    const consumed = await consumeVerificationCode(
      db,
      "email_recovery_current",
      studentId,
      currentEmailCode,
    );
    if (!consumed.ok) throw userError("Invalid or expired code.");

    if (await emailInUse(db, newEmailB, memberB.member_id)) {
      throw userError("This email is already in use.");
    }

    if (
      !(await verifyPassword(answer1, memberB.security_answer_1_hash, memberB.security_answer_1_salt)) ||
      !(await verifyPassword(answer2, memberB.security_answer_2_hash, memberB.security_answer_2_salt))
    ) {
      throw userError("Security answers are incorrect.");
    }

    const newCode = generateVerificationCode(6);
    await storeVerificationCode(
      db,
      "email_recovery_new",
      `${memberB.member_id}|${newEmailB}`,
      newCode,
      600,
      5,
    );

    const sent = await sendEmail(
      newEmailB,
      "CESS email recovery",
      `Your CESS email recovery code is: ${newCode}\n\nIt expires in 10 minutes.`,
    );
    if (!sent) throw userError("Could not send the verification email. Please try again.");

    const issued = await issueRecoveryToken(
      memberB.member_id,
      RECOVERY_PURPOSES.EMAIL_RECOVERY,
      Number(memberB.session_version),
    );

    return { code_sent: true, recovery_token: issued.token, expires_at: issued.expires_at };
  }

  // Phase 1: send code to current verified email
  let studentIdC: string;
  try {
    studentIdC = validateStudentId(input && input.student_id);
  } catch {
    return { acknowledged: true };
  }

  try {
    const rl = await rateLimitCheckAndConsume(db, "emailrecover.start", studentIdC, 3, 900);
    if (!rl.allowed) return { acknowledged: true };
  } catch {
    return { acknowledged: true };
  }

  const memberC = await findMemberByStudentId(db, studentIdC);

  if (memberC && isActiveMember(memberC) && normalizeEmail(memberC.verified_email)) {
    const codeC = generateVerificationCode(6);
    await storeVerificationCode(db, "email_recovery_current", studentIdC, codeC, 600, 5);
    await sendEmail(
      normalizeEmail(memberC.verified_email),
      "CESS email recovery code",
      `Your CESS email recovery code is: ${codeC}\n\nIt expires in 10 minutes.`,
    );
  }

  return { acknowledged: true };
}

// =========================================================
// ROUTER — HTTP ENTRY POINT
// =========================================================

const ACTIONS: Record<string, (input: any) => Promise<unknown>> = {
  startActivation: authStartActivation,
  verifyActivationCode: authVerifyActivationCode,
  setPassword: authSetPassword,
  setSecurityQuestions: authSetSecurityQuestions,
  login: authLogin,
  refreshSession: authRefreshSession,
  getSession: authGetSession,
  forgotPasswordStart: authForgotPasswordStart,
  resetPassword: authResetPassword,
  changeEmail: authChangeEmail,
  recoverEmail: authRecoverEmail,
};

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
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
