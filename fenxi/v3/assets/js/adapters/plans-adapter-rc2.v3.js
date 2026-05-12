(function(){
  'use strict';
  function esc(v){return String(v==null?'':v).trim();}
  function n(v){var x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0;}
  function compact(r,role){
    var prof=r._rc2Professional||{};
    return {school:esc(r.school),major:esc(r.major),score2025:esc(r.score2025),rank2025:esc(r.rank2025),schoolProvince:esc(r.schoolProvince),lnArea:esc(r.lnArea),schoolNatureLabel:esc(r.schoolNatureLabel),tuition2025:esc(r.tuition2025||r.tuitionStatus||''),planRole:role,safety:(r._rc2RankRole&&r._rc2RankRole.label)||'',rankDistance:Number(r._rc2RankNo||0)-Number(r.rank2025||0),matchReason:(r._rc2InterestMatch&&r._rc2InterestMatch.reason)||'',evidenceLevel:(r._rc2Risks||[]).length?'需要复核':'模型判断',reviewTags:(r._rc2Risks||[]).slice(0,4),oneLine:(r._rc2Reasons||[]).slice(0,2).join('；')||'按旧版路径规则进入候选。',score:r._rc2Score,scoreBreakdown:r._rc2ScoreBreakdown,professional:prof,reviewTasks:r._rc2ReviewTasks||[],rawPlanBand:r._rc2PlanBand};
  }
  function uniquePick(pool,limit,seen){
    seen=seen||Object.create(null); var out=[];
    (pool||[]).forEach(function(r){var key=[r.school,r.major,r.rank2025].join('|'); if(out.length>=limit||seen[key])return; seen[key]=1; out.push(r);});
    return out;
  }
  function sortA(a,b){
    var order={steady:1,safeLow:2,match:3,unknown:4,reach:5,upper:6,farReach:7};
    var ar=a._rc2RankRole&&a._rc2RankRole.id, br=b._rc2RankRole&&b._rc2RankRole.id;
    var o=(order[ar]||9)-(order[br]||9); if(o)return o;
    return (b._rc2Score||0)-(a._rc2Score||0);
  }
  function sortB(a,b){
    function p(r){var lv=r._rc2Professional&&r._rc2Professional.level;return lv==='core'?4:lv==='related'?3:lv==='fuzzy'?1:0;}
    var d=p(b)-p(a); if(d)return d;
    var im=(b._rc2InterestMatch?1:0)-(a._rc2InterestMatch?1:0); if(im)return im;
    return (b._rc2Score||0)-(a._rc2Score||0);
  }
  function sortC(a,b){
    var order={reach:1,upper:2,farReach:3,match:4,steady:5,safeLow:6};
    var ar=a._rc2RankRole&&a._rc2RankRole.id, br=b._rc2RankRole&&b._rc2RankRole.id;
    var o=(order[ar]||9)-(order[br]||9); if(o)return o;
    return (b._rc2Score||0)-(a._rc2Score||0);
  }
  function groupRows(rows){
    rows=rows||[];
    var A=rows.filter(function(r){return r._rc2PlanBand==='A';}).sort(sortA);
    var B=rows.filter(function(r){return r._rc2PlanBand==='B';}).sort(sortB);
    var C=rows.filter(function(r){return r._rc2PlanBand==='C';}).sort(sortC);
    // 防止 A/B/C 被某一条逻辑吸空：只做方案展示兜底，不改原候选的 planBand。
    if(!A.length){A=rows.filter(function(r){var id=r._rc2RankRole&&r._rc2RankRole.id;return id==='steady'||id==='safeLow'||id==='match';}).sort(sortA);}
    if(!B.length){B=rows.filter(function(r){var id=r._rc2RankRole&&r._rc2RankRole.id;var lv=r._rc2Professional&&r._rc2Professional.level;return (id==='match'||id==='steady')&&(r._rc2InterestMatch||lv==='core'||lv==='related');}).sort(sortB);}
    if(!C.length){C=rows.filter(function(r){var id=r._rc2RankRole&&r._rc2RankRole.id;return id==='reach'||id==='upper'||id==='farReach';}).sort(sortC);}
    return {A:A,B:B,C:C};
  }
  function generate(state){
    state=state||(window.LN_V3_STORE?window.LN_V3_STORE.getState():{});
    var result=window.LN_V3_COMPUTE_CORE?window.LN_V3_COMPUTE_CORE.ensure(state):{rows:[],stats:{}};
    var rows=result.rows||[]; var group=groupRows(rows); var seen=Object.create(null);
    var aPick=uniquePick(group.A,8,seen), bPick=uniquePick(group.B,8,seen), cPick=uniquePick(group.C,8,seen);
    var plans={
      A:{id:'A',title:'A 守底线方案',role:'家庭底线内的稳妥组合',tone:'先守位次安全、家庭底线、费用和学校性质，再看是否值得继续保留。',count:(rows.filter(function(r){return r._rc2PlanBand==='A';}).length)||group.A.length,sourcePool:rows.length,focus:['位次安全','家庭底线','费用/性质复核'],samples:aPick.map(function(r){return compact(r,'守底线');})},
      B:{id:'B',title:'B 看专业方案',role:'可达范围内的专业路径',tone:'只看位次可讨论范围内的专业正主、相近方向和孩子兴趣命中；明显够不上的不放进 B 主方案。',count:(rows.filter(function(r){return r._rc2PlanBand==='B';}).length)||group.B.length,sourcePool:rows.length,focus:['专业正主','孩子兴趣','培养方案'],samples:bPick.map(function(r){return compact(r,'看专业');})},
      C:{id:'C',title:'C 看上限方案',role:'学校层级、城市或提档价值比较',tone:'承接可冲、上限探索和平台/城市比较，必须明确标注上探风险，不能冒充稳妥。',count:(rows.filter(function(r){return r._rc2PlanBand==='C';}).length)||group.C.length,sourcePool:rows.length,focus:['平台/城市','上限探索','风险复核'],samples:cPick.map(function(r){return compact(r,'看上限');})}
    };
    return {ok:true,reason:'rc2fix1-plans-rank-first',basePool:result.basePool,familyFilteredRows:result.familyFilteredRows,matchedRows:result.interestMatchedRows,effectiveRows:result.effectiveRows,scoreBand:result.context&&result.context.score,scenario:result.context&&result.context.scenario,targetPath:result.context&&result.context.targetPath,plans:plans,stats:result.stats,summary:'RC2.fix1 已按“位次先行→家庭底线→专业路径→上限比较”生成 A/B/C：A '+plans.A.count+' 条，B '+plans.B.count+' 条，C '+plans.C.count+' 条。'};
  }
  function apply(reason){if(!window.LN_V3_STORE)return generate();var preview=generate(window.LN_V3_STORE.getState());window.LN_V3_STORE.setState({plans:{A:preview.plans.A.samples,B:preview.plans.B.samples,C:preview.plans.C.samples,preview:preview,meta:{generatedAt:new Date().toISOString(),reason:preview.reason}},compute:{basePool:preview.familyFilteredRows,filtered:preview.effectiveRows,lastReason:'rc2fix1-plans'},ui:{lastMessage:preview.summary}},reason||'rc2fix1:plans-apply');return preview;}
  function matrix(){return ['A','B','C'].map(function(id){return {name:'RC2.fix1 '+id+' 方案角色',ok:true,rule:id==='A'?'位次安全/家庭底线':id==='B'?'可达范围内的专业路径':'上限探索/平台城市'};});}
  window.LN_V3_PLANS_ADAPTER={generate:generate,apply:apply,matrix:matrix,ready:true,rc2:true,version:'v300rc2fix1'};
})();
