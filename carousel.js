(function(){
if(window.cessCar)return;
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const st=document.createElement("style");
st.textContent=`.cc{position:relative;aspect-ratio:16/9;overflow:hidden;background:rgba(255,255,255,.06)}.cc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease;cursor:zoom-in}.cc img.on{opacity:1}
.cc-d{position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:center;gap:6px;pointer-events:none}.cc-d i{width:7px;height:7px;border-radius:99px;background:rgba(255,255,255,.55);transition:.3s}.cc-d i.on{background:#FFC72C;width:18px}`;
document.head.append(st);
window.cessCar=im=>{im=(im||[]).slice(0,4);if(!im.length)return"";return `<div class="cc" data-gal>${im.map((u,i)=>`<img src="${E(u)}" alt="" loading="lazy" class="${i?"":"on"}">`).join("")}${im.length>1?`<div class="cc-d">${im.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div>`:""}</div>`};
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches,HV=matchMedia("(hover:hover)").matches;
document.addEventListener("pointerdown",e=>{const c=e.target.closest(".cc");if(c)c._h=Date.now()},true);
function step(c){const m=[...c.querySelectorAll("img")],d=[...c.querySelectorAll(".cc-d i")];let i=m.findIndex(x=>x.classList.contains("on"));if(m[i])m[i].classList.remove("on");if(d[i])d[i].classList.remove("on");i=(i+1)%m.length;m[i].classList.add("on");if(d[i])d[i].classList.add("on")}
if(!RM)setInterval(()=>{document.querySelectorAll(".cc").forEach(c=>{
  if(c.querySelectorAll("img").length<2||(HV&&c.matches(":hover"))||(c._h&&Date.now()-c._h<7000))return;
  const r=c.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;step(c)})},4500);
})();
