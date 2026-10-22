(function(){
let CAT=[],DF="",SF="";
const sx='style="height:40px;padding:0 10px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);font:inherit"';
const sx2='style="flex:1;height:42px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);padding:0 8px"';
const loadCat=async()=>{try{CAT=(await call("deptList")).items}catch(e){}};
const depts=()=>[...new Set([...CAT.filter(c=>!c.parent).map(c=>c.name),...S.map(s=>s.dept).filter(Boolean)])];
const specs=d=>[...new Set([...CAT.filter(c=>c.parent===d).map(c=>c.name),...S.filter(s=>s.dept===d).map(s=>s.spec).filter(Boolean)])];
const opts=(a,v,ph)=>`<option value="">${ph}</option>`+a.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");

function fillF(){
  const f=document.getElementById("df"),s=document.getElementById("ds");if(!f)return;
  f.innerHTML=opts(depts(),DF,"كل الأقسام");
  const sp=DF?specs(DF):[];s.hidden=!sp.length;s.innerHTML=opts(sp,SF,"كل التخصصات");
}
async function toolbar(){
  await loadCat();
  const add=document.getElementById("add");
  if(!add||document.getElementById("df"))return;
  add.insertAdjacentHTML("beforebegin",`<select id="df" ${sx}></select><select id="ds" ${sx} hidden></select><button class="btn" id="dm">الأقسام</button>`);
  fillF();
  document.getElementById("df").onchange=e=>{DF=e.target.value;SF="";fillF();render()};
  document.getElementById("ds").onchange=e=>{SF=e.target.value;render()};
  document.getElementById("dm").onclick=mgr;
}
const _render=render;
render=function(){
  const all=S;
  if(DF||SF)S=all.filter(s=>(!DF||s.dept===DF)&&(!SF||s.spec===SF));
  try{_render()}finally{S=all}
  fillF();
};
const _row=row;
row=function(s){let h=_row(s);const t=[s.dept,s.spec].filter(Boolean).join(" · ");return t?h.replace("</bdi>","</bdi> · "+esc(t)):h};

function wireSel(v1,v2){
  const a=document.getElementById("dp1"),b=document.getElementById("dp2");
  const fill=(d,s)=>{const sp=d?specs(d):[];if(s&&!sp.includes(s))sp.push(s);b.innerHTML=opts(sp,s,"— التخصص —");b.hidden=!sp.length};
  const ds=depts();if(v1&&!ds.includes(v1))ds.push(v1);
  a.innerHTML=opts(ds,v1,"— القسم —");fill(v1,v2);a.onchange=()=>fill(a.value,"");
}
const selHtml=`<div class="fld"><label>القسم والتخصص</label><div style="display:flex;gap:8px"><select id="dp1" ${sx2}></select><select id="dp2" ${sx2}></select></div></div>`;
function inj(){
  if(dlg.querySelector("#dp1"))return;
  if(dlg.querySelector("#e3")&&dlg.querySelector("#sv")){
    const id=((dlg.querySelector("p.sub")||{}).textContent||"").trim(),s=S.find(x=>x.student_id===id)||{};
    dlg.querySelector("#e3").closest(".fld").insertAdjacentHTML("afterend",selHtml);wireSel(s.dept,s.spec);
  }else if(dlg.querySelector("#f3")){
    dlg.querySelector("#f3").closest(".fld").insertAdjacentHTML("afterend",selHtml);wireSel("","");
  }
}
const _modal=modal;
modal=function(h){_modal(h);try{inj()}catch(e){}};
const _call=call;
call=async function(a,i={}){
  const a1=document.getElementById("dp1"),a2=document.getElementById("dp2");
  if(a1&&a==="adminUpdateStudent")i={...i,dept:a1.value,spec:a2.value};
  const p1=dlg.querySelector("#p1");
  if(a1&&a==="adminAddStudents"&&i.rows&&i.rows.length===1&&!i.rows[0].dept&&p1&&!p1.hidden)i={...i,rows:[{...i.rows[0],dept:a1.value,spec:a2.value}]};
  return _call(a,i);
};

function ask(t,v){
  return new Promise(r=>{
    modal(`<h3>${t}</h3><div class="fld"><input id="aq" value="${esc(v||"")}" maxlength="60"></div><div class="row"><button class="btn pri" id="ay">حفظ</button><button class="btn" id="an">رجوع</button></div>`);
    dlg.onclose=()=>{dlg.onclick=null;r(null)};
    $("#aq").focus();
    $("#ay").onclick=()=>r($("#aq").value.trim());$("#an").onclick=()=>r(null);
    $("#aq").onkeydown=e=>{if(e.key==="Enter")r($("#aq").value.trim())};
  });
}
async function mgr(){
  await loadCat();
  const D=CAT.filter(c=>!c.parent);
  modal(`<h3>الأقسام والتخصصات</h3><p class="sub">تُستخدم عند إضافة الطلاب واستيراد Excel والتصفية. أضف أو عدّل ما يطابق كليتك.</p>`
    +(D.map(d=>`<div style="border:1px solid var(--bd);border-radius:14px;padding:10px;margin-bottom:10px"><div style="display:flex;gap:6px;align-items:center"><b style="flex:1">${esc(d.name)}</b><button class="btn sm" data-sp="${esc(d.name)}">+ تخصص</button><button class="btn sm" data-ed="${esc(d.name)}" data-p="">تعديل</button><button class="btn sm dng" data-rm="${esc(d.name)}" data-p="">حذف</button></div>${CAT.filter(c=>c.parent===d.name).map(s=>`<div style="display:flex;gap:6px;align-items:center;margin:8px 10px 0"><span style="flex:1">↳ ${esc(s.name)}</span><button class="btn sm" data-ed="${esc(s.name)}" data-p="${esc(d.name)}">تعديل</button><button class="btn sm dng" data-rm="${esc(s.name)}" data-p="${esc(d.name)}">حذف</button></div>`).join("")}</div>`).join("")||'<div class="empty">لا توجد أقسام.</div>')
    +`<div class="row"><button class="btn pri" id="dn">+ قسم جديد</button><button class="btn" id="dx">إغلاق</button></div>`);
  dlg.onclose=()=>{dlg.onclick=null};
  dlg.onclick=async e=>{
    if(e.target.closest("#dx"))return dlg.close();
    const sp=e.target.closest("[data-sp]"),ed=e.target.closest("[data-ed]"),rm=e.target.closest("[data-rm]"),dn=e.target.closest("#dn");
    if(!sp&&!ed&&!rm&&!dn)return;
    try{
      if(dn){const n=await ask("اسم القسم الجديد","");if(n)await call("adminDeptSave",{name:n,parent:""})}
      else if(sp){const n=await ask("اسم التخصص الجديد","");if(n)await call("adminDeptSave",{name:n,parent:sp.dataset.sp})}
      else if(ed){const n=await ask("تعديل الاسم",ed.dataset.ed);if(n&&n!==ed.dataset.ed)await call("adminDeptSave",{name:n,old:ed.dataset.ed,parent:ed.dataset.p})}
      else if(rm){
        if(!await confirmBox("حذف؟",`سيُحذف <b>${esc(rm.dataset.rm)}</b>${rm.dataset.p?"":" مع تخصصاته"}. الطلاب المسجلون فيه يحتفظون باسمه.`,"حذف",true))return mgr();
        await call("adminDeptDelete",{name:rm.dataset.rm,parent:rm.dataset.p});
      }
      toast("تم");
    }catch(err){toast(err.message,"bad")}
    await loadCat();load(true);mgr();
  };
}
toolbar();
})();
