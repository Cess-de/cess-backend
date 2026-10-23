const CESS_FN="smooth-handler";
const PW_RULES=[
 ["8 أحرف على الأقل",p=>p.length>=8],
 ["يبدأ بحرف إنجليزي كبير (A-Z)",p=>/^[A-Z]/.test(p)],
 ["يحتوي على رقم واحد على الأقل (0-9)",p=>/\d/.test(p)],
 ["يحتوي على رمز واحد على الأقل مثل ! @ # $ %",p=>/[^\p{L}\p{N}\s]/u.test(p)]
];
function pwErr(p){const r=PW_RULES.find(x=>!x[1](p));return r?"كلمة المرور لا تحقق الشرط: "+r[0]:null}
function pwMeter(input,box){
  const draw=()=>{const p=input.value;box.innerHTML=PW_RULES.map(([t,f])=>{const ok=p&&f(p);return `<div style="font-size:12.5px;margin:3px 0;color:${ok?"#22C55E":p?"#EF4444":"var(--t2)"}">${ok?"✓":"•"} ${t}</div>`}).join("")};
  input.addEventListener("input",draw);draw();
}
const CESS_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpYmhsanBtbW1jeGN4aHBidXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTQwMzIsImV4cCI6MjEwNTM3MDAzMn0.4z9qDoZ71ftWDVj8MoarqMzTTwai15I2myBs1gxI0l0";
(function(){
  const ap=u=>document.querySelectorAll(".logo-icon,.logo i").forEach(e=>{if(e.dataset.lg===u)return;e.dataset.lg=u;e.style.background="transparent";e.style.overflow="hidden";e.innerHTML='<img src="'+u.replace(/"/g,"")+'" alt="" style="width:100%;height:100%;object-fit:contain">'});
  const run=()=>{
    let c="",t=0;try{c=localStorage.getItem("cess-logo")||"";t=+localStorage.getItem("cess-logo-t")||0}catch(e){}
    if(c)ap(c);
    if(Date.now()-t<600000)return;
    fetch("https://bibhljpmmmcxcxhpbuqf.supabase.co/functions/v1/"+CESS_FN,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+CESS_ANON},body:JSON.stringify({action:"siteSettings",input:{}})})
      .then(r=>r.json()).then(j=>{
        if(!j.ok)return;const u=((j.data.settings.img_logo||{}).ar||"");
        try{localStorage.setItem("cess-logo-t",Date.now());u?localStorage.setItem("cess-logo",u):localStorage.removeItem("cess-logo")}catch(e){}
        if(u)ap(u);
      }).catch(()=>{});
  };
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",run):run();
})();
