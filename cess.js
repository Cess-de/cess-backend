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
  const KEY="cess-site",TTL=120000;
  const noText=/admin\.html$/.test(location.pathname)||/[?&]notext=1/.test(location.search);
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const SK=new Set(["SCRIPT","STYLE","TEXTAREA","NOSCRIPT"]);
  let MAP=null,RT=null,RG=null,obs=null;
  function build(S){
    let r=[];try{r=JSON.parse((S.txt_rules||{}).ar||"[]")}catch(e){}
    r=r.filter(x=>x&&x.f&&typeof x.t==="string"&&x.f!==x.t).sort((a,b)=>b.f.length-a.f.length);
    MAP=new Map(r.map(x=>[x.f,x.t]));
    const p=r.map(x=>esc(x.f)).join("|");RT=r.length?new RegExp(p):null;RG=r.length?new RegExp(p,"g"):null;
  }
  function fix(s){
    const n=s.replace(/\s+/g," ");if(!RT||!RT.test(n))return null;
    return s.match(/^\s*/)[0]+n.trim().replace(RG,m=>MAP.get(m))+s.match(/\s*$/)[0];
  }
  const skip=p=>!p||SK.has(p.nodeName)||(p.closest&&p.closest("[data-notext]"));
  function tn(n){if(skip(n.parentNode))return;const v=fix(n.nodeValue);if(v!==null)n.nodeValue=v}
  function walk(root){
    if(!RT||!root)return;
    if(root.nodeType===3)return tn(root);
    if(root.nodeType!==1)return;
    const w=document.createTreeWalker(root,4);let n;while((n=w.nextNode()))tn(n);
    [root,...root.querySelectorAll("[placeholder],[title],[alt],[aria-label]")].forEach(e=>{
      if(e.closest("[data-notext]"))return;
      ["placeholder","title","alt","aria-label"].forEach(a=>{const v=e.getAttribute(a);if(v){const x=fix(v);if(x!==null)e.setAttribute(a,x)}});
    });
  }
  const OPT={childList:true,subtree:true,characterData:true};
  function watch(){
    if(obs||!RT)return;
    obs=new MutationObserver(ms=>{
      obs.disconnect();
      const s=new Set();ms.forEach(m=>{if(m.type==="characterData")s.add(m.target);else m.addedNodes.forEach(x=>s.add(x))});
      s.forEach(walk);obs.observe(document.documentElement,OPT);
    });
    obs.observe(document.documentElement,OPT);
  }
  function logo(S){
    const u=((S.img_logo||{}).ar||"").replace(/["'<>\s]/g,"");if(!u)return;
    document.querySelectorAll(".logo-icon,.logo i").forEach(e=>{
      if(e.dataset.lg2===u)return;e.dataset.lg2=u;
      e.style.cssText+=";background:transparent;width:auto;height:42px;min-width:42px;border-radius:0;overflow:visible;padding:0";
      e.innerHTML='<img src="'+u+'" alt="" style="height:100%;width:auto;max-width:170px;object-fit:contain;display:block">';
    });
    document.querySelectorAll("[data-brand]").forEach(e=>{
      if(e.dataset.lg2===u)return;e.dataset.lg2=u;
      e.innerHTML='<img src="'+u+'" alt="شعار الجمعية" style="max-height:'+(+e.dataset.brand||120)+'px;max-width:72%;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto">';
    });
  }
  function apply(S){
    logo(S);
    if(noText)return;
    build(S);
    if(RT){const t=fix(document.title);if(t!==null)document.title=t;walk(document.body);watch()}
  }
  function run(){
    let c=null,t=0;try{c=JSON.parse(localStorage.getItem(KEY)||"null");t=+localStorage.getItem(KEY+"-t")||0}catch(e){}
    if(c)apply(c);
    if(Date.now()-t<TTL)return;
    fetch("https://bibhljpmmmcxcxhpbuqf.supabase.co/functions/v1/"+CESS_FN,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+CESS_ANON},body:JSON.stringify({action:"siteSettings",input:{}})})
      .then(r=>r.json()).then(j=>{
        if(!j.ok)return;const S=j.data.settings;
        try{localStorage.setItem(KEY,JSON.stringify(S));localStorage.setItem(KEY+"-t",Date.now())}catch(e){}
        apply(S);
      }).catch(()=>{});
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",run):run();
})();
