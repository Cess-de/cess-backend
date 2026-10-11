CESS_SEC.log=function(el){
  const LB={adminAddStudents:"إضافة طلاب",adminUpdateStudent:"تعديل بيانات طالب",adminDeleteStudent:"حذف طالب",adminIssueCodes:"إصدار رموز تفعيل",adminSetStatus:"تغيير حالة حساب",adminResetAccount:"إعادة تعيين حساب",adminAdminSave:"تعيين/تعديل مشرف",adminAdminRemove:"إزالة مشرف",adminSiteSave:"تعديل إعدادات الموقع",adminResSave:"حفظ مورد",adminResDelete:"حذف مورد",adminPfSet:"حجب/تمييز ملف",adminPfClear:"مسح/حذف ملف عضو",adminAchVerify:"توثيق إنجاز",adminAchDelete:"حذف إنجاز",adminLeaderSet:"تعيين صفة قيادية",adminAnnSave:"حفظ إعلان",adminAnnDelete:"حذف إعلان",adminActSave:"حفظ نشاط",adminActDelete:"حذف نشاط",adminOffSave:"حفظ أمانة",adminOffDelete:"حذف أمانة",adminElSave:"حفظ انتخاب",adminElTree:"تعديل مناصب ومرشحي انتخاب",adminElStatus:"تغيير حالة انتخاب",adminElDelete:"حذف انتخاب"};
  const RED=/Delete|Remove|Reset|Clear|Status/;
  let R=[],Q="",W="",N=100;
  const ago=d=>{const s=Math.max(1,Math.round((Date.now()-new Date(d))/1000));return s<60?"الآن":s<3600?"قبل "+Math.round(s/60)+" د":s<86400?"قبل "+Math.round(s/3600)+" س":new Date(d).toLocaleDateString("ar",{day:"numeric",month:"short"})};
  const row=r=>`<div class="rs" title="${esc(new Date(r.at).toLocaleString("ar"))}"><div class="av">${RED.test(r.action)?"⚠️":"📝"}</div><div class="who"><b>${esc(LB[r.action]||r.action)}</b><span>${esc(r.name||r.who)} · <bdi>${esc(r.who)}</bdi>${r.target?` · <bdi>${esc(r.target)}</bdi>`:""}</span></div><span class="badge gray">${ago(r.at)}</span></div>`;
  const fl=()=>{const q=Q.trim().toLowerCase();return R.filter(r=>(!W||r.who===W)&&(!q||((LB[r.action]||"")+" "+r.action+" "+(r.target||"")+" "+(r.name||"")+" "+r.who).toLowerCase().includes(q)))};
  const list=()=>{const f=fl();return f.length?f.slice(0,N).map(row).join("")+(f.length>N?`<div class="empty"><button class="btn" id="lm">عرض المزيد (${f.length-N})</button></div>`:""):'<div class="empty">لا توجد عمليات مطابقة.</div>'};
  function draw(){
    const ws=[...new Map(R.map(r=>[r.who,r.name||r.who])).entries()];
    el.innerHTML=`<p class="sub">كل عملية تعديل أو حذف يقوم بها أي مشرف تُسجَّل هنا تلقائيًا، ولا يمكن تعديلها. تُحفظ 180 يومًا.</p><div class="bar"><input id="lq" type="search" placeholder="ابحث في السجل" value="${esc(Q)}"><select id="lw" style="height:40px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);padding:0 10px"><option value="">كل المشرفين</option>${ws.map(([k,n])=>`<option value="${esc(k)}" ${k===W?"selected":""}>${esc(n)}</option>`).join("")}</select><button class="btn" id="ld">تحميل CSV</button></div><div class="list" id="ll">${list()}</div>`;
    el.querySelector("#lq").oninput=e=>{Q=e.target.value;N=100;el.querySelector("#ll").innerHTML=list()};
    el.querySelector("#lw").onchange=e=>{W=e.target.value;N=100;el.querySelector("#ll").innerHTML=list()};
    el.querySelector("#ld").onclick=()=>csv("audit-log.csv",["الوقت","المشرف","الرقم","العملية","التفاصيل"],fl().map(r=>[new Date(r.at).toLocaleString("ar"),r.name||"",r.who,LB[r.action]||r.action,r.target||""]));
  }
  el.onclick=e=>{if(e.target.closest("#lm")){N+=100;el.querySelector("#ll").innerHTML=list()}};
  (async()=>{
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminLogList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    draw();
  })();
};
