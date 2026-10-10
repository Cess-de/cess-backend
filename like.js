(function(){
const PID=new URLSearchParams(location.search).get("id");if(!PID)return;
const st=document.createElement("style");
st.textContent=`.lk{display:inline-flex;align-items:center;gap:8px;margin-top:12px;height:42px;padding:0 18px;border-radius:999px;border:1px solid var(--bd);background:var(--card);color:var(--t1);font:700 14px Inter,sans-serif;cursor:pointer}.lk.on{border-color:#ff5a76;color:#ff5a76}.lk:disabled{cursor:default;opacity:.85}.lk i{font-style:normal}.lk.pop i{animation:lkp .4s}@keyframes lkp{40%{transform:scale(1.5)}}`;
document.head.append(st);
let busy=false;
function draw(b,d){b.className="lk"+(d.liked?" on":"");b.innerHTML=`<i>${d.liked?"❤️":"🤍"}</i><span>${d.likes}</span>`;b.disabled=!d.can;b.title=d.self?"إعجابات ملفك":d.can?(d.liked?"إلغاء الإعجاب":"أعجبني"):"سجّل الدخول للإعجاب"}
async function inject(host){
  if(document.getElementById("lk-btn"))return;
  const b=document.createElement("button");b.id="lk-btn";b.className="lk";b.innerHTML="<i>🤍</i><span>…</span>";b.disabled=true;host.append(b);
  let d;try{d=await call("pfLike",{pid:PID})}catch(e){b.remove();return}
  draw(b,d);
  b.onclick=async()=>{
    if(busy||!d.can)return;busy=true;
    const want=!d.liked,old={...d};d.liked=want;d.likes+=want?1:-1;draw(b,d);b.classList.add("pop");
    try{d=await call("pfLike",{pid:PID,like:want});draw(b,d)}catch(e){d=old;draw(b,d)}
    busy=false;
  };
}
new MutationObserver(()=>{const h=document.querySelector("#pv .hero2 > div:last-child");if(h&&!document.getElementById("lk-btn"))inject(h)}).observe(document.body,{childList:true,subtree:true});
})();
