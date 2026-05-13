// V2.9.7.5 student profile UI: light entry + drawer.
(function(){
  function rules(){return window.LN_STUDENT_PROFILE_RULES_V2975;}
  function esc(v){return rules()?.safe?.(v) || String(v??'');}
  function renderSummary(){
    const box=document.getElementById('studentProfileBoxV2975'); if(!box||!rules()) return;
    const sum=rules().summary();
    box.innerHTML=`<div class="student-profile-compact-v2975">
      <div><b>${esc(sum.title)}</b><span>${esc(sum.text)}</span></div>
      <button class="execute-secondary" data-action="open-student-profile">补充画像</button>
    </div>`;
  }
  function selectField(key,state){
    const opts=rules().OPTIONS[key]||[];
    return `<select id="studentProfile_${esc(key)}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${state[key]===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  }
  function openDrawer(){
    if(!rules()) return;
    const s=rules().readState();
    const body=`<div class="student-profile-drawer-v2975">
      <p class="drawer-help-v296">学生画像只用于调整提醒顺序，不作为专业排除条件。性别不会直接决定推荐专业。</p>
      <div class="student-profile-grid-v2975">
        <label><span>性别</span>${selectField('gender',s)}</label>
        <label><span>想法来源</span>${selectField('source',s)}</label>
        <label><span>学习偏好</span>${selectField('learning',s)}</label>
        <label><span>学习强度感受</span>${selectField('load',s)}</label>
        <label><span>后续路径接受度</span>${selectField('path',s)}</label>
        <label><span>专业理解状态</span>${selectField('understanding',s)}</label>
      </div>
      <div class="profile-note-v2975">提示：如果这里是家长观察，建议后续再让孩子确认一次。</div>
    </div>`;
    window.LN_DRAWER_V296?.open?.('学生画像', body);
    bindDrawer();
  }
  function bindDrawer(){
    document.querySelectorAll('[id^="studentProfile_"]').forEach(el=>{
      if(el.dataset.boundV2975) return; el.dataset.boundV2975='1';
      el.addEventListener('change',()=>{
        const cur=rules().readState();
        const key=el.id.replace('studentProfile_',''); cur[key]=el.value;
        rules().saveState(cur); renderSummary();
        window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'student-profile-change',level:'soft',delay:180});
      });
    });
  }
  window.LN_STUDENT_PROFILE_UI_V2975={renderSummary,openDrawer,ready:true};
})();
