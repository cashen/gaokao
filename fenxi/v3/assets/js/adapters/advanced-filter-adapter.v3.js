(function(){
  'use strict';
  function tx(v){return String(v==null?'':v).trim();}
  function clean(v){return tx(v).replace(/\s+/g,'').replace(/[（）()【】\[\]·•,，;；:：/\\|-]/g,'');}
  function n(v){var x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0;}
  function uniq(list){var seen=Object.create(null);return (list||[]).filter(function(x){var k=tx(x);if(!k||seen[k])return false;seen[k]=1;return true;});}
  var DEFAULTS={qSchool:'',qMajor:'',subjectGroup:'',primaryDiscipline:'',taxConfidence:'',schoolTier:'',feeType:'all',confusableGroup:'',level:'',rankRole:'',planBand:'',sortBy:'profile',onlyConfusable:false,onlyKey:false,onlyShortlist:false,fullMode:false,page:1,pageSize:20};
  function normalize(f){return Object.assign({},DEFAULTS,f||{});}
  function textBlob(r){return [
    r.school,r.major,r.majorText,r.cleanMajor,r.rawMajor,r.mainMajorV29475,
    r.officialMajorName,r.officialMajorCode,r.officialCategoryName,r.officialCategoryCode,r.officialDisciplineCode,
    r.undergradMajorName,r.undergradMajorCode,r.undergradDisciplineName,r.undergradCategoryName,
    r.primaryDisciplineNames,r.primaryDisciplineCodes,r.subjectGroup,
    r.gradReferenceShort,r.schoolTier&&r.schoolTier.label,r.schoolNatureLabel,r.schoolNature&&r.schoolNature.label,
    r.feeTypeLabelV29475,r.tuition2025,r.tuitionStatus,(r.riskFlags||[]).join(' '),
    (r._rc2Risks||[]).join(' '),(r._rc2ReviewTasks||[]).join(' ')
  ].map(tx).filter(Boolean).join(' ');}
  function majorBlob(r){return [
    r.major,r.majorText,r.cleanMajor,r.rawMajor,r.mainMajorV29475,
    r.officialMajorName,r.officialMajorCode,r.officialCategoryName,r.officialCategoryCode,r.officialDisciplineCode,
    r.undergradMajorName,r.undergradMajorCode,r.undergradDisciplineName,r.undergradCategoryName,
    r.primaryDisciplineNames,r.primaryDisciplineCodes,r.subjectGroup,r.gradReferenceShort
  ].map(tx).filter(Boolean).join(' ');}
  function primaryBlob(r){return [
    r.primaryDisciplineNames,r.primaryDisciplineCodes,r.cleanMajor,r.undergradCategoryName,
    r.officialCategoryCode,r.officialMajorCode,r.officialDisciplineCode,r.officialMajorName,
    r.undergradDisciplineName,r.undergradMajorCode,r.undergradMajorName
  ].map(tx).filter(Boolean).join(' ');}
  function matchSchool(r,q){return !q||tx(r.school).indexOf(q)!==-1;}
  function matchMajorLegacy(r,q){
    q=clean(q); if(!q)return true;
    if(typeof window.majorMatchesV29475==='function'){try{return !!window.majorMatchesV29475(r,q);}catch(e){}}
    return clean(majorBlob(r)).indexOf(q)!==-1;
  }
  function matchPrimaryLegacy(r,q){q=clean(q); if(!q)return true; return clean(primaryBlob(r)).indexOf(q)!==-1;}
  function highFee(r){return r.isHighFee===true||r.isCoopV29475===true||/高收费|中外合作|合作办学|国际|学术互认|联合培养|ACCA|CIMA|ISEC/.test(textBlob(r));}
  function isPrivate(r){return r.isPrivateV29475===true||/民办|独立|private/.test(textBlob(r));}
  function tierLevel(r){return tx((r.schoolTier&&r.schoolTier.level)||r.schoolTierLevel||'');}
  function matchSchoolTier(r,v){
    if(!v)return true; var lv=tierLevel(r), b=textBlob(r);
    if(v==='985')return lv==='985'||/985/.test(b);
    if(v==='211')return lv==='211'||/211/.test(b);
    if(v==='public')return ['public','publicSoft'].indexOf(lv)!==-1||/公办/.test(b);
    if(v==='private')return isPrivate(r);
    if(v==='unknown')return lv==='unknown'||/待核验|未知/.test(b);
    return true;
  }
  function matchTax(r,v){
    if(!v)return true; var tc=tx(r.taxonomyConfidence); var rank={high:3,medium:2,low:1,unknown:0,'':0};
    if(v==='high')return tc==='high';
    if(v==='medium')return (rank[tc]||0)>=2;
    if(v==='review')return ['low','unknown',''].indexOf(tc)!==-1;
    return true;
  }
  function matchFee(r,v){
    if(!v||v==='all')return true;
    if(v==='normal')return !highFee(r)&&!isPrivate(r);
    if(v==='coopOnly')return highFee(r);
    if(v==='excludeHighPrivate')return !highFee(r)&&!isPrivate(r);
    if(v==='privateOnly')return isPrivate(r);
    return true;
  }
  function hasConfusable(r,group){
    if(typeof window.hasConfusableGroupV2946==='function'&&group){try{return !!window.hasConfusableGroupV2946(r,group);}catch(e){}}
    if(typeof window.hasConfusableMajorV2946==='function'){try{if(window.hasConfusableMajorV2946(r))return true;}catch(e){}}
    var m=tx(r.major), risk=(r._rc2Risks||[]).join(' ')+textBlob(r);
    return /易混|不等同|泛相关|需复核/.test(risk)||/大数据管理与应用|医学影像技术|医学检验技术|护理学|康复治疗|自动化|测控技术与仪器|工商管理类|管理科学与工程/.test(m);
  }
  function hasKeySubject(r){return (r.keySubjectHints||[]).length>0||/重点学科|国家特色|一流本科|双一流|学科评估/.test(textBlob(r));}
  function passAll(r,f){
    f=normalize(f);
    if(!matchSchool(r,f.qSchool))return false;
    if(!matchMajorLegacy(r,f.qMajor))return false;
    if(f.subjectGroup&&tx(r.subjectGroup)!==f.subjectGroup)return false;
    if(!matchPrimaryLegacy(r,f.primaryDiscipline))return false;
    if(f.planBand&&tx(r._rc2PlanBand||r.planBand)!==f.planBand)return false;
    if(f.rankRole&&tx(r._rc2RankRole&&r._rc2RankRole.id)!==f.rankRole)return false;
    if(f.level&&tx(r._level)!==f.level)return false;
    if(!matchTax(r,f.taxConfidence))return false;
    if(!matchSchoolTier(r,f.schoolTier))return false;
    if(!matchFee(r,f.feeType))return false;
    if(f.confusableGroup&&!hasConfusable(r,f.confusableGroup))return false;
    if(f.onlyConfusable&&!hasConfusable(r,''))return false;
    if(f.onlyKey&&!hasKeySubject(r))return false;
    return true;
  }
  function activeSteps(f){
    f=normalize(f); var steps=[];
    if(f.qSchool)steps.push(['学校关键词',function(r){return matchSchool(r,f.qSchool);},'qSchool']);
    if(f.qMajor)steps.push(['专业关键词/目录/学科检索',function(r){return matchMajorLegacy(r,f.qMajor);},'qMajor']);
    if(f.subjectGroup)steps.push(['学科群',function(r){return tx(r.subjectGroup)===f.subjectGroup;},'subjectGroup']);
    if(f.primaryDiscipline)steps.push(['专业类/研一级/官方代码',function(r){return matchPrimaryLegacy(r,f.primaryDiscipline);},'primaryDiscipline']);
    if(f.planBand)steps.push(['A/B/C 角色',function(r){return tx(r._rc2PlanBand||r.planBand)===f.planBand;},'planBand']);
    if(f.rankRole)steps.push(['位次角色',function(r){return tx(r._rc2RankRole&&r._rc2RankRole.id)===f.rankRole;},'rankRole']);
    if(f.level)steps.push(['旧版冲稳保层级',function(r){return tx(r._level)===f.level;},'level']);
    if(f.taxConfidence)steps.push(['目录可信度',function(r){return matchTax(r,f.taxConfidence);},'taxConfidence']);
    if(f.schoolTier)steps.push(['院校层级/性质',function(r){return matchSchoolTier(r,f.schoolTier);},'schoolTier']);
    if(f.feeType&&f.feeType!=='all')steps.push(['办学/收费类型',function(r){return matchFee(r,f.feeType);},'feeType']);
    if(f.confusableGroup)steps.push(['易混主题',function(r){return hasConfusable(r,f.confusableGroup);},'confusableGroup']);
    if(f.onlyConfusable)steps.push(['只看易混/需复核',function(r){return hasConfusable(r,'');},'onlyConfusable']);
    if(f.onlyKey)steps.push(['只看重点学科',function(r){return hasKeySubject(r);},'onlyKey']);
    return steps;
  }
  function buildFunnel(records,f){
    var rows=(records||[]).slice(); var funnel=[{step:'基础候选池',before:rows.length,count:rows.length,drop:0,key:'base'}];
    activeSteps(f).forEach(function(step){var before=rows.length; rows=rows.filter(step[1]); funnel.push({step:step[0],before:before,count:rows.length,drop:before-rows.length,key:step[2]});});
    return {records:rows,funnel:funnel};
  }
  function planOrder(x){return x==='A'?1:x==='B'?2:x==='C'?3:9;}
  function roleOrder(id){return ({farReach:1,upper:2,reach:3,match:4,steady:5,safeLow:6,tooLow:8,unknown:9})[id]||9;}
  function liftScore(r){if(typeof window.liftValueScoreV29475==='function'){try{return window.liftValueScoreV29475(r);}catch(e){}} return n(r._rc2PlanScores&&r._rc2PlanScores.C)||0;}
  function sortRows(list,f){f=normalize(f); var out=list.slice(); out.sort(function(a,b){
    if(f.sortBy==='plan')return planOrder(a._rc2PlanBand)-planOrder(b._rc2PlanBand)||roleOrder(a._rc2RankRole&&a._rc2RankRole.id)-roleOrder(b._rc2RankRole&&b._rc2RankRole.id)||n(b._rc2Score)-n(a._rc2Score);
    if(f.sortBy==='rank2025')return n(a._rc2Rank2025||a.rank2025||a.rank_2025)-n(b._rc2Rank2025||b.rank2025||b.rank_2025);
    if(f.sortBy==='rank_near'||f.sortBy==='fit')return Math.abs(n(a._rc2Rank2025||a.rank2025||a.rank_2025)-n(a._rc2RankNo))-Math.abs(n(b._rc2Rank2025||b.rank2025||b.rank_2025)-n(b._rc2RankNo));
    if(f.sortBy==='rank_safe')return (n(b._rc2Rank2025||b.rank2025||b.rank_2025)-n(b._rc2RankNo))-(n(a._rc2Rank2025||a.rank2025||a.rank_2025)-n(a._rc2RankNo));
    if(f.sortBy==='score_high')return n(b._rc2Score2025||b.score2025||b.score_2025)-n(a._rc2Score2025||a.score2025||a.score_2025);
    if(f.sortBy==='rankDiffHot')return n(a.rankDiff)-n(b.rankDiff);
    if(f.sortBy==='rankDiffLoose')return n(b.rankDiff)-n(a.rankDiff);
    if(f.sortBy==='lift')return liftScore(b)-liftScore(a);
    return planOrder(a._rc2PlanBand)-planOrder(b._rc2PlanBand)||n(b._rc2Score)-n(a._rc2Score)||Math.abs(n(a._rc2Rank2025||a.rank2025||a.rank_2025)-n(a._rc2RankNo))-Math.abs(n(b._rc2Rank2025||b.rank2025||b.rank_2025)-n(b._rc2RankNo));
  }); return out;}
  function apply(records,filter){var f=normalize(filter); var base=(records||[]).length; var built=buildFunnel(records,f); var sorted=sortRows(built.records,f); var last=built.funnel[built.funnel.length-1]||{count:sorted.length}; var bottleneck=built.funnel.slice(1).filter(function(x){return x.drop>0;}).sort(function(a,b){return b.drop-a.drop;})[0]||null; return {ok:true,filter:f,before:base,after:sorted.length,records:sorted,funnel:built.funnel,bottleneck:bottleneck,activeCount:activeSteps(f).length,summary:'基础候选 '+base+' 条，当前筛选 '+sorted.length+' 条。'+(bottleneck?' 主要压缩项：'+bottleneck.step+'，减少 '+bottleneck.drop+' 条。':'')};}
  function hasActiveFilter(f){return activeSteps(f).length>0;}
  function clearFilter(keepFullMode){var f=normalize({}); if(keepFullMode)f.fullMode=true; return f;}
  function fromState(state){return normalize((state&&state.advancedFilter)||((state&&state.candidates&&state.candidates.advancedFilter)||{}));}
  window.LN_V3_ADVANCED_FILTER={DEFAULTS:DEFAULTS,normalize:normalize,apply:apply,fromState:fromState,hasActiveFilter:hasActiveFilter,clearFilter:clearFilter,matchMajorLegacy:matchMajorLegacy,matchPrimaryLegacy:matchPrimaryLegacy,buildFunnel:buildFunnel,ready:true,version:'v300rc2fix3'};
})();
