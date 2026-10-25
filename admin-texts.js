(function(){
const ID=[["اسم الجمعية المختصر","CESS-UofT"],["اسم الجمعية الكامل","جمعية الهندسة المدنية"],["المجال أو التخصص","الهندسة المدنية"],["اسم الجامعة","الجامعة التكنولوجية"],["اسم الكلية","كلية الهندسة والعمارة"],["اسم الجمعية بالإنجليزية","Civil Engineering Student Society"],["المجال بالإنجليزية","Civil Engineering"]];
const PG=[["index.html","الصفحة الرئيسية"],["login.html","تسجيل الدخول"],["activate.html","تفعيل الحساب"],["forgot-password.html","استرداد الحساب"],["dashboard.html","لوحة العضو"],["profile.html","ملفي الشخصي"],["members.html","الأعضاء"],["resources.html","الموارد"],["activities.html","الأنشطة والإعلانات"],["vote.html","الانتخابات"],["page.html?p=vision","صفحة الرؤية"],["page.html?p=leaders","صفحة القيادات"],["page.html?p=offices","صفحة الأمانات"],["page.html?p=archive","صفحة الأرشيف"]];
SEC.splice(Math.max(0,SEC.findIndex(x=>x[0]==="site"))+1,0,["texts","هوية ونصوص الموقع","غيّر أي نص مكتوب في كل صفحات الموقع."]);
ready.then(()=>{if(can("site")&&!PERMS.includes("texts")){PERMS.push("texts");if(!$("#app").hidden)tabs()}});
const SUM='style="padding:16px;font-weight:700;cursor:pointer"';
const INP='style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);font:inherit"';
const SEL='style="flex:1;min-width:0;height:42px;padding:0 10px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);font:inherit"';
function grab(src){
  return new Promise(res=>{
    const f=document.createElement("iframe");f.style.cssText="position:fixed;left:-9999px;top:0;width:420px;height:900px;border:0";
    f.src=src+(src.includes("?")?"&":"?")+"notext=1";
    f.onload=()=>setTimeout(()=>{
      try{
        const d=f.contentDocument,out=new Set();
        const add=s=>{s=(s||"").replace(/\s+/g," ").trim();if(s.length>=2&&s.length<=200&&/\p{L}/u.test(s))out.add(s)};
        add(d.title);
        const w=d.createTreeWalker(d.body,4);let n;
        while((n=w.nextNode())){const p=n.parentNode;if(["SCRIPT","STYLE","TEXTAREA","NOSCRIPT"].includes(p.nodeName)||p.closest("[data-notext]"))continue;add(n.nodeValue)}
        d.querySelectorAll("[placeholder],[title],[aria-label]").forEach(e=>["placeholder","title","aria-label"].forEach(a=>add(e.getAttribute(a))));
        res([...out]);
      }catch(e){res([])}finally{f.remove()}
    },2800);
    document.body.append(f);
  });
}
CESS_SEC.texts=async function(el){
  el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
  const M=new Map();let dirty=false;
  try{const S=(await call("adminSiteGet")).settings;JSON.parse((S.txt_rules&&S.txt_rules.ar)||"[]").forEach(r=>{if(r&&r.f)M.set(r.f,r.t)})}
  catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
  const mark=()=>{dirty=true;const b=el.querySelector("#tsv");if(b)b.disabled=false};
  const set=(f,v)=>{v=v.trim();v&&v!==f?M.set(f,v):M.delete(f);mark()};
  function draw(){
    const rs=[...M];
    el.innerHTML=`<p class="sub">غيّر أي نص مكتوب في الموقع كله دون تعديل الكود. تُطبَّق التغييرات على كل الصفحات، وتظهر للزوار خلال دقيقتين.</p>
    <details class="list" open style="margin-bottom:10px"><summary ${SUM}>① الهوية: الأسماء الأساسية</summary><div style="padding:0 16px 16px"><p class="sub">اكتب الاسم الجديد مكان القديم ويُبدَّل في كل الصفحات. مثال: غيّر «الهندسة المدنية» إلى «الطب» فتصير «جمعية الطب» و«طلاب الطب». اترك الحقل فارغًا إن لم ترد التغيير.</p>${ID.map(([l,d],i)=>`<div class="fld"><label>${l} <span style="color:var(--t2);font-weight:400">— الحالي: ${esc(d)}</span></label><input ${INP} data-id="${i}" value="${esc(M.get(d)||"")}" placeholder="${esc(d)}"></div>`).join("")}</div></details>
    <details class="list" style="margin-bottom:10px"><summary ${SUM}>② تعديل نصوص صفحة بعينها</summary><div style="padding:0 16px 16px"><p class="sub">اختر صفحة لتظهر كل نصوصها، ثم اكتب البديل تحت أي نص. وما لا يظهر هنا (نوافذ تفتح بعد ضغط زر مثلًا) أضفه من «إضافة يدوية» في الجزء ③.</p><div class="row" style="margin:0 0 10px"><select id="tpg" ${SEL}>${PG.map(([u,n])=>`<option value="${u}">${n}</option>`).join("")}</select><button class="btn pri" id="tld" style="flex:0 0 auto">عرض النصوص</button></div><input id="tfq" ${INP} placeholder="ابحث في النصوص" hidden><div id="tpl" style="margin-top:10px"></div></div></details>
    <details class="list" style="margin-bottom:10px"><summary ${SUM}>③ كل التعديلات الحالية (${rs.length})</summary><div style="padding:0 16px 16px"><div>${rs.length?rs.map(([f,t])=>`<div class="rs" style="padding:10px 0"><div class="who"><b style="font-weight:600">${esc(f)}</b><span>⟵ ${esc(t)}</span></div><button class="btn sm dng" data-del="${esc(f)}">×</button></div>`).join(""):'<div class="empty">لا توجد تعديلات.</div>'}</div>
    <div class="fld" style="margin-top:12px"><label>إضافة يدوية (النص كما يظهر في الموقع بالضبط ← البديل)</label><input id="mf" ${INP} placeholder="النص الحالي" style="margin-bottom:6px;width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid var(--bd);background:var(--card);color:var(--t1);font:inherit"><input id="mt" ${INP} placeholder="النص الجديد"></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn" id="mad">إضافة</button><button class="btn" id="mcp">نسخ الكل</button><button class="btn" id="mim">لصق تعديلات</button><button class="btn dng" id="mcl">مسح الكل</button></div></div></details>
    <div style="position:sticky;bottom:12px;padding-top:6px"><button class="btn pri" id="tsv" style="width:100%" ${dirty?"":"disabled"}>حفظ كل التعديلات</button></div>`;
  }
  el.oninput=e=>{
    const t=e.target;
    if(t.dataset.id!==undefined)return set(ID[+t.dataset.id][1],t.value);
    if(t.dataset.t!==undefined)return set(t.dataset.t,t.value);
    if(t.id==="tfq"){const q=t.value.trim().toLowerCase();el.querySelectorAll("[data-row]").forEach(r=>{r.hidden=!!q&&!r.dataset.row.toLowerCase().includes(q)})}
  };
  el.onclick=async e=>{
    const g=s=>e.target.closest(s);let b;
    if(b=g("#tld"))return busy(b,async()=>{
      const box=el.querySelector("#tpl");box.innerHTML='<div class="sub">جارٍ قراءة الصفحة...</div>';
      const L=await grab(el.querySelector("#tpg").value);
      box.innerHTML=L.length?L.map(s=>`<div class="fld" data-row="${esc(s)}"><label style="font-weight:500;color:var(--t2);line-height:1.6">${esc(s)}</label><input ${INP} data-t="${esc(s)}" value="${esc(M.get(s)||"")}" placeholder="النص الجديد (فارغ = بدون تغيير)"></div>`).join(""):'<div class="sub">لم أجد نصوصًا في هذه الصفحة.</div>';
      el.querySelector("#tfq").hidden=!L.length;
    });
    if(b=g("[data-del]")){M.delete(b.dataset.del);mark();return draw()}
    if(g("#mad")){
      const f=el.querySelector("#mf").value.replace(/\s+/g," ").trim(),t=el.querySelector("#mt").value.trim();
      if(!f||!t)return toast("اكتب النص الحالي والجديد.","bad");
      if(f===t)return;M.set(f,t);mark();return draw();
    }
    if(g("#mcp")){await copy(JSON.stringify([...M].map(([f,t])=>({f,t}))));return toast("نُسخت التعديلات")}
    if(g("#mim")){
      modal('<h3>لصق تعديلات</h3><p class="sub">الصق ما نسخته من موقع آخر (نص JSON).</p><div class="fld"><textarea id="tim" rows="6" dir="ltr"></textarea></div><div class="row"><button class="btn pri" id="tiy">استيراد</button><button class="btn" id="tin">إلغاء</button></div>');
      $("#tin").onclick=()=>dlg.close();
      $("#tiy").onclick=()=>{
        try{const a=JSON.parse($("#tim").value);if(!Array.isArray(a))throw 0;let n=0;
          a.forEach(r=>{if(r&&r.f&&typeof r.t==="string"&&r.f!==r.t){M.set(String(r.f).slice(0,300),String(r.t).slice(0,600));n++}});
          dlg.close();mark();draw();toast("استُورد "+n+" تعديلًا");
        }catch(x){toast("النص غير صالح.","bad")}
      };
      return;
    }
    if(g("#mcl")){
      if(!await confirmBox("مسح كل التعديلات؟","سيعود الموقع بنصوصه الأصلية بعد الحفظ.","مسح",true))return;
      M.clear();mark();return draw();
    }
    if(b=g("#tsv"))return busy(b,async()=>{
      await call("adminTxtSave",{rules:[...M].map(([f,t])=>({f,t}))});
      dirty=false;try{localStorage.removeItem("cess-site-t")}catch(x){}
      toast("تم الحفظ — تظهر التعديلات في الموقع خلال دقيقتين");
    });
  };
  draw();
};
})();
