(function(){
const BASE="https://bibhljpmmmcxcxhpbuqf.supabase.co/storage/v1/object/public/hero-images/";
const DEF={img_hero_night:[1,2,3,4,5,6].map(n=>BASE+"night-"+n+".jpg.JPG"),img_hero_day:[1,2,3,4,5,6].map(n=>BASE+"day-"+n+".jpg.JPG")};
const CARDS=[["img_logo","الشعار","يظهر بدل 🎓 في كل الصفحات. يُفضّل PNG بخلفية شفافة.",1],["img_hero_night","خلفيات الرئيسية — الوضع الليلي","تتبدل تلقائيًا في واجهة الصفحة الرئيسية. الأفضل صور أفقية.",8],["img_hero_day","خلفيات الرئيسية — الوضع النهاري","تظهر عندما يختار الزائر الوضع الفاتح.",8]];
SEC.splice(SEC.findIndex(x=>x[0]==="site")+1,0,["images","صور الموقع","الشعار وخلفيات الصفحة الرئيسية."]);
ready.then(()=>{if(can("site")&&!PERMS.includes("images")){PERMS.push("images");if(!$("#app").hidden)tabs()}});
const rs=(f,logo)=>new Promise((ok,no)=>{
  const im=new Image(),u=URL.createObjectURL(f);
  im.onload=()=>{
    const M=logo?512:1600,k=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));
    const x=c.getContext("2d");let d;
    if(logo){x.drawImage(im,0,0,c.width,c.height);d=c.toDataURL("image/png");if(d.length>600000){x.globalCompositeOperation="destination-over";x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);d=c.toDataURL("image/jpeg",.85)}}
    else{x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);d=c.toDataURL("image/jpeg",.8);if(d.length>950000)d=c.toDataURL("image/jpeg",.6)}
    URL.revokeObjectURL(u);ok(d);
  };
  im.onerror=()=>no(new Error("تعذّرت قراءة الصورة."));im.src=u;
});
CESS_SEC.images=async function(el){
  el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
  let S;try{S=(await call("adminSiteGet")).settings}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
  const get=k=>{const v=(S[k]&&S[k].ar)||"";if(k==="img_logo")return v?[v]:[];try{return JSON.parse(v||"[]")}catch(e){return[]}};
  const L={},D={};CARDS.forEach(([k])=>{L[k]=get(k);D[k]=false});
  function draw(){
    el.innerHTML='<p class="sub">ارفع الصور وسيستعملها الموقع تلقائيًا. تُصغَّر الصور في جهازك قبل الرفع، ويظهر التغيير في الموقع خلال دقائق.</p>'+CARDS.map(([k,t,h,max])=>{
      const u=L[k],lg=k==="img_logo",w=lg?96:132,hh=lg?96:84;
      return `<div class="list" style="padding:16px;margin-bottom:12px"><b>${t}</b><p class="sub" style="margin:4px 0 10px">${h}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${u.map((x,i)=>`<div style="width:${w}px"><div style="position:relative;height:${hh}px;border-radius:12px;overflow:hidden;background:${k==="img_hero_day"?"#e8eef7":"#0B132B"};border:1px solid var(--bd)"><img src="${esc(x)}" alt="" style="width:100%;height:100%;object-fit:${lg?"contain":"cover"}"><button class="btn sm dng" style="position:absolute;top:4px;left:4px;width:28px;height:28px;padding:0" data-rm="${k}|${i}">×</button></div>${max>1?`<div style="display:flex;gap:4px;margin-top:4px"><button class="btn sm" style="flex:1;padding:0" data-mv="${k}|${i}|-1" ${i===0?"disabled":""}>→</button><button class="btn sm" style="flex:1;padding:0" data-mv="${k}|${i}|1" ${i===u.length-1?"disabled":""}>←</button></div>`:""}</div>`).join("")}
      ${u.length<max||lg?`<label class="btn" style="width:${w}px;height:${hh}px;border-radius:12px;font-size:26px;cursor:pointer">＋<input type="file" accept="image/*" ${max>1?"multiple":""} hidden data-up="${k}"></label>`:""}</div>
      ${!u.length&&DEF[k]?`<p class="sub">يستخدم الموقع الآن الصور الافتراضية. <button class="btn sm" data-def="${k}">ابدأ من الصور الحالية</button></p>`:""}
      <div class="sub" data-st="${k}"></div>
      <div class="row" style="margin-top:6px"><button class="btn pri" data-save="${k}" ${D[k]?"":"disabled"}>حفظ</button>${u.length?`<button class="btn" data-reset="${k}">استعادة الافتراضي</button>`:""}</div></div>`;
    }).join("");
  }
  el.onclick=async e=>{
    const g=a=>e.target.closest(a);
    let b=g("[data-rm]");if(b){const[k,i]=b.dataset.rm.split("|");L[k].splice(+i,1);D[k]=true;return draw()}
    b=g("[data-mv]");if(b){const[k,i,d]=b.dataset.mv.split("|"),a=+i,z=a+ +d;[L[k][a],L[k][z]]=[L[k][z],L[k][a]];D[k]=true;return draw()}
    b=g("[data-def]");if(b){L[b.dataset.def]=[...DEF[b.dataset.def]];D[b.dataset.def]=true;return draw()}
    b=g("[data-save]");if(b){const k=b.dataset.save;return busy(b,async()=>{await call("adminImgSave",{key:k,urls:L[k]});D[k]=false;toast("تم الحفظ");draw()})}
    b=g("[data-reset]");if(b){
      const k=b.dataset.reset;
      if(!await confirmBox("استعادة الافتراضي؟","ستُحذف الصور المخصصة ويعود الموقع للصور الافتراضية.","استعادة",true))return;
      return busy(b,async()=>{await call("adminImgSave",{key:k,urls:[]});L[k]=[];D[k]=false;toast("تمت الاستعادة");draw()});
    }
  };
  el.onchange=async e=>{
    const f=e.target.closest("[data-up]");if(!f)return;
    const k=f.dataset.up,lg=k==="img_logo",max=CARDS.find(c=>c[0]===k)[3],files=[...f.files].slice(0,lg?1:max-L[k].length);f.value="";
    const st=el.querySelector(`[data-st="${k}"]`);
    for(let n=0;n<files.length;n++){
      st.textContent=`جارٍ رفع ${n+1} / ${files.length}...`;
      try{const r=await call("siteImgUpload",{data:await rs(files[n],lg),kind:lg?"logo":"hero"});if(lg)L[k]=[];L[k].push(r.url);D[k]=true}
      catch(err){toast(err.message,"bad")}
    }
    draw();
  };
  draw();
};
})();
