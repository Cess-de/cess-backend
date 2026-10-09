(function(){
const css=`.jd{border:1px solid rgba(255,255,255,.25);border-radius:24px;background:rgba(20,29,56,.78);-webkit-backdrop-filter:blur(24px) saturate(170%);backdrop-filter:blur(24px) saturate(170%);color:#fff;padding:22px;width:min(94vw,440px);direction:rtl;font-family:Inter,sans-serif;margin:auto}
.jd::backdrop{background:rgba(0,0,0,.55)}.jd h3{font-size:17px;font-weight:800;margin-bottom:10px}
.jd .w{background:rgba(255,199,44,.12);border:1px solid rgba(255,199,44,.45);border-radius:14px;padding:12px;font-size:13px;line-height:1.8;margin-bottom:6px}
.jd label{display:block;font-size:12.5px;font-weight:600;opacity:.85;margin:12px 0 6px}
.jd input[type=tel]{width:100%;height:44px;padding:0 14px;border-radius:14px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font:inherit;direction:ltr}
.jd .c{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.7;margin:12px 0 2px;opacity:1}.jd .c input{width:18px;height:18px;margin-top:3px;accent-color:#FFC72C}
.jd .h{font-size:12.5px;opacity:.7;line-height:1.7;margin-top:6px}.jd .e{color:#ff9b9b;font-size:13px;min-height:18px;margin-top:8px}
.jd .r{display:flex;gap:8px;margin-top:12px}.jd .r button{flex:1;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font:700 13.5px Inter,sans-serif;cursor:pointer}
.jd .r .p{background:#FFC72C;color:#0B132B;border-color:transparent}.jd .r button:disabled{opacity:.5;cursor:not-allowed}`;
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dg=s=>String(s).replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/\D/g,"");
document.addEventListener("click",e=>{
  const b=e.target.closest('[data-j][data-v="1"]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();openJoin(b.dataset.j);
},true);
function openJoin(id){
  const a=ACT.find(x=>x.id===id);if(!a)return;
  if(!document.getElementById("jd-css")){const s=document.createElement("style");s.id="jd-css";s.textContent=css;document.head.append(s)}
  const d=document.createElement("dialog");d.className="jd";
  d.innerHTML=`<h3>التسجيل في «${E(a.title)}»</h3>
  <div class="w">⚠️ سجّل فقط إن كنت <b>جادًا</b> وجاهزًا للمشاركة في هذا النشاط. سيتواصل معك المنظمون عبر الأرقام أدناه.</div>
  <label>رقم الهاتف *</label><input id="jp" type="tel" inputmode="tel" placeholder="0912345678" value="${E(localStorage.getItem("cess-phone")||"")}">
  <label class="c" style="margin-top:12px"><input type="checkbox" id="js" checked><span>رقم الواتساب هو نفسه رقم الهاتف</span></label>
  <div id="jw" hidden><label>رقم الواتساب *</label><input id="jq" type="tel" inputmode="tel" placeholder="0912345678"></div>
  <p class="h">لا بأس أن يكون الرقم نفسه للمكالمات والواتساب، المهم أن تكون متاحًا على أحدهما.</p>
  <label class="c"><input type="checkbox" id="jk"><span>أتعهد بأنني جادّ في التسجيل وجاهز للمشاركة في هذا النشاط.</span></label>
  <div class="e" id="je"></div>
  <div class="r"><button class="p" id="jo" disabled>تأكيد التسجيل</button><button id="jx">إلغاء</button></div>`;
  document.body.append(d);d.showModal();
  const $=s=>d.querySelector(s),close=()=>{d.close();d.remove()};
  const ok=()=>{$("#jw").hidden=$("#js").checked;const p=dg($("#jp").value).length>=9,w=$("#js").checked||dg($("#jq").value).length>=9;$("#jo").disabled=!(p&&w&&$("#jk").checked)};
  ["#jp","#jq","#js","#jk"].forEach(s=>$(s).oninput=$(s).onchange=ok);ok();
  $("#jx").onclick=close;d.addEventListener("cancel",()=>d.remove());
  $("#jo").onclick=async()=>{
    const b=$("#jo");b.disabled=true;b.textContent="جارٍ التسجيل...";$("#je").textContent="";
    try{
      await call("actReg",{id,join:true,phone:$("#jp").value,same_wa:$("#js").checked,whatsapp:$("#jq").value,committed:true});
      localStorage.setItem("cess-phone",$("#jp").value);
      ACT=(await call("actList")).items;drawA();close();toast("تم تسجيلك ✅ سيتواصل معك المنظمون");
    }catch(err){$("#je").textContent=err.message;b.textContent="تأكيد التسجيل";ok()}
  };
}
})();
