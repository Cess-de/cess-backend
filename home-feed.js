(function(){
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const need=(src,ok)=>new Promise(r=>{if(ok())return r();const s=document.createElement("script");s.src=src;s.onload=r;s.onerror=r;document.head.append(s)});
const css=`.hf-h{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:800;margin:6px 2px 12px}.hf-h small{font-size:13px;font-weight:600;opacity:.7}
.hf-row{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 16px;scrollbar-width:none}.hf-row::-webkit-scrollbar{display:none}
.hf{flex:0 0 min(84vw,310px);scroll-snap-align:start;border-radius:22px;overflow:hidden;display:flex;flex-direction:column;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 6px 24px rgba(0,0,0,.16)}
.hf-i{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,rgba(255,199,44,.35),rgba(59,130,246,.35))}.hf-i .cc{position:absolute;inset:0;aspect-ratio:auto}
.hf-ph{height:100%;display:flex;align-items:center;justify-content:center;font-size:42px}
.hf-b{position:absolute;top:10px;right:10px;z-index:2;pointer-events:none;font-size:12px;font-weight:800;padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff}.hf-b.ac{background:#FFC72C;color:#0B132B}
.hf-t{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}.hf-t b{font-size:16px;line-height:1.5}
.hf-d{font-size:12.5px;font-weight:700;color:#FFC72C}.hf-m{font-size:12.5px;opacity:.75}
.hf-t p{font-size:13px;line-height:1.7;opacity:.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hf-p{height:6px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}.hf-p i{display:block;height:100%;background:#FFC72C}
.hf-a{margin-top:auto;display:inline-flex;align-items:center;justify-content:center;height:40px;border-radius:999px;background:#FFC72C;color:#0B132B;font:800 13.5px Inter,sans-serif;text-decoration:none}.hf-a.g{background:rgba(255,255,255,.14);color:inherit;border:1px solid rgba(255,255,255,.3)}`;
window.CessFeed={async mount(box,o){
  if(!document.getElementById("hf-css")){const s=document.createElement("style");s.id="hf-css";s.textContent=css;document.head.append(s)}
  let d;
  try{const r=await fetch(o.url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+o.anon},body:JSON.stringify({action:"homeFeed",input:{}})});const j=await r.json();if(!j.ok)throw 0;d=j.data}catch(e){if(o.onEmpty)o.onEmpty();return}
  if(!d.activities.length&&!d.announcements.length){if(o.onEmpty)o.onEmpty();return}
  await Promise.all([need("carousel.js",()=>window.cessCar),need("lightbox.js",()=>window.CessBox)]);
  const sec=box.closest("#feed");if(sec)sec.querySelectorAll(".section-title,.section-subtitle").forEach(x=>x.remove());
  const dt=a=>new Date(a).toLocaleString("ar",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
  const pic=(x,b)=>`<div class="hf-i">${x.images&&x.images.length?window.cessCar(x.images):`<div class="hf-ph">${x.starts_at?"📅":"📢"}</div>`}${b}</div>`;
  const act=a=>`<article class="hf">${pic(a,a.capacity&&a.count>=a.capacity?'<span class="hf-b">اكتمل العدد</span>':'<span class="hf-b ac">سارع بالتسجيل</span>')}<div class="hf-t"><div class="hf-d">📅 ${dt(a.starts_at)}</div><b>${E(a.title)}</b>${a.location?`<div class="hf-m">📍 ${E(a.location)}</div>`:""}${a.description?`<p>${E(a.description)}</p>`:""}${a.capacity?`<div class="hf-p"><i style="width:${Math.min(100,Math.round(a.count/a.capacity*100))}%"></i></div><div class="hf-m">${a.count} / ${a.capacity} مسجّل</div>`:""}<a class="hf-a" href="activities.html">سجّل الآن</a></div></article>`;
  const ann=n=>`<article class="hf">${pic(n,n.kind==="urgent"?'<span class="hf-b" style="background:#EF4444">عاجل</span>':"")}<div class="hf-t"><b>${E(n.title)}</b>${n.body?`<p>${E(n.body)}</p>`:""}<a class="hf-a g" href="activities.html#news">التفاصيل</a></div></article>`;
  box.innerHTML=(d.announcements.length?`<div class="hf-h">📢 الإعلانات</div><div class="hf-row">${d.announcements.map(ann).join("")}</div>`:"")+(d.activities.length?`<div class="hf-h" style="margin-top:8px">📅 النشاطات <small>— سارع بالتسجيل</small></div><div class="hf-row">${d.activities.map(act).join("")}</div>`:"");
}};
})();
