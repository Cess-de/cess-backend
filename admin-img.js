(function(){
const LISTS={};
const rs=f=>new Promise((ok,no)=>{const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const k=Math.min(1,1280/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",.8))};im.onerror=()=>no(new Error("تعذّرت قراءة الصورة."));im.src=u});
window.CessImg={mk(urls){
  let L=[...(urls||[])];const el=document.createElement("div");el.className="fld";
  const draw=()=>{
    el.innerHTML=`<label>الصور (حتى 4)</label><div style="display:flex;gap:8px;flex-wrap:wrap">${L.map((u,i)=>`<div style="position:relative;width:76px;height:76px"><img src="${esc(u)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px"><button type="button" data-x="${i}" style="position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#EF4444;color:#fff;cursor:pointer">×</button></div>`).join("")}${L.length<4?'<label class="btn" style="width:76px;height:76px;border-radius:12px;font-size:24px">＋<input type="file" accept="image/*" hidden></label>':""}</div><small style="display:block;min-height:18px;color:var(--bad)"></small>`;
    el.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{L.splice(+b.dataset.x,1);draw()});
    const f=el.querySelector("input");
    if(f)f.onchange=async()=>{const file=f.files[0];if(!file)return;f.parentNode.style.opacity=".5";try{L.push((await call("imgUpload",{data:await rs(file)})).url);draw()}catch(e){draw();el.querySelector("small").textContent=e.message}};
  };
  draw();return{el,get:()=>L};
}};
const _modal=modal;
modal=function(h){
  _modal(h);window.__imgs=null;
  const t=dlg.querySelector("#n1")?["#n1","adminAnnList"]:dlg.querySelector("#a1")?["#a1","adminActList"]:null;if(!t)return;
  const v=dlg.querySelector(t[0]).value,it=(LISTS[t[1]]||[]).find(x=>x.title===v);
  const p=CessImg.mk(it?it.images:[]),row=[...dlg.querySelectorAll(".row")].pop();row.parentNode.insertBefore(p.el,row);window.__imgs=p;
};
const _call=call;
call=async function(a,i={}){
  if((a==="adminAnnSave"||a==="adminActSave")&&window.__imgs)i={...i,images:window.__imgs.get()};
  const d=await _call(a,i);if(a==="adminAnnList"||a==="adminActList")LISTS[a]=d.items;return d;
};
})();
