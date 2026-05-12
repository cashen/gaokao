(function(){
  'use strict';
  function n(v){var x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0;}
  function tx(v){return String(v==null?'':v).trim();}
  function uniq(list){var seen=Object.create(null);return (list||[]).filter(function(x){var k=tx(x);if(!k||seen[k])return false;seen[k]=1;return true;});}
  function getState(){return window.LN_V3_STORE?window.LN_V3_STORE.getState():{};}
  function getRecords(state){
    state=state||getState();
    if(window.LN_V3_FAMILY_FILTER&&window.LN_V3_FAMILY_FILTER.getPreviewRecords){
      var p=window.LN_V3_FAMILY_FILTER.getPreviewRecords(state.family||{});
      if(p&&Array.isArray(p.records))return {records:p.records,basePool:p.basePool||p.records.length,familyFilteredRows:p.records.length,preview:p.preview||p};
    }
    var cache=window.LN_V3_DATA_CACHE||{}; var rows=Array.isArray(cache.records)?cache.records:[];
    return {records:rows,basePool:rows.length,familyFilteredRows:rows.length,preview:null};
  }
  function contextFromState(state){
    state=state||getState();
    var rb=window.LN_V3_LEGACY_RULEBOOK;
    var score=n((state.rank||{}).effectiveScore||(state.rank||{}).score||(state.rank||{}).rawScore);
    var rank=n((state.rank||{}).effectiveRank||(state.rank||{}).rank||(state.rank||{}).rawRank);
    var scenario=(state.scenario||{}).currentScenario||(state.scenario||{}).current||'';
    if(!scenario&&rb&&rb.scenarioForScore)scenario=rb.scenarioForScore(score);
    var sc=rb&&rb.getScenario?rb.getScenario(scenario):null;
    var target=(state.scenario||{}).targetPath||((sc&&sc.targetPath)||'employment');
    return {state:state,rank:rank,rankNo:rank,score:score,scenarioId:scenario,targetPath:target,family:state.family||{},reviewFilter:window.LN_V3_ADVANCED_FILTER?window.LN_V3_ADVANCED_FILTER.fromState(state):{},scenario:sc};
  }
  function interestMatch(record,state){
    var child=(state||{}).childPreference||{};
    if(!window.LN_V3_CHILD_INTEREST||!window.LN_V3_CHILD_INTEREST.matchRecord)return null;
    try{return window.LN_V3_CHILD_INTEREST.matchRecord(record,child);}catch(e){return null;}
  }
  function highFee(r){return r.isHighFee===true||/高收费|中外合作|合作办学|国际|学术互认|联合培养|ACCA|CIMA|ISEC/.test([r.major,r.tuition2025,r.tuitionStatus,(r.riskFlags||[]).join(' ')].join(' '));}
  function privateLike(r){return /民办|独立|private/.test([r.schoolNatureLabel,r.schoolNature&&r.schoolNature.label,r.schoolTier&&r.schoolTier.level,r.schoolTier&&r.schoolTier.label].join(' '));}
  function tierLevel(r){return tx((r.schoolTier&&r.schoolTier.level)||r.schoolTierLevel||'');}
  function rankRole(record,ctx){
    var rankNo=n(ctx.rankNo), rr=n(record.rank2025);
    if(!rankNo||!rr)return {id:'unknown',label:'位次待复核',group:'unknown',gap:0,abs:0,hard:false,score:0};
    var gap=rankNo-rr; // positive = candidate was harder in 2025
    var abs=Math.abs(gap);
    var far=Math.max(5500,Math.round(rankNo*0.28));
    var upper=Math.max(2600,Math.round(rankNo*0.13));
    var reach=Math.max(1200,Math.round(rankNo*0.06));
    var steady=Math.max(1600,Math.round(rankNo*0.08));
    var safe=Math.max(5600,Math.round(rankNo*0.24));
    if(gap>far)return {id:'farReach',label:'超冲过远',group:'C',gap:gap,abs:abs,hard:true,score:-35};
    if(gap>upper)return {id:'upper',label:'上限探索',group:'C',gap:gap,abs:abs,hard:true,score:-12};
    if(gap>reach)return {id:'reach',label:'可冲',group:'C',gap:gap,abs:abs,hard:false,score:0};
    if(gap>=-steady)return {id:'match',label:'匹配',group:'B',gap:gap,abs:abs,hard:false,score:18};
    if(gap>=-safe)return {id:'steady',label:'稳妥',group:'A',gap:gap,abs:abs,hard:false,score:22};
    return {id:'safeLow',label:'保底/偏低',group:'A',gap:gap,abs:abs,hard:false,score:8};
  }
  function professional(record,ctx){
    if(!window.LN_V3_PROFESSIONAL_PATH)return null;
    var target=ctx.targetPath;
    var pathId='';
    if(target==='grid')pathId='electric';
    else if(target==='medical')pathId='medical';
    else if(target==='exam')pathId='exam';
    else {
      var child=(ctx.state||{}).childPreference||{};
      var ids=(child.selectedGroups||[]).map(function(g){return typeof g==='string'?g:g.id;});
      if(ids.indexOf('electric_energy')>=0)pathId='electric';
      else if(ids.indexOf('computer_ai')>=0)pathId='computer';
      else if(ids.indexOf('electronic_comm')>=0)pathId='info';
      else if(ids.indexOf('medicine_health')>=0)pathId='medical';
      else if(ids.indexOf('law_human_edu')>=0)pathId='exam';
      else if(ids.indexOf('finance_manage')>=0)pathId='accounting';
      else if(ids.indexOf('mechanical_instrument')>=0)pathId='machine';
    }
    if(pathId&&window.LN_V3_PROFESSIONAL_PATH.matchOne)return window.LN_V3_PROFESSIONAL_PATH.matchOne(record,pathId);
    if(window.LN_V3_PROFESSIONAL_PATH.best)return window.LN_V3_PROFESSIONAL_PATH.best(record,ctx.state||{});
    return null;
  }
  function profScore(prof){
    if(!prof)return 0;
    if(prof.level==='core')return 28;
    if(prof.level==='related')return 16;
    if(prof.level==='fuzzy')return 3;
    return 0;
  }
  function planBandByRole(r,ctx,baseScore){
    var role=r._rc2RankRole, prof=r._rc2Professional, im=r._rc2InterestMatch;
    var hf=highFee(r), priv=privateLike(r);
    var budget=tx((ctx.family||{}).budget||'normal');
    var feeType=tx((ctx.family||{}).feeType||'all');
    var costAllowed=(budget==='high'||budget==='flex'||budget==='coop'||feeType==='coopCompare'||feeType==='coopOnly');
    // 位次先行：明显够不上的，只能做 C；兴趣与专业不能把它拉进 B。
    if(role.id==='farReach'||role.id==='upper'||role.id==='reach')return 'C';
    // 成本/性质先行：普通家庭下，高收费/民办不能当 A 的底线。
    if((hf||priv)&&!costAllowed)return role.id==='match'?'B':'C';
    // 匹配位次：专业正主/兴趣命中进 B，否则可作 A 观察。
    if(role.id==='match'){
      if(im||['core','related'].indexOf(prof&&prof.level)>=0)return 'B';
      return 'A';
    }
    // 稳妥区：A 兜底优先。兴趣命中不能把稳妥底线候选全部吸入 B。
    if(role.id==='steady')return 'A';
    if(role.id==='safeLow')return 'A';
    return baseScore&&baseScore.planBand?baseScore.planBand:'A';
  }
  function addLegacyInterpretation(r,ctx){
    var reasons=[],risks=[],tasks=[];
    var role=r._rc2RankRole, prof=r._rc2Professional, im=r._rc2InterestMatch;
    if(role)reasons.push('位次角色：'+role.label);
    if(im)reasons.push(im.reason||'兴趣方向命中');
    if(prof&&prof.label)reasons.push('专业路径：'+prof.label);
    if(prof&&prof.warning)risks.push(prof.warning);
    if(highFee(r)){risks.push('高收费/中外合作需复核');tasks.push('复核学费、证书、培养地点和转专业政策');}
    if(privateLike(r)){risks.push('民办/独立性质需复核');tasks.push('核算四年总成本和就业资源');}
    if(/大数据管理与应用/.test(tx(r.major))){risks.push('大数据管理与应用不等同于计算机类大数据技术');tasks.push('复核本科专业代码和管理科学与工程类属性');}
    if(/医学影像技术|医学检验技术|护理|康复治疗/.test(tx(r.major))){risks.push('医学技术/护理康复不等同于临床医生路径');tasks.push('复核执业资格和培养方案');}
    if(/自动化|测控技术与仪器|电子信息工程/.test(tx(r.major))&&ctx.targetPath==='grid'){risks.push('泛电相关专业不能直接等同电气正主');tasks.push('复核电网招聘口径、专业代码和学校行业背景');}
    if(/类|试验班|实验班|大类/.test(tx(r.major))){risks.push('大类/试验班不等同最终专业');tasks.push('复核分流规则、可选专业范围和转专业政策');}
    tasks=tasks.concat(['复核招生章程','复核专业代码与培养方案','结合近两年位次变化再决定是否保留']);
    r._rc2Reasons=uniq((r._rc2Reasons||[]).concat(reasons));
    r._rc2Risks=uniq((r._rc2Risks||[]).concat(risks));
    r._rc2ReviewTasks=uniq((r._rc2ReviewTasks||[]).concat(prof&&prof.reviewTasks||[]).concat(tasks)).slice(0,10);
  }
  function scoreRows(records,ctx){
    var rows=[], stats={input:(records||[]).length,interestMatchedRows:0,rankRoles:{},planBands:{A:0,B:0,C:0},scoreMin:100,scoreMax:0,risks:0,blockedFromBByRank:0};
    (records||[]).forEach(function(raw){
      var r=Object.assign({},raw);
      r._rc2RankNo=ctx.rankNo;
      r._rc2RankRole=rankRole(r,ctx);
      var im=interestMatch(r,ctx.state); r._rc2InterestMatch=im; if(im)stats.interestMatchedRows++;
      if(ctx.state&&ctx.state.childPreference&&ctx.state.childPreference.manualOnly&&!im)return;
      var base=window.LN_V3_PROFILE_SCORE_ENGINE?window.LN_V3_PROFILE_SCORE_ENGINE.score(r,ctx):{score:50,planBand:'A',reasons:[],risks:[],reviewTasks:[],breakdown:{},planScores:{}};
      r._rc2Professional=professional(r,ctx)||base.professional||null;
      var ps=profScore(r._rc2Professional);
      var interestBonus=im?8:0;
      var rankBonus=r._rc2RankRole.score||0;
      var costPenalty=highFee(r)?-18:0;
      var privatePenalty=privateLike(r)?-10:0;
      var farPenalty=(r._rc2RankRole.id==='farReach')?-28:(r._rc2RankRole.id==='upper'?-10:0);
      r._rc2Score=Math.max(0,Math.min(100,Math.round((base.score||50)+ps+interestBonus+rankBonus+costPenalty+privatePenalty+farPenalty)));
      r._rc2PlanScores=base.planScores||{};
      r._rc2Reasons=base.reasons||[];
      r._rc2Risks=base.risks||[];
      r._rc2ReviewTasks=base.reviewTasks||[];
      r._rc2ScoreBreakdown=Object.assign({},base.breakdown||{}, {位次角色:rankBonus,专业路径:ps,兴趣命中:interestBonus,成本扣分:costPenalty,性质扣分:privatePenalty,上限距离:farPenalty});
      var band=planBandByRole(r,ctx,base); if((r._rc2RankRole.id==='farReach'||r._rc2RankRole.id==='upper'||r._rc2RankRole.id==='reach')&&band==='B'){band='C';stats.blockedFromBByRank++;}
      r._rc2PlanBand=band;
      addLegacyInterpretation(r,ctx);
      stats.rankRoles[r._rc2RankRole.id]=(stats.rankRoles[r._rc2RankRole.id]||0)+1;
      stats.planBands[r._rc2PlanBand]=(stats.planBands[r._rc2PlanBand]||0)+1;
      stats.scoreMin=Math.min(stats.scoreMin,r._rc2Score); stats.scoreMax=Math.max(stats.scoreMax,r._rc2Score); stats.risks+=(r._rc2Risks||[]).length;
      rows.push(r);
    });
    return {rows:rows,stats:stats};
  }
  function sortRows(rows,ctx){
    // RC2.fix2：基础候选池只做基础排序，不叠加候选复核页高级筛选。
    var out=(rows||[]).slice();
    function po(x){return x==='A'?1:x==='B'?2:x==='C'?3:9;}
    out.sort(function(a,b){return po(a._rc2PlanBand)-po(b._rc2PlanBand)||(b._rc2Score||0)-(a._rc2Score||0)||Math.abs((a.rank2025||0)-(a._rc2RankNo||0))-Math.abs((b.rank2025||0)-(b._rc2RankNo||0));});
    return out;
  }
  function compute(state,reason){
    state=state||getState(); var started=(performance&&performance.now)?performance.now():Date.now();
    var ctx=contextFromState(state); var data=getRecords(state); var scored=scoreRows(data.records,ctx); var baseRows=sortRows(scored.rows,ctx);
    var hash=window.LN_V3_STATE_INVALIDATION?window.LN_V3_STATE_INVALIDATION.hashState(state).base:JSON.stringify({rank:state.rank,family:state.family,child:state.childPreference,scenario:state.scenario});
    var result={ok:true,reason:reason||'rc2fix2-compute',version:'v300rc2fix2',context:ctx,contextHash:hash,loadedRows:n((state.rank||{}).loadedRows)||data.basePool,basePool:data.basePool,familyFilteredRows:data.familyFilteredRows,advancedFilteredRows:baseRows.length,interestMatchedRows:scored.stats.interestMatchedRows,effectiveRows:baseRows.length,rows:baseRows,baseRows:baseRows,stats:Object.assign({},scored.stats,{computeMs:Math.round(((performance&&performance.now)?performance.now():Date.now())-started),scenarioId:ctx.scenarioId,targetPath:ctx.targetPath,reviewFilterIsolated:true}),generatedAt:new Date().toISOString()};
    window.LN_V3_LAST_COMPUTE_RESULT=result; return result;
  }
  function apply(reason){
    if(!window.LN_V3_STORE)return compute(null,reason); var state=getState(); var result=compute(state,reason);
    window.LN_V3_STORE.setState({computeResult:{version:result.version,valid:true,staleReason:'',contextHash:result.contextHash,loadedRows:result.loadedRows,basePool:result.basePool,familyFilteredRows:result.familyFilteredRows,advancedFilteredRows:result.advancedFilteredRows,interestMatchedRows:result.interestMatchedRows,effectiveRows:result.effectiveRows,stats:result.stats,generatedAt:result.generatedAt},compute:{basePool:result.familyFilteredRows,filtered:result.effectiveRows,lastReason:'rc2fix2-compute-core'},ui:{lastMessage:'RC2.fix2 已重新计算基础候选池：'+result.effectiveRows+' 条；候选复核筛选不会污染基础池。'}},'rc2fix2:compute-apply');
    return result;
  }
  function ensure(state){var result=window.LN_V3_LAST_COMPUTE_RESULT; state=state||getState(); var hash=window.LN_V3_STATE_INVALIDATION?window.LN_V3_STATE_INVALIDATION.hashState(state).base:''; if(!result||result.contextHash!==hash)return compute(state,'rc2fix2-ensure'); return result;}
  function matrix(){
    var oldCache=window.LN_V3_DATA_CACHE;
    var cases=[
      {name:'600分 计算机+电气 电网能源',rank:15000,score:600,target:'grid',majors:['人工智能','电气工程及其自动化','自动化'],rows:[{school:'东北大学',major:'人工智能',score2025:635,rank2025:4735,schoolNatureLabel:'公办倾向'},{school:'稳妥大学',major:'电气工程及其自动化',score2025:595,rank2025:17000,schoolNatureLabel:'公办倾向'},{school:'匹配大学',major:'自动化',score2025:602,rank2025:14500,schoolNatureLabel:'公办倾向'}],expect:function(g){return g.A>0&&g.B>0&&g.C>0;}},
      {name:'500分 辽宁 电气',rank:56548,score:500,target:'grid',rows:[{school:'省内公办',major:'电气工程及其自动化',score2025:500,rank2025:57000,schoolNatureLabel:'公办倾向'},{school:'稳妥公办',major:'自动化',score2025:485,rank2025:62000,schoolNatureLabel:'公办倾向'},{school:'高平台',major:'电气工程及其自动化',score2025:560,rank2025:30000,schoolNatureLabel:'公办倾向'}],expect:function(g){return g.A>0&&g.C>0;}},
      {name:'医学路径 医技复核',rank:20000,score:585,target:'medical',rows:[{school:'医科大学',major:'临床医学',score2025:588,rank2025:19500,schoolNatureLabel:'公办倾向'},{school:'医学院',major:'医学影像技术',score2025:575,rank2025:24000,schoolNatureLabel:'公办倾向'}],expect:function(g){return g.B>0||g.A>0;}}
    ];
    var out=cases.map(function(c){
      var state={rank:{score:String(c.score),rank:String(c.rank),loadedRows:c.rows.length},family:{regionMode:'none',provinces:[],rejects:[]},childPreference:{selectedGroups:[{id:c.target==='grid'?'electric_energy':c.target==='medical'?'medicine_health':'computer_ai',name:'测试'}],selectedMajors:[],manualOnly:false},scenario:{currentScenario:c.target==='grid'?'grid':c.target==='medical'?'medical':'employment',targetPath:c.target},advancedFilter:{}};
      window.LN_V3_DATA_CACHE={records:c.rows}; var got=compute(state,'matrix'); var g=got.stats.planBands||{}; return {name:c.name,ok:!!c.expect(g),planBands:g,rankRoles:got.stats.rankRoles,first:got.rows[0]&&{school:got.rows[0].school,major:got.rows[0].major,band:got.rows[0]._rc2PlanBand,role:got.rows[0]._rc2RankRole.label}};
    });
    window.LN_V3_DATA_CACHE=oldCache; return out;
  }
  window.LN_V3_COMPUTE_CORE={contextFromState:contextFromState,getRecords:getRecords,rankRole:rankRole,compute:compute,apply:apply,ensure:ensure,matrix:matrix,ready:true,version:'v300rc2fix2'};
})();
