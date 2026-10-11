CESS_SEC.vote=function(el){
  if(!document.getElementById("vt-css"))document.head.insertAdjacentHTML("beforeend",'<style id="vt-css">.pb input{height:40px;padding:0 10px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);font:inherit;min-width:0}.rb{height:10px;border-radius:99px;background:var(--bd);overflow:hidden;margin:4px 0 10px}.rb i{display:block;height:100%;background:var(--ac)}</style>');
  const SN={draft:["مسودة","gray"],open:["مفتوح","ok"],closed:["مغلق","info"]};
  let R=[];
  const loc=v=>{if(!v)return"";const d=new Date(v);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
  const iso=v=>v?new Date(v).toISOString():null;
  const row=e=>{const[t,c]=SN[e.status];return `<div class="rs"><div class="av">🗳️</div><div class="who"><b>${esc(e.title)}</b><span>${e.voters} صوّتوا${e.batches.length?" · دفعات: "+esc(e.batches.join("، ")):""}</span></div><span class="badge ${c}">${t}</span><div class="acts"><button class="btn sm" data-o="${esc(e.id)}">إدارة</button></div></div>`};
  async function refresh(){
    el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
    try{R=(await call("adminElList")).items}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
    el.innerHTML=`<p class="sub">تصويت سري: لا يعرف أي مشرف اختيار أي عضو، ولا تظهر النتائج إلا بعد الإغلاق.</p><div class="bar"><button class="btn pri" id="na">+ انتخاب جديد</button></div><div class="list">${R.length?R.map(row).join(""):'<div class="empty">لا توجد انتخابات بعد.</div>'}</div>`;
  }
  el.onclick=e=>{if(e.target.closest("#na"))return open(null);const o=e.target.closest("[data-o]");if(o)open(o.dataset.o)};
  const cand=(c={})=>`<div class="cr" style="display:flex;gap:6px;margin-bottom:6px"><input class="ci" dir="ltr" inputmode="numeric" placeholder="الرقم الجامعي" value="${esc(c.student_id||"")}" style="flex:0 0 125px"><input class="cp" placeholder="برنامج/نبذة (اختياري)" value="${esc(c.platform||"")}" style="flex:1"><button type="button" class="btn sm dng" data-rc>×</button></div>`;
  const blk=(p={})=>`<div class="pb" style="border:1px solid var(--bd);border-radius:14px;padding:12px;margin-bottom:10px"><div style="display:flex;gap:6px;margin-bottom:8px"><input class="pt" placeholder="عنوان المنصب (مثال: رئيس الجمعية)" value="${esc(p.title||"")}" style="flex:1"><button type="button" class="btn sm dng" data-rp>حذف</button></div><div class="cl">${(p.candidates&&p.candidates.length?p.candidates:[{}]).map(cand).join("")}</div><button type="button" class="btn sm" data-ac>+ مرشح</button><span class="sub" style="margin:0 8px">${(p.candidates||[]).filter(c=>c.name).map(c=>esc(c.name)).join("، ")}</span></div>`;
  const resH=d=>{const r=d.results;return `<p class="sub">المشاركة: ${r.voters} من ${d.eligible} (${d.eligible?Math.round(r.voters/d.eligible*100):0}%)</p>`+r.positions.map(p=>`<div style="margin-bottom:14px"><b>${esc(p.title)}</b><span class="sub" style="margin:0 8px">${p.total} ورقة · امتناع ${p.abstain}</span>${p.candidates.map((c,i)=>{const pc=p.total?Math.round(c.votes/p.total*100):0;return `<div style="margin-top:8px;display:flex;justify-content:space-between;font-size:13.5px"><span>${i===0&&c.votes>0?"🏆 ":""}${esc(c.name||c.student_id)}</span><span>${c.votes} · ${pc}%</span></div><div class="rb"><i style="width:${pc}%"></i></div>`}).join("")}</div>`).join("")};
  async function open(id){
    let d=null;
    if(id){try{d=await call("adminElGet",{id})}catch(e){return toast(e.message,"bad")}}
    const draft=!d||d.status==="draft",P=d&&d.positions.length?d.positions:[{candidates:[{}]}];
    modal(`<h3>${d?esc(d.title):"انتخاب جديد"}</h3>
    ${d?`<p class="sub">${SN[d.status][0]} · صوّت ${d.voters} من ${d.eligible} مؤهل</p><div class="rb"><i style="width:${d.eligible?Math.round(d.voters/d.eligible*100):0}%"></i></div>`:""}
    ${draft?`<div class="fld"><label>العنوان *</label><input id="v1" maxlength="120" value="${esc(d?d.title:"")}"></div>
    <div class="fld"><label>الوصف</label><textarea id="v2" rows="2" maxlength="2000">${esc((d&&d.description)||"")}</textarea></div>
    <div class="fld"><label>يفتح (اختياري)</label><input id="v3" type="datetime-local" value="${loc(d&&d.opens_at)}"></div>
    <div class="fld"><label>يُغلق (اختياري)</label><input id="v4" type="datetime-local" value="${loc(d&&d.closes_at)}"></div>
    <div class="fld"><label>الدفعات المسموح لها (افصل بفاصلة، فارغ = الجميع)</label><input id="v5" value="${esc(d?d.batches.join("، "):"")}"></div>
    <h3 style="font-size:15px;margin:14px 0 8px">المناصب والمرشحون</h3><div id="pl">${P.map(blk).join("")}</div><button type="button" class="btn sm" id="ap">+ منصب</button>`
    :d.results?`<h3 style="font-size:15px;margin:10px 0">النتائج</h3>${resH(d)}`
    :d.positions.map(p=>`<div style="margin-bottom:8px"><b>${esc(p.title)}</b><div class="sub" style="margin:2px 0">${p.candidates.map(c=>esc(c.name||c.student_id)).join("، ")}</div></div>`).join("")}
    <div class="row" style="flex-wrap:wrap">${draft?'<button class="btn pri" id="sv">حفظ المسودة</button>':""}${d&&d.status==="draft"?'<button class="btn" id="op">فتح التصويت</button>':""}${d&&d.status==="open"?'<button class="btn danger" id="cl">إغلاق التصويت وإعلان النتائج</button>':""}${d&&d.status==="closed"?`<button class="btn" id="sh">${d.show_results?"إخفاء النتائج عن الأعضاء":"إظهار النتائج للأعضاء"}</button><button class="btn" id="cp">نسخ النتائج</button>`:""}${d?'<button class="btn dng" id="dl">حذف</button>':""}<button class="btn" id="x">إغلاق</button></div>`);
    const $$=s=>dlg.querySelector(s);
    $$("#x").onclick=()=>{dlg.onclick=null;dlg.close()};
    dlg.onclick=e=>{
      if(e.target.closest("#ap")){$$("#pl").insertAdjacentHTML("beforeend",blk());return}
      const ac=e.target.closest("[data-ac]");if(ac){ac.parentNode.querySelector(".cl").insertAdjacentHTML("beforeend",cand());return}
      const rc=e.target.closest("[data-rc]");if(rc){rc.parentNode.remove();return}
      const rp=e.target.closest("[data-rp]");if(rp)rp.closest(".pb").remove();
    };
    const read=()=>draft?{meta:{id:d?d.id:null,title:$$("#v1").value.trim(),description:$$("#v2").value,opens_at:iso($$("#v3").value),closes_at:iso($$("#v4").value),batches:$$("#v5").value.split(/[,،]/).map(s=>s.trim()).filter(Boolean)},positions:[...dlg.querySelectorAll(".pb")].map(b=>({title:b.querySelector(".pt").value,candidates:[...b.querySelectorAll(".cr")].map(r=>({student_id:nz(r.querySelector(".ci").value),platform:r.querySelector(".cp").value})).filter(c=>c.student_id)}))}:null;
    const commit=async x=>{if(!x.meta.title)throw new Error("اكتب عنوان الانتخاب.");const r=await call("adminElSave",x.meta);await call("adminElTree",{id:r.id,positions:x.positions});return r.id};
    if($$("#sv"))$$("#sv").onclick=e=>busy(e.currentTarget,async()=>{await commit(read());dlg.onclick=null;dlg.close();toast("تم الحفظ");await refresh()});
    if($$("#op"))$$("#op").onclick=async()=>{
      const x=read();
      if(!await confirmBox("فتح التصويت؟","بعد الفتح لا يمكن تعديل المناصب أو المرشحين، وسيتمكن الأعضاء المؤهلون من التصويت فورًا.","فتح التصويت"))return;
      try{const id=await commit(x);await call("adminElStatus",{id,status:"open"});toast("فُتح التصويت");await refresh()}catch(e){toast(e.message,"bad")}
    };
    if($$("#cl"))$$("#cl").onclick=async()=>{
      if(!await confirmBox("إغلاق التصويت؟","بعد الإغلاق لا يُقبل أي صوت، وتظهر النتائج للأعضاء. لا يمكن إعادة الفتح.","إغلاق وإعلان النتائج",true))return;
      try{await call("adminElStatus",{id:d.id,status:"closed",show_results:true});toast("أُغلق التصويت");await refresh()}catch(e){toast(e.message,"bad")}
    };
    if($$("#sh"))$$("#sh").onclick=e=>busy(e.currentTarget,async()=>{await call("adminElSave",{id:d.id,title:d.title,show_results:!d.show_results});dlg.close();toast("تم");await refresh()});
    if($$("#cp"))$$("#cp").onclick=async()=>{await copy(d.results.positions.map(p=>p.title+"\n"+p.candidates.map(c=>`  ${c.name||c.student_id}: ${c.votes}`).join("\n")+`\n  امتناع: ${p.abstain}`).join("\n\n"));toast("تم النسخ")};
    if($$("#dl"))$$("#dl").onclick=async()=>{
      if(!await confirmBox("حذف الانتخاب؟","سيُحذف الانتخاب بمرشحيه وأصواته ونتائجه نهائيًا.","حذف",true))return;
      try{await call("adminElDelete",{id:d.id});toast("تم الحذف");await refresh()}catch(e){toast(e.message,"bad")}
    };
  }
  refresh();
};
