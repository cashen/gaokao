// V2.9.5.4 selection-engine: candidate basket, dedupe and plan add actions
function addCandidate(id){const r=DATA.find(x=>x.id===id);if(r&&!candidates.find(x=>x.id===id))candidates.push(r);localStorage.setItem('ln_candidates_v292',JSON.stringify(candidates));renderCandidates();renderStructure()}
function renderStructure(){
  const el=document.getElementById('structureList'); if(!el)return;
  if(!candidates.length){el.innerHTML='<div class="structure-item">候选为空</div>';return;}
  const rows=candidates.map(r=>DATA.find(x=>x.id===r.id)||r).map(r=>typeof enrichRecord==='function'?enrichRecord(r):enrich(r));
  const count=fn=>rows.filter(fn).length;
  const warnings=[];
  if(count(r=>classify(r.rank2025)==='保底')===0)warnings.push('提醒：兜底项偏少');
  if(count(r=>['可冲','超冲'].includes(classify(r.rank2025)))>rows.length*0.45)warnings.push('提醒：冲得偏多');
  if(count(r=>r.isHighFee)>0)warnings.push('提醒：含高收费，需核算成本');
  if(count(r=>r.isCollegeSpecialPlanV29474)>0)warnings.push('提醒：含高校专项资格候选，需确认资格');
  if(count(r=>r.schoolProvince!=='辽宁')>rows.length*0.6)warnings.push('提醒：省外比例较高');
  const items=[`总数 ${rows.length}`,`冲 ${count(r=>['可冲','超冲'].includes(classify(r.rank2025)))}`,`稳/匹配 ${count(r=>['匹配','稳妥'].includes(classify(r.rank2025)))}`,`保底 ${count(r=>classify(r.rank2025)==='保底')}`,`公办倾向 ${count(r=>r.schoolNature?.label==='公办倾向')}`,`沈阳 ${count(r=>r.lnArea==='沈阳')} / 大连 ${count(r=>r.lnArea==='大连')}`,...warnings];
  el.innerHTML=items.map(x=>`<div class="structure-item">${x}</div>`).join('');
}

function renderCandidates(){document.getElementById('candidateList').innerHTML=candidates.map(r=>`<div class="candidate"><b>${r.school}</b><div>${r.major}</div><div class="small">${geoDisplayV29472(enrich(r))}｜2025：${fmt(r.score2025)} 分 / ${fmt(r.rank2025)} 位</div><button class="ghost slim" style="margin-top:8px" onclick="removeCandidate('${r.id}')">移除</button></div>`).join('')||'<p class="small">还没有加入候选。</p>'}function removeCandidate(id){candidates=candidates.filter(x=>x.id!==id);localStorage.setItem('ln_candidates_v292',JSON.stringify(candidates));renderCandidates()}function clearCandidates(){candidates=[];localStorage.removeItem('ln_candidates_v292');renderCandidates()}
function candidateKeyV29475Fix2(r){return planKeyV29475Fix2(r)}
function flashCandidateNoteV29475Fix2(msg){
  let el=document.getElementById('candidateFlashV29475Fix2');
  if(!el){
    el=document.createElement('div'); el.id='candidateFlashV29475Fix2'; el.className='candidate-flash-v29475fix2';
    document.body.appendChild(el);
  }
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),1800);
}
addRowsToCandidatesV29476 = function(rows, planType='', role=''){
  const existing=new Set((candidates||[]).map(candidateKeyV29475Fix2));
  let added=0;
  (rows||[]).forEach(r=>{
    const source=DATA.find(x=>x.id===r.id)||r;
    const key=candidateKeyV29475Fix2(source);
    if(!existing.has(key)){
      const cloned={...source,
        _selectedSourcePlanV29476:planType||'手动',
        _selectedPlanRoleV29476:role||'手动',
        _selectedPathLabelV29476:planType==='B'?majorPathInfoV29476(r).label:planType==='C'?liftExchangeInfoV29476(r).label:planType==='A'?'稳妥底线':'手动加入',
        _selectedAtV29476:new Date().toISOString()
      };
      candidates.push(cloned); existing.add(key); added++;
    }
  });
  localStorage.setItem('ln_candidates_v292',JSON.stringify(candidates));
  renderCandidates(); renderStructure();
  return added;
};
addRowsToCandidatesV29475Fix2 = function(rows){return addRowsToCandidatesV29476(rows,'手动','手动');};
addPlanOneV29475Fix2 = function(id,type='',role=''){
  const r=DATA.find(x=>String(x.id)===String(id)) || (filtered||[]).find(x=>String(x.id)===String(id));
  const added=addRowsToCandidatesV29476(r?[r]:[],type||'手动',role||'手动');
  flashCandidateNoteV29475Fix2(added?'已加入 1 条自选':'这条已在自选中');
};
addPlanGroupV29475Fix2 = function(type){
  const rows=(latestPlanBucketsV29475Fix2&&latestPlanBucketsV29475Fix2[type]||[]).slice(0,4);
  const added=addRowsToCandidatesV29476(rows,type,'方案候选');
  flashCandidateNoteV29475Fix2(`已加入${type}方案 ${added} 条，重复项已自动跳过`);
};
addAllPlansV29475Fix2 = function(){
  const rows=[...(latestPlanBucketsV29475Fix2.A||[]).slice(0,4).map(r=>[r,'A']),...(latestPlanBucketsV29475Fix2.B||[]).slice(0,4).map(r=>[r,'B']),...(latestPlanBucketsV29475Fix2.C||[]).slice(0,4).map(r=>[r,'C'])];
  let added=0; rows.forEach(([r,t])=>{added+=addRowsToCandidatesV29476([r],t,'方案候选')});
  flashCandidateNoteV29475Fix2(`已加入 A/B/C 方案 ${added} 条，重复项已自动跳过`);
};
renderCandidates = function(){
  const el=document.getElementById('candidateList'); if(!el)return;
  el.innerHTML=(candidates||[]).map(r=>{
    const er=DATA.find(x=>x.id===r.id)||r; enrich(er);
    const src=r._selectedSourcePlanV29476||'手动'; const role=r._selectedPlanRoleV29476||''; const path=r._selectedPathLabelV29476||'';
    return `<div class="candidate candidate-v29476"><b>${htmlSafeV2945(er.school)}</b><div>${htmlSafeV2945(er.major)}</div><div class="small">${htmlSafeV2945(geoDisplayV29472(er))}｜2025：${fmt(er.score2025)} 分 / ${fmt(er.rank2025)} 位</div><div class="candidate-source-v29476"><span>来源：${htmlSafeV2945(src)}</span>${role?`<span>${htmlSafeV2945(role)}</span>`:''}${path?`<span>${htmlSafeV2945(path)}</span>`:''}</div><button class="ghost slim" style="margin-top:8px" onclick="removeCandidate('${htmlSafeV2945(er.id)}')">移除</button></div>`;
  }).join('')||'<p class="small">还没有加入候选。</p>';
};

window.LN_SELECTION = {
  addCandidate, removeCandidate, clearCandidates,
  renderCandidates, addRowsToCandidatesV29476,
  addPlanOneV29475Fix2, addPlanGroupV29475Fix2, addAllPlansV29475Fix2,
  candidateKeyV29475Fix2
};
