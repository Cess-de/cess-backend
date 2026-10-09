CESS_SEC.news=function(el){
  const KI={info:"📢",event:"📅",urgent:"⚠️"},KN={info:"عادي",event:"فعالية",urgent:"عاجل"};
  let R=[];
  const loc=v=>{if(!v)return"";const d=new Date(v);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
  const st=r=>{const n=Date.now();return !r.published?["مخفي","gray"]:r.ends_at&&new Date(r.ends_at)<n?["منتهٍ","gray"]:r.starts_at&&new Date(r.starts_at)>n?["مجدول","info"]:["نشط","ok"]};
  const row=r=>{const[t,c]=st(r);return `<div class="rs"><div class="av">${KI[r.kind]||"📢"}</div><div class="who"><b>${esc(r.title)}</b><span>${KN[r.kind]} · ${r.audience==="members"?"للأعضاء":"للجميع"}${r.popup?" · منبثق":""}${r.pinned?" · مثبّت":""}</span></div><span class="badge ${c}">${t}</span><div class="acts"><button class="btn sm" data-ed="${esc(r.id)}">تعديل</button><button class="btn sm dng" data-rm="${esc(r.id)}">حذف</button></div></div>`};
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminAnnList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    el.innerHTML=`<p class="sub">الإعلان «المنبثق» يظهر كإشعار زجاجي في الصفحة الرئيسية. «عاجل» يتكرر في كل زيارة حتى ينتهي.</p><div class="bar"><button class="btn pri" id="na">+ إعلان جديد</button></div><div class="list">${R.length?R.map(row).join(""):'<div class="empty">لا توجد إعلانات بعد.</div>'}</div>`;
  }
  el.onclick=async e=>{
    if(e.target.closest("#na"))return form(null);
    const ed=e.target.closest("[data-ed]");if(ed)return form(R.find(r=>r.id===ed.dataset.ed));
    const rm=e.target.closest("[data-rm]");
    if(rm){const r=R.find(x=>x.id===rm.dataset.rm);if(!await confirmBox("حذف الإعلان؟",`سيُحذف <b>${esc(r.title)}</b> نهائيًا.`,"حذف",true))return;busy(rm,async()=>{await call("adminAnnDelete",{id:r.id});toast("تم الحذف");await refresh()})}
  };
  function form(r){
    modal(`<h3>${r?"تعديل الإعلان":"إعلان جديد"}</h3>
    <div class="fld"><label>العنوان *</label><input id="n1" maxlength="120" value="${esc(r?r.title:"")}"></div>
    <div class="fld"><label>النص</label><textarea id="n2" rows="4" maxlength="2000">${esc(r?r.body||"":"")}</textarea></div>
    <div class="fld"><label>النوع</label><select id="n3" style="width:100%;height:42px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);padding:0 10px"><option value="info">عادي</option><option value="event">فعالية</option><option value="urgent">عاجل</option></select></div>
    <div class="fld"><label>يراه</label><select id="n4" style="width:100%;height:42px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);padding:0 10px"><option value="public">الجميع (الزوار والأعضاء)</option><option value="members">الأعضاء فقط</option></select></div>
    <div class="fld"><label>يبدأ (اختياري)</label><input id="n5" type="datetime-local" value="${loc(r&&r.starts_at)}"></div>
    <div class="fld"><label>ينتهي (اختياري)</label><input id="n6" type="datetime-local" value="${loc(r&&r.ends_at)}"></div>
    ${[["n7","منبثق في الصفحة الرئيسية",r?r.popup:true],["n8","مثبّت في الأعلى",r?r.pinned:false],["n9","منشور",r?r.published:true]].map(([id,l,c])=>`<label style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><input type="checkbox" id="${id}" style="width:18px;height:18px" ${c?"checked":""}> ${l}</label>`).join("")}
    <div class="row"><button class="btn pri" id="sv">حفظ</button><button class="btn" id="x">إلغاء</button></div>`);
    $("#n3").value=r?r.kind:"info";$("#n4").value=r?r.audience:"public";
    $("#x").onclick=()=>dlg.close();
    $("#sv").onclick=e=>busy(e.currentTarget,async()=>{
      if(!$("#n1").value.trim())throw new Error("اكتب عنوان الإعلان.");
      const dt=v=>v?new Date(v).toISOString():null;
      await call("adminAnnSave",{id:r?r.id:null,title:$("#n1").value,body:$("#n2").value,kind:$("#n3").value,audience:$("#n4").value,starts_at:dt($("#n5").value),ends_at:dt($("#n6").value),popup:$("#n7").checked,pinned:$("#n8").checked,published:$("#n9").checked});
      dlg.close();toast("تم الحفظ");await refresh();
    });
  }
  refresh();
};
