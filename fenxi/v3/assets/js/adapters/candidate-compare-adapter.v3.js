(function(){
  'use strict';
  function text(v){return String(v==null?'':v).trim();}
  function normalizeOptions(o){o=o||{};return {filterPlan:['all','A','B','C','shortlist'].indexOf(text(o.filterPlan))>=0?text(o.filterPlan):'shortlist',sortBy:text(o.sortBy||'plan_then_rank')};}
  function shortlistItems(state){return (((state||{}).shortlist||{}).items||[]).slice();}
  function filterCards(cards,state,options){options=normalizeOptions(options);var list=options.filterPlan==='shortlist'?shortlistItems(state):(cards||[]).filter(function(c){return options.filterPlan==='all'||c.planBand===options.filterPlan;});return list;}
  function counts(cards,state){var keys={};shortlistItems(state).forEach(function(x){keys[x.key]=1;});var list=cards||[];return {all:list.length,A:list.filter(function(x){return x.planBand==='A';}).length,B:list.filter(function(x){return x.planBand==='B';}).length,C:list.filter(function(x){return x.planBand==='C';}).length,shortlist:Object.keys(keys).length};}
  function riskText(card){return ((card.reviewTags||[]).concat(card.nextReview||[])).slice(0,2).join('；')||'复核招生章程';}
  function compareRows(cards,state,options){return filterCards(cards,state,options||{filterPlan:'shortlist'}).slice(0,6).map(function(card){return {key:card.key,planBand:card.planBand,school:card.school,major:card.major,score2025:card.score2025,rank2025:card.rank2025,rankDistance:card.rankDistance,safety:card.safety,familyFit:card.familyFit,interestFit:card.interestFit,evidenceLevel:card.evidenceLevel,risk:riskText(card),conclusion:card.conclusion||'继续复核'};});}
  function generate(cards,state,options){options=normalizeOptions(options||{filterPlan:'shortlist'});var rows=compareRows(cards||[],state||{},options);return {ok:true,reason:'rc2fix1-shortlist-only-compare',options:options,counts:counts(cards||[],state||{}),filtered:filterCards(cards||[],state||{},options),filteredCount:rows.length,rows:rows,rowCount:rows.length,summary:rows.length?'已按家庭自选池生成横向比较。':'横向比较只读取家庭自选池；当前没有自选项。'};}
  function staticPlan(){return {filterPlans:['shortlist'],sortBy:['plan_then_rank'],compareColumns:['方案','学校专业','位次角色','专业路径','复核风险'],defaultFilter:'shortlist',defaultSort:'plan_then_rank'};}
  window.LN_V3_CANDIDATE_COMPARE={staticPlan:staticPlan,normalizeOptions:normalizeOptions,filterCards:filterCards,counts:counts,compareRows:compareRows,generate:generate,ready:true,version:'v300rc2fix1'};
})();
