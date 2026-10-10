CESS_SEC.offices=function(el){
  let R=[];
  const row=r=>`<div class="rs"><div class="av">${r.images[0]?`<img src="${esc(r.images[0])}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:"🏛️"}</div><div class="who"><b>${esc(r.name)}</b><span>الترتيب ${r.sort} · ${r.images.length} صور</span></div><span class="badge ${r.published?"ok":"gray"}">${r.published?"منشورة":"مخفية"}</span><div class="acts"><button class="btn sm" data-ed="${esc(r.id)}">تعديل</button><button class="btn sm dng" data-rm="${esc(r.id)}">حذف</button></div></div>`;
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminOffList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    el.innerHTML=`<p class="sub">الأمانات واللجان تظهر في صفحة «الأمانات» العامة مع صورها.</p><div class="bar"><button class="btn pri" id="na">+ أمانة جديدة</button></div><div class="list">${R.length?R.map(row).join(""):'<div class="empty">لا توجد أمانات بعد.</div>'}</div>`;
  }
  el.onclick=async e=>{
    if(e.target.closest("#na"))return form(null);
    const ed=e.target.closest("[data-ed]");if(ed)return form(R.find(r=>r.id===ed.dataset.ed));
    const rm=e.target.closest("[data-rm]");
    if(rm){const r=R.find(x=>x.id===rm.dataset.rm);if(!await confirmBox("حذف الأمانة؟",`سيُحذف <b>${esc(r.name)}</b>.`,"حذف",true))return;busy(rm,async()=>{await call("adminOffDelete",{id:r.id});toast("تم الحذف");await refresh()})}
  };
  function form(r){
    modal(`<h3>${r?"تعديل الأمانة":"أمانة جديدة"}</h3>
    <div class="fld"><label>الاسم *</label><input id="o1" maxlength="100" value="${esc(r?r.name:"")}"></div>
    <div class="fld"><label>الوصف</label><textarea id="o2" rows="4" maxlength="2000">${esc(r?r.description||"":"")}</textarea></div>
    <div class="fld"><label>الترتيب (1 يظهر أولًا)</label><input id="o3" type="number" min="1" max="999" value="${r?r.sort:""}"></div>
    <label style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><input type="checkbox" id="o4" style="width:18px;height:18px" ${!r||r.published?"checked":""}> منشورة</label>
    <div class="row"><button class="btn pri" id="sv">حفظ</button><button class="btn" id="x">إلغاء</button></div>`);
    const p=CessImg.mk(r?r.images:[]),row=[...dlg.querySelectorAll(".row")].pop();row.parentNode.insertBefore(p.el,row);
    $("#x").onclick=()=>dlg.close();
    $("#sv").onclick=e=>busy(e.currentTarget,async()=>{
      if(!$("#o1").value.trim())throw new Error("اكتب اسم الأمانة.");
      await call("adminOffSave",{id:r?r.id:null,name:$("#o1").value,description:$("#o2").value,sort:$("#o3").value,published:$("#o4").checked,images:p.get()});
      dlg.close();toast("تم الحفظ");await refresh();
    });
  }
  refresh();
};
