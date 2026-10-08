const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PF_ICON={facebook:"fa-brands fa-facebook",instagram:"fa-brands fa-instagram",x:"fa-brands fa-x-twitter",linkedin:"fa-brands fa-linkedin",github:"fa-brands fa-github",youtube:"fa-brands fa-youtube",telegram:"fa-brands fa-telegram",whatsapp:"fa-brands fa-whatsapp",tiktok:"fa-brands fa-tiktok",behance:"fa-brands fa-behance",drive:"fa-brands fa-google-drive",website:"fa-solid fa-globe"};
const PF_NAME={facebook:"فيسبوك",instagram:"إنستغرام",x:"X (تويتر)",linkedin:"لينكدإن",github:"GitHub",youtube:"يوتيوب",telegram:"تيليجرام",whatsapp:"واتساب",tiktok:"تيك توك",behance:"Behance",drive:"Google Drive",website:"موقع إلكتروني"};
const PF_RE=[["facebook",/(^|\.)(facebook\.com|fb\.com|fb\.me)$/],["instagram",/(^|\.)instagram\.com$/],["x",/(^|\.)(x\.com|twitter\.com)$/],["linkedin",/(^|\.)linkedin\.com$/],["github",/(^|\.)github\.com$/],["youtube",/(^|\.)(youtube\.com|youtu\.be)$/],["telegram",/(^|\.)(t\.me|telegram\.me)$/],["whatsapp",/(^|\.)(wa\.me|whatsapp\.com)$/],["tiktok",/(^|\.)tiktok\.com$/],["behance",/(^|\.)behance\.net$/],["drive",/^(drive|docs)\.google\.com$/]];
function pfPlat(u){
  try{
    let s=String(u).trim();if(!s)return null;
    if(!/^https?:\/\//i.test(s))s="https://"+s;
    const h=new URL(s).hostname.replace(/^www\./,"");
    if(!h.includes("."))return null;
    for(const [k,r] of PF_RE)if(r.test(h))return k;
    return "website";
  }catch(e){return null}
}
function pfIcons(links){
  return (links||[]).map(l=>{const n=PF_NAME[l.platform]||"رابط";return `<a class="soc" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(n)}" aria-label="${esc(n)}"><i class="${PF_ICON[l.platform]||PF_ICON.website}"></i></a>`}).join("");
}
