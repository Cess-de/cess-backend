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
