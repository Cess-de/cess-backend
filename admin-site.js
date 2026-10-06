CESS_SEC.site=async function(el){
  const G=[
    ["hero","الصفحة الرئيسية",[["hero_eyebrow","العنوان الصغير",0],["hero_h1_line1","العنوان — السطر الأول",0],["hero_h1_line2","العنوان — السطر الثاني",0],["hero_tagline","الشعار",0],["hero_desc","الوصف",1]]],
    ["mission","الرؤية والرسالة",[["mission_title","عنوان القسم",0],["mission_subtitle","الوصف تحت العنوان",1],["vision_text","نص الرؤية",1],["message_text","نص الرسالة",1],["standard_text","معيار عملنا",1]]],
    ["footer","التذييل",[["footer_name","اسم الجمعية",0],["footer_tagline","العبارة الترحيبية",1],["footer_copyright","حقوق النشر",0]]]
  ];
  const LK=[["facebook","فيسبوك","https://facebook.com/..."],["instagram","إنستغرام","https://instagram.com/..."],["x","X (تويتر)","https://x.com/..."],["linkedin","لينكدإن","https://linkedin.com/..."],["whatsapp","واتساب","https://wa.me/..."],["telegram","تيليجرام","https://t.me/..."],["email","البريد الإلكتروني","info@example.com"]];
  el.innerHTML='<div class="list"><div class="sk"></div><div class="sk"></div></div>';
  let cur;
  try{cur=(await call("adminSiteGet")).settings}catch(e){el.innerHTML=`<div class="list"><div class="empty">${esc(e.message)}</div></div>`;return}
  let DEF={ar:{},en:{}};
  try{
    const t=await(await fetch("index.html?v="+Date.now())).text(),a=t.indexOf("const TRANSLATIONS"),b=t.indexOf("function getSavedLang");
    DEF=new Function("return ("+t.slice(t.indexOf("{",a),b).trim().replace(/;\s*$/,"")+")")();
  }catch(e){}
  const D=l=>DEF[l]||{};
  const val=(k,l)=>(cur[k]&&cur[k][l])||D(l)[k]||"";
  const one=(k,l,long)=>{
    const ph=l==="ar"?"العربية":"English",dir=l==="en"?"ltr":"rtl";
    return long?`<textarea id="s_${k}_${l}" rows="3" dir="${dir}" placeholder="${ph}">${esc(val(k,l))}</textarea>`
               :`<input id="s_${k}_${l}" dir="${dir}" placeholder="${ph}" value="${esc(val(k,l))}">`;
  };
  const field=([k,label,long])=>`<div class="fld"><label>${label}</label>${one(k,"ar",long)}<div style="height:6px"></div>${one(k,"en",long)}</div>`;
  const sum='style="padding:16px;font-weight:700;cursor:pointer"';
  const grp=([id,title,fs])=>`<details class="list" style="margin-bottom:10px" ${id==="hero"?"open":""}><summary ${sum}>${title}</summary><div style="padding:0 16px 16px" data-g="${id}">${fs.map(field).join("")}<div class="row"><button class="btn pri" data-save="${id}" disabled>حفظ</button><button class="btn" data-def="${id}">استعادة النص الأصلي</button></div></div></details>`;
  const links=`<details class="list" style="margin-bottom:10px"><summary ${sum}>روابط التواصل الاجتماعي</summary><div style="padding:0 16px 16px" data-g="links"><p class="sub">اترك الحقل فارغًا لإخفاء الأيقونة. الروابط تبدأ بـ https:// والبريد بصيغة name@example.com</p>${LK.map(([k,l,p])=>`<div class="fld"><label>${l}</label><input id="l_${k}" dir="ltr" placeholder="${p}" value="${esc((cur["social_"+k]||{}).ar||"")}"><small id="le_${k}"></small></div>`).join("")}<div class="row"><button class="btn pri" data-save="links" disabled>حفظ</button></div></div></details>`;
  el.innerHTML=`<p class="sub">تُحفظ التغييرات وتظهر في الصفحة الرئيسية فورًا. النص الذي تتركه كما هو يبقى النص الأصلي.</p>`+G.map(grp).join("")+links;

  const items=id=>id==="links"
    ?LK.map(([k])=>({key:"social_"+k,ar:$("#l_"+k).value.trim(),en:""}))
    :G.find(x=>x[0]===id)[2].map(([k])=>{
        const f=l=>{const v=$("#s_"+k+"_"+l).value.trim();return v===(D(l)[k]||"")?"":v};
        return{key:k,ar:f("ar"),en:f("en")};
      });
  el.oninput=e=>{const g=e.target.closest("[data-g]");if(g)g.querySelector("[data-save]").disabled=false};
  el.onclick=e=>{
    const d=e.target.closest("[data-def]");
    if(d){
      G.find(x=>x[0]===d.dataset.def)[2].forEach(([k])=>["ar","en"].forEach(l=>{$("#s_"+k+"_"+l).value=D(l)[k]||""}));
      d.closest("[data-g]").querySelector("[data-save]").disabled=false;
      return;
    }
    const s=e.target.closest("[data-save]");
    if(!s)return;
    busy(s,async()=>{
      const id=s.dataset.save,it=items(id);
      if(id==="links"){
        let bad=false;
        it.forEach(x=>{
          const k=x.key.slice(7),v=x.ar,ok=!v||(k==="email"?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v):/^https:\/\//.test(v));
          $("#le_"+k).textContent=ok?"":(k==="email"?"صيغة البريد غير صحيحة.":"يجب أن يبدأ الرابط بـ https://");
          if(!ok)bad=true;
        });
        if(bad)throw new Error("راجع الحقول المظللة بالأحمر.");
      }
      await call("adminSiteSave",{items:it});
      it.forEach(x=>{cur[x.key]={ar:x.ar,en:x.en}});
      toast("تم الحفظ — تظهر التغييرات في الصفحة الرئيسية الآن");
    });
  };
};
