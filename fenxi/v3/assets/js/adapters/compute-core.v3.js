(function(){
  'use strict';
  function tx(v){return String(v==null?'':v).trim();}
  function n(v){var x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0;}
  function uniq(list){var seen=Object.create(null);return (list||[]).filter(function(x){var k=tx(x);if(!k||seen[k])return false;seen[k]=1;return true;});}
  function first(obj,keys){for(var i=0;i<keys.length;i++){var v=obj&&obj[keys[i]]; if(v!==undefined&&v!==null&&tx(v)!=='')return v;}return '';}
  function scoreOf(r){return n(first(r,['score2025','score_2025','minScore2025','min_score_2025','lowestScore2025','score','score2025Text']));}
  function rankOf(r){return n(first(r,['rank2025','rank_2025','minRank2025','min_rank_2025','lowestRank2025','rank','rank2025Text']));}
  function fmt(v){var x=n(v);return x?String(x):'';}
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
    var child=state.childPreference||{};
    return {state:state,rank:rank,rankNo:rank,score:score,scenarioId:scenario,targetPath:target,family:state.family||{},child:child,scenario:sc};
  }
  function interestMatch(record,state){
    var child=(state||{}).childPreference||{};
    if(!window.LN_V3_CHILD_INTEREST||!window.LN_V3_CHILD_INTEREST.matchRecord)return null;
    try{return window.LN_V3_CHILD_INTEREST.matchRecord(record,child);}catch(e){return null;}
  }
  function blob(r){return [r.school,r.major,r.majorText,r.cleanMajor,r.schoolNatureLabel,r.tuition2025,r.tuitionStatus,r.schoolTier&&r.schoolTier.label,r.schoolTier&&r.schoolTier.level,(r.riskFlags||[]).join(' ')].map(tx).join(' ');}
  function highFee(r){return r.isHighFee===true||r.isCoopV29475===true||/高收费|中外合作|合作办学|国际|学术互认|联合培养|ACCA|CIMA|ISEC/.test(blob(r));}
  function privateLike(r){return r.isPrivateV29475===true||/民办|独立|private/.test(blob(r));}
  function vocationalLike(r){return /职业大学|职业技术大学|职业本科|应用技术大学/.test([r.school,r.schoolType,r.schoolNatureLabel,r.schoolNature&&r.schoolNature.label].map(tx).join(' '));}
  function qualificationLike(r){return /高校专项|专项计划|辽宁省高校专项|地方专项|国家专项|预科|民族班|定向|公费师范|优师专项|需政审|体检|面试/.test([r.major,r.majorText,r.cleanMajor,(r.riskFlags||[]).join(' ')].map(tx).join(' '));}
  function schoolMeta(r){
    var lv=tx((r.schoolTier&&r.schoolTier.level)||r.schoolTierLevel||'');
    var text=blob(r), labels=[];
    if(lv==='985'||/985/.test(text))labels.push('985');
    else if(lv==='211'||/211/.test(text))labels.push('211');
    else if(/双一流/.test(text))labels.push('双一流');
    else labels.push('双非');
    if(privateLike(r))labels.push('民办/独立');
    else if(/公办/.test(text)||lv==='public'||lv==='publicSoft')labels.push(lv==='publicSoft'?'公办倾向':'公办');
    else labels.push('性质待核验');
    if(vocationalLike(r))labels.push('职业本科/职业大学');
    if(highFee(r))labels.push('高收费/中外合作');
    if(qualificationLike(r))labels.push('资格型计划');
    return {level:lv||'unknown',labels:uniq(labels),isPrivate:privateLike(r),isVocational:vocationalLike(r),isHighFee:highFee(r),isQualification:qualificationLike(r),display:uniq(labels).join('｜')};
  }
  function activePathIds(ctx){
    var out=[]; function add(x){if(x&&out.indexOf(x)<0)out.push(x);}
    if(ctx.targetPath==='grid')add('electric');
    if(ctx.targetPath==='medical')add('medical');
    if(ctx.targetPath==='exam')add('exam');
    if(ctx.targetPath==='postgrad')add('computer');
    var groups=(ctx.child&&ctx.child.selectedGroups)||[];
    groups.forEach(function(g){var id=typeof g==='string'?g:g.id; if(id==='electric_energy')add('electric'); if(id==='computer_ai')add('computer'); if(id==='electronic_comm')add('info'); if(id==='medicine_health')add('medical'); if(id==='law_human_edu')add('exam'); if(id==='finance_manage')add('accounting'); if(id==='mechanical_instrument')add('machine'); if(id==='agri_animal_food')add('medical');});
    return out;
  }
  function professional(record,ctx){
    var engine=window.LN_V3_PROFESSIONAL_PATH, ids=activePathIds(ctx);
    if(!engine)return null;
    var best=null;
    ids.forEach(function(id){var m=engine.matchOne?engine.matchOne(record,id):null; if(!m)return; var score={core:4,related:3,fuzzy:1,none:0}[m.level]||0; if(!best||score>best._activeScore)best=Object.assign({},m,{activePath:true,_activeScore:score});});
    if(best)return best;
    if(engine.best){var b=engine.best(record,ctx.state||{}); if(b)return Object.assign({},b,{activePath:false});}
    return null;
  }
  function profScore(prof){if(!prof)return 0; if(prof.level==='core')return prof.activePath?30:12; if(prof.level==='related')return prof.activePath?18:7; if(prof.level==='fuzzy')return prof.activePath?2:-3; return 0;}
  function rankRole(record,ctx){
    var rankNo=n(ctx.rankNo), rr=rankOf(record);
    if(!rankNo||!rr)return {id:'unknown',label:'位次待复核',group:'review',gap:0,abs:0,score:-20};
    var gap=rankNo-rr; // positive = 2025录取位次更靠前，当前更难够到
    var abs=Math.abs(gap);
    var far=Math.max(6500,Math.round(rankNo*0.18));
    var upper=Math.max(2800,Math.round(rankNo*0.08));
    var reach=Math.max(1000,Math.round(rankNo*0.035));
    var steady=Math.max(1800,Math.round(rankNo*0.055));
    var safe=Math.max(8000,Math.round(rankNo*0.16));
    var tooLow=Math.max(22000,Math.round(rankNo*0.34));
    if(gap>far)return {id:'farReach',label:'超冲过远',group:'C',gap:gap,abs:abs,score:-42};
    if(gap>upper)return {id:'upper',label:'上限探索',group:'C',gap:gap,abs:abs,score:-16};
    if(gap>reach)return {id:'reach',label:'可冲',group:'C',gap:gap,abs:abs,score:-2};
    if(gap>=-steady)return {id:'match',label:'匹配',group:'B',gap:gap,abs:abs,score:22};
    if(gap>=-safe)return {id:'steady',label:'稳妥',group:'A',gap:gap,abs:abs,score:24};
    if(gap>=-tooLow)return {id:'safeLow',label:'保底',group:'A',gap:gap,abs:abs,score:8};
    return {id:'tooLow',label:'过低兜底',group:'A',gap:gap,abs:abs,score:-18};
  }
  function metaPenalty(meta,ctx){
    var budget=tx((ctx.family||{}).budget||'normal'), fee=tx((ctx.family||{}).feeType||'all'), allow=(budget==='high'||budget==='flex'||budget==='coop'||fee==='coopOnly'||fee==='coopCompare');
    var p=0;
    if(meta.isHighFee&&!allow)p-=24;
    if(meta.isPrivate&&!allow)p-=16;
    if(meta.isVocational)p-=12;
    if(meta.isQualification&&((ctx.family||{}).qualificationMode!=='include'))p-=45;
    return p;
  }
  function planBandByRole(r,ctx,base){
    var role=r._rc2RankRole, prof=r._rc2Professional, im=r._rc2InterestMatch, meta=r._rc2SchoolMeta;
    var targetSpecific=activePathIds(ctx).length>0;
    var professionalMain=prof&&prof.activePath&&['core','related'].indexOf(prof.level)>=0;
    if(role.id==='farReach'||role.id==='upper'||role.id==='reach')return 'C';
    if(meta.isQualification&&((ctx.family||{}).qualificationMode!=='include'))return 'C';
    if(role.id==='match'){
      if(im||professionalMain)return 'B';
      return 'A';
    }
    if(role.id==='steady'){
      if(targetSpecific&&(im||professionalMain)&&!meta.isPrivate&&!meta.isHighFee&&!meta.isVocational)return 'B';
      return 'A';
    }
    if(role.id==='safeLow'||role.id==='tooLow'||role.id==='unknown')return 'A';
    return base&&base.planBand?base.planBand:'A';
  }
  function addInterpretation(r,ctx){
    var reasons=[],risks=[],tasks=[];
    var role=r._rc2RankRole, prof=r._rc2Professional, im=r._rc2InterestMatch, meta=r._rc2SchoolMeta;
    reasons.push('位次角色：'+role.label);
    reasons.push('学校标签：'+meta.display);
    if(im)reasons.push(im.reason||'兴趣方向命中');
    if(prof&&prof.label)reasons.push('专业路径：'+prof.label+(prof.activePath?'':'（非当前主线，仅作识别）'));
    if(role.id==='tooLow')risks.push('位次放宽过多，只能做兜底核验，不能因稳就前置');
    if(role.id==='farReach'||role.id==='upper')risks.push('上探风险较高，不能冒充稳妥或专业主方案');
    if(prof&&prof.warning)risks.push(prof.warning);
    if(meta.isHighFee){risks.push('高收费/中外合作需复核');tasks.push('复核学费、证书、培养地点和转专业政策');}
    if(meta.isPrivate){risks.push('民办/独立性质需核算成本和管理质量');tasks.push('核算四年总成本、就业资源和升学路径');}
    if(meta.isVocational){risks.push('职业本科/职业大学需单独理解，不等同普通本科院校层级');tasks.push('复核学校性质、培养定位和毕业证书说明');}
    if(meta.isQualification){risks.push('资格型计划不是普通考生默认入口');tasks.push('复核专项资格、公示名单和招生章程');}
    if(/大数据管理与应用/.test(tx(r.major))){risks.push('大数据管理与应用不等同于计算机类数据科学与大数据技术');tasks.push('复核本科专业代码和管理科学与工程类属性');}
    if(/医学影像技术|医学检验技术|护理|康复治疗/.test(tx(r.major))){risks.push('医学技术/护理康复不等同于临床医生路径');tasks.push('复核执业资格和培养方案');}
    if(/自动化|测控技术与仪器|电子信息工程/.test(tx(r.major))&&ctx.targetPath==='grid'){risks.push('泛电相关专业不能直接等同电气正主');tasks.push('复核电网招聘口径、专业代码和学校行业背景');}
    if(/类|试验班|实验班|大类/.test(tx(r.major))){risks.push('大类/试验班不等同最终专业');tasks.push('复核分流规则、可选专业范围和转专业政策');}
    tasks=tasks.concat(['复核招生章程','复核2025招生计划原文','复核专业代码与培养方案','结合近两年位次变化再决定是否保留']);
    r._rc2Reasons=uniq((r._rc2Reasons||[]).concat(reasons));
    r._rc2Risks=uniq((r._rc2Risks||[]).concat(risks));
    r._rc2ReviewTasks=uniq((r._rc2ReviewTasks||[]).concat(prof&&prof.reviewTasks||[]).concat(tasks)).slice(0,12);
  }
  function scoreRows(records,ctx){
    var rows=[], stats={input:(records||[]).length,interestMatchedRows:0,rankRoles:{},schoolMeta:{},planBands:{A:0,B:0,C:0},excludedQualification:0,blockedFromBByRank:0};
    (records||[]).forEach(function(raw){
      var r=Object.assign({},raw);
      r._rc2Score2025=scoreOf(r); r._rc2Rank2025=rankOf(r);
      r._rc2RankNo=ctx.rankNo;
      r._rc2RankRole=rankRole(r,ctx);
      r._rc2SchoolMeta=schoolMeta(r);
      if(r._rc2SchoolMeta.isQualification&&((ctx.family||{}).qualificationMode!=='include')){stats.excludedQualification++;return;}
      var im=interestMatch(r,ctx.state); r._rc2InterestMatch=im; if(im)stats.interestMatchedRows++;
      if(ctx.child&&ctx.child.manualOnly&&!im)return;
      var base=window.LN_V3_PROFILE_SCORE_ENGINE?window.LN_V3_PROFILE_SCORE_ENGINE.score(r,ctx):{score:50,planBand:'A',reasons:[],risks:[],reviewTasks:[],breakdown:{},planScores:{}};
      r._rc2Professional=professional(r,ctx)||base.professional||null;
      var ps=profScore(r._rc2Professional), interestBonus=im?8:0, rankBonus=r._rc2RankRole.score||0, penalty=metaPenalty(r._rc2SchoolMeta,ctx);
      r._rc2Score=Math.max(0,Math.min(100,Math.round((base.score||50)+ps+interestBonus+rankBonus+penalty)));
      r._rc2PlanScores=base.planScores||{};
      r._rc2Reasons=base.reasons||[];
      r._rc2Risks=base.risks||[];
      r._rc2ReviewTasks=base.reviewTasks||[];
      r._rc2ScoreBreakdown=Object.assign({},base.breakdown||{}, {位次角色:rankBonus,学校性质成本:penalty,专业路径:ps,兴趣命中:interestBonus});
      var band=planBandByRole(r,ctx,base);
      if((r._rc2RankRole.id==='farReach'||r._rc2RankRole.id==='upper'||r._rc2RankRole.id==='reach')&&band==='B'){band='C';stats.blockedFromBByRank++;}
      r._rc2PlanBand=band;
      addInterpretation(r,ctx);
      stats.rankRoles[r._rc2RankRole.id]=(stats.rankRoles[r._rc2RankRole.id]||0)+1;
      stats.planBands[r._rc2PlanBand]=(stats.planBands[r._rc2PlanBand]||0)+1;
      (r._rc2SchoolMeta.labels||[]).forEach(function(x){stats.schoolMeta[x]=(stats.schoolMeta[x]||0)+1;});
      rows.push(r);
    });
    return {rows:rows,stats:stats};
  }
  function roleOrderA(id){return ({match:1,steady:2,safeLow:5,tooLow:9,unknown:10,reach:11,upper:12,farReach:13})[id]||20;}
  function roleOrderB(id){return ({match:1,steady:2,reach:4,safeLow:6,tooLow:9,unknown:10,upper:12,farReach:13})[id]||20;}
  function roleOrderC(id){return ({reach:1,upper:2,farReach:5,match:6,steady:7,safeLow:8,tooLow:9,unknown:10})[id]||20;}
  function metaScore(r){var m=r._rc2SchoolMeta||{}; var s=0; if(m.isPrivate)s-=12; if(m.isVocational)s-=18; if(m.isHighFee)s-=16; if(m.isQualification)s-=25; if((m.labels||[]).indexOf('公办')>=0||(m.labels||[]).indexOf('公办倾向')>=0)s+=10; if((m.labels||[]).indexOf('985')>=0)s+=18; else if((m.labels||[]).indexOf('211')>=0)s+=12; return s;}
  function sortRows(rows,ctx){
    var out=(rows||[]).slice();
    out.sort(function(a,b){
      var po={A:1,B:2,C:3}; var d=(po[a._rc2PlanBand]||9)-(po[b._rc2PlanBand]||9); if(d)return d;
      if(a._rc2PlanBand==='A')return roleOrderA(a._rc2RankRole.id)-roleOrderA(b._rc2RankRole.id)||metaScore(b)-metaScore(a)||Math.abs(n(a._rc2Rank2025)-n(a._rc2RankNo))-Math.abs(n(b._rc2Rank2025)-n(b._rc2RankNo))||n(b._rc2Score)-n(a._rc2Score);
      if(a._rc2PlanBand==='B'){
        function p(r){var lv=r._rc2Professional&&r._rc2Professional.level;return lv==='core'?4:lv==='related'?3:lv==='fuzzy'?1:0;}
        return roleOrderB(a._rc2RankRole.id)-roleOrderB(b._rc2RankRole.id)||p(b)-p(a)||(b._rc2InterestMatch?1:0)-(a._rc2InterestMatch?1:0)||n(b._rc2Score)-n(a._rc2Score);
      }
      return roleOrderC(a._rc2RankRole.id)-roleOrderC(b._rc2RankRole.id)||metaScore(b)-metaScore(a)||n(b._rc2Score)-n(a._rc2Score);
    });
    return out;
  }
  function compute(state,reason){
    var ctx=contextFromState(state||getState());
    var payload=getRecords(ctx.state);
    var scored=scoreRows(payload.records||[],ctx);
    var rows=sortRows(scored.rows,ctx);
    var stats=Object.assign({},scored.stats,{input:(payload.records||[]).length,rows:rows.length,reason:reason||'compute'});
    var result={ok:true,reason:'v300rc2fix3-compute',context:ctx,basePool:payload.basePool||0,familyFilteredRows:payload.familyFilteredRows||0,interestMatchedRows:stats.interestMatchedRows||0,effectiveRows:rows.length,rows:rows,stats:stats,generatedAt:new Date().toISOString()};
    window.LN_V3_COMPUTE_CORE._last=result;
    return result;
  }
  function ensure(state){var st=state||getState(); var last=window.LN_V3_COMPUTE_CORE._last; if(last&&last.context&&JSON.stringify(last.context.state.rank||{})===JSON.stringify((st.rank||{}))&&JSON.stringify(last.context.state.family||{})===JSON.stringify((st.family||{}))&&JSON.stringify(last.context.state.childPreference||{})===JSON.stringify((st.childPreference||{}))&&JSON.stringify(last.context.state.scenario||{})===JSON.stringify((st.scenario||{})))return last; return compute(st,'ensure');}
  function apply(reason){if(!window.LN_V3_STORE)return compute(getState(),reason); var res=compute(window.LN_V3_STORE.getState(),reason||'apply'); window.LN_V3_STORE.setState({computeResult:{version:'v300rc2fix3',valid:true,staleReason:'',contextHash:JSON.stringify({rank:res.context.rankNo,score:res.context.score,scenario:res.context.scenarioId,target:res.context.targetPath}),loadedRows:res.basePool,basePool:res.basePool,familyFilteredRows:res.familyFilteredRows,effectiveRows:res.effectiveRows,stats:res.stats,generatedAt:res.generatedAt},compute:{basePool:res.familyFilteredRows,filtered:res.effectiveRows,lastReason:'rc2fix3-compute'},ui:{lastMessage:'已按旧版候选逻辑重新计算：基础 '+res.familyFilteredRows+' 条，有效 '+res.effectiveRows+' 条。'}},reason||'rc2fix3:compute-apply'); return res;}
  function matrix(){
    var old=window.LN_V3_DATA_CACHE;
    window.LN_V3_DATA_CACHE={records:[
      {school:'辽宁理工职业大学',major:'软件工程技术',score2025:367,rank2025:118109,schoolNatureLabel:'民办 职业本科'},
      {school:'大连东软信息学院',major:'计算机科学与技术',score2025:460,rank2025:76739,schoolNatureLabel:'民办'},
      {school:'辽宁科技学院',major:'材料成型及控制工程',score2025:469,rank2025:72088,schoolNatureLabel:'公办'},
      {school:'稳妥公办大学',major:'电气工程及其自动化',score2025:455,rank2025:79000,schoolNatureLabel:'公办'},
      {school:'东北大学',major:'人工智能',score2025:635,rank2025:4735,schoolNatureLabel:'公办 985'}
    ]};
    var cases=[
      {name:'460辽宁底线',state:{rank:{score:'460',rank:'72000'},family:{regionMode:'hard',provinces:['辽宁'],rejects:[],qualificationMode:'exclude'},childPreference:{selectedGroups:[],manualOnly:false},scenario:{currentScenario:'publicLow',targetPath:'publicLow'}}},
      {name:'600计算机电气',state:{rank:{score:'600',rank:'15000'},family:{regionMode:'none',provinces:[],rejects:[],qualificationMode:'exclude'},childPreference:{selectedGroups:[{id:'computer_ai',name:'计算机'},{id:'electric_energy',name:'电气能源'}],manualOnly:false},scenario:{currentScenario:'grid',targetPath:'grid'}}}
    ];
    var out=cases.map(function(c){var res=compute(c.state,'matrix');return {name:c.name,ok:res.rows.length>0&&res.stats.planBands.A!==undefined,planBands:res.stats.planBands,rankRoles:res.stats.rankRoles,first:res.rows.slice(0,5).map(function(r){return {school:r.school,major:r.major,plan:r._rc2PlanBand,role:r._rc2RankRole.label,meta:r._rc2SchoolMeta.display,score:r._rc2Score2025,rank:r._rc2Rank2025};})};});
    window.LN_V3_DATA_CACHE=old;
    return out;
  }
  window.LN_V3_COMPUTE_CORE={compute:compute,ensure:ensure,apply:apply,matrix:matrix,_last:null,scoreOf:scoreOf,rankOf:rankOf,schoolMeta:schoolMeta,ready:true,version:'v300rc2fix3'};
})();
