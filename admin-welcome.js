/* admin-welcome.js — يضيف تبويب "الطلاب الجدد" إلى لوحة التحكم الحالية.
   يُحمَّل بعد admin-ext.js و admin-img.js. يستخدم دوال الصفحة نفسها (call, busy, toast, confirmBox, esc, $). */
(function () {
  const MJ = { architecture: "عمارة", civil: "هندسة مدنية", control: "هندسة تحكم", communications: "هندسة اتصالات", electronics: "هندسة إلكترونيات", power: "هندسة قدرة", computer: "هندسة حاسوب" };
  let W = [], WF = "all", WQ = "", file = null;

  if (!SEC.some(x => x[0] === "welcome")) SEC.splice(1, 0, ["welcome", "الطلاب الجدد", "بيانات الطلاب المقبولين المسجّلين من صفحة الترحيب."]);

  const intl = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "249" + d.slice(1); return d; };
  const day = d => { try { return new Date(d).toLocaleDateString("en-GB"); } catch { return ""; } };

  function shell() {
    $("#s-other").innerHTML = `
<div class="list" style="margin-bottom:12px;padding:14px"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
  <div class="av" id="wlp" style="overflow:hidden;background:var(--ac)">🎓</div>
  <div style="flex:1;min-width:150px"><b>شعار صفحة الترحيب</b><div class="sub" style="margin:2px 0 0">يظهر في صفحة welcome.html</div></div>
  <input type="file" id="wlf" accept="image/*" hidden>
  <button class="btn sm" id="wlc">اختيار صورة</button><button class="btn sm pri" id="wlu" disabled>رفع</button>
</div></div>
<div class="stats" id="wst"></div>
<div class="bar"><input id="wq" type="search" placeholder="ابحث بالاسم أو الرقم أو الهاتف" aria-label="بحث"><button class="btn" id="wex">تصدير CSV</button><button class="btn" id="wrf" aria-label="تحديث">↻</button></div>
<div class="chips" id="wch"></div><div class="list" id="wls"></div>`;

    $("#wq").value = WQ;
    $("#wq").oninput = e => { WQ = e.target.value; draw(); };
    $("#wrf").onclick = e => busy(e.currentTarget, () => load(true));
    $("#wex").onclick = exportCsv;
    $("#wls").onclick = onList;
    $("#wlc").onclick = () => $("#wlf").click();
    $("#wlf").onchange = onFile;
    $("#wlu").onclick = e => busy(e.currentTarget, upload);
    call("welcomeLogo").then(r => r.url && setPrev(r.url)).catch(() => {});
  }

  function setPrev(url) { const b = $("#wlp"); if (!b) return; b.textContent = ""; const i = new Image(); i.style.cssText = "width:100%;height:100%;object-fit:cover"; i.src = url; b.append(i); }

  function onFile() {
    file = $("#wlf").files[0] || null;
    $("#wlu").disabled = !file;
    if (file) { const r = new FileReader(); r.onload = () => setPrev(r.result); r.readAsDataURL(file); }
  }

  async function upload() {
    if (!file) return;
    const src = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => rej(new Error("تعذّر قراءة الصورة.")); x.src = src; });
    const side = Math.min(512, im.width, im.height), cv = document.createElement("canvas"); cv.width = cv.height = side;
    const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, side, side);
    const sw = Math.min(im.width, im.height); cx.drawImage(im, (im.width - sw) / 2, (im.height - sw) / 2, sw, sw, 0, 0, side, side);
    const d = await call("adminWelcomeLogo", { data: cv.toDataURL("image/jpeg", 0.9) });
    setPrev(d.url); file = null; $("#wlu").disabled = true; toast("تم رفع الشعار");
  }

  async function load(quiet) {
    if (!quiet && $("#wls")) $("#wls").innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
    try { W = (await call("adminWelcomeList")).rows || []; } catch (e) { toast(e.message, "bad"); W = []; }
    draw();
  }

  function list() {
    const q = nz(WQ).toLowerCase();
    return W.filter(r => (WF === "all" || r.major === WF) &&
      (!q || [r.student_id, r.full_name, r.whatsapp, r.phone].some(v => String(v || "").toLowerCase().includes(q))));
  }

  function draw() {
    if (!$("#wls")) return;
    const cnt = {}; W.forEach(r => cnt[r.major] = (cnt[r.major] || 0) + 1);
    const recent = W.filter(r => Date.now() - new Date(r.submitted_at) < 864e5).length;
    $("#wst").innerHTML = `<div class="st"><b>${W.length}</b><span>الإجمالي</span></div><div class="st"><b>${recent}</b><span>آخر 24 ساعة</span></div>`;
    $("#wch").innerHTML = [["all", "الكل (" + W.length + ")"], ...Object.keys(MJ).filter(k => cnt[k]).map(k => [k, MJ[k] + " (" + cnt[k] + ")"])]
      .map(([k, l]) => `<button class="chip ${WF === k ? "on" : ""}" data-wf="${k}">${esc(l)}</button>`).join("");
    $("#wch").onclick = e => { const b = e.target.closest("[data-wf]"); if (b) { WF = b.dataset.wf; draw(); } };
    const rows = list();
    $("#wls").innerHTML = rows.length ? rows.slice(0, 300).map(r => `
<div class="rs"><div class="av">${esc((r.full_name || "؟").trim().slice(0, 1))}</div>
<div class="who"><b>${esc(r.full_name)}</b><span><bdi>${esc(r.student_id)}</bdi> · ${esc(MJ[r.major] || r.major)} · ${day(r.submitted_at)}</span>
<span style="display:block" dir="ltr">${esc(r.whatsapp)} / ${esc(r.phone)}</span></div>
<div class="acts"><a class="btn sm" href="https://wa.me/${intl(r.whatsapp)}" target="_blank" rel="noopener">واتساب</a><a class="btn sm" href="tel:${esc(r.phone)}">اتصال</a><button class="btn sm dng" data-wd="${esc(r.id)}">حذف</button></div></div>`).join("")
      + (rows.length > 300 ? '<div class="empty">يُعرض أول 300 فقط. استخدم البحث أو الفلتر.</div>' : "")
      : `<div class="empty">${W.length ? "لا نتائج مطابقة." : "لا توجد تسجيلات بعد."}</div>`;
  }

  async function onList(e) {
    const b = e.target.closest("[data-wd]"); if (!b) return;
    const r = W.find(x => x.id === b.dataset.wd); if (!r) return;
    if (!await confirmBox("حذف التسجيل؟", `سيُحذف تسجيل <b>${esc(r.full_name)}</b> نهائيًا.`, "حذف", true)) return;
    await busy(b, async () => { await call("adminWelcomeDelete", { id: r.id }); W = W.filter(x => x.id !== r.id); draw(); toast("تم الحذف"); });
  }

  function exportCsv() {
    const rows = list(); if (!rows.length) return toast("لا توجد بيانات للتصدير", "bad");
    const cell = (v, num) => { v = String(v ?? ""); if (num && /^\+?\d+$/.test(v)) return '="' + v + '"'; if (/^[=@\t\r]/.test(v) || /^[+\-](?![\d\s()+\-]*$)/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const head = ["الرقم الجامعي", "الاسم", "التخصص", "واتساب", "مكالمات", "التاريخ"].map(h => '"' + h + '"').join(",");
    const lines = rows.map(r => [cell(r.student_id, 1), cell(r.full_name), cell(MJ[r.major] || r.major), cell(r.whatsapp, 1), cell(r.phone, 1), cell(day(r.submitted_at))].join(","));
    const u = URL.createObjectURL(new Blob(["\ufeff" + [head, ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = u; a.download = "welcome-students.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  }

  // ربط التبويب بدورة رسم اللوحة
  const _tabs = tabs;
  tabs = function () {
    _tabs();
    if (SC === "welcome") { shell(); load(); }
  };
  if (!$("#app").hidden) tabs();
})();
