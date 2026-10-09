(function(){
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const css=`.nf{position:fixed;top:calc(14px + env(safe-area-inset-top));left:50%;transform:translate(-50%,-150%);width:min(94vw,440px);z-index:9999;padding:16px 16px 14px;border-radius:24px;color:#fff;direction:rtl;font-family:Inter,sans-serif;background:rgba(20,29,56,.58);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,.26);box-shadow:0 18px 50px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .6s cubic-bezier(.34,1.4,.5,1)}
.nf.on{transform:translate(-50%,0)}.nf.u{border-color:rgba(239,68,68,.75)}
.nf-h{display:flex;gap:10px;align-items:flex-start}.nf-i{font-size:24px;line-height:1}.nf-t{flex:1;min-width:0}
.nf-t b{display:block;font-size:15px;line-height:1.5}
.nf-t p{margin-top:4px;font-size:13px;line-height:1.7;opacity:.85;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.nf-t p.x{display:block;-webkit-line-clamp:unset}
.nf-x{border:0;background:rgba(255,255,255,.14);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px}
.nf-a{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.nf-a button,.nf-a a{flex:1;min-width:90px;height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.14);color:#fff;font:700 13px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.nf-a .p{background:#FFC72C;color:#0B132B;border-color:transparent}`;
const IC={info:"📢",event:"📅",urgent:"⚠️"};
window.CessNotify={async init(o){
  let items=[];
  try{
    const r=await fetch(o.url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+o.anon},body:JSON.stringify({action:"annPublic",input:{token:o.token||null}})});
    const j=await r.json();if(j.ok)items=j.data.items.filter(x=>x.popup);
  }catch(e){return}
  let seen={};try{seen=JSON.parse(localStorage.getItem("cess-nf")||"{}")}catch(e){}
  const q=items.filter(x=>x.kind==="urgent"?!sessionStorage.getItem("nf-"+x.id):seen[x.id]!==x.created_at);
  if(!q.length)return;
  if(!document.getElementById("nf-css")){const s=document.createElement("style");s.id="nf-css";s.textContent=css;document.head.append(s)}
  const box=document.createElement("div");box.setAttribute("role","alert");document.body.append(box);
  let k=0;
  const close=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),600)};
  const mark=x=>{if(x.kind==="urgent")sessionStorage.setItem("nf-"+x.id,"1");else{seen[x.id]=x.created_at;localStorage.setItem("cess-nf",JSON.stringify(seen))}};
  function show(){
    const x=q[k],n=q.length;
    box.className="nf"+(x.kind==="urgent"?" u":"");
    box.innerHTML=`<div class="nf-h"><div class="nf-i">${IC[x.kind]||"📢"}</div><div class="nf-t"><b>${E(x.title)}</b>${x.body?`<p>${E(x.body)}</p>`:""}</div><button class="nf-x" aria-label="إغلاق">×</button></div><div class="nf-a">${x.body&&x.body.length>110?'<button class="more">المزيد</button>':""}${o.token?`<a class="p" href="activities.html${x.kind==="event"?"":"#news"}">التفاصيل</a>`:""}<button class="ok">${k<n-1?"التالي ("+(n-k-1)+")":"فهمت"}</button></div>`;
    requestAnimationFrame(()=>box.classList.add("on"));
    box.querySelector(".nf-x").onclick=()=>{mark(x);close()};
    box.querySelector(".ok").onclick=()=>{mark(x);if(k<n-1){k++;show()}else close()};
    const m=box.querySelector(".more");if(m)m.onclick=()=>{box.querySelector("p").classList.add("x");m.remove()};
  }
  setTimeout(show,900);
}};
})();
