CESS_SEC.roles=function(el){
  const PN={students:"الطلاب والتفعيل",offices:"الأمانات واللجان",activities:"الأنشطة",news:"الإعلانات",resources:"الموارد",site:"إعدادات الموقع",vote:"الانتخابات",log:"سجل العمليات"};
  const PRE=[["أمين الإعلام",["news","resources"]],["أمين الأنشطة",["activities","resources"]],["شؤون الطلاب",["students"]]];
  let D=null;
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{D=await call("adminAdmins")}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    draw();
  }
  function row(a){const sup=a.role==="super",me=a.student_id===D.me;
    return `<div class="rs"><div class="av">${esc((a.full_name||a.student_id).trim().slice(0,1))}</div><div class="who"><b>${esc(a.full_name||"بدون اسم")}${me?" (أنت)":""}</b><span><bdi>${esc(a.student_id)}</bdi> · ${sup?"كل الصلاحيات":(a.perms.map(p=>PN[p]).filter(Boolean).join("، ")||"بلا صلاحيات")}</span></div><span class="badge ${sup?"warn":"info"}">${sup?"مشرف عام":"مشرف"}</span><div class="acts"><button class="btn sm" data-ed="${esc(a.student_id)}">تعديل</button>${me?"":`<button class="btn sm dng" data-rm="${esc(a.student_id)}">إزالة</button>`}</div></div>`}
  function draw(){
    el.innerHTML=`<p class="sub">المشرف العام يملك كل الصلاحيات ويدير المشرفين. أما المشرف العادي فيرى الأقسام التي تمنحه إياها فقط. الشرط: أن يكون حسابه مفعّلًا.</p><div class="bar"><button class="btn pri" id="ra">+ إضافة مشرف</button></div><div class="list">${D.admins.map(row).join("")}</div>`;
    el.querySelector("#ra").onclick=()=>form(null);
    el.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>form(D.admins.find(x=>x.student_id===b.dataset.ed)));
    el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>remove(b.dataset.rm));
  }
  async function remove(id){
    const a=D.admins.find(x=>x.student_id===id);
    if(!await confirmBox("إزالة المشرف؟",`سيفقد <b>${esc(a.full_name||id)}</b> كل صلاحيات الإشراف، ويبقى حسابه كعضو عادي.`,"إزالة",true))return;
    try{await call("adminAdminRemove",{student_id:id});toast("تمت الإزالة");await refresh()}catch(e){toast(e.message,"bad")}
  }
  function form(a){
    const edit=!!a;let role=a?a.role:"admin";
    modal(`<h3>${edit?"تعديل المشرف":"إضافة مشرف"}</h3>
    <p class="sub">${edit?esc(a.full_name||"")+" — <bdi>"+esc(a.student_id)+"</bdi>":"أدخل الرقم الجامعي لحساب مفعّل."}</p>
    ${edit?"":'<div class="fld"><label>الرقم الجامعي</label><input id="rid" inputmode="numeric" dir="ltr" autocomplete="off"></div>'}
    <div class="seg"><button data-r="admin">صلاحيات محددة</button><button data-r="super">مشرف عام</button></div>
    <div id="pp"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${PRE.map((p,i)=>`<button class="chip" data-p="${i}">${p[0]}</button>`).join("")}</div>
    ${Object.entries(PN).map(([k,v])=>`<label style="display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--bd);border-radius:10px;margin-bottom:6px;cursor:pointer"><input type="checkbox" value="${k}" style="width:18px;height:18px"> ${v}</label>`).join("")}</div>
    <p class="sub" id="sp" hidden>المشرف العام يملك كل الصلاحيات ويستطيع إدارة المشرفين. امنحها بحذر.</p>
    <div class="row"><button class="btn pri" id="sv">حفظ</button><button class="btn" id="x">إلغاء</button></div>`);
    const boxes=[...dlg.querySelectorAll("#pp input")];
    const setR=r=>{role=r;dlg.querySelectorAll(".seg button").forEach(b=>b.classList.toggle("on",b.dataset.r===r));$("#pp").hidden=r==="super";$("#sp").hidden=r!=="super"};
    boxes.forEach(b=>b.checked=!!a&&a.perms.includes(b.value));
    setR(role);
    dlg.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>setR(b.dataset.r));
    dlg.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const p=PRE[b.dataset.p][1];boxes.forEach(x=>x.checked=p.includes(x.value))});
    $("#sv").onclick=e=>busy(e.currentTarget,async()=>{
      const sid=edit?a.student_id:nz($("#rid").value);
      if(!/^\d{4,20}$/.test(sid))throw new Error("أدخل رقمًا جامعيًا صحيحًا.");
      const perms=boxes.filter(x=>x.checked).map(x=>x.value);
      if(role==="admin"&&!perms.length)throw new Error("اختر صلاحية واحدة على الأقل.");
      await call("adminAdminSave",{student_id:sid,role,perms});
      dlg.close();toast("تم الحفظ");await refresh();
    });
    $("#x").onclick=()=>dlg.close();
  }
  refresh();
};
