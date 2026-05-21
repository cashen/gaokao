/*
 * V2.92RC2.5.audit-human-scenario-runner｜A/B/C 人类思维策略审计
 * 边界：不改业务逻辑、不改公式、不改 rules-closure4；只提供统一测试接口和审计输出。
 */
(function(){
  'use strict';
  const VERSION='V2.92RC2.5.audit-human-scenario-runner';
  const STORAGE_KEYS=['ln_child_interest_state_v2955','ln_child_intent_state_v2975','ln_student_profile_state_v298'];
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const now=()=>new Date().toISOString();
  function hashText(str){str=String(str||'');let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*16777619)>>>0;}return h.toString(16);}
  const $=id=>document.getElementById(id);
  function withTimeout(promise,ms,label){return new Promise(resolve=>{let done=false;const timer=setTimeout(()=>{if(done)return;done=true;resolve({__timeout:true,label:label||'timeout',ms});},ms);Promise.resolve(promise).then(v=>{if(done)return;done=true;clearTimeout(timer);resolve(v);},e=>{if(done)return;done=true;clearTimeout(timer);resolve({__error:true,error:String(e&&e.message||e),stack:e&&e.stack?String(e.stack).slice(0,800):''});});});}
  function statusRank(s){return s==='FAIL'?3:s==='TIMEOUT'?2:s==='WARN'?1:0;}
  function worse(a,b){return statusRank(a)>=statusRank(b)?a:b;}
  const CORE_CASE_IDS=new Set(['680-male-computer-platform','650-female-medical-reject-cycle','600-male-grid-accept-site','580-female-exam-expression-no-site','560-male-computer-strong-code','550-male-grid-employment','530-employment-no-interest','510-male-mechanical-employment','490-female-teacher-exam-normal','470-female-law-exam-no-fee','450-edge-normal-no-fee','550-rich-computer-upgrade']);
  function safe(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function setVal(id,v){const el=$(id); if(!el||v===undefined||v===null)return false; el.value=String(v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;}
  function setChipSet(rootSel, attr, values){
    const set=new Set((values||[]).map(String));
    document.querySelectorAll(rootSel+' .chip').forEach(ch=>{const val=String(ch.dataset[attr]||ch.dataset.value||ch.textContent||'').trim(); ch.classList.toggle('active',set.has(val));});
  }
  function selectRegionGroups(groups){setChipSet('#regionGroupChips','regionGroup',groups||[]);}
  function selectProvinces(provinces){
    if(!Array.isArray(provinces))return;
    const set=new Set(provinces.map(String));
    document.querySelectorAll('#provinceChips .chip').forEach(ch=>{const val=String(ch.dataset.province||ch.textContent||'').trim(); ch.classList.toggle('active',set.has(val));});
  }
  function setRejects(rejects){setChipSet('#rejectChips','reject',rejects||[]);}
  function setProfile(input){
    const next={gender:input.gender||'unspecified',learning:input.learning||'unclear',load:input.load||'unknown',path:input.path||'unknown',understanding:input.understanding||'unclear',source:'family_discussion'};
    try{window.LN_STUDENT_PROFILE_RULES_V2981?.saveState?.(next);}catch(e){}
    setVal('studentGender',next.gender);
  }
  function setInterests(ids,manualOnly){
    ids=Array.isArray(ids)?ids.filter(Boolean):[];
    // 审计 case 必须只使用显式传入的兴趣。先清空孩子 intent，避免上一个 case 的电气/医学/计算机等自动映射污染后续场景。
    try{window.LN_CHILD_INTENT_TRANSLATOR_V2976?.clear?.();}catch(e){}
    try{window.LN_CHILD_INTENT_TRANSLATOR_V298?.clear?.();}catch(e){}
    try{document.querySelectorAll('[data-child-intent-id],.intent-chip-v2975,.intent-chip-v2976').forEach(el=>el.classList.remove('active'));}catch(e){}
    try{window.LN_CHILD_INTEREST_RUNTIME_V296?.saveState?.({mode:ids.length?'selected':'undecided',selectedGroups:ids,disabledAutoMappings:[],selectedMajors:[],selectedKeywords:[],manualOnlyInterest:!!manualOnly,confidence:ids.length?'medium':'low',source:'audit-data-safe-runner'});}catch(e){}
    try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}
  }
  function saveStorage(){const o={}; STORAGE_KEYS.forEach(k=>{try{o[k]=localStorage.getItem(k);}catch(e){}}); return o;}
  function restoreStorage(o){STORAGE_KEYS.forEach(k=>{try{o&&o[k]!==null&&o[k]!==undefined?localStorage.setItem(k,o[k]):localStorage.removeItem(k);}catch(e){}});}
  function valRaw(id){const el=$(id); return el?(el.type==='checkbox'?!!el.checked:String(el.value||'')):'';}
  function readAuditState(){
    const child=(()=>{try{return window.LN_CHILD_INTEREST_RUNTIME_V296?.readState?.()||JSON.parse(localStorage.getItem('ln_child_interest_state_v2955')||'{}');}catch(e){return {};}})();
    const intent=(()=>{try{return window.LN_CHILD_INTENT_TRANSLATOR_V2976?.readState?.()||JSON.parse(localStorage.getItem('ln_child_intent_state_v2975')||'{}');}catch(e){return {};}})();
    const profile=(()=>{try{return window.LN_STUDENT_PROFILE_RULES_V2981?.readState?.()||JSON.parse(localStorage.getItem('ln_student_profile_state_v298')||'{}');}catch(e){return {};}})();
    const chips=sel=>[].slice.call(document.querySelectorAll(sel+' .chip.active')).map(ch=>String(ch.dataset.regionGroup||ch.dataset.province||ch.dataset.reject||ch.dataset.value||ch.textContent||'').trim()).filter(Boolean);
    return {score:valRaw('myScore'),rank:valRaw('myRank'),model:valRaw('model'),priority:valRaw('priority'),budget:valRaw('budget'),regionMode:valRaw('regionMode'),cityMode:valRaw('cityMode'),feeType:valRaw('filterFeeType'),sortBy:valRaw('sortBy'),regions:chips('#regionGroupChips'),provinces:chips('#provinceChips'),rejects:chips('#rejectChips'),childInterest:child,childIntent:intent,profile:profile,contextHash:hashText(JSON.stringify({s:valRaw('myScore'),r:valRaw('myRank'),p:valRaw('priority'),b:valRaw('budget'),ri:chips('#regionGroupChips'),pr:chips('#provinceChips'),rej:chips('#rejectChips'),child, intent}))};
  }
  function clearAllChips(){try{document.querySelectorAll('#regionGroupChips .chip,#provinceChips .chip,#rejectChips .chip,[data-child-intent-id],.intent-chip-v2975,.intent-chip-v2976').forEach(ch=>ch.classList.remove('active'));}catch(e){}}
  function resetCaseState(){
    // RC2.4: 这里只清“用户输入状态”，不清 DATA / MANIFEST / chunks / CHUNK_CACHE 等底层数据。
    // 之前 RC2.3 把测试隔离和运行数据 reset 混在一起，导致审计候选池为空。
    try{window.LN_CHILD_INTENT_TRANSLATOR_V2976?.clear?.();}catch(e){}
    try{window.LN_CHILD_INTENT_TRANSLATOR_V298?.clear?.();}catch(e){}
    try{window.LN_CHILD_INTEREST_RUNTIME_V296?.undecided?.();}catch(e){}
    try{window.LN_CHILD_INTEREST_RUNTIME_V296?.saveState?.({mode:'undecided',selectedGroups:[],disabledAutoMappings:[],selectedMajors:[],selectedKeywords:[],manualOnlyInterest:false,confidence:'low',source:'audit-user-reset'});}catch(e){}
    try{window.LN_STUDENT_PROFILE_RULES_V2981?.saveState?.({gender:'unspecified',learning:'unclear',load:'unknown',path:'unknown',understanding:'unclear',source:'audit-user-reset'});}catch(e){}
    clearAllChips();
    ['myScore','myRank','targetCities','qMajor','qSchool'].forEach(id=>setVal(id,''));
    setVal('model','normal'); setVal('priority','employment'); setVal('budget','normal'); setVal('regionMode','none'); setVal('cityMode','none'); setVal('filterFeeType','all'); setVal('filterSchoolTier',''); setVal('sortBy','profile');
    const strict=$('strictProfile'); if(strict){strict.checked=true; strict.dispatchEvent(new Event('change',{bubbles:true}));}
    try{window.currentStrategy='employment';}catch(e){}
    try{currentStrategy='employment';}catch(e){}
    // 只清本轮 A/B/C 派生结果，避免读取上一个 case；不清 filtered/DATA/CHUNK_CACHE。
    try{window.latestPlanBucketsV29475Fix2={A:[],B:[],C:[]};}catch(e){}
    try{latestPlanBucketsV29475Fix2={A:[],B:[],C:[]};}catch(e){}
    try{window.LN_STATE_SNAPSHOT_V296?.reset?.();}catch(e){}
  }
  function readDataState(){
    let manifestReady=false, rankReady=false, dataLen=null, chunkCacheSize=null, manifestVersion='', totalRecords=null, chunks=0;
    try{manifestReady=!!MANIFEST; manifestVersion=MANIFEST?.version||''; totalRecords=MANIFEST?.totalRecords||null; chunks=(MANIFEST?.chunks||[]).length||0;}catch(e){}
    try{rankReady=!!(RANK2025 && Object.keys(RANK2025).length);}catch(e){}
    try{dataLen=Array.isArray(DATA)?DATA.length:null;}catch(e){}
    try{chunkCacheSize=(typeof CHUNK_CACHE!=='undefined'&&CHUNK_CACHE&&typeof CHUNK_CACHE.size==='number')?CHUNK_CACHE.size:null;}catch(e){}
    return {manifestReady,rankReady,manifestVersion,totalRecords,chunks,dataLen,chunkCacheSize};
  }
  async function ensureDataSafeReady(opts){
    opts=opts||{}; const t=Date.now(); const maxMs=Number(opts.dataReadyTimeoutMs||opts.dataTimeoutMs||6500);
    while(Date.now()-t<maxMs){
      const st=readDataState();
      if(st.manifestReady && st.rankReady)return Object.assign({status:'ready',ms:Date.now()-t},st);
      // 如果 boot 还没完成，等待原页面加载；不主动清 DATA。
      await sleep(120);
    }
    const late=readDataState();
    return Object.assign({status:(late.manifestReady?'partial':'not-ready'),ms:Date.now()-t},late);
  }
  function rankFromScore(score){
    score=Number(score||0);
    if(!score)return null;
    try{
      const table=(typeof RANK2025!=='undefined'&&RANK2025)||window.RANK2025||{};
      const direct=Number(table[String(score)]||table[score]||0);
      if(direct>0)return direct;
      let bestRank=null,bestGap=Infinity;
      Object.keys(table||{}).forEach(k=>{
        const s=Number(k), r=Number(table[k]);
        if(Number.isFinite(s)&&Number.isFinite(r)&&r>0){
          const gap=Math.abs(s-score);
          if(gap<bestGap){bestGap=gap;bestRank=r;}
        }
      });
      if(bestRank>0)return bestRank;
    }catch(e){}
    // 低分段或 rank 表未就绪时的审计兜底。只用于 debug case 注入，不参与业务公式。
    if(score>=680)return 350;
    if(score>=650)return 1600;
    if(score>=620)return 6500;
    if(score>=600)return 11500;
    if(score>=580)return 18500;
    if(score>=560)return 28500;
    if(score>=550)return 34000;
    if(score>=530)return 47500;
    if(score>=520)return 55500;
    if(score>=510)return 63000;
    if(score>=500)return 71000;
    if(score>=490)return 80000;
    if(score>=480)return 90000;
    if(score>=470)return 102000;
    if(score>=460)return 116000;
    if(score>=450)return 132000;
    return 150000;
  }
  function auditRank(input){
    input=input||{};
    if(Number(input.rank)>0)return Number(input.rank);
    try{const r=(typeof resolveRank==='function')?resolveRank():null; if(Number(r)>0)return Number(r);}catch(e){}
    try{if(typeof currentRank!=='undefined'&&Number(currentRank)>0)return Number(currentRank);}catch(e){}
    const fallback=rankFromScore(input.score);
    return fallback&&Number(fallback)>0?Number(fallback):null;
  }
  async function applyContext(input,opts){
    opts=opts||{}; input=input||{};
    const t0=performance.now();
    resetCaseState();
    const dataBefore=await ensureDataSafeReady(opts);
    const beforeState=readAuditState();
    const resolvedInputRank=Number(input.rank||0)>0?Number(input.rank):rankFromScore(input.score);
    input.rank=resolvedInputRank||input.rank||'';
    try{window.__LN_AUDIT_CURRENT_CASE__={id:input.id||'',score:input.score||'',rank:input.rank||'',source:VERSION,at:now()};}catch(e){}
    setVal('myScore',input.score||''); setVal('myRank',input.rank||''); setVal('model',input.model||'normal');
    setProfile(input); setInterests(input.interests||[],input.manualOnlyInterest);
    if(typeof window.applyStrategy==='function' && input.scenario){try{window.applyStrategy(input.scenario);}catch(e){window.currentStrategy=input.scenario;}}
    else if(input.scenario){try{window.currentStrategy=input.scenario;}catch(e){}}
    await sleep(Number(opts.afterStrategyMs||40));
    setVal('priority',input.priority||scenarioDefaultPriority(input.scenario)||'employment');
    setVal('budget',input.budget||'normal'); setVal('regionMode',input.regionMode||'hard'); setVal('cityMode',input.cityMode||'none'); setVal('targetCities',(input.cities||[]).join(' '));
    if(input.feeType!==undefined)setVal('filterFeeType',input.feeType);
    if(input.schoolTier!==undefined)setVal('filterSchoolTier',input.schoolTier);
    if(input.majorKeyword!==undefined)setVal('qMajor',input.majorKeyword);
    if(input.schoolKeyword!==undefined)setVal('qSchool',input.schoolKeyword);
    if(input.strictProfile!==undefined){const el=$('strictProfile'); if(el){el.checked=!!input.strictProfile; el.dispatchEvent(new Event('change',{bubbles:true}));}}
    if(input.regions)selectRegionGroups(input.regions);
    if(input.provinces)selectProvinces(input.provinces);
    setRejects(input.rejects||[]);
    try{window.LN_STATE_SNAPSHOT_V296?.reset?.();}catch(e){}
    const dataTimeout=Number(opts.dataTimeoutMs||6500);
    const computeTimeout=Number(opts.computeTimeoutMs||2500);
    let dataStatus='unknown', computeStatus='unknown';
    if(typeof window.autoRefreshAsync==='function'){
      const r=await withTimeout(window.autoRefreshAsync(),dataTimeout,'autoRefreshAsync');
      dataStatus=r&&r.__timeout?'timeout':r&&r.__error?'error':'ok';
      if(r&&r.__error)throw new Error('autoRefreshAsync error: '+r.error);
    }else if(window.LN_REFRESH_CONTROLLER_V292RC?.request){
      const r=await withTimeout(window.LN_REFRESH_CONTROLLER_V292RC.request('abc-human-audit',{delay:0}),computeTimeout,'refresh-controller');
      computeStatus=r&&r.__timeout?'timeout':r&&r.__error?'error':'ok';
    }else if(typeof window.applyFilters==='function'){
      window.applyFilters('abc-human-audit'); computeStatus='sync';
    }
    if(!Array.isArray(window.filtered)||!window.filtered.length||!window.latestPlanBucketsV29475Fix2){
      const ok=await waitForBuckets(Number(opts.bucketTimeoutMs||1800));
      if(!ok && window.LN_COMPUTE_PIPELINE_V2983?.applyFilters){
        const r=await withTimeout(window.LN_COMPUTE_PIPELINE_V2983.applyFilters('abc-human-audit-direct'),computeTimeout,'compute-pipeline-direct');
        computeStatus=r&&r.__timeout?'timeout-direct':r&&r.__error?'error-direct':'ok-direct';
        await waitForBuckets(Number(opts.bucketTimeoutMs||1000));
      }
    }
    const dataAfter=readDataState();
    return {ms:Math.round(performance.now()-t0),dataStatus,computeStatus,dataBefore,dataAfter,filtered:(typeof filtered!=='undefined'&&Array.isArray(filtered))?filtered.length:(Array.isArray(window.filtered)?window.filtered.length:null),rank:auditRank(input),beforeState,afterState:readAuditState()};
  }
  function scenarioDefaultPriority(sc){return ({employment:'employment',exam:'exam',grid:'grid',medical:'medical',teacher:'exam',platformSprint:'school',platformStable:'school',highValue:'employment',publicLow:'lowPublic',edgeBachelor:'lowPublic',budgetFlexible:'city',privateMajor:'employment',broad:'employment'})[sc]||'employment';}
  async function waitForBuckets(maxMs){const t=Date.now(); while(Date.now()-t<maxMs){const b=window.latestPlanBucketsV29475Fix2; if(b && ((Array.isArray(b.A)&&b.A.length)||(Array.isArray(b.B)&&b.B.length)||(Array.isArray(b.C)&&b.C.length))){return true;} await sleep(80);} return false;}
  function rankBand(rank,input){rank=Number(rank||auditRank(input)||0); if(!rank)return 'unknown'; if(rank<=12000)return 'top'; if(rank<=25000)return 'high'; if(rank<=60000)return 'middle'; if(rank<=90000)return 'low'; return 'edge';}
  function expectedCLabel(band){return band==='top'||band==='high'?'争平台':band==='middle'?'看城市/层级':band==='low'?'机会对照':'成本换本科机会';}
  function pathOf(r){try{return window.LN_RULES_CLOSURE_V291?.pathInfo?.(r)||{};}catch(e){return {};}}
  function evalOf(r,type){try{return window.LN_RULES_CLOSURE_V291?.evaluate?.(r,type)||{};}catch(e){return {};}}
  function rowSummary(r,type,input,idx){
    const p=pathOf(r), e=evalOf(r,type), score=Number(input.score||0), rank=Number(auditRank(input)||0);
    return {idx:idx+1,school:r.school||'',major:r.major||'',score2025:r.score2025||null,rank2025:r.rank2025||null,scoreGap:score&&r.score2025?Number(r.score2025)-score:null,rankGap:rank&&r.rank2025?Number(r.rank2025)-rank:null,band:r._level||'',path:p.key||'unknown',layer:p.layer||'',core:!!p.isCore,related:!!p.isRelated,highCost:!!(r.isHighFee||r.isCoopV29475||r.isPrivateV29475),costLabel:e.costRisk?.label||'',siteRisk:e.siteRisk?.level||0,medicalLong:!!e.medicalRisk?.longCycle,medicalNight:!!e.medicalRisk?.night,tags:e.tags||[],notes:(e.notes||[]).slice(0,3),conflicts:e.conflicts||[]};
  }
  function summarizeBucket(rows,type,input){
    rows=rows||[]; const brief=rows.slice(0,6).map((r,i)=>rowSummary(r,type,input,i));
    const bands={}, paths={}; brief.forEach(x=>{bands[x.band||'']=(bands[x.band||'']||0)+1; paths[x.path||'unknown']=(paths[x.path||'unknown']||0)+1;});
    const avg=(arr,field)=>{const vals=arr.map(x=>x[field]).filter(x=>Number.isFinite(Number(x))); return vals.length?Math.round(vals.reduce((a,b)=>a+Number(b),0)/vals.length):null;};
    return {items:brief,bandDistribution:bands,pathDistribution:paths,avgScoreGap:avg(brief,'scoreGap'),avgRankGap:avg(brief,'rankGap'),highCostCount:brief.filter(x=>x.highCost).length,siteRiskCount:brief.filter(x=>x.siteRisk>=3).length,medicalConflictCount:brief.filter(x=>x.medicalLong||x.medicalNight).length};
  }
  function hitRate(summary,expectedPaths){if(!expectedPaths||!expectedPaths.length)return null; const set=new Set(expectedPaths); const n=summary.items.length||1; return Math.round(summary.items.filter(x=>set.has(x.path)).length*100/n)/100;}
  function auditCase(caseDef,actual){
    const input=caseDef.input||{}, expect=caseDef.expect||{}, band=actual.rankBand||'unknown', reasons=[], fail=[];
    const hasScore=Number(input.score||actual.score||0)>0;
    const A=actual.A, B=actual.B, C=actual.C;
    const bHit=hitRate(B,expect.BPaths||expect.paths||[]); const cHit=hitRate(C,expect.CPaths||[]);
    if((input.rejects||[]).includes('高收费') && input.budget!=='high' && input.budget!=='coop' && A.highCostCount>0)fail.push('A 出现高成本候选，与普通预算/拒绝高收费冲突');
    if((input.rejects||[]).includes('工地现场') && A.siteRiskCount>=2)fail.push('A 现场/设备风险过多，与拒绝现场冲突');
    if(expect.BPaths||expect.paths){if(bHit!==null&&bHit<0.5)reasons.push('B 与兴趣/场景主路径命中率偏低：'+bHit);}
    const Bsafe=(B.bandDistribution['保底']||0)+(B.bandDistribution['过低']||0);
    if((['top','high','middle'].includes(band)||hasScore)&&Bsafe>=4)reasons.push('B 保底比例过高，可能把“看专业”做成了“专业版保底”');
    if(['low','edge'].includes(band)&&(C.bandDistribution['保底']||0)>=4 && !['privateMajor','budgetFlexible'].includes(input.scenario))reasons.push('低分/边缘 C 过于保底，机会对照不足');
    if(input.budget==='high'||input.budget==='coop'||input.budget==='flex'){
      if(C.highCostCount===0 && ['privateMajor','budgetFlexible','edgeBachelor'].includes(input.scenario))reasons.push('预算较宽/民办可比较，但 C 未体现成本换机会');
    }
    if(input.interests&&input.interests.length && bHit!==null&&bHit<0.34)fail.push('明确兴趣存在，但 B 几乎没有围绕兴趣路径');
    if((input.rejects||[]).some(x=>x==='夜班'||x==='长学制') && input.interests?.includes('medical_health') && B.medicalConflictCount>=3)reasons.push('医学兴趣与拒绝夜班/长周期冲突，B 中医学长周期风险偏多');
    const after=actual.state&&actual.state.after||{}; const selected=(after.childInterest&&after.childInterest.selectedGroups)||[]; const intents=(after.childIntent&&after.childIntent.selectedIntentIds)||[]; const expectedInterests=input.interests||[];
    if(JSON.stringify(selected.slice().sort())!==JSON.stringify(expectedInterests.slice().sort()))reasons.push('case 兴趣状态与输入不一致，可能存在状态污染：'+JSON.stringify({expected:expectedInterests,actual:selected}));
    if(intents.length)reasons.push('case 仍残留 child intent 自动映射：'+intents.join(','));
    const status=fail.length?'FAIL':reasons.length?'WARN':'PASS';
    return {status,reasons:[...fail,...reasons],metrics:{score:actual.score,rank:actual.rank,rankBand:band,BInterestPathHitRate:bHit,CPathHitRate:cHit,BsafeCount:Bsafe,CLabelExpected:expectedCLabel(band),afterContextHash:actual.state?.after?.contextHash||''}};
  }
  async function runCase(caseDef,opts){
    const input=caseDef.input||{};
    const applyDiag=await applyContext(input,opts||{});
    const b=window.latestPlanBucketsV29475Fix2||{};
    const resolvedRank=auditRank(input);
    const filteredCount=(typeof filtered!=='undefined'&&Array.isArray(filtered))?filtered.length:(Array.isArray(window.filtered)?window.filtered.length:0);
    const actual={caseId:caseDef.id,title:caseDef.title,input,score:Number(input.score||0)||null,rank:resolvedRank,rankBand:rankBand(resolvedRank,input),filtered:filteredCount,applyDiag,state:{before:applyDiag.beforeState,after:applyDiag.afterState},A:summarizeBucket(b.A||[],'A',input),B:summarizeBucket(b.B||[],'B',input),C:summarizeBucket(b.C||[],'C',input)};
    if(!actual.filtered && !(actual.A.items.length||actual.B.items.length||actual.C.items.length))actual.humanAudit={status:'FAIL',reasons:['候选池为空或未完成计算；dataBefore='+JSON.stringify(applyDiag.dataBefore||{})+'；dataAfter='+JSON.stringify(applyDiag.dataAfter||{})],metrics:{}};
    else actual.humanAudit=auditCase(caseDef,actual);
    return actual;
  }
  const CASES=[
    {id:'680-male-computer-platform',title:'680男孩｜计算机AI｜平台优先',input:{score:680,model:'normal',gender:'male',learning:'science',load:'normal',interests:['computer_info'],scenario:'platformSprint',priority:'school',budget:'normal',regionMode:'none',rejects:['高收费']},expect:{paths:['computer','electronic']}},
    {id:'650-female-medical-accept-cycle',title:'650女孩｜医学｜接受长周期',input:{score:650,gender:'female',learning:'science',load:'normal',interests:['medical_health'],scenario:'medical',priority:'medical',budget:'normal',regionMode:'none',rejects:['高收费']},expect:{paths:['medical']}},
    {id:'650-female-medical-reject-cycle',title:'650女孩｜医学｜拒绝夜班长周期',input:{score:650,gender:'female',learning:'science',load:'sensitive',interests:['medical_health'],scenario:'medical',priority:'medical',budget:'normal',regionMode:'none',rejects:['高收费','夜班','长学制']},expect:{paths:['medical']}},
    {id:'620-law-exam-city',title:'620不限｜法学考公｜城市优先',input:{score:620,gender:'unspecified',learning:'expression',load:'normal',interests:['humanities_law'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'soft',regions:['长三角','京津冀'],rejects:['高收费','工地现场']},expect:{paths:['public_service','liberal','accounting','teacher']}},
    {id:'600-male-grid-accept-site',title:'600男孩｜电网｜接受现场',input:{score:600,gender:'male',learning:'practice',load:'normal',interests:['electric_energy'],scenario:'grid',priority:'grid',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['electric','electronic','engineering']}},
    {id:'600-male-grid-reject-site',title:'600男孩｜电网｜拒绝现场',input:{score:600,gender:'male',learning:'science',load:'normal',interests:['electric_energy'],scenario:'grid',priority:'grid',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费','工地现场']},expect:{paths:['electric','electronic','computer']}},
    {id:'580-female-exam-expression-no-site',title:'580女孩｜考公表达｜拒绝现场',input:{score:580,gender:'female',learning:'expression',load:'normal',interests:['humanities_law'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'soft',regions:['东北','京津冀'],rejects:['高收费','工地现场']},expect:{paths:['public_service','liberal','teacher','accounting']}},
    {id:'560-male-computer-strong-code',title:'560男孩｜计算机｜强代码可接受',input:{score:560,gender:'male',learning:'science',load:'normal',interests:['computer_info'],scenario:'employment',priority:'employment',budget:'normal',regionMode:'soft',regions:['东北','京津冀'],rejects:['高收费']},expect:{paths:['computer','electronic']}},
    {id:'560-male-computer-sensitive',title:'560男孩｜计算机｜学习强度敏感',input:{score:560,gender:'male',learning:'science',load:'sensitive',interests:['computer_info'],scenario:'employment',priority:'employment',budget:'normal',regionMode:'soft',regions:['东北'],rejects:['高收费']},expect:{paths:['computer','electronic']}},
    {id:'550-male-grid-employment',title:'550男孩｜电网就业｜普通预算',input:{score:550,gender:'male',learning:'practice',load:'normal',interests:['electric_energy'],scenario:'grid',priority:'employment',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['electric','electronic','engineering']}},
    {id:'550-female-accounting-exam',title:'550女孩｜财会考公｜普通预算',input:{score:550,gender:'female',learning:'expression',load:'normal',interests:['finance_manage','humanities_law'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费','工地现场']},expect:{paths:['accounting','public_service','liberal','teacher']}},
    {id:'530-employment-no-interest',title:'530不限｜就业优先｜无明确兴趣',input:{score:530,gender:'unspecified',learning:'unclear',load:'unknown',interests:[],scenario:'employment',priority:'employment',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{}},
    {id:'530-female-teacher-exam',title:'530女孩｜师范考编',input:{score:530,gender:'female',learning:'expression',load:'normal',interests:['teacher_education'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['teacher','liberal','public_service']}},
    {id:'510-male-mechanical-employment',title:'510男孩｜机械智能制造｜就业',input:{score:510,gender:'male',learning:'practice',load:'normal',interests:['mechanical_instrument'],scenario:'employment',priority:'employment',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['engineering','electronic','electric']}},
    {id:'490-female-teacher-exam-normal',title:'490女孩｜师范考编｜普通预算',input:{score:490,gender:'female',learning:'expression',load:'normal',interests:['teacher_education'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['teacher','liberal','public_service']}},
    {id:'490-male-computer-normal',title:'490男孩｜计算机｜普通预算',input:{score:490,gender:'male',learning:'science',load:'normal',interests:['computer_info'],scenario:'employment',priority:'employment',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['computer','electronic']}},
    {id:'470-female-law-exam-no-fee',title:'470女孩｜法学考公｜拒绝高收费',input:{score:470,gender:'female',learning:'expression',load:'normal',interests:['humanities_law','teacher_education'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费','工地现场']},expect:{paths:['public_service','teacher','liberal','accounting']}},
    {id:'470-male-electric-employment',title:'470男孩｜电气就业｜接受现场',input:{score:470,gender:'male',learning:'practice',load:'normal',interests:['electric_energy'],scenario:'employment',priority:'employment',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['electric','electronic','engineering']}},
    {id:'450-edge-normal-no-fee',title:'450不限｜本科机会｜普通预算',input:{score:450,gender:'unspecified',learning:'unclear',load:'sensitive',interests:[],scenario:'edgeBachelor',priority:'lowPublic',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{}},
    {id:'450-male-computer-private-flex',title:'450男孩｜计算机｜民办可比较不差钱',input:{score:450,gender:'male',learning:'science',load:'normal',interests:['computer_info'],scenario:'privateMajor',priority:'employment',budget:'high',regionMode:'soft',regions:['东北','京津冀','长三角'],rejects:[]},expect:{paths:['computer','electronic']}},
    {id:'450-female-medical-nursing-normal',title:'450女孩｜护理医学相关｜普通预算',input:{score:450,gender:'female',learning:'path_clear',load:'normal',interests:['medical_health'],scenario:'medical',priority:'medical',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费','夜班']},expect:{paths:['medical']}},
    {id:'550-rich-computer-upgrade',title:'550不差钱｜计算机｜提专业档次',input:{score:550,gender:'unspecified',learning:'science',load:'normal',interests:['computer_info'],scenario:'budgetFlexible',priority:'city',budget:'high',regionMode:'soft',regions:['京津冀','长三角'],rejects:[]},expect:{paths:['computer','electronic']}},
    {id:'520-rich-medical',title:'520不差钱｜医学相关',input:{score:520,gender:'unspecified',learning:'science',load:'normal',interests:['medical_health'],scenario:'medical',priority:'medical',budget:'high',regionMode:'soft',regions:['东北','京津冀'],rejects:[]},expect:{paths:['medical']}},
    {id:'480-rich-city-major',title:'480不差钱｜本科+城市+专业',input:{score:480,gender:'unspecified',learning:'path_clear',load:'normal',interests:['computer_info'],scenario:'privateMajor',priority:'city',budget:'high',regionMode:'soft',regions:['京津冀','长三角'],rejects:[]},expect:{paths:['computer','electronic','business']}},
    {id:'580-female-electric-accept-site',title:'580女孩｜电气兴趣｜接受现场',input:{score:580,gender:'female',learning:'science',load:'normal',interests:['electric_energy'],scenario:'grid',priority:'grid',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['electric','electronic','engineering']}},
    {id:'560-male-expression-exam',title:'560男孩｜偏表达｜考公',input:{score:560,gender:'male',learning:'expression',load:'normal',interests:['humanities_law'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'soft',regions:['东北','京津冀'],rejects:['高收费','工地现场']},expect:{paths:['public_service','liberal','teacher','accounting']}},
    {id:'600-male-medical-no-night',title:'600男孩｜医学｜拒绝夜班',input:{score:600,gender:'male',learning:'science',load:'normal',interests:['medical_health'],scenario:'medical',priority:'medical',budget:'normal',regionMode:'none',rejects:['高收费','夜班']},expect:{paths:['medical']}},
    {id:'620-female-computer-no-code-sensitive',title:'620女孩｜计算机｜强度敏感',input:{score:620,gender:'female',learning:'science',load:'sensitive',interests:['computer_info'],scenario:'employment',priority:'employment',budget:'normal',regionMode:'soft',regions:['京津冀','长三角'],rejects:['高收费']},expect:{paths:['computer','electronic']}},
    {id:'580-platform-no-interest',title:'580不限｜平台稳定｜无兴趣',input:{score:580,gender:'unspecified',learning:'unclear',load:'unknown',interests:[],scenario:'platformStable',priority:'school',budget:'normal',regionMode:'none',rejects:['高收费']},expect:{}},
    {id:'520-public-low-normal',title:'520普通家庭｜省内/东北公办优先',input:{score:520,gender:'unspecified',learning:'unclear',load:'unknown',interests:[],scenario:'publicLow',priority:'lowPublic',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{}},
    {id:'500-female-teacher-normal',title:'500女孩｜师范考编｜普通预算',input:{score:500,gender:'female',learning:'expression',load:'normal',interests:['teacher_education'],scenario:'exam',priority:'exam',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{paths:['teacher','liberal','public_service']}},
    {id:'500-male-electric-no-site',title:'500男孩｜电气兴趣｜拒绝现场',input:{score:500,gender:'male',learning:'science',load:'normal',interests:['electric_energy'],scenario:'grid',priority:'grid',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费','工地现场']},expect:{paths:['electric','electronic','computer']}},
    {id:'470-no-interest-public-low',title:'470不限｜低分公办｜无兴趣',input:{score:470,gender:'unspecified',learning:'unclear',load:'sensitive',interests:[],scenario:'publicLow',priority:'lowPublic',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费']},expect:{}},
    {id:'460-female-medical-reject-cycle',title:'460女孩｜医学兴趣｜拒绝夜班长周期',input:{score:460,gender:'female',learning:'path_clear',load:'sensitive',interests:['medical_health'],scenario:'medical',priority:'medical',budget:'normal',regionMode:'hard',regions:['东北'],rejects:['高收费','夜班','长学制']},expect:{paths:['medical']}},
    {id:'650-rich-platform-city',title:'650不差钱｜平台+城市',input:{score:650,gender:'unspecified',learning:'science',load:'normal',interests:['computer_info'],scenario:'budgetFlexible',priority:'city',budget:'high',regionMode:'soft',regions:['京津冀','长三角','珠三角'],rejects:[]},expect:{paths:['computer','electronic','business']}},
    {id:'600-female-finance-city',title:'600女孩｜财会金融｜城市优先',input:{score:600,gender:'female',learning:'expression',load:'normal',interests:['finance_manage'],scenario:'employment',priority:'city',budget:'normal',regionMode:'soft',regions:['京津冀','长三角'],rejects:['高收费']},expect:{paths:['accounting','business','public_service']}}
  ];
  function selectCases(opts){
    opts=opts||{};
    let list=CASES.slice();
    const mode=opts.mode||opts.suite||'core';
    if(mode==='core')list=list.filter(c=>CORE_CASE_IDS.has(c.id));
    if(Array.isArray(opts.ids)&&opts.ids.length){const ids=new Set(opts.ids);list=CASES.filter(c=>ids.has(c.id));}
    const limit=Number(opts.limit||0); if(limit>0)list=list.slice(0,limit);
    return {mode,list};
  }
  function buildAuditReport(mode,list,results,t,perCaseTimeout,caseOpts,extra){
    const counts=results.reduce((a,x)=>{const s=x.humanAudit?.status||'UNKNOWN';a[s]=(a[s]||0)+1;return a;},{});
    const flags=results.filter(x=>x.humanAudit?.status!=='PASS').map(x=>({id:x.caseId,title:x.title,status:x.humanAudit?.status,reasons:x.humanAudit?.reasons||[],durationMs:x.durationMs||null,applyDiag:x.applyDiag||null}));
    let status='PASS';
    if(extra&&extra.running)status='RUNNING';
    else if(!list.length)status='FAIL';
    else if(!results.length)status='FAIL';
    else if(counts.FAIL)status='FAIL';
    else if(counts.TIMEOUT||counts.WARN)status='WARN';
    const report={kind:'LN Fenxi ABC Human Policy Audit',version:VERSION,generatedAt:now(),mode,caseTotal:results.length,expectedTotal:list.length,counts,status,flags,results,durationMs:Math.round(performance.now()-t),timeouts:counts.TIMEOUT||0,policy:{doesModifyBusiness:false,doesModifyFormula:false,doesModifyABC:false,purpose:'自动模拟人类真实家庭场景，审计 A/B/C 是否符合语义。'},runner:{perCaseTimeoutMs:perCaseTimeout,caseOptions:caseOpts,coreCaseCount:[...CORE_CASE_IDS].length,totalCaseCount:CASES.length,completed:results.length,remaining:Math.max(0,list.length-results.length)}};
    if(extra)Object.assign(report,extra);
    try{window.__LN_ABC_POLICY_AUDIT_LAST__=report;}catch(e){}
    try{window.dispatchEvent(new CustomEvent('ln:abc-human-audit-progress',{detail:report}));}catch(e){}
    return report;
  }
  async function runAll(opts){
    opts=opts||{}; const original=saveStorage(); const t=performance.now(); const picked=selectCases(opts); const list=picked.list; const mode=picked.mode;
    const results=[]; const perCaseTimeout=Number(opts.perCaseTimeoutMs||12000); const caseOpts={dataTimeoutMs:Number(opts.dataTimeoutMs||4200),computeTimeoutMs:Number(opts.computeTimeoutMs||2200),bucketTimeoutMs:Number(opts.bucketTimeoutMs||1200),afterStrategyMs:Number(opts.afterStrategyMs||30)};
    buildAuditReport(mode,list,results,t,perCaseTimeout,caseOpts,{running:true,note:'审计已启动，debug 外层超时时可读取此 partial report，避免 caseTotal 被清零。'});
    try{
      for(let i=0;i<list.length;i++){
        const c=list[i]; const oneStart=performance.now();
        let res=await withTimeout(runCase(c,caseOpts),perCaseTimeout,'case:'+c.id);
        if(res&&res.__timeout){res={caseId:c.id,title:c.title,input:c.input,durationMs:Math.round(performance.now()-oneStart),humanAudit:{status:'TIMEOUT',reasons:['单 case 超时：'+perCaseTimeout+'ms，已跳过并继续后续场景'],metrics:{}},timeout:true};}
        else if(res&&res.__error){res={caseId:c.id,title:c.title,input:c.input,durationMs:Math.round(performance.now()-oneStart),humanAudit:{status:'FAIL',reasons:['单 case 异常：'+res.error],metrics:{}},error:res.error,stack:res.stack};}
        else {res.durationMs=Math.round(performance.now()-oneStart);}
        results.push(res);
        buildAuditReport(mode,list,results,t,perCaseTimeout,caseOpts,{running:true,lastCaseId:c.id,lastCaseStatus:res.humanAudit?.status||'UNKNOWN'});
        if(opts.progress)try{opts.progress(i+1,list.length,c,res);}catch(e){}
        await sleep(Number(opts.betweenCaseMs||60));
      }
    }finally{restoreStorage(original); try{window.LN_STUDENT_PROFILE_RULES_V2981?.readState?.(); window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){} }
    return buildAuditReport(mode,list,results,t,perCaseTimeout,caseOpts,{running:false});
  }
  window.LN_TEST_INTERFACE_V292RC2={ready:true,version:VERSION,applyContext,runCase,runAll,selectCases,cases:CASES,coreCaseIds:[...CORE_CASE_IDS],readDataState,ensureDataSafeReady,rankFromScore};
  window.LN_ABC_POLICY_AUDIT_V292RC2={ready:true,version:VERSION,cases:CASES,coreCaseIds:[...CORE_CASE_IDS],runCase,runAll,selectCases,auditCase,readDataState,ensureDataSafeReady,rankFromScore,lastReport:()=>window.__LN_ABC_POLICY_AUDIT_LAST__};
})();
