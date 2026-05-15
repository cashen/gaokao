
// V2.92RC｜A/B/C 统一裁决层：先判风险与成本资格，再导出/命名
(function(){
  if(window.LN_FINAL_DECISION_DISABLE===true) return;
  var VERSION='v292rc-final-decision';
  var STAMP='292rc-20260515';
  function clean(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
  function num(v){v=Number(v);return Number.isFinite(v)?v:0;}
  function rank(){try{return window.currentRank||(typeof currentRank!=='undefined'?currentRank:null)||num(document.getElementById('myRank')&&document.getElementById('myRank').value)||null;}catch(e){return null;}}
  function rowRank(r){return num(r&& (r.rank2025||r.rank||r.minRank||r.rank_2025))||null;}
  function rowScore(r){return num(r&& (r.score2025||r.score||r.minScore||r.score_2025))||null;}
  function natureText(r){return [r&&r.schoolNatureLabel,r&&r.nature,r&&r.schoolNature&&r.schoolNature.label,r&&r.schoolNature,r&&r.major,r&&r.school,r&&r.riskFlags,r&&r.fee,r&&r.tuition,r&&r.remark].map(clean).join(' ');}
  function costFlags(r){var s=natureText(r), out=[]; if(!(r&& (r.tuition2025||r.tuition||r.fee)))out.push('学费待核验'); if(/民办|独立学院|独立/.test(s)||r&& (r.isPrivate||r.isPrivateV29475))out.push('民办/独立学院需复核'); if(/中外|合作办学|国际/.test(s)||r&& (r.isCoop||r.isCoopV29475))out.push('中外合作需复核'); if(/高收费|高费/.test(s)||r&&r.isHighFee)out.push('高收费需重点复核'); return Array.from(new Set(out));}
  function isHighCost(r){return /民办|独立|中外|高收费/.test(costFlags(r).join('|'));}
  function gapOf(r){var cr=rank(), rr=rowRank(r); if(!cr||!rr)return {gap:null,abs:null,kind:'unknown',text:'位次差待复核'}; var g=rr-cr, abs=Math.abs(g); if(g<0)return {gap:g,abs:abs,kind:'behind',text:'孩子落后约 '+abs.toLocaleString('zh-CN')+' 位'}; if(g<=500)return {gap:g,abs:abs,kind:'pressure',text:'基本压线'}; return {gap:g,abs:abs,kind:'lead',text:'孩子领先约 '+g.toLocaleString('zh-CN')+' 位'};}
  function risk(r){var g=gapOf(r).gap; if(g==null)return '需复核'; if(g<0)return '小冲/边缘冲'; if(g<=500)return '压线匹配'; if(g<=1500)return '近线匹配'; if(g<=5000)return '匹配/稳妥'; if(g<=12000)return '保底'; return '强保底/分数利用偏低';}
  function orderKey(r){var rs=risk(r); if(isHighCost(r))return 'highCost'; if(/小冲/.test(rs))return 'front'; if(/压线/.test(rs))return 'pressure'; if(/近线/.test(rs))return 'near'; if(/匹配|稳妥/.test(rs))return 'middle'; if(/强保底|分数利用偏低/.test(rs))return 'strong'; if(/保底/.test(rs))return 'safe'; return 'middle';}
  function bucketAllowed(type,r){var k=orderKey(r); if(k==='highCost')return false; if(type==='C')return ['front','pressure','near','middle'].includes(k); if(type==='B')return !['strong','highCost'].includes(k); return true;}
  function role(type,r,oldRole){var k=orderKey(r); if(k==='highCost')return '高成本观察'; if(k==='strong')return '强保底对照'; if(k==='safe')return type==='C'?'不进C组':'保底对照'; if(k==='front')return '小冲/边缘冲'; if(k==='pressure')return '压线匹配'; if(k==='near')return '近线匹配'; if(k==='middle')return oldRole||'匹配/稳妥'; return oldRole||'候选项';}
  function dedupeKey(r){return [clean(r&&r.school),clean(r&& (r.major||r.cleanMajor||r.admissionMajor)),clean(r&& (r.majorCode2025||r.admissionMajorCode||r.code||''))].join('|');}
  function closure(){try{return window.LN_RULES_CLOSURE_V291||null;}catch(e){return null;}}
  function getBuckets(){try{var c=closure(); if(c&&c.makeBuckets)return c.makeBuckets();}catch(e){} return window.latestPlanBucketsV29475Fix2||{A:[],B:[],C:[]};}
  function fieldsFor(r,type,i){try{return closure()&&closure().closureFields&&closure().closureFields(r,type,i)||{};}catch(e){return {};}}
  function merged(){var b=getBuckets(), map=new Map(), out=[]; ['A','B','C'].forEach(function(t){(b[t]||[]).forEach(function(r,i){var k=dedupeKey(r), obj=map.get(k); if(!obj){obj={type:t,index:i,row:r,fields:fieldsFor(r,t,i),sources:[]}; map.set(k,obj); out.push(obj);} obj.sources.push(t+(i+1));});}); out.forEach(function(x){x.risk=risk(x.row); x.orderKey=orderKey(x.row); x.gap=gapOf(x.row); x.costFlags=costFlags(x.row); x.highCost=isHighCost(x.row); x.allowed=bucketAllowed(x.type,x.row); x.role=role(x.type,x.row,x.fields&&x.fields.role);}); return out;}
  window.LN_FINAL_DECISION_V292={ready:true,version:VERSION,stamp:STAMP,rank:rank,gapOf:gapOf,risk:risk,orderKey:orderKey,costFlags:costFlags,isHighCost:isHighCost,bucketAllowed:bucketAllowed,role:role,mergedItems:merged};
  try{window.LN_DEBUG_V2983&&window.LN_DEBUG_V2983.setFlags&&window.LN_DEBUG_V2983.setFlags({finalDecision:'v292rc',abcEligibilityFirst:true,dynamicRoleNaming:true,noForcedFill:true});}catch(e){}
})();
