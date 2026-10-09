CESS_SEC.activities=function(el){
  let R=[];
  const loc=v=>{if(!v)return"";const d=new Date(v);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
  const wh=d=>new Date(d).toLocaleString("ar",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
  const over=a=>new Date(a.ends_at||a.starts_at)<new Date();
  const row=a=>`<div class="rs"><div class="av">📅</div><div class="who"><b>${esc(a.title)}</b><span>${wh(a.starts_at)}${a.location?" · "+esc(a.location):""}</span></div><span class="badge ${!a.published?"gray":over(a)?"gray":"ok"}">${!a.published?"مخفي":over(a)?"انتهى":"قادم"}</span><span class="badge info">${a.count}${a.capacity?"/"+a.capacity:""}</span><div class="acts"><button class="btn sm" data-rg="${esc(a.id)}">المسجلون</button><button class="btn sm" data-ed="${esc(a.id)}">تعديل</button><button class="btn sm dng" data-rm="${esc(a.id)}">حذف</button></div></div>`;
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminActList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    el.innerHTML=`<p class="sub">الأنشطة تظهر للأعضاء في صفحة «الأنشطة» ويسجّلون منها (بالهاتف والواتساب وتعهد الجدية). العدد الأقصى اختياري.</p><div class="bar"><button class="btn pri" id="na">+ نشاط جديد</button></div><div class="list">${R.length?R.map(row).join(""):'<div class="empty">لا توجد أنشطة بعد.</div>'}</div>`;
  }
  el.onclick=async e=>{
    if(e.target.closest("#na"))return form(null);
    const ed=e.target.closest("[data-ed]");if(ed)return form(R.find(r=>r.id===ed.dataset.ed));
    const rg=e.target.closest("[data-rg]");if(rg)return regs(R.find(r=>r.id===rg.dataset.rg));
    const rm=e.target.closest("[data-rm]");
    if(rm){const a=R.find(x=>x.id===rm.dataset.rm);if(!await confirmBox("حذف النشاط؟",`سيُحذف <b>${esc(a.title)}</b> مع قائمة المسجلين (${a.count}).`,"حذف",true))return;busy(rm,async()=>{await call("adminActDelete",{id:a.id});toast("تم الحذف");await refresh()})}
  };
  async function regs(a){
    let L=[];try{L=(await call("adminActRegs",{id:a.id})).items}catch(e){return toast(e.message,"bad")}
    const wa=x=>`https://wa.me/${x.whatsapp}?text=${encodeURIComponent("مرحبًا "+(x.name||"")+"، بخصوص تسجيلك في «"+a.title+"»")}`;
    modal(`<h3>مسجلو «${esc(a.title)}» (${L.length})</h3>
    <div class="row" style="margin-top:8px"><button class="btn pri" id="dl">تحميل (Excel)</button><button class="btn" id="x">إغلاق</button></div>
    <div class="list" style="max-height:52vh;overflow:auto;margin-top:12px">${L.map(x=>`<div class="rs" style="padding:12px 14px"><div class="who"><b>${esc(x.name||"بدون اسم")}</b><span><bdi>${esc(x.student_id)}</bdi>${x.batch?" · دفعة "+esc(x.batch):""}</span><span dir="ltr" style="display:block">${x.phone?"+"+esc(x.phone):"—"}${x.whatsapp&&x.whatsapp!==x.phone?" · واتساب +"+esc(x.whatsapp):""}</span></div><div class="acts">${x.whatsapp?`<a class="btn sm pri" target="_blank" rel="noopener" href="${esc(wa(x))}">واتساب</a>`:""}${x.phone?`<a class="btn sm" href="tel:+${esc(x.phone)}">اتصال</a>`:""}</div></div>`).join("")||'<div class="empty">لا مسجلين بعد.</div>'}</div>`);
    $("#x").onclick=()=>dlg.close();
    $("#dl").onclick=()=>csv("registrants.csv",["الاسم","الرقم الجامعي","الدفعة","الهاتف","واتساب","وقت التسجيل"],L.map(x=>[x.name||"",x.student_id,x.batch||"",x.phone||"",x.whatsapp||"",x.at?new Date(x.at).toLocaleString("ar"):""]));
  }
  function form(a){
    modal(`<h3>${a?"تعديل النشاط":"نشاط جديد"}</h3>
    <div class="fld"><label>العنوان *</label><input id="a1" maxlength="120" value="${esc(a?a.title:"")}"></div>
    <div class="fld"><label>الوصف</label><textarea id="a2" rows="3" maxlength="2000">${esc(a?a.description||"":"")}</textarea></div>
    <div class="fld"><label>المكان</label><input id="a3" maxlength="150" value="${esc(a?a.location||"":"")}"></div>
    <div class="fld"><label>يبدأ *</label><input id="a4" type="datetime-local" value="${loc(a&&a.starts_at)}"></div>
    <div class="fld"><label>ينتهي (اختياري)</label><input id="a5" type="datetime-local" value="${loc(a&&a.ends_at)}"></div>
    <div class="fld"><label>العدد الأقصى (فارغ = بلا حد)</label><input id="a6" type="number" min="1" value="${a&&a.capacity?a.capacity:""}"></div>
    <label style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><input type="checkbox" id="a7" style="width:18px;height:18px" ${!a||a.published?"checked":""}> منشور للأعضاء</label>
    <div class="row"><button class="btn pri" id="sv">حفظ</button><button class="btn" id="x">إلغاء</button></div>`);
    $("#x").onclick=()=>dlg.close();
    $("#sv").onclick=e=>busy(e.currentTarget,async()=>{
      if(!$("#a1").value.trim())throw new Error("اكتب عنوان النشاط.");
      if(!$("#a4").value)throw new Error("حدّد موعد بداية النشاط.");
      const dt=v=>v?new Date(v).toISOString():null;
      await call("adminActSave",{id:a?a.id:null,title:$("#a1").value,description:$("#a2").value,location:$("#a3").value,starts_at:dt($("#a4").value),ends_at:dt($("#a5").value),capacity:$("#a6").value,published:$("#a7").checked});
      dlg.close();toast("تم الحفظ");await refresh();
    });
  }
  refresh();
};
