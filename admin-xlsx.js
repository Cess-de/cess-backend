(function(){
const SJ="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
let ld=null;
const lib=()=>window.XLSX?Promise.resolve():(ld=ld||new Promise((ok,no)=>{const s=document.createElement("script");s.src=SJ;s.onload=ok;s.onerror=()=>{ld=null;no(new Error("تعذّر تحميل قارئ Excel، تحقق من الإنترنت."))};document.head.append(s)}));
const N=s=>String(s??"").replace(/[\u200e\u200f\ufeff]/g,"").replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/[۰-۹]/g,d=>d.charCodeAt(0)-1776).trim();
const H=s=>N(s).toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const SYN={
  id:["الرقم الجامعي","رقم جامعي","الرقم الأكاديمي","رقم أكاديمي","رقم الطالب","رقم القيد","رقم التسجيل","رقم الجلوس","الرقم","student id","student number","student no","studentid","id","reg no","registration number","matric","index number","no"],
  name:["الاسم","اسم الطالب","الاسم الكامل","الاسم الرباعي","اسم","name","full name","student name","fullname"],
  batch:["الدفعة","دفعة","batch","cohort","year","intake","السنة الدراسية","سنة القبول","المستوى","level"],
  email:["البريد","البريد الجامعي","البريد الإلكتروني","الايميل","ايميل","email","e mail","mail","university email"]};
SYN.dept=["القسم","قسم","الكلية","كلية","department","dept","faculty","major"];
SYN.spec=["التخصص","تخصص","المسار","الشعبة","specialization","specialisation","track","stream","branch","program"];
Object.keys(SYN).forEach(k=>SYN[k]=SYN[k].map(H));
const FK=["id","name","batch","email","dept","spec"],FL={id:"الرقم الجامعي",name:"الاسم",batch:"الدفعة",email:"البريد",dept:"القسم",spec:"التخصص"};
const cv=v=>typeof v==="number"?String(v):N(v);
const idv=v=>cv(v).replace(/\.0+$/,"").replace(/[\s,.\-_]/g,"");
const IDOK=v=>/^\d{4,20}$/.test(v);
function hit(cell,k){const c=H(cell);if(!c)return 0;let b=0;for(const s of SYN[k]){if(c===s)return 3;if(s.length>=4&&(" "+c+" ").includes(" "+s+" "))b=2}return b}
function analyze(rows,forced){
  let best=-1,bs=0;
  if(forced!==undefined)best=forced;
  else for(let r=0;r<Math.min(rows.length,30);r++){
    const used=new Set();let sc=0,key=false;
    rows[r].forEach(c=>{for(const k of FK){if(!used.has(k)&&hit(c,k)){used.add(k);sc+=hit(c,k);if(k==="id"||k==="name")key=true;break}}});
    if(key&&sc>bs){bs=sc;best=r}
  }
  const map={id:-1,name:-1,batch:-1,email:-1,dept:-1,spec:-1},w=
  if(best>=0)rows[best].forEach((c,i)=>{for(const k of FK){if(map[k]<0&&hit(c,k)&&!Object.values(map).includes(i)){map[k]=i;break}}});
  const data=rows.slice(best+1,best+201);
  const st=i=>{const v=data.map(r=>cv(r[i])).filter(Boolean);if(!v.length)return{};const f=p=>v.filter(p).length/v.length;
    return{id:f(x=>IDOK(idv(x))&&x.length>=5),email:f(x=>x.includes("@")),name:f(x=>/\p{L}/u.test(x)&&x.length>=6&&/\s/.test(x)),batch:f(x=>/^(19|20)\d{2}$/.test(x)||/^\d{1,2}$/.test(x))}};
  const S=Array.from({length:w},(_,i)=>st(i));
  for(const [k,t] of [["id",.6],["email",.3],["name",.6],["batch",.6]]){
    if(map[k]>=0)continue;let bi=-1,bv=t;
    S.forEach((s,i)=>{if((s[k]||0)>=bv&&!Object.values(map).includes(i)){bv=s[k];bi=i}});
    if(bi>=0)map[k]=bi;
  }
  return{hdr:best,map,w};
}
function extract(sh,map,hdr,fb,sbatch){
  const ok=[],bad=[],seen=new Set();let dup=0;
  sh.rows.slice(hdr+1).forEach(r=>{
    if(!r.some(c=>cv(c)))return;
    const id=map.id>=0?idv(r[map.id]):"";
    if(!IDOK(id)){bad.push(cv(map.id>=0?r[map.id]:r.find(c=>cv(c))));return}
    if(seen.has(id)){dup++;return}seen.add(id);
    const g=k=>map[k]>=0?cv(r[map[k]]):"";
    ok.push({student_id:id,full_name:g("name"),batch:g("batch")||fb||(sbatch?sh.name:""),email:g("email"),dept:g("dept"),spec:g("spec")});
  });
  return{ok,bad,dup};
}
const col=i=>{let s="",n=i+1;while(n>0){s=String.fromCharCode(65+(n-1)%26)+s;n=Math.floor((n-1)/26)}return s};
const SEL='style="width:100%;height:40px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);padding:0 8px"';

function wire(p){
  const q=s=>p.querySelector(s);let S=null,cur=0;
  q("#xf").onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>8e6){q("#xs").textContent="الملف كبير جدًا (الحد 8 ميجابايت).";return}
    q("#xs").textContent="جارٍ قراءة الملف...";q("#xm").hidden=true;
    try{
      await lib();
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});
      S=wb.SheetNames.map(n=>{
        const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:"",blankrows:false}),a=analyze(rows);
        return{name:n,rows,hdr:a.hdr,map:a.map,w:a.w,n:extract({rows},a.map,a.hdr).ok.length};
      }).filter(s=>s.rows.length);
      if(!S.length)throw new Error("الملف فارغ.");
      cur=S.reduce((b,s,i)=>s.n>S[b].n?i:b,0);
      q("#xs").textContent="📄 "+f.name;draw();
    }catch(err){q("#xs").textContent="";toast(err.message||"تعذّرت قراءة الملف.","bad")}
  };
  function collect(){
    const fb=q("#xdb").value.trim(),sb=q("#xsb")&&q("#xsb").checked,all=q("#xall")&&q("#xall").checked;
    const L=all?S.filter(s=>s.n>0):[S[cur]],ok=[],bad=[],seen=new Set();let dup=0;
    L.forEach(s=>{const r=extract(s,s.map,s.hdr,fb,sb);r.ok.forEach(x=>{if(seen.has(x.student_id))dup++;else{seen.add(x.student_id);ok.push(x)}});bad.push(...r.bad);dup+=r.dup});
    return{ok,bad,dup};
  }
  function sum(){
    const r=collect();
    q("#xsum").innerHTML=`<span class="ok">✓ ${r.ok.length} طالب صالح</span>${r.bad.length?` · <span class="bad">✗ ${r.bad.length} صف مرفوض</span>`:""}${r.dup?` · مكرر ${r.dup}`:""}`
      +(r.ok.length?`<table class="pvt"><tr><th>الرقم</th><th>الاسم</th><th>الدفعة</th><th>البريد</th></tr>${r.ok.slice(0,5).map(x=>`<tr><td dir="ltr">${esc(x.student_id)}</td><td>${esc(x.full_name)}</td><td>${esc(x.batch)}</td><td dir="ltr">${esc(x.email)}</td></tr>`).join("")}</table>`
        :`<div class="bad" style="margin-top:6px">لم نجد أرقامًا جامعية صالحة. اختر عمود «الرقم الجامعي» وصف العناوين الصحيح.</div>`)
      +(r.bad.length?`<div class="sub" style="margin-top:6px">أمثلة المرفوض: ${r.bad.slice(0,3).map(x=>esc(String(x).slice(0,24))).join(" | ")}</div>`:"");
    const b=q("#xgo");b.disabled=!r.ok.length;b.textContent=r.ok.length?`إضافة ${r.ok.length} طالب`:"إضافة";b._rows=r.ok;
  }
  function draw(){
    const sh=S[cur],hd=sh.hdr>=0?sh.rows[sh.hdr]:[];
    const opt=k=>`<select data-k="${k}" ${SEL}><option value="-1">— بدون —</option>${Array.from({length:sh.w},(_,i)=>`<option value="${i}" ${sh.map[k]===i?"selected":""}>${col(i)}${cv(hd[i])?": "+esc(cv(hd[i]).slice(0,22)):""}</option>`).join("")}</select>`;
    q("#xm").hidden=false;
    q("#xm").innerHTML=`${S.length>1?`<div class="fld"><label>الورقة</label><select id="xsh" ${SEL}>${S.map((s,i)=>`<option value="${i}" ${i===cur?"selected":""}>${esc(s.name)} (${s.n} طالب)</option>`).join("")}</select></div>
      <label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" id="xall" style="width:18px;height:18px"> استيراد كل الأوراق التي فيها طلاب (تعرّف تلقائي لكل ورقة)</label>
      <label style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input type="checkbox" id="xsb" style="width:18px;height:18px"> إن لم يوجد عمود دفعة فاستخدم اسم الورقة كدفعة</label>`:""}
      <div class="fld"><label>صف العناوين</label><select id="xhd" ${SEL}><option value="-1" ${sh.hdr<0?"selected":""}>بدون عناوين</option>${Array.from({length:Math.min(sh.rows.length,30)},(_,i)=>`<option value="${i}" ${sh.hdr===i?"selected":""}>الصف ${i+1}: ${esc(sh.rows[i].filter(c=>cv(c)).slice(0,3).map(c=>cv(c).slice(0,14)).join(" | "))}</option>`).join("")}</select></div>
      ${FK.map(k=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="width:96px;font-size:12.5px;font-weight:600">${FL[k]}${k==="id"?" *":""}</span>${opt(k)}</div>`).join("")}
      <div class="fld"><label>دفعة لكل الطلاب (اختياري، تُستعمل إن كانت خانة الدفعة فارغة)</label><input id="xdb" placeholder="مثال: 2022"></div>
      <div id="xsum" class="sub"></div><div class="row"><button class="btn pri" id="xgo" disabled>إضافة</button></div>`;
    q("#xgo").onclick=e=>busy(e.currentTarget,async()=>{
      const rows=e.currentTarget._rows||[];let a=0,u=0,s=0;
      for(let i=0;i<rows.length;i+=150){
        q("#xs").textContent=`جارٍ الإضافة... ${Math.min(i+150,rows.length)} / ${rows.length}`;
        const d=await call("adminAddStudents",{rows:rows.slice(i,i+150)});a+=d.added;u+=d.updated;s+=d.skipped;
      }
      dlg.close();toast(`أُضيف ${a} · حُدّث ${u}${s?` · موجود مسبقًا ${s}`:""}`);await load(true);
    });
    sum();
  }
  q("#xm").onchange=e=>{
    const t=e.target,sh=S&&S[cur];
    if(t.id==="xsh"){cur=+t.value;draw();return}
    if(t.id==="xhd"){const a=analyze(sh.rows,+t.value);sh.hdr=a.hdr;sh.map=a.map;sh.w=a.w;draw();return}
    if(t.dataset.k){sh.map[t.dataset.k]=+t.value;sum();return}
    sum();
  };
  q("#xm").oninput=e=>{if(e.target.id==="xdb")sum()};
}
function inject(){
  const seg=dlg.querySelector(".seg"),p2=dlg.querySelector("#p2");if(!seg||!p2||dlg.querySelector("#p3"))return;
  const b=document.createElement("button");b.dataset.t="xf";b.textContent="ملف Excel";seg.append(b);
  const p3=document.createElement("div");p3.id="p3";p3.hidden=true;p2.insertAdjacentElement("afterend",p3);
  p3.innerHTML=`<p class="sub">ارفع ملف Excel (xlsx أو xls أو csv) بأي تنسيق. نكتشف الأعمدة تلقائيًا وتراجعها قبل الإضافة. يُقرأ الملف في جهازك فقط.</p>
    <label class="btn pri" style="width:100%;height:46px;cursor:pointer">اختيار ملف Excel<input type="file" id="xf" accept=".xlsx,.xls,.csv" hidden></label>
    <div id="xs" class="sub" style="margin-top:10px"></div><div id="xm" hidden></div>`;
    b.addEventListener("click",()=>{seg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));dlg.querySelector("#p1").hidden=true;p2.hidden=true;p3.hidden=false});
  seg.querySelectorAll("button:not([data-t=xf])").forEach(x=>x.addEventListener("click",()=>{p3.hidden=true}));
  wire(p3);
}
const _modal=modal;
modal=function(h){_modal(h);if(dlg.querySelector("#ta"))inject()};
})();
