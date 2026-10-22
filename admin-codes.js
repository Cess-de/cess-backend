(function(){
const b=document.getElementById("all");if(!b)return;
const SE='style="width:100%;height:42px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);padding:0 10px"';
const uniq=a=>[...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),"ar"));
const op=(a,ph)=>`<option value="">${ph}</option>`+a.map(x=>`<option>${esc(x)}</option>`).join("");
b.onclick=()=>{
  modal(`<h3>إصدار رموز التفعيل</h3><p class="sub">تُصدَر الرموز للفئة المختارة ويُنزَّل ملف CSV تلقائيًا. الرموز تظهر مرة واحدة فقط.</p>
  <div class="fld"><label>القسم</label><select id="c1" ${SE}></select></div>
  <div class="fld"><label>التخصص</label><select id="c2" ${SE}></select></div>
  <div class="fld"><label>الدفعة</label><select id="c3" ${SE}></select></div>
  <div class="fld"><label>الفئة</label><select id="c4" ${SE}><option value="none">من لا رمز له فقط</option><option value="code">من لديه رمز لم يُفعَّل (يُبطل رمزه القديم)</option><option value="both">الاثنان</option></select></div>
  <div class="sub" id="cn"></div><div class="row"><button class="btn pri" id="cg" disabled>إصدار وتنزيل CSV</button><button class="btn" id="cx">إلغاء</button></div>`);
  const q=s=>dlg.querySelector(s);
  const pick=()=>{const d=q("#c1").value,s=q("#c2").value,t=q("#c3").value,k=q("#c4").value;return S.filter(x=>(!d||x.dept===d)&&(!s||x.spec===s)&&(!t||x.batch===t)&&(k==="both"?(x.state==="none"||x.state==="code"):x.state===k))};
  const f2=()=>{const d=q("#c1").value;q("#c2").innerHTML=op(uniq(S.filter(x=>!d||x.dept===d).map(x=>x.spec)),"كل التخصصات")};
  const cnt=()=>{const n=pick().length,g=q("#cg");q("#cn").textContent=n?`سيُصدَر رمز لـ ${n} طالب.`:"لا يوجد طلاب في هذه الفئة.";g.disabled=!n;g.textContent=n?`إصدار ${n} رمز وتنزيل CSV`:"إصدار وتنزيل CSV"};
  q("#c1").innerHTML=op(uniq(S.map(x=>x.dept)),"كل الأقسام");f2();
  q("#c3").innerHTML=op(uniq(S.map(x=>x.batch)),"كل الدفعات");cnt();
  q("#c1").onchange=()=>{f2();cnt()};q("#c2").onchange=q("#c3").onchange=q("#c4").onchange=cnt;
  q("#cx").onclick=()=>dlg.close();
  q("#cg").onclick=e=>busy(e.currentTarget,async()=>{
    const ids=pick().map(x=>x.student_id),out=[];let days=30,err=null;
    try{
      for(let i=0;i<ids.length;i+=400){
        q("#cn").textContent=`جارٍ الإصدار... ${Math.min(i+400,ids.length)} / ${ids.length}`;
        const d=await call("adminIssueCodes",{ids:ids.slice(i,i+400)});out.push(...d.codes);days=d.days;
      }
    }catch(e2){err=e2}
    if(!out.length)throw err||new Error("لم يُصدَر أي رمز.");
    const by=new Map(S.map(x=>[x.student_id,x])),exp=new Date(Date.now()+days*864e5).toLocaleDateString("ar");
    const rows=out.map(c=>{const s=by.get(c.student_id)||{};return[c.full_name||s.full_name||"",c.student_id,s.batch||"",s.dept||"",s.spec||"",c.code,exp]});
    const dl=()=>csv("activation-codes-"+new Date().toISOString().slice(0,10)+".csv",["الاسم","الرقم الجامعي","الدفعة","القسم","التخصص","رمز التفعيل","صالح حتى"],rows);
    dl();load(true);
    modal(`<h3>${err?"أُصدر "+out.length+" رمزًا فقط ⚠️":"تم إصدار "+out.length+" رمز ✅"}</h3><p class="sub">${err?"توقفت العملية بسبب: "+esc(err.message)+". الرموز التي صدرت محفوظة في الملف، أعد الإصدار لبقية الطلاب.":"نُزِّل الملف تلقائيًا."} إن لم يبدأ التنزيل (يحدث أحيانًا على الآيفون) فاضغط «تنزيل الملف». لن تظهر هذه الرموز مرة أخرى.</p><div class="row"><button class="btn pri" id="rd">تنزيل الملف</button><button class="btn" id="rc">نسخ الكل</button></div><div class="row"><button class="btn" id="rx">إغلاق</button></div>`);
    $("#rd").onclick=dl;
    $("#rc").onclick=async()=>{await copy(rows.map(r=>r.join("\t")).join("\n"));toast("تم النسخ")};
    $("#rx").onclick=()=>dlg.close();
  });
};
})();
