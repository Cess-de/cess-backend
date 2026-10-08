CESS_SEC.members=function(el){
  const VN={members:"للأعضاء",public:"عام",hidden:"مخفي"};
  let R=[],Q="",F="all";
  const FL={all:()=>1,lead:r=>!!r.leader_title,hid:r=>r.visibility==="hidden"||r.blocked,rev:r=>r.unverified>0};
  const av=r=>r.photo?`<img src="${esc(r.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:esc((r.name||r.student_id).trim().slice(0,1));
  const row=r=>`<div class="rs"><div class="av">${av(r)}</div><div class="who"><b>${esc(r.name||"بدون اسم")}${r.leader_title?`<span class="badge warn" style="margin-inline-start:6px;font-size:11px">${esc(r.leader_title)}</span>`:""}</b><span><bdi>${esc(r.student_id)}</bdi>${r.batch?" · دفعة "+esc(r.batch):""} · ${VN[r.visibility]||""}${r.unverified?" · "+r.unverified+" إنجاز للمراجعة":""}</span></div>${r.blocked?'<span class="badge bad">محجوب</span>':""}${r.featured?'<span class="badge info">مميّز</span>':""}<div class="acts"><button class="btn sm" data-o="${esc(r.student_id)}">إدارة</button></div></div>`;
  const list=()=>{const q=Q.trim().toLowerCase(),rs=R.filter(FL[F]).filter(r=>!q||(r.name+" "+r.student_id+" "+(r.leader_title||"")).toLowerCase().includes(q));return rs.length?rs.map(row).join(""):`<div class="empty">${R.length?"لا نتائج.":"لم يُنشئ أحد ملفه بعد."}</div>`};
  function draw(){
    el.innerHTML=`<p class="sub">إدارة ملفات الأعضاء: الحجب والتمييز والصفة القيادية وتوثيق الإنجازات.</p><div class="bar"><input id="mq" type="search" placeholder="ابحث بالاسم أو الرقم أو الصفة" value="${esc(Q)}"><button class="btn pri" id="ml">+ تعيين قيادي</button></div><div class="chips">${[["all","الكل"],["lead","القياديون"],["rev","إنجازات للمراجعة"],["hid","مخفية/محجوبة"]].map(([k,l])=>`<button class="chip ${F===k?"on":""}" data-f="${k}">${l}</button>`).join("")}</div><div class="list" id="mlist">${list()}</div>`;
    el.querySelector("#mq").oninput=e=>{Q=e.target.value;el.querySelector("#mlist").innerHTML=list()};
  }
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminPfList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    draw();
  }
  el.onclick=e=>{
    const f=e.target.closest("[data-f]");if(f){F=f.dataset.f;return draw()}
    if(e.target.closest("#ml"))return leader(null);
    const o=e.target.closest("[data-o]");if(o)mgr(R.find(r=>r.student_id===o.dataset.o));
  };
  function leader(r){
    modal(`<h3>تعيين قيادي</h3>${r?`<p class="sub">${esc(r.name||r.student_id)}</p>`:'<div class="fld"><label>الرقم الجامعي</label><input id="l1" inputmode="numeric" dir="ltr"></div>'}<div class="fld"><label>الصفة القيادية (فارغة = إلغاء)</label><input id="l2" value="${esc((r&&r.leader_title)||"")}" placeholder="مثال: رئيس الجمعية"></div><div class="fld"><label>الترتيب (1 يظهر أولًا)</label><input id="l3" type="number" min="1" max="999" value="${r&&r.leader_title?r.leader_rank:""}"></div><p class="sub">يظهر القيادي للعامة في الصفحة الرئيسية فقط إذا اختار صاحب الملف «عام».</p><div class="row"><button class="btn pri" id="ls">حفظ</button><button class="btn" id="lx">إلغاء</button></div>`);
    $("#lx").onclick=()=>dlg.close();
    $("#ls").onclick=e=>busy(e.currentTarget,async()=>{
      const sid=r?r.student_id:nz($("#l1").value);
      if(!/^\d{4,20}$/.test(sid))throw new Error("أدخل رقمًا جامعيًا صحيحًا.");
      await call("adminLeaderSet",{student_id:sid,title:$("#l2").value,rank:$("#l3").value});
      dlg.close();toast("تم الحفظ");await refresh();
    });
  }
  async function mgr(r){
    let ach=[];try{ach=(await call("pfGet",{pid:r.pid})).achievements||[]}catch(e){}
    modal(`<h3>${esc(r.name||r.student_id)}</h3><p class="sub"><bdi>${esc(r.student_id)}</bdi></p>
    <div class="row" style="margin-top:0"><a class="btn" target="_blank" rel="noopener" href="members.html?id=${encodeURIComponent(r.pid)}">عرض الملف</a><button class="btn" id="g1">${r.featured?"إلغاء التمييز":"تمييز"}</button><button class="btn dng" id="g2">${r.blocked?"إظهار الملف":"حجب الملف"}</button></div>
    <div class="row"><button class="btn" id="g3">الصفة القيادية</button>${r.photo?'<button class="btn dng" id="g4">مسح الصورة</button>':""}<button class="btn dng" id="g5">حذف الملف</button></div>
    <h3 style="margin-top:18px;font-size:15px">الإنجازات (${ach.length})</h3>
    ${ach.map(a=>`<div class="rs" style="padding:10px 0"><div class="who"><b>${esc(a.title)}</b>${a.verified?'<span class="badge ok" style="margin-inline-start:6px;font-size:11px">موثّق</span>':""}<span>${esc(a.date||"")}</span></div><div class="acts"><button class="btn sm" data-v="${esc(a.id)}" data-s="${a.verified?0:1}">${a.verified?"إلغاء التوثيق":"توثيق"}</button><button class="btn sm dng" data-d="${esc(a.id)}">حذف</button></div></div>`).join("")||'<p class="sub">لا توجد إنجازات.</p>'}
    <div class="row"><button class="btn" id="x">إغلاق</button></div>`);
    const done=async m=>{toast(m);await refresh()},again=async()=>{await refresh();mgr(R.find(x=>x.student_id===r.student_id)||r)};
    $("#x").onclick=()=>dlg.close();
    $("#g1").onclick=e=>busy(e.currentTarget,async()=>{await call("adminPfSet",{student_id:r.student_id,featured:!r.featured});dlg.close();await done("تم")});
    $("#g2").onclick=e=>busy(e.currentTarget,async()=>{await call("adminPfSet",{student_id:r.student_id,blocked:!r.blocked});dlg.close();await done(r.blocked?"أُظهر الملف":"حُجب الملف")});
    $("#g3").onclick=()=>leader(r);
    if($("#g4"))$("#g4").onclick=e=>busy(e.currentTarget,async()=>{await call("adminPfClear",{student_id:r.student_id,what:"photo"});dlg.close();await done("مُسحت الصورة")});
    $("#g5").onclick=async()=>{
      if(!await confirmBox("حذف الملف كاملًا؟",`سيُحذف ملف <b>${esc(r.name||r.student_id)}</b> وصورته وإنجازاته نهائيًا.`,"حذف",true))return;
      try{await call("adminPfClear",{student_id:r.student_id,what:"all"});await done("حُذف الملف")}catch(e){toast(e.message,"bad")}
    };
    dlg.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>busy(b,async()=>{await call("adminAchVerify",{id:b.dataset.v,verified:b.dataset.s==="1"});await again()}));
    dlg.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>busy(b,async()=>{await call("adminAchDelete",{id:b.dataset.d});await again()}));
  }
  refresh();
};
