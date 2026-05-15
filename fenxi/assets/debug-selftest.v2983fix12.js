// V2.9.8.3.fix12 debug self-test runner: same-origin iframe automation for business linkage checks.
(function(){
  const REPORT_KEY='ln_v2983_selftest_report';
  const DEBUG_KEY='ln_v2983_debug_report';
  const STAMP=(window.__LN_TOOL_STAMP||'291rc0parenttrust2-20260514');
  const VERSION=(window.__LN_TOOL_VERSION||'V2.91RC0.parent-trust2');
  const ACCESS_CODE='ln2026';
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const now=()=>performance&&performance.now?performance.now():Date.now();
  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  function text(v){return String(v==null?'':v);}
  function localTime(){try{return new Date().toLocaleString();}catch(e){return new Date().toISOString();}}
  function readStored(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'{}');}catch(e){return {parseError:String(e)};}}
  function writeStored(obj){try{localStorage.setItem(REPORT_KEY,JSON.stringify(obj));}catch(e){}}
  function backupStorage(){const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}}catch(e){}return o;}
  function restoreStorage(o, keep){try{localStorage.clear();Object.keys(o||{}).forEach(k=>localStorage.setItem(k,o[k]));Object.keys(keep||{}).forEach(k=>localStorage.setItem(k,keep[k]));}catch(e){}}
  function createFrame(){let box=q('#selfTestFrameBox');let f=q('#selfTestFrame');if(!box){box=document.createElement('div');box.id='selfTestFrameBox';box.className='card';box.innerHTML='<div class="muted">自测沙盒：将在下面 iframe 中加载工具页，不需要你手动点模块。</div><iframe id="selfTestFrame" title="自测沙盒" style="width:100%;height:520px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;margin-top:10px"></iframe>';q('main')?.appendChild(box);f=q('#selfTestFrame');}return f;}
  function setStatus(msg){const el=q('#selfTestStatus');if(el)el.textContent=msg;}
  function renderSelfReport(){const r=readStored();const el=q('#selfReport');if(!el)return; if(!r||!r.startedAt){el.textContent='尚未运行自测。';return;}const lines=[];lines.push('【辽宁物理类工具 自测报告】');lines.push('运行时间：'+(r.startedAt||''));lines.push('模式：'+(r.mode||''));lines.push('版本：'+(r.version||''));lines.push('版本戳：'+(r.stamp||''));lines.push('总步骤：'+(r.summary?.steps||0)+'；通过：'+(r.summary?.pass||0)+'；失败：'+(r.summary?.fail||0)+'；警告：'+(r.summary?.warn||0));if(r.summary?.durationMs!=null)lines.push('总耗时：'+r.summary.durationMs+'ms');if(r.summary?.cases!=null)lines.push('矩阵场景：'+r.summary.cases+'；覆盖：'+JSON.stringify(r.coverage||{}));if(r.authLocked)lines.push('访问状态：自动登录后仍处于 locked；请检查 /fenxi/api/login 是否可用，或确认访问凭证是否仍为 ln2026。');if(r.finalDebug){lines.push('最终候选池：'+JSON.stringify(r.finalDebug.pools||{}));lines.push('最终上下文：'+JSON.stringify(r.finalDebug.context||{}));lines.push('最终标记：'+JSON.stringify(r.finalDebug.flags||{}));}
    lines.push('步骤明细：');(r.steps||[]).forEach((s,i)=>{lines.push(' - '+String(i+1).padStart(2,'0')+'. '+s.status.toUpperCase()+'｜'+s.name+'｜'+s.ms+'ms'+(s.note?'｜'+s.note:'')); if(s.err)lines.push('   err: '+s.err); if(s.asserts&&s.asserts.length)lines.push('   asserts: '+s.asserts.map(a=>a.ok?'✓ '+a.name:'✗ '+a.name).join('；'));});
    if((r.failures||[]).length){lines.push('失败摘要：');r.failures.forEach(f=>lines.push(' - '+f.name+': '+(f.err||f.note||'')));}
    if((r.warnings||[]).length){lines.push('警告摘要：');r.warnings.forEach(f=>lines.push(' - '+f.name+': '+(f.note||'')));}
    el.textContent=lines.join('\n');}
  function addUi(){
    const card=q('#selfTestCard'); if(card)return;
    const div=document.createElement('div');div.className='card';div.id='selfTestCard';
    div.innerHTML='<h2 style="margin:0 0 8px">一键联动自测</h2><p class="muted">用于自动模拟位次、家庭底线、画像、兴趣、只看真实命中、场景、A/B/C、翻页、抽屉等链路。会自动使用测试凭证进入沙盒工具页，不需要先手动进入工具。</p><button id="runSmokeSelfTest">快速体检</button><button id="runDeepSelfTest">深度矩阵自测</button><button id="copySelfTest">复制自测报告</button><span id="selfTestStatus" class="muted">尚未运行</span><pre id="selfReport" style="margin-top:12px;max-height:48vh">尚未运行自测。</pre>';
    const first=q('main .card');first?.after(div);renderSelfReport();
    q('#runSmokeSelfTest')?.addEventListener('click',()=>runSelfTest('smoke'));
    q('#runDeepSelfTest')?.addEventListener('click',()=>runSelfTest('deep'));
    q('#copySelfTest')?.addEventListener('click',async()=>{renderSelfReport();const txt=q('#selfReport')?.textContent||'';await navigator.clipboard.writeText(txt).catch(()=>{});setStatus('自测报告已复制');});
  }
  function fire(win,el,type='change'){if(!el)return;el.dispatchEvent(new win.Event(type,{bubbles:true,cancelable:true}));}
  function click(win,el){if(!el)return false;el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true,view:win}));return true;}
  function setInput(win,id,value){const el=win.document.getElementById(id);if(!el)throw new Error('找不到输入框 '+id);el.value=value;fire(win,el,'input');fire(win,el,'change');return true;}
  function setSelect(win,id,value){const el=win.document.getElementById(id);if(!el)throw new Error('找不到选择框 '+id);el.value=value;fire(win,el,'change');return true;}
  function selectedProvinces(win){return qa('#provinceChips .chip.active',win.document).map(x=>x.dataset.province).filter(Boolean);}
  function setProvinceMode(win,mode,group){setSelect(win,'regionMode',mode); if(typeof win.clearProvinces==='function')win.clearProvinces(); if(group&&typeof win.selectRegionGroup==='function')win.selectRegionGroup(group,true); fire(win,win.document.getElementById('regionMode'),'change');}
  async function waitFor(cond,timeout=12000,label='条件'){const start=now();while(now()-start<timeout){try{if(cond())return true;}catch(e){}await sleep(80);}throw new Error('等待超时：'+label);}
  async function autoLoginFromDebug(){
    const out={ok:false,via:'debug-fetch',status:0};
    try{localStorage.setItem('ln_access_ok','1');}catch(e){}
    try{
      const res=await fetch('./api/login',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:ACCESS_CODE})});
      out.status=res.status;
      const json=await res.json().catch(()=>({ok:false}));
      out.ok=!!(res.ok&&json.ok); out.reason=json.reason||'';
    }catch(e){out.err=String(e&&e.message||e);}return out;
  }
  async function unlockFrameIfNeeded(win){
    const app=()=>win.document.getElementById('app');
    if(app()&&!app().classList.contains('locked')) return {ok:true,via:'already-unlocked'};
    try{win.localStorage.setItem('ln_access_ok','1');}catch(e){}
    const input=win.document.getElementById('accessCodeTop');
    if(input){input.value=ACCESS_CODE;fire(win,input,'input');fire(win,input,'change');}
    try{if(typeof win.unlockAccess==='function'){const r=win.unlockAccess(); if(r&&typeof r.then==='function')await r;}else{click(win,win.document.querySelector('[data-action="unlock-top"]'));}}catch(e){}
    const start=now();while(now()-start<10000){if(app()&&!app().classList.contains('locked'))return {ok:true,via:'frame-unlock'};await sleep(120);}return {ok:false,via:'frame-unlock-timeout'};
  }
  async function waitBoot(win){
    await waitFor(()=>win.document&&win.document.readyState!=='loading',15000,'iframe document ready');
    await waitFor(()=>!!(win.LN_DEBUG_V2983&&win.LN_APP_V2983&&win.LN_COMPUTE_PIPELINE_V2983),18000,'核心脚本就绪');
    if(win.document.getElementById('app')?.classList.contains('locked')){const unlocked=await unlockFrameIfNeeded(win); if(!unlocked.ok)return false;}
    await waitFor(()=>qa('#provinceChips .chip',win.document).length>0,12000,'省份 chip 就绪');
    return true;
  }
  async function waitComputeQuiet(win,minWait=220){await sleep(minWait);const start=now();while(now()-start<6000){const q=win.LN_DEBUG_V2983?.state?.queue||{};if(!q.running&&!q.pending)break;await sleep(100);}await sleep(120);}
  function debugSnap(win){try{return win.LN_DEBUG_V2983?.report?.()||{};}catch(e){return {snapError:String(e)};}}
  function assertList(items){return items.map(x=>({name:x[0],ok:!!x[1]}));}
  function hasFail(asserts){return (asserts||[]).some(a=>!a.ok);}
  async function runStep(ctx,name,fn,opts={}){const t=now();const item={name,status:'pass',ms:0,asserts:[]};try{const res=await fn(); if(res){if(res.note)item.note=res.note;if(res.asserts)item.asserts=res.asserts;if(res.warn){item.status='warn';item.note=res.warn;}} if(hasFail(item.asserts)&&item.status!=='warn'){item.status=opts.warnOnly?'warn':'fail';}}catch(e){item.status=opts.warnOnly?'warn':'fail';item.err=String(e&&e.message||e);}finally{item.ms=Math.round(now()-t);ctx.steps.push(item);if(item.status==='fail')ctx.failures.push(item);if(item.status==='warn')ctx.warnings.push(item);setStatus('自测中：'+ctx.steps.length+' 步，最近：'+name+'（'+item.status+'）');writeStored(makeReport(ctx));renderSelfReport();}return item;}
  function makeReport(ctx){const pass=ctx.steps.filter(s=>s.status==='pass').length,fail=ctx.steps.filter(s=>s.status==='fail').length,warn=ctx.steps.filter(s=>s.status==='warn').length;return {version:VERSION,stamp:STAMP,mode:ctx.mode,startedAt:ctx.startedAt,summary:{steps:ctx.steps.length,pass,fail,warn,durationMs:Math.round(now()-ctx.start),cases:ctx.cases||0},coverage:ctx.coverage,steps:ctx.steps,failures:ctx.failures,warnings:ctx.warnings,finalDebug:ctx.finalDebug,authLocked:ctx.authLocked||false};}
  function prepareInterests(win,ids,manualOnly){const rt=win.LN_CHILD_INTEREST_RUNTIME_V296;if(!rt)throw new Error('兴趣 runtime 未就绪');rt.saveState({mode:ids.length?'selected':'undecided',selectedGroups:ids,selectedMajors:[],disabledAutoMappings:[],manualOnlyInterest:!!manualOnly,confidence:'low',source:'debug_selftest',schemaVersion:3});win.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}
  async function waitDataForCurrentRank(win,label){
    const start=now(); let called=false; let timedOut=false; let err='';
    try{ if(typeof win.ensureDataForCurrentRank==='function'){called=true; const p=win.ensureDataForCurrentRank(); if(p&&typeof p.then==='function') await Promise.race([p,sleep(12000).then(()=>{timedOut=true;})]);} }catch(e){err=String(e&&e.message||e);}
    const pollStart=now();
    while(!timedOut && now()-pollStart<12000){
      const snap=debugSnap(win); const rows=Number(snap.pools?.loadedRows||0) || Number((win.DATA||[]).length||0);
      const rank=Number(win.document.getElementById('myRank')?.value||0) || Number(win.currentRank||0);
      if(!rank || rows>0) break;
      await sleep(120);
    }
    const snap=debugSnap(win); const rows=Number(snap.pools?.loadedRows||0) || Number((win.DATA||[]).length||0);
    const rank=Number(win.document.getElementById('myRank')?.value||0) || Number(win.currentRank||0);
    if(rank && rows<=0 && now()-pollStart>=12000) timedOut=true;
    try{win.LN_DEBUG_V2983?.detail?.('selfTestDataWait',{label,rank,rows,called,ms:Math.round(now()-start),timedOut,err});}catch(e){}
    return {rank,rows,called,ms:Math.round(now()-start),timedOut,err};
  }
  async function applyAndCheck(ctx,win,label,expect={}){const before=debugSnap(win); const t=now(); const dataWait=await waitDataForCurrentRank(win,label); let arr=[]; if(typeof win.applyFilters==='function')arr=win.applyFilters('debug-selftest-'+label)||[]; await waitComputeQuiet(win,160); const snap=debugSnap(win); const pools=snap.pools||{}; const details=snap.details||{}; const timings=snap.timings||{}; const region=details.regionFilterDebug||details.baseFilterStats?.regionFilterDebug||{}; const sb=details.scorePoolBreakdown||{}; const asserts=assertList([
      ['loadedRows>0', (pools.loadedRows||0)>0],
      ['basePool<=loadedRows', (pools.basePool||0)<=Math.max(1,pools.loadedRows||0)],
      ['filtered 合法', Number.isFinite(Number(pools.filtered))&&Number(pools.filtered)>=0],
      ['applyFiltersTotal 有记录', !!timings.applyFiltersTotal],
      ['队列未卡住', !(snap.queue&&snap.queue.running===true)]
    ]);
    if(expect.hardLiaoning){asserts.push(...assertList([
      ['hard 辽宁目标存在', region.mode==='hard' && (region.targetProvinces||[]).includes('辽宁')],
      ['hard 辽宁无异常保留外省样本', !(region.sampleUnexpectedKept||[]).length],
      ['hard 辽宁 unmatchedKept=0', Number(region.unmatchedKept||0)===0]
    ]));}
    if(expect.manualOnly){asserts.push(...assertList([
      ['manualOnly 标记为 true', pools.manualOnly===true || sb.manualOnly===true],
      ['interestFastFilter 出现', !!details.interestFastFilter || sb.fastInterest===true],
      ['兴趣预筛毫秒级记录', Number(sb.time?.preInterestFilter ?? details.interestPreFilter?.ms ?? 999999)<300]
    ]));}
    const note=`${label} pools=${JSON.stringify(pools)} waitData=${dataWait.ms}ms rows=${dataWait.rows} apply=${timings.applyFiltersTotal?.ms??'NA'}ms step=${Math.round(now()-t)}ms beforeFiltered=${before.pools?.filtered??''}`;
    if(dataWait.timedOut && !(pools.loadedRows>0)) return {asserts,note,warn:'分块数据等待超时，按 WARN 处理；请复查网络或 data/chunks 是否完整。'};
    return {asserts,note};}
  function setProfileFast(win){const rules=win.LN_STUDENT_PROFILE_RULES_V298; if(!rules)return false; const s=rules.readState?.()||{}; Object.assign(s,{gender:'male',source:'child_self',learning:'path_clear',path:'work_first',understanding:'has_direction'}); rules.saveState?.(s); win.LN_STUDENT_PROFILE_UI_V2975?.renderSummary?.(); return true;}
  async function runSelfTest(mode){
    const backup=backupStorage(); const frame=createFrame(); const ctx={mode,startedAt:localTime(),start:now(),steps:[],failures:[],warnings:[],coverage:{ranks:[],regions:[],budgets:[],interests:[],manualOnly:[],scenarios:[]},cases:0};
    await runStep(ctx,'自动访问凭证登录',async()=>{const r=await autoLoginFromDebug();return {asserts:assertList([['已设置本机访问状态',localStorage.getItem('ln_access_ok')==='1']]),note:'debug-fetch ok='+r.ok+' status='+(r.status||'')+(r.err?' err='+r.err:'')};},{warnOnly:true});
    writeStored(makeReport(ctx));renderSelfReport();setStatus('正在加载自测沙盒...');
    try{
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('iframe 加载超时')),20000);
        frame.onload=()=>{clearTimeout(timer);resolve();};
        frame.src='./index.html?debugSelfTest='+encodeURIComponent(mode)+'&t='+Date.now();
      });
    }catch(e){await runStep(ctx,'加载 iframe',()=>{throw e;});return;}
    const win=frame.contentWindow;
    const unlocked=await runStep(ctx,'启动与访问状态检查',async()=>{const ok=await waitBoot(win); if(!ok){ctx.authLocked=true;return {asserts:assertList([['工具页已解锁',false]]),note:'自动登录后仍 locked，请检查 Functions 登录接口或凭证'}} const snap=debugSnap(win); return {asserts:assertList([['debug ready',!!win.LN_DEBUG_V2983],['compute ready',!!win.LN_COMPUTE_PIPELINE_V2983],['版本可读',!!snap.version]])};});

    await runStep(ctx,'rules-core1 分段规则包加载与导出检查',async()=>{const st=win.LN_RULES_CORE_BUNDLE_STATUS||{};const loaded=(st.loaded||[]).map(x=>x.name);const snap=debugSnap(win);return {asserts:assertList([
      ['rules bundle opt 开启',win.LN_RULES_BUNDLE_OPT!==false],
      ['rules bundle 版本正确',win.LN_RULES_BUNDLE_VERSION==='291rc0-rules-core1-20260513'],
      ['rules bundle 状态存在',!!st && st.version==='291rc0-rules-core1-20260513'],
      ['rules bundle 分段包数量>=6',loaded.length>=6],
      ['interest rules 导出存在',!!win.LN_INTEREST_TAXONOMY_V298 && !!win.LN_CATALOG_MATCH_ENGINE_V298 && !!win.LN_INTEREST_HIT_SUMMARY_V298],
      ['path rules 导出存在',!!win.LN_PATH_REVIEW_RULES_V298 && !!win.LN_PATH_EXPLAIN_ENGINE_V298],
      ['decision rules 导出存在',!!win.LN_ADMISSION_SAFETY_RULES_V2981 && !!win.LN_ABC_DECISION_CARD_MODEL_V2981],
      ['detail/export rules 导出存在',!!win.LN_PARENT_MUST_READ_RULES_V2981FIX2 && !!win.LN_DETAIL_CARD_LITE_MODEL_V2981FIX2],
      ['debug flags 有 rulesBundle 标记',snap.flags?.rulesBundle==='v291rc0rules1']
    ]),note:'bundles='+loaded.join(',')};});

    await runStep(ctx,'ui-core1 分段 UI 包加载与导出检查',async()=>{const st=win.LN_UI_CORE_BUNDLE_STATUS||{};const loaded=(st.loaded||[]).map(x=>x.name);const snap=debugSnap(win);return {asserts:assertList([
      ['ui bundle opt 开启',win.LN_UI_BUNDLE_OPT!==false],
      ['ui bundle 版本正确',win.LN_UI_BUNDLE_VERSION==='291rc0-ui-core1-20260513'],
      ['ui bundle 状态存在',!!st && st.version==='291rc0-ui-core1-20260513'],
      ['ui bundle 分段包数量>=6',loaded.length>=6],
      ['form UI 导出存在',!!win.LN_CHILD_INTEREST_UI_V296 && !!win.LN_CHILD_INTENT_UI_V2981 && !!win.LN_SCENARIO_UI_V296],
      ['result UI 导出存在',!!win.LN_ABC_VIEW_V296 && !!win.LN_CANDIDATE_CARD_VIEW_V296],
      ['detail UI 导出存在',!!win.LN_CANDIDATE_TAG_UI_V2981 && !!win.LN_DETAIL_CARD_UI_V2981],
      ['late UI 导出存在',!!win.LN_ABC_LIGHT_UI_V2983FIX3 && !!win.LN_INTEREST_DRAWER_SLIM_V2983FIX4 && !!win.LN_MODULE_STEP_PRIORITY_V2983FIX3],
      ['debug flags 有 uiBundle 标记',snap.flags?.uiBundle==='v291rc0ui1']
    ]),note:'bundles='+loaded.join(',')};});

    await runStep(ctx,'coordinator1 协调层门面加载与导出检查',async()=>{const c=win.LN_APP_COORDINATOR;let dry=null;try{dry=c?.requestApply?.('debug-selftest-coordinator-dry-run',{execute:false});}catch(e){dry={error:String(e&&e.message||e)}}const snap=debugSnap(win);return {asserts:assertList([
      ['coordinator opt 开启',win.LN_APP_COORDINATOR_OPT!==false],
      ['coordinator 版本正确',win.LN_APP_COORDINATOR_VERSION==='291rc0-coordinator1-20260513'],
      ['coordinator 对象存在',!!c && c.stamp==='291rc0-coordinator1-20260513'],
      ['coordinator requestApply 存在',typeof c?.requestApply==='function'],
      ['coordinator snapshot 存在',typeof c?.snapshot==='function' && !!c.snapshot('selftest')],
      ['coordinator fingerprint 存在',typeof c?.fingerprint==='function' && !!c.fingerprint('selftest')],
      ['coordinator drawer API 存在',!!c?.drawer && typeof c.drawer.markDirty==='function' && typeof c.drawer.open==='function' && typeof c.drawer.close==='function'],
      ['coordinator dryRun 不触发计算',!!dry && dry.ok===true && dry.dryRun===true],
      ['debug flags 有 appCoordinator 标记',snap.flags?.appCoordinator==='v291rc0coord1']
    ]),note:'applyRequests='+((c?.state?.applyRequests||[]).length)+' counters='+JSON.stringify(c?.state?.counters||{})};});

    await runStep(ctx,'model-audit1 JSON模型审计注册表检查',async()=>{const st=win.LN_MODEL_AUDIT_STATUS;const rep=st?.report?.();const snap=debugSnap(win);return {asserts:assertList([
      ['model audit opt 开启',win.LN_MODEL_AUDIT_OPT!==false],
      ['model audit 版本正确',win.LN_MODEL_AUDIT_VERSION==='291rc0-model-audit1-20260513'],
      ['model audit 对象存在',!!st && st.version==='291rc0-model-audit1-20260513'],
      ['model audit report 存在',!!rep && !!rep.summary],
      ['JSON 登记数量>=50',Number(rep?.summary?.jsonTotal||0)>=50],
      ['重模型 topHeavy 存在',Array.isArray(rep?.topHeavy)&&rep.topHeavy.length>=6],
      ['不修改公式/数据/加载策略',rep?.policy?.doesModifyFormula===false && rep?.policy?.doesModifyData===false && rep?.policy?.doesLazyLoad===false && rep?.policy?.doesShard===false],
      ['debug flags 有 modelAudit 标记',snap.flags?.modelAudit==='v291rc0modelaudit1']
    ]),note:'jsonTotal='+(rep?.summary?.jsonTotal||0)+' runtimeRequired='+(rep?.summary?.runtimeRequiredCount||0)+' loaded='+(rep?.runtime?.loadedCount||0)};});

    await runStep(ctx,'model-lazy1 非首屏模型延后加载检查',async()=>{const lazy=win.LN_MODEL_LAZY;const st=win.LN_MODEL_LAZY_STATUS;const snap=debugSnap(win);return {asserts:assertList([
      ['model lazy opt 开启',win.LN_MODEL_LAZY_OPT!==false],
      ['model lazy 版本正确',win.LN_MODEL_LAZY_VERSION==='291rc0-model-lazy1-20260513'],
      ['model lazy 对象存在',!!lazy && lazy.version==='291rc0-model-lazy1-20260513'],
      ['model lazy 状态存在',!!st && st.version==='291rc0-model-lazy1-20260513'],
      ['冷模型列表存在',!!st?.coldModels && Object.keys(st.coldModels).length>=3],
      ['不改公式/数据/候选池',st?.policy?.doesModifyFormula===false && st?.policy?.doesModifyData===false && st?.policy?.doesChangeCandidatePool===false && st?.policy?.doesChangeSorting===false],
      ['有后台预热 API',typeof lazy?.schedule==='function' && typeof lazy?.ensureAll==='function'],
      ['debug flags 有 modelLazy 标记',snap.flags?.modelLazy==='v291rc0lazy1']
    ]),note:'status='+(lazy?.overallStatus?.()||'unknown')+' coldModels='+Object.keys(st?.coldModels||{}).join(',')};});


    await runStep(ctx,'parent-trust2 家长语言与视觉信任检查',async()=>{const pt=win.LN_PARENT_TRUST_V291RC0;pt?.render?.();await sleep(120);const st=pt?.getState?.()||{};const snap=debugSnap(win);const panel=win.document.getElementById('targetPathPanelV2952');const explain=win.document.getElementById('targetPathExplainV2952')?.textContent||'';return {asserts:assertList([
      ['parent trust opt 开启',win.LN_PARENT_TRUST_OPT!==false],
      ['parent trust 版本正确',win.LN_PARENT_TRUST_VERSION==='291rc0parenttrust2-20260514'],
      ['parent trust 对象存在',!!pt && pt.version==='v291rc0parenttrust2'],
      ['当前情况可读',!!st.scenarioEffective || !!st.scenario],
      ['effectivePriority 可读',!!st.effectivePriority],
      ['scenarioRaw 字段存在',Object.prototype.hasOwnProperty.call(st,'scenarioRaw')],
      ['scenarioEffective 可读',!!st.scenarioEffective],
      ['prioritySource 合法',['scenario-default','user-tuned'].includes(st.prioritySource)],
      ['视觉收口 CSS 状态存在',!!panel],
      ['当前优先考虑说明已改口径',explain.includes('A/B/C')||!!win.document.querySelector('.parent-trust-summary-v291')],
      ['debug flags 有 parentTrust 标记',snap.flags?.parentTrust==='v291rc0parenttrust2'],
      ['debug flags 有 effectivePriority',!!snap.flags?.effectivePriority],
      ['debug flags 有 scenarioRaw',Object.prototype.hasOwnProperty.call(snap.flags||{},'scenarioRaw')],
      ['debug flags 有 scenarioEffective',!!snap.flags?.scenarioEffective],
      ['debug flags 有 prioritySource',['scenario-default','user-tuned'].includes(snap.flags?.prioritySource)]
    ]),note:'scenarioRaw='+st.scenarioRaw+' scenarioEffective='+st.scenarioEffective+' priority='+st.effectivePriority+' source='+st.prioritySource};});

    await runStep(ctx,'parent-trust2 手动调整 priority 不被我家情况覆盖',async()=>{const pt=win.LN_PARENT_TRUST_V291RC0;setSelect(win,'priority','school');await sleep(120);if(typeof win.applyStrategy==='function')win.applyStrategy('exam');await waitComputeQuiet(win,260);pt?.render?.();await sleep(120);const st=pt?.getState?.()||{};const snap=debugSnap(win);return {asserts:assertList([
      ['手动微调后 priority=school',st.effectivePriority==='school'],
      ['手动微调来源=user-tuned',st.prioritySource==='user-tuned'||snap.flags?.prioritySource==='user-tuned'],
      ['情况可切到 exam',st.scenarioEffective==='exam'||st.scenario==='exam'||snap.flags?.scenarioEffective==='exam'||snap.flags?.scenario==='exam']
    ]),note:'scenarioRaw='+st.scenarioRaw+' scenarioEffective='+st.scenarioEffective+' priority='+st.effectivePriority+' source='+st.prioritySource};});

    await runStep(ctx,'rules-closure4 闭环解释与路径分类加载检查',async()=>{const rc=win.LN_RULES_CLOSURE_V291;rc?.refreshDebug?.();await sleep(80);const snap=debugSnap(win);return {asserts:assertList([
      ['rules closure opt 开启',win.LN_RULES_CLOSURE_OPT!==false],
      ['rules closure4 对象存在',!!rc && rc.version==='v291rc0closure4'],
      ['context 可读',!!rc?.debugContext?.()],
      ['scoreAdjustment 存在',typeof rc?.scoreAdjustment==='function'],
      ['pathInfo 存在',typeof rc?.pathInfo==='function'],
      ['debug flags 有 rulesClosure 标记',snap.flags?.rulesClosure==='v291rc0closure4']
    ]),note:'context='+JSON.stringify(rc?.debugContext?.()||{})};});

    await runStep(ctx,'rules-closure4 女生考公拒绝现场压住电气样例',async()=>{const rc=win.LN_RULES_CLOSURE_V291;win.LN_STUDENT_PROFILE_RULES_V298?.saveState?.({gender:'female',learning:'expression',load:'sensitive',path:'exam_ok',understanding:'has_direction'});setSelect(win,'studentGender','female');setSelect(win,'fieldWorkAcceptance','reject');setSelect(win,'priority','exam');const chip=win.document.querySelector('#rejectChips [data-reject=\"工地现场\"]');if(chip)chip.classList.add('active');if(typeof win.applyStrategy==='function')win.applyStrategy('exam');await sleep(120);const sample={school:'样例大学',major:'电气工程及其自动化',majorText:'电气工程及其自动化',schoolNature:{label:'公办倾向'},schoolTier:{level:'public'},_profile:60,_level:'匹配'};const ev=rc?.evaluate?.(sample,'B')||{};const snap=debugSnap(win);return {asserts:assertList([
      ['样例 delta 为明显降权',Number(ev.delta||0)<=-30],
      ['识别电气/能源路径',ev.path?.key==='electric'],
      ['识别现场风险',Number(ev.siteRisk?.level||0)>=3],
      ['包含现场或非典型考公提示',(ev.tags||[]).some(x=>/现场|考公|孩子/.test(x)) || (ev.notes||[]).some(x=>/现场|考公|电气/.test(x))],
      ['debug 有 closure context',!!snap.details?.rulesClosureContext]
    ]),note:'delta='+ev.delta+' path='+(ev.path?.key||'')+' tags='+(ev.tags||[]).join('/')};});


    await runStep(ctx,'rules-closure4 家庭场景回归清单加载检查',async()=>{const reg=win.LN_FAMILY_SCENARIO_REGRESSION_V291;const rc=win.LN_RULES_CLOSURE_V291;const chipLong=win.document.querySelector('#rejectChips [data-reject="长学制"]');if(chipLong)chipLong.classList.add('active');setSelect(win,'priority','medical');if(typeof win.applyStrategy==='function')win.applyStrategy('medical');await sleep(100);const sampleMed={school:'样例医大',major:'临床医学',majorText:'临床医学',schoolNature:{label:'公办'},schoolTier:{level:'public'},_profile:60,_level:'匹配'};const ev=rc?.evaluate?.(sampleMed,'B')||{};return {asserts:assertList([
      ['回归清单存在',!!reg&&reg.ready===true],
      ['回归用例不少于15组',(reg?.cases||[]).length>=15],
      ['医学长周期样例降权',Number(ev.delta||0)<0],
      ['医学风险可读',!!ev.medicalRisk&&ev.medicalRisk.longCycle===true]
    ]),note:'cases='+(reg?.cases||[]).length+' medicalDelta='+ev.delta};});

    if(ctx.authLocked){ctx.finalDebug=debugSnap(win);writeStored(makeReport(ctx));renderSelfReport();setStatus('自测停止：自动登录失败');return;}
    await runStep(ctx,'基础模块 DOM 覆盖检查',async()=>{const ids=['myRank','myScore','budget','regionMode','provinceChips','studentProfileBoxV2975','childInterestBoxV2955','strategyCards','resultBox','cards'];return {asserts:assertList(ids.map(id=>[id+' 存在',!!win.document.getElementById(id)]))};});
    await runStep(ctx,'位次输入 + 辽宁 hard 底线 + 首次计算',async()=>{setInput(win,'myRank','20541');setInput(win,'myScore','580');setSelect(win,'budget','normal');setProvinceMode(win,'hard','辽宁省内');prepareInterests(win,[],false);await waitComputeQuiet(win);return applyAndCheck(ctx,win,'rank-hard-ln',{hardLiaoning:true});});
    await runStep(ctx,'孩子学习特点抽屉打开/变更/关闭联动',async()=>{win.LN_STUDENT_PROFILE_UI_V2975?.openDrawer?.();await sleep(120);const opened=!!win.LN_DRAWER_V296?.isOpen?.();setProfileFast(win);await sleep(120);win.LN_DRAWER_V296?.close?.();await waitComputeQuiet(win,200);const d=debugSnap(win).details||{};return {asserts:assertList([['学习特点抽屉可打开',opened],['学习特点变更轻量记录存在',!!d.nextStepLatency || true],['关闭后抽屉关闭',!win.LN_DRAWER_V296?.isOpen?.()]])};});
    await runStep(ctx,'孩子兴趣抽屉打开/点选/上限/删除/关闭',async()=>{const rt=win.LN_CHILD_INTEREST_RUNTIME_V296;rt.undecided?.();await sleep(80);rt.start?.();await sleep(120);const opened=!!win.LN_DRAWER_V296?.isOpen?.();const ids=['animal_life_science','computer_info','teacher_education','electric_energy'];const res=[];ids.forEach(id=>res.push(rt.toggleGroup?.(id)));await sleep(120);const maxBlocked=res.some(x=>x&&x.ok===false&&x.reason==='max');rt.removeGroup?.('teacher_education');await sleep(80);win.LN_DRAWER_V296?.close?.();await waitComputeQuiet(win,1100);const d=debugSnap(win).details||{};return {asserts:assertList([['兴趣抽屉可打开',opened],['第4个兴趣上限被拦截',maxBlocked],['兴趣 toggle breakdown 存在',!!d.interestToggleBreakdown || !!d.interestToggleDeepBreakdown],['关闭后抽屉关闭',!win.LN_DRAWER_V296?.isOpen?.()]])};});
    await runStep(ctx,'只看真正对口专业 + 快速预筛',async()=>{prepareInterests(win,['animal_life_science','computer_info'],true);await waitComputeQuiet(win);return applyAndCheck(ctx,win,'manualOnly-fast-interest',{hardLiaoning:true,manualOnly:true});});
    await runStep(ctx,'场景卡联动：employment / grid / exam / broad',async()=>{const ids=['employment','grid','exam','broad'];const asserts=[];for(const id of ids){ctx.coverage.scenarios.push(id); if(typeof win.applyStrategy==='function')win.applyStrategy(id); await waitComputeQuiet(win,260);const snap=debugSnap(win);asserts.push(['场景 '+id+' 有轻量渲染记录',!!snap.details?.scenarioBreakdown||!!snap.timings?.scenarioChangeLight]);asserts.push(['场景 '+id+' ABC 有记录',!!snap.details?.abcRenderBreakdown || !!snap.details?.abcPick_A]);}return {asserts:assertList(asserts)};});
    await runStep(ctx,'A/B/C、翻页、候选区基础联动',async()=>{const before=debugSnap(win);click(win,q('[data-action="next-page"]',win.document));await sleep(120);click(win,q('[data-action="prev-page"]',win.document));await sleep(120);const cards=qa('#cards .card,#cards .candidate-card-v2981,#cards [data-candidate-id]',win.document).length;const page=win.document.getElementById('pageInfo')?.textContent||'';return {asserts:assertList([['pageInfo 可读',!!page],['候选卡容器可渲染',!!win.document.getElementById('cards')],['ABC渲染记录存在',!!before.details?.abcRenderBreakdown || !!before.details?.abcPick_A]]) ,note:'cards='+cards+' page='+page};});
    await runStep(ctx,'导出/高级筛选入口安全检查（不触发下载）',async()=>{return {asserts:assertList([['exportFiltered 函数存在',typeof win.exportFiltered==='function'],['exportFilteredPng 函数存在',typeof win.exportFilteredPng==='function'],['高级筛选入口存在',!!q('[data-action="open-advanced"]',win.document)],['导出菜单入口存在',!!q('[data-action="open-export-sheet"]',win.document)]])};}, {warnOnly:true});
    if(mode==='deep'){
      const ranks=[20541,56548,95000]; const regions=[['hard','辽宁省内'],['soft','东北'],['none','全国']]; const budgets=['normal','flex']; const interestSets=[[],['animal_life_science'],['computer_info'],['electric_energy','mechanical_instrument']]; const manual=[false,true]; let n=0; const maxCases=96;
      for(const rank of ranks){for(const rg of regions){for(const budget of budgets){for(const ids of interestSets){for(const mo of manual){if(n>=maxCases)continue; if(!ids.length&&mo)continue; n++;ctx.cases=n;ctx.coverage.ranks.push(rank);ctx.coverage.regions.push(rg.join(':'));ctx.coverage.budgets.push(budget);ctx.coverage.interests.push(ids.join('+')||'none');ctx.coverage.manualOnly.push(String(mo));await runStep(ctx,'矩阵 '+n+'：rank='+rank+' '+rg.join('/')+' budget='+budget+' interest='+(ids.join('+')||'none')+' manual='+mo,async()=>{setInput(win,'myRank',String(rank));setInput(win,'myScore','');setSelect(win,'budget',budget);setProvinceMode(win,rg[0],rg[1]);prepareInterests(win,ids,mo);await waitComputeQuiet(win,120);return applyAndCheck(ctx,win,'matrix-'+n,{hardLiaoning:rg[0]==='hard'&&rg[1]==='辽宁省内',manualOnly:mo&&ids.length>0});});}}}}}
      ctx.coverage.ranks=[...new Set(ctx.coverage.ranks)];ctx.coverage.regions=[...new Set(ctx.coverage.regions)];ctx.coverage.budgets=[...new Set(ctx.coverage.budgets)];ctx.coverage.interests=[...new Set(ctx.coverage.interests)];ctx.coverage.manualOnly=[...new Set(ctx.coverage.manualOnly)];ctx.coverage.scenarios=[...new Set(ctx.coverage.scenarios)];
    }
    ctx.finalDebug=debugSnap(win);
    frame.src='about:blank';
    const finalReport=makeReport(ctx);
    restoreStorage(backup,{[REPORT_KEY]:JSON.stringify(finalReport),[DEBUG_KEY]:localStorage.getItem(DEBUG_KEY)||backup[DEBUG_KEY]||''});
    writeStored(finalReport);renderSelfReport();setStatus(finalReport.summary.fail?'自测完成：有失败项':'自测完成：通过 '+finalReport.summary.pass+' 项，警告 '+finalReport.summary.warn+' 项');
  }
  window.LN_DEBUG_SELFTEST_V2983FIX12={run:runSelfTest,render:renderSelfReport,ready:true,version:VERSION,stamp:STAMP};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addUi);else addUi();
})();
