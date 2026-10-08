(function(){
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const css=`.gsw{position:relative;padding:20px 12px 14px;border-radius:28px;overflow:hidden;background:radial-gradient(circle at 15% 20%,rgba(255,199,44,.35),transparent 45%),radial-gradient(circle at 85% 80%,rgba(59,130,246,.35),transparent 50%)}
.gs{position:relative;direction:ltr;display:flex;gap:6px;align-items:center;padding:8px;border-radius:999px;overflow-x:auto;scrollbar-width:none;background:rgba(255,255,255,.1);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);border:1px solid rgba(255,255,255,.22);box-shadow:0 10px 34px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.3)}
.gs::-webkit-scrollbar{display:none}
[data-theme=light] .gs{background:rgba(255,255,255,.55);border-color:rgba(15,23,42,.1)}
.gl{position:absolute;top:6px;bottom:6px;left:0;width:0;border-radius:999px;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,.12));-webkit-backdrop-filter:blur(8px) brightness(1.2);backdrop-filter:blur(8px) brightness(1.2);border:1px solid rgba(255,255,255,.55);box-shadow:inset 0 1px 1px rgba(255,255,255,.7),0 6px 18px rgba(0,0,0,.25);transition:transform .65s cubic-bezier(.34,1.4,.5,1),width .65s cubic-bezier(.34,1.4,.5,1)}
.ga{position:relative;z-index:1;flex:0 0 auto;width:52px;height:52px;border-radius:50%;border:0;padding:0;cursor:pointer;background:#FFC72C;color:#0B132B;font:800 20px Inter,sans-serif;overflow:hidden;transition:transform .5s cubic-bezier(.34,1.56,.64,1)}
.ga img{width:100%;height:100%;object-fit:cover;display:block}.ga.on{transform:scale(1.18)}.ga.ld{box-shadow:0 0 0 2px #FFC72C}
.gi{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;flex-wrap:wrap}
.gt{min-width:0;transition:opacity .25s}.gt.f{opacity:0}
.gn{display:block;font-weight:800;font-size:16px;color:inherit;text-decoration:none}
.gr{display:inline-block;margin-top:4px;font-size:12.5px;font-weight:700;color:#0B132B;background:#FFC72C;border-radius:999px;padding:2px 12px}
.gh{display:block;margin-top:4px;font-size:13px;opacity:.7}
.gb{display:inline-flex;align-items:center;height:40px;padding:0 18px;border-radius:999px;color:inherit;text-decoration:none;font:700 13px Inter,sans-serif;background:rgba(255,255,255,.14);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.3)}`;
window.CessStrip={async mount(box,o){
  if(!document.getElementById("gs-css")){const s=document.createElement("style");s.id="gs-css";s.textContent=css;document.head.append(s)}
  let d;
  try{const r=await fetch(o.url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+o.anon},body:JSON.stringify({action:"pfStrip",input:{token:o.token||null}})});const j=await r.json();if(!j.ok)throw 0;d=j.data}
  catch(e){if(o.onEmpty)o.onEmpty();return}
  if(!d.items.length){if(o.onEmpty)o.onEmpty();return}
  const it=d.items;
  box.innerHTML=`<div class="gsw"><div class="gs"><div class="gl"></div>${it.map((x,i)=>`<button class="ga${x.leader_title?" ld":""}" data-i="${i}" aria-label="${E(x.name)}">${x.photo?`<img src="${E(x.photo)}" alt="">`:E((x.name||"؟").trim().slice(0,1))}</button>`).join("")}</div><div class="gi"><div class="gt"></div><a class="gb" href="${E(o.all||"members.html")}">عرض كل الأعضاء (${d.total}) ←</a></div></div>`;
  const bar=box.querySelector(".gs"),lens=box.querySelector(".gl"),txt=box.querySelector(".gt"),av=[...box.querySelectorAll(".ga")];
  let cur=0,timer=null,vis=true;
  function go(i){
    cur=(i+it.length)%it.length;const a=av[cur],x=it[cur];
    av.forEach((b,k)=>b.classList.toggle("on",k===cur));
    lens.style.width=a.offsetWidth+18+"px";lens.style.transform="translateX("+(a.offsetLeft-9)+"px)";
    bar.scrollTo({left:Math.max(0,a.offsetLeft+a.offsetWidth/2-bar.clientWidth/2),behavior:"smooth"});
    txt.classList.add("f");
    setTimeout(()=>{txt.innerHTML=`<a class="gn" href="members.html?id=${encodeURIComponent(x.pid)}">${E(x.name||"عضو")}</a>${x.leader_title?`<span class="gr">${E(x.leader_title)}</span>`:""}${x.headline?`<span class="gh">${E(x.headline)}</span>`:""}`;txt.classList.remove("f")},200);
  }
  function stop(){clearInterval(timer)}
  function play(){stop();if(matchMedia("(prefers-reduced-motion:reduce)").matches||it.length<2)return;timer=setInterval(()=>{if(vis)go(cur+1)},3200)}
  av.forEach((b,i)=>b.onclick=()=>{if(i===cur)location.href="members.html?id="+encodeURIComponent(it[i].pid);else{go(i);play()}});
  box.addEventListener("pointerenter",stop);box.addEventListener("pointerleave",play);
  if("IntersectionObserver" in window)new IntersectionObserver(e=>{vis=e[0].isIntersecting}).observe(box);
  addEventListener("resize",()=>go(cur));
  go(0);play();
}};
})();
