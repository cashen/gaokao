// History is reference-only in v016.44/r134.
// Historical values remain visible, but they do not create a user-facing
// history-review state. School/major identity and explicit manual fields keep
// their existing confirmation behavior.
const STORAGE_KEY='gaokao:simulation-report:v002';
const readState=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}};

function syncHistoryReferenceOnly(){
  const state=readState();
  if(!Array.isArray(state?.volunteers))return;
  let incomplete=0,check=0,complete=0;
  for(const row of state.volunteers){
    const card=document.querySelector(`.volunteer-card[data-card-id="${CSS.escape(String(row.id))}"]`);
    if(!card)continue;
    const hasIdentity=Boolean(row.school&&row.majorCode&&row.majorName);
    const hasManualCheck=Object.values(row.manualCheck||{}).some(Boolean);
    if(!row.school||!row.majorCode){
      incomplete+=1;
    }else if(!hasIdentity||hasManualCheck){
      check+=1;
    }else{
      complete+=1;
      const line=card.querySelector('.state-line');
      line?.classList.remove('needs-check');
      line?.classList.add('complete');
      const label=line?.querySelector('.state-dot')?.nextElementSibling;
      if(label)label.textContent='当前记录没有明显缺项';
    }
    card.querySelectorAll('.history-inline em').forEach(node=>node.remove());
  }
  const summary=document.querySelector('#wbSummary');
  if(summary){
    summary.innerHTML=`<span class="summary-item">共 ${state.volunteers.length} 条</span><span class="summary-item">✓ ${complete} 条信息完整</span><span class="summary-item ${check?'warn':''}">⚠ ${check} 条需要核对</span><span class="summary-item ${incomplete?'danger':''}">○ ${incomplete} 条未完成</span>`;
  }
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;syncHistoryReferenceOnly()});
}

schedule();
window.addEventListener('load',schedule,{once:true});
window.addEventListener('storage',schedule);
const root=document.querySelector('#wbRows');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});

export const SIMULATION_HISTORY_REFERENCE_ONLY='v016.44-r134';
