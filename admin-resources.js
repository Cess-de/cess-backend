CESS_SEC.resources=function(el){
  const KI={file:"📄",folder:"📁",doc:"📝",sheet:"📊",slides:"📽️",form:"📋",video:"🎬",link:"🔗"};
  const KN={file:"ملف Drive",folder:"مجلد Drive",doc:"مستند Google",sheet:"جدول Google",slides:"عرض تقديمي",form:"نموذج Google",video:"فيديو",link:"رابط"};
  const det=u=>{try{
    const x=new URL(u);if(x.protocol!=="https:")return null;
    const h=x.hostname.replace(/^www\./,""),p=x.pathname;
    if(h==="drive.google.com")return /\/folders\//.test(p)?"folder":"file";
    if(h==="docs.google.com")return /^\/document/.test(p)?"doc":/^\/spreadsheets/.test(p)?"sheet":/^\/presentation/.test(p)?"slides":/^\/forms/.test(p)?"form":"link";
    if(/youtube\.com$|youtu\.be$/.test(h))return "video";
    return "link";
  }catch(e){return null}};
  let R=[],Q="";
  const cats=()=>[...new Set(R.map(r=>r.category).filter(Boolean))].sort();
  const rows=()=>{const q=Q.trim().toLowerCase();return R.filter(r=>!q||(r.title+" "+(r.category||"")).toLowerCase().includes(q))};
  const row=r=>`<div class="rs"><div class="av">${KI[r.kind]||"🔗"}</div><div class="who"><b>${esc(r.title)}</b><span>${esc(r.category||"بدون تصنيف")} · ${KN[r.kind]||"رابط"}</span></div><span class="badge ${r.published?"ok":"gray"}">${r.published?"منشور":"مخفي"}</span><div class="acts"><a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener">فتح</a><button class="btn sm" data-ed="${esc(r.id)}">تعديل</button><button class="btn sm dng" data-rm="${esc(r.id)}">حذف</button></div></div>`;
  const list=()=>{const rs=rows();return rs.length?rs.map(row).join(""):`<div class="empty">${R.length?"لا نتائج مطابقة.":"لا توجد موارد بعد.<br>اضغط «إضافة مورد» والصق رابطًا من Drive."}</div>`};
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminResList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    el.innerHTML=`<p class="sub">أضف روابط Drive (من أي حساب لديك) أو أي رابط آخر. يراها الأعضاء فقط في صفحة «الموارد».</p><div class="bar"><input id="rq" type="search" placeholder="ابحث في الموارد" value="${esc(Q)}"><button class="btn pri" id="ra">+ إضافة مورد</button></div><div class="list" id="rl">${list()}</div>`;
    el.querySelector("#rq").oninput=e=>{Q=e.target.value;el.querySelector("#rl").innerHTML=list()};
  }
  el.onclick=async e=>{
    if(e.target.closest("#ra"))return form(null);
    const ed=e.target.closest("[data-ed]");if(ed)return form(R.find(r=>r.id===ed.dataset.ed));
    const rm=e.target.closest("[data-rm]");
    if(rm){
      const r=R.find(x=>x.id===rm.dataset.rm);
      if(!await confirmBox("حذف المورد؟",`سيُحذف <b>${esc(r.title)}</b> من الموقع. الملف الأصلي في Drive لا يتأثر.`,"حذف",true))return;
      busy(rm,async()=>{await call("adminResDelete",{id:r.id});toast("تم الحذف");await refresh()});
    }
  };
  function form(r){
    modal(`<h3>${r?"تعديل المورد":"إضافة مورد"}</h3>
    <datalist id="cl">${cats().map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
    <div class="fld"><label>العنوان *</label><input id="m1" value="${esc(r?r.title:"")}"></div>
    <div class="fld"><label>الرابط *</label><input id="m2" dir="ltr" placeholder="https://drive.google.com/..." value="${esc(r?r.url:"")}"><small id="m2e"></small></div>
    <div class="fld"><label>الوصف</label><textarea id="m3" rows="3">${esc(r?r.description||"":"")}</textarea></div>
    <div class="fld"><label>التصنيف</label><input id="m4" list="cl" placeholder="مثال: محاضرات، امتحانات، كتب" value="${esc(r?r.category||"":"")}"></div>
    <label style="display:flex;gap:10px;align-items:center;margin:4px 0 8px"><input type="checkbox" id="m5" style="width:18px;height:18px" ${!r||r.published?"checked":""}> منشور للأعضاء</label>
    <p class="sub" style="margin:0 0 4px">⚠️ في Drive: اضغط «مشاركة» ثم «أي شخص لديه الرابط» (عارض)، وإلا لن يفتحه الأعضاء.</p>
    <div class="row"><button class="btn pri" id="sv">حفظ</button><button class="btn" id="x">إلغاء</button></div>`);
    const chk=()=>{const u=$("#m2").value.trim(),k=u?det(u):null,s=$("#m2e");s.style.color=u&&!k?"var(--bad)":"var(--ok)";s.textContent=!u?"":k?"✓ تم التعرف: "+KN[k]:"الرابط غير صالح (يجب أن يبدأ بـ https://)"};
    $("#m2").oninput=chk;chk();
    $("#sv").onclick=e=>busy(e.currentTarget,async()=>{
      const t=$("#m1").value.trim(),u=$("#m2").value.trim();
      if(!t)throw new Error("اكتب عنوان المورد.");
      if(!det(u))throw new Error("الرابط غير صالح. يجب أن يبدأ بـ https://");
      await call("adminResSave",{id:r?r.id:null,title:t,url:u,description:$("#m3").value,category:$("#m4").value,published:$("#m5").checked});
      dlg.close();toast("تم الحفظ");await refresh();
    });
    $("#x").onclick=()=>dlg.close();
  }
  refresh();
};
