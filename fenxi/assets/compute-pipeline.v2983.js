// V2.9.8.3.fix3 compute pipeline: funnel filtering + render/post-processing breakdown for debug.
(function(){
  const S={baseKey:'',basePool:[],profileKey:'',profileCache:new Map(),lastFiltered:[],lastContext:null,lastScoreStats:null,lastBaseStats:null,lastRenderStats:null,lastViewPool:[]};
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  const dbg=()=>window.LN_DEBUG_V2983;
  const debugDetail=(name,obj)=>{try{window.LN_DEBUG_V2983?.detail?.(name,obj);}catch(e){}};
  const val=id=>document.getElementById(id)?.value||'';
  const checked=id=>!!document.getElementById(id)?.checked;
  function selectedChips(sel,attr){return [...document.querySelectorAll(sel+'.active')].map(x=>x.dataset[attr]||x.dataset.value||x.textContent.trim()).filter(Boolean);}
  function safeCall(fn,fallback){try{return fn();}catch(e){return fallback;}}
  function timeStep(stats,name,fn){const t=perf();let ok=true;try{return fn&&fn();}catch(e){ok=false;stats.errors=stats.errors||[];stats.errors.push({step:name,message:String(e&&e.message||e)});return undefined;}finally{stats[name]=Math.round(perf()-t);stats[name+'Ok']=ok;}}
  function buildContext(){
    const rt=window.LN_CHILD_INTEREST_RUNTIME_V296;
    const st=rt?.readState?.()||{};
    const effective=rt?.effectiveGroupIds?.(st)||[];
    const ctx={
      score:val('myScore'),rank:typeof resolveRank==='function'?resolveRank():null,
      model:val('model'),sortBy:val('sortBy')||'default',
      family:{budget:val('budget'),regionMode:val('regionMode'),provinces:selectedChips('#provinceChips .chip','province'),cityMode:val('cityMode'),cities:val('targetCities'),feeType:val('filterFeeType'),rejects:selectedRejects?.()||[]},
      filters:{qSchool:val('qSchool').trim(),qMajor:val('qMajor').trim(),level:val('filterLevel'),subject:val('filterSubjectGroup'),primary:val('filterPrimary').trim(),tax:val('filterTaxConfidence'),tier:val('filterSchoolTier'),confusable:val('filterConfusableGroup'),onlyKey:checked('onlyKey'),onlyConfusable:checked('onlyConfusable')},
      child:{state:st,effective,manualOnly:!!(st.manualOnlyInterest&&effective.length)},
      scenario:{current:window.currentStrategy||''}
    };
    dbg()?.setContext?.({rank:ctx.rank,score:ctx.score,family:ctx.family,child:{effective:ctx.child.effective,manualOnly:ctx.child.manualOnly},scenario:ctx.scenario,sortBy:ctx.sortBy});
    return ctx;
  }
  function cheapKey(ctx){return JSON.stringify({rank:ctx.rank,model:ctx.model,data:(typeof DATA!=='undefined'?(DATA||[]).length:0),f:ctx.filters,family:ctx.family,qualification:safeCall(()=>window.LN_STATE_SNAPSHOT_V296?.snapshot?.(true)?.qualification||{},{}),special:typeof specialPlanStatusV29474==='function'?specialPlanStatusV29474():''});}
  function profileKey(ctx){return JSON.stringify({rank:ctx.rank,family:ctx.family,child:ctx.child.effective,manualOnly:ctx.child.manualOnly,scenario:ctx.scenario,legacy:safeCall(()=>window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.contextHash?.(),''),groups:['medicine','teacher','liberal','chem','physics','gridPower','outProvince'].map(k=>[k,typeof getGroup==='function'?getGroup(k):'']),mentor:['mentorMode','familyTolerance','gradPlan','timePressure','priority'].map(id=>[id,val(id)])});}
  function buildBasePool(ctx){
    const key=cheapKey(ctx);
    if(S.baseKey===key && S.basePool.length){return S.basePool;}
    const t=perf();
    const exStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0,'高校专项隐藏':0,'资格入口隐藏':0};
    const snapshot=(window.LN_STATE_SNAPSHOT_V296?.snapshot?.(true))||{};
    const special=typeof specialPlanStatusV29474==='function'?specialPlanStatusV29474():'unreviewed';
    const taxRank={high:3,medium:2,low:1,unknown:0};
    const cityTargets=typeof selectedCitiesV29472==='function'?selectedCitiesV29472():[];
    const cityMode=typeof cityModeV29472==='function'?cityModeV29472():ctx.family.cityMode;
    const out=[];
    for(const raw of (typeof DATA!=='undefined'?(DATA||[]):[])){
      const level=typeof classify==='function'?classify(raw.rank2025):'';
      const r=Object.assign({},raw,{_level:level,_fit:((typeof currentRank!=='undefined'&&currentRank)&&raw.rank2025)?Math.abs(raw.rank2025-currentRank):999999999});
      const gateCheck=window.LN_QUALIFICATION_GATE_V296?.check?.(r,snapshot);
      if(gateCheck&&gateCheck.blocked){exStats['资格入口隐藏']=(exStats['资格入口隐藏']||0)+1;if(gateCheck.gateId==='eduSpecialPlan'||gateCheck.gateId==='lnRuralSpecial')exStats['高校专项隐藏']=(exStats['高校专项隐藏']||0)+1;if(gateCheck.statKey)exStats[gateCheck.statKey]=(exStats[gateCheck.statKey]||0)+1;continue;}
      if(gateCheck&&gateCheck.matched)r._qualificationGate=gateCheck;else if(r.isCollegeSpecialPlanV29474&&special!=='approved'){exStats['高校专项隐藏']++;exStats['资格入口隐藏']++;continue;}
      const f=ctx.filters;
      if(f.qSchool&&!(r.school||'').includes(f.qSchool))continue;
      if(f.qMajor&&!(typeof majorMatchesV29475==='function'?majorMatchesV29475(r,f.qMajor):String(r.major||'').includes(f.qMajor)))continue;
      if(f.subject&&r.subjectGroup!==f.subject)continue;
      if(f.primary&&!((r.primaryDisciplineNames||'').includes(f.primary)||(r.primaryDisciplineCodes||'').includes(f.primary)||(r.cleanMajor||'').includes(f.primary)||(r.undergradCategoryName||'').includes(f.primary)||(r.officialCategoryCode||'').includes(f.primary)||(r.officialMajorCode||'').includes(f.primary)||(r.officialDisciplineCode||'').includes(f.primary)||(r.officialMajorName||'').includes(f.primary)))continue;
      if(f.tax==='high'&&r.taxonomyConfidence!=='high')continue;
      if(f.tax==='medium'&&(taxRank[r.taxonomyConfidence]||0)<2)continue;
      if(f.tax==='review'&&!['low','unknown'].includes(r.taxonomyConfidence))continue;
      if(f.tier==='985'&&r.schoolTier?.level!=='985')continue;
      if(f.tier==='211'&&r.schoolTier?.level!=='211')continue;
      if(f.tier==='public'&&!['public','publicSoft'].includes(r.schoolTier?.level))continue;
      if(f.tier==='private'&&r.schoolTier?.level!=='private')continue;
      if(f.tier==='unknown'&&r.schoolTier?.level!=='unknown')continue;
      if(ctx.family.feeType==='normal'&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)){exStats['预算排除']++;continue;}
      if(ctx.family.feeType==='coopOnly'&&!(r.isCoopV29475||r.isHighFee)){exStats['预算排除']++;continue;}
      if(ctx.family.feeType==='excludeHighPrivate'&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)){exStats['预算排除']++;continue;}
      if(f.onlyConfusable&&!(typeof hasConfusableMajorV2946==='function'&&hasConfusableMajorV2946(r)))continue;
      if(f.confusable&&!(typeof hasConfusableGroupV2946==='function'&&hasConfusableGroupV2946(r,f.confusable)))continue;
      if(f.level&&r._level!==f.level)continue;
      if(cityMode==='hard'&&cityTargets.length&&!(typeof cityMatchesV29472==='function'&&cityMatchesV29472(r,cityTargets))){exStats['区域排除']++;continue;}
      if(f.onlyKey&&!(r.keySubjectHints||[]).length)continue;
      out.push(r);
    }
    window.exclusionStats=exStats; try{exclusionStats=exStats;}catch(e){}
    S.baseKey=key;S.basePool=out;
    S.lastBaseStats={rows:(typeof DATA!=='undefined'?(DATA||[]):[]).length,out:out.length,exclusionStats:Object.assign({},exStats),filters:ctx.filters,family:ctx.family};
    debugDetail('baseFilterStats',S.lastBaseStats);
    dbg()?.timing?.('buildBasePool',perf()-t,{rows:S.lastBaseStats.rows,out:out.length});
    return out;
  }
  function scorePool(base,ctx){
    const t=perf(); const key=profileKey(ctx); const sortBy=ctx.sortBy; const rt=window.LN_CHILD_INTEREST_RUNTIME_V296; const interestActive=ctx.child.effective.length>0; const manualOnly=ctx.child.manualOnly;
    if(S.profileKey!==key){S.profileKey=key;S.profileCache.clear();}
    const ex=window.exclusionStats||{}; const out=[]; const strict=checked('strictProfile');
    const stats={input:base.length,preInput:base.length,strictPreInput:base.length,strictPreOutput:base.length,preOutput:base.length,manualOnly,interestActive,sortBy,profileHit:0,profileMiss:0,strictExcluded:0,lowProfileExcluded:0,out:0,time:{strictPre:0,preInterestFilter:0,profileScore:0,confidence:0,interestSort:0,strictCheck:0}};
    function ensureProfile(r){
      let p=S.profileCache.get(r.id);
      if(p){stats.profileHit++;}
      else{const tp=perf();p=typeof profileScore==='function'?profileScore(r):{score:50,reasons:[],excludes:[],mentor:{}};stats.time.profileScore+=perf()-tp;S.profileCache.set(r.id,p);stats.profileMiss++;}
      r._profile=p.score;r._reasons=p.reasons||[];r._excludes=p.excludes||[];r._mentor=p.mentor||{};
      return p;
    }
    let pool=base;
    // V2.9.8.3.fix3: if strict profile is enabled, shrink by cached/profile rules BEFORE expensive interest real-hit filtering.
    // This keeps "只看真实命中" from matching thousands of rows that would be removed by strict profile anyway.
    if(strict){
      const tStrict=perf(); const strictPool=[];
      for(const r of base){
        ensureProfile(r);
        if((r._excludes||[]).length){const b=typeof exclusionBucket==='function'?exclusionBucket(r._excludes):'画像排除';ex[b]=(ex[b]||0)+1;stats.strictExcluded++;continue;}
        if((r._profile||0)<32){ex['低匹配排除']=(ex['低匹配排除']||0)+1;stats.lowProfileExcluded++;continue;}
        strictPool.push(r);
      }
      pool=strictPool; stats.strictPreOutput=pool.length; stats.time.strictPre=Math.round(perf()-tStrict);
    }
    if(manualOnly&&rt){
      const tPre=perf(); const narrowed=[];
      for(const r of pool){let pass=true;try{pass=!!rt.filterPass?.(r);}catch(e){pass=true;}if(pass)narrowed.push(r);}
      pool=narrowed; stats.preInput=base.length; stats.preOutput=pool.length; stats.time.preInterestFilter=Math.round(perf()-tPre);
      debugDetail('interestPreFilter',{in:base.length,afterStrict:stats.strictPreOutput,out:pool.length,ms:stats.time.preInterestFilter,manualOnly:true});
    }
    for(const r of pool){
      if(!strict){
        ensureProfile(r);
        const ts=perf();
        if((r._excludes||[]).length){const b=typeof exclusionBucket==='function'?exclusionBucket(r._excludes):'画像排除';ex[b]=(ex[b]||0)+1;stats.strictExcluded++;stats.time.strictCheck+=perf()-ts;continue;}
        if((r._profile||0)<32){ex['低匹配排除']=(ex['低匹配排除']||0)+1;stats.lowProfileExcluded++;stats.time.strictCheck+=perf()-ts;continue;}
        stats.time.strictCheck+=perf()-ts;
      }
      const tc=perf(); r._confidence=typeof confidence==='function'?confidence(r):{label:'',cls:''}; stats.time.confidence+=perf()-tc;
      const ti=perf(); r._interestSortScore=interestActive?(typeof interestSortScoreV298Fix1==='function'?interestSortScoreV298Fix1(r):0):0; stats.time.interestSort+=perf()-ti;
      out.push(r);
    }
    stats.out=out.length;
    Object.keys(stats.time).forEach(k=>stats.time[k]=Math.round(stats.time[k]));
    stats.cacheSize=S.profileCache.size; S.lastScoreStats=stats;
    debugDetail('scorePoolBreakdown',stats);
    debugDetail('cacheStats',{profile:{hit:stats.profileHit,miss:stats.profileMiss,size:S.profileCache.size},interestPreFilter:{in:stats.preInput,afterStrict:stats.strictPreOutput,out:stats.preOutput,ms:stats.time.preInterestFilter}});
    dbg()?.timing?.('scorePool',perf()-t,{in:base.length,strictPre:stats.strictPreOutput,pre:pool.length,out:out.length,cache:S.profileCache.size,profileMiss:stats.profileMiss,interestPreMs:stats.time.preInterestFilter});
    return out;
  }
  function sortPool(arr,ctx){
    const t=perf(); const sortBy=ctx.sortBy; const interestActive=ctx.child.effective.length>0;
    arr.sort((a,b)=>{
      if(sortBy==='rank2025')return(a.rank2025||999999999)-(b.rank2025||999999999);
      if(sortBy==='rankDiffHot')return(a.rankDiff??999999999)-(b.rankDiff??999999999);
      if(sortBy==='rankDiffLoose')return(b.rankDiff??-999999999)-(a.rankDiff??-999999999);
      if(sortBy==='fit')return a._fit-b._fit;
      if(sortBy==='lift')return (typeof liftValueScoreV29475==='function'?liftValueScoreV29475(b):0)-(typeof liftValueScoreV29475==='function'?liftValueScoreV29475(a):0);
      if(interestActive){const d=(b._interestSortScore||0)-(a._interestSortScore||0);if(d)return d;}
      return((b._profile||0)-(a._profile||0))||(a._fit-b._fit);
    });
    dbg()?.timing?.('sortPool',perf()-t,{rows:arr.length,sortBy});
    return arr;
  }
  function applyFiltersV2983(reason){
    const start=perf(); const renderStats={reason:reason||'applyFilters'};
    const ctx=timeStep(renderStats,'buildContext',()=>buildContext()); S.lastContext=ctx;
    const base=timeStep(renderStats,'buildBasePoolInline',()=>buildBasePool(ctx));
    let arr=timeStep(renderStats,'scorePoolInline',()=>scorePool(base,ctx))||[];
    arr=timeStep(renderStats,'sortPoolInline',()=>sortPool(arr,ctx))||arr;
    window.filtered=arr; try{filtered=arr;}catch(e){} window.currentPage=1; try{currentPage=1;}catch(e){}
    window.LN_DEBUG_V2983?.setPools?.({loadedRows:(typeof DATA!=='undefined'?(DATA||[]):[]).length,basePool:base.length,filtered:arr.length,interestActive:ctx.child.effective.length,manualOnly:ctx.child.manualOnly});
    timeStep(renderStats,'scheduleInterestAggregate',()=>window.LN_INTEREST_HIT_SUMMARY_V298?.scheduleAggregate?.(arr,1400));
    timeStep(renderStats,'interestSummary',()=>window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.());
    timeStep(renderStats,'updateCounts',()=>{if(typeof updateCounts==='function')return updateCounts();});
    timeStep(renderStats,'renderPlanABC',()=>{if(typeof renderPlanABC==='function')return renderPlanABC();});
    timeStep(renderStats,'renderCards',()=>{if(typeof renderCards==='function')return renderCards();});
    timeStep(renderStats,'updateLive',()=>{if(typeof updateLive==='function')return updateLive();});
    timeStep(renderStats,'updateGuideState',()=>{if(typeof updateGuideState==='function')return updateGuideState();});
    renderStats.total=Math.round(perf()-start);renderStats.filtered=arr.length;S.lastRenderStats=renderStats;debugDetail('renderBreakdown',renderStats);
    const ms=perf()-start; dbg()?.timing?.('applyFiltersTotal',ms,{reason:reason||'applyFilters',filtered:arr.length});
    return arr;
  }
  function patch(){
    window.applyFilters=applyFiltersV2983;
    if(window.LN_FILTER_ENGINE)window.LN_FILTER_ENGINE.applyFilters=applyFiltersV2983;
    window.LN_COMPUTE_PIPELINE_V2983={buildContext,buildBasePool,scorePool,sortPool,applyFilters:applyFiltersV2983,state:S,ready:true,version:'V2.9.8.3.fix3'};
    window.LN_DEBUG_V2983?.setFlags?.({computePipeline:'v2983fix3',applyFiltersPatched:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
})();
