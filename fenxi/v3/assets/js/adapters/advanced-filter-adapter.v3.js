(function(){
  'use strict';
  function tx(v){return String(v||'').trim();}
  function n(v){var x=Number(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0;}
  var DEFAULTS={qSchool:'',qMajor:'',subjectGroup:'',primaryDiscipline:'',taxConfidence:'',schoolTier:'',feeType:'all',confusableGroup:'',level:'',rankRole:'',planBand:'',sortBy:'profile',onlyConfusable:false,onlyKey:false,onlyShortlist:false,fullMode:false,page:1,pageSize:20};
  function normalize(f){return Object.assign({},DEFAULTS,f||{});}
  function blob(r){return [r.school,r.major,r.cleanMajor,r.officialMajorName,r.undergradMajorName,r.undergradCategoryName,r.officialCategoryName,r.primaryDisciplineNames,r.primaryDisciplineCodes,r.subjectGroup,r.schoolTier&&r.schoolTier.label,r.schoolNatureLabel,r.feeTypeLabelV29475,(r._rc2Risks||[]).join(' '),(r._rc2ReviewTasks||[]).join(' ')].map(tx).join(' ');}
  function highFee(r){return /高收费|中外合作|合作办学|国际|学术互认|联合培养|ACCA|CIMA|ISEC/.test(blob(r));}
  function isPrivate(r){return /民办|独立|private/.test(blob(r));}
  function tier(r){return tx((r.schoolTier&&r.schoolTier.level)||r.schoolTierLevel||'');}
  function pass(r,f){
    f=normalize(f); var b=blob(r), cleanB=b.replace(/\s+/g,'');
    if(f.qSchool&&tx(r.school).indexOf(f.qSchool)===-1)return false;
    if(f.qMajor&&cleanB.indexOf(f.qMajor.replace(/\s+/g,''))===-1)return false;
    if(f.subjectGroup&&tx(r.subjectGroup)!==f.subjectGroup)return false;
    if(f.primaryDiscipline&&b.indexOf(f.primaryDiscipline)===-1)return false;
    if(f.planBand&&tx(r._rc2PlanBand||r.planBand)!==f.planBand)return false;
    if(f.rankRole&&tx(r._rc2RankRole&&r._rc2RankRole.id)!==f.rankRole)return false;
    if(f.taxConfidence){var tc=tx(r.taxonomyConfidence); if(f.taxConfidence==='high'&&tc!=='high')return false; if(f.taxConfidence==='medium'&&['high','medium'].indexOf(tc)===-1)return false; if(f.taxConfidence==='review'&&['low','unknown',''].indexOf(tc)===-1)return false;}
    if(f.schoolTier){var lv=tier(r), label=b; if(f.schoolTier==='985'&&!/985/.test(label)&&lv!=='985')return false; if(f.schoolTier==='211'&&!/211/.test(label)&&lv!=='211')return false; if(f.schoolTier==='public'&&!/公办/.test(label)&&['public','publicSoft'].indexOf(lv)===-1)return false; if(f.schoolTier==='private'&&!isPrivate(r))return false;}
    if(f.feeType==='normal'&&highFee(r))return false; if(f.feeType==='coopOnly'&&!highFee(r))return false; if(f.feeType==='excludeHighPrivate'&&(highFee(r)||isPrivate(r)))return false;
    if(f.level&&tx(r._level)!==f.level)return false;
    if(f.onlyConfusable&&!((r._rc2Risks||[]).join('').indexOf('复核')!==-1||/大数据管理与应用|医学影像技术|自动化|测控技术与仪器|工商管理类/.test(tx(r.major))))return false;
    if(f.onlyKey&&!((r.keySubjectHints||[]).length||/重点学科|双一流|国家特色/.test(b)))return false;
    return true;
  }
  function planOrder(x){return x==='A'?1:x==='B'?2:x==='C'?3:9;}
  function sort(list,f){f=normalize(f); var out=list.slice(); out.sort(function(a,b){
    if(f.sortBy==='plan')return planOrder(a._rc2PlanBand)-planOrder(b._rc2PlanBand)||n(b._rc2Score)-n(a._rc2Score);
    if(f.sortBy==='rank2025')return n(a.rank2025)-n(b.rank2025);
    if(f.sortBy==='rank_near'||f.sortBy==='fit')return Math.abs(n(a.rank2025)-n(a._rc2RankNo))-Math.abs(n(b.rank2025)-n(b._rc2RankNo));
    if(f.sortBy==='rank_safe')return (n(b.rank2025)-n(b._rc2RankNo))-(n(a.rank2025)-n(a._rc2RankNo));
    if(f.sortBy==='score_high')return n(b.score2025)-n(a.score2025);
    if(f.sortBy==='rankDiffHot')return n(a.rankDiff)-n(b.rankDiff);
    if(f.sortBy==='rankDiffLoose')return n(b.rankDiff)-n(a.rankDiff);
    if(f.sortBy==='lift')return n(b._rc2PlanScores&&b._rc2PlanScores.C)-n(a._rc2PlanScores&&a._rc2PlanScores.C);
    // 画像匹配优先：先方案角色，再推荐分，避免 B/C 抢空 A。
    return planOrder(a._rc2PlanBand)-planOrder(b._rc2PlanBand)||n(b._rc2Score)-n(a._rc2Score);
  }); return out;}
  function apply(records,filter){var f=normalize(filter); var before=(records||[]).length; var rows=(records||[]).filter(function(r){return pass(r,f);}); rows=sort(rows,f); return {ok:true,filter:f,before:before,after:rows.length,records:rows,summary:'高级筛选从 '+before+' 条缩到 '+rows.length+' 条。'};}
  function fromState(state){return normalize((state&&state.advancedFilter)||((state&&state.candidates&&state.candidates.advancedFilter)||{}));}
  window.LN_V3_ADVANCED_FILTER={DEFAULTS:DEFAULTS,normalize:normalize,apply:apply,fromState:fromState,ready:true,version:'v300rc2fix1'};
})();
