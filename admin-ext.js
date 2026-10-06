// يحمّل وحدات الأقسام (admin-اسم_القسم.js) تلقائيًا ويخفي الأقسام التي لا تملك صلاحيتها
window.CESS_SEC=window.CESS_SEC||{};
let PERMS=null,ROLE=null;
const ready=call("me").then(m=>{PERMS=m.perms||[];ROLE=m.role}).catch(()=>{PERMS=[]});
const can=k=>!!PERMS&&PERMS.includes(k);
const _load=load;
load=async function(q){await ready;if(can("students"))return _load(q)};
async function mount(k){
  const el=$("#s-other"),o=SEC.find(x=>x[0]===k);
  el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
  if(!CESS_SEC[k])await new Promise(r=>{const s=document.createElement("script");s.src="admin-"+k+".js?v="+Date.now();s.onload=r;s.onerror=r;document.head.append(s)});
  if(SC!==k)return;
  if(CESS_SEC[k])CESS_SEC[k](el);
  else el.innerHTML=`<div class="list"><div class="ph"><b>${o[1]}</b>${o[2]}<br>هذا القسم قيد البناء ضمن خطة المشروع، وسيُضاف هنا.</div></div>`;
}
tabs=function(){
  if(PERMS===null){ready.then(tabs);return}
  const ok=SEC.filter(([k])=>k==="roles"?ROLE==="super":can(k));
  if(!ok.some(([k])=>k===SC))SC=ok.length?ok[0][0]:"students";
  $("#tabs").innerHTML=ok.map(([k,l])=>`<button class="tab ${SC===k?"on":""}" data-s="${k}">${l}</button>`).join("");
  $("#s-students").hidden=SC!=="students";$("#s-other").hidden=SC==="students";
  if(SC!=="students")mount(SC);
};
ready.then(()=>{if(!$("#app").hidden){tabs();if(can("students"))_load(true)}});
