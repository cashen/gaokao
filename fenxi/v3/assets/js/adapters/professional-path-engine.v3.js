(function () {
  'use strict';
  function norm(v){return String(v||'').replace(/\s+/g,'').replace(/[（(].*?[）)]/g,'').trim();}
  function textOf(record){record=record||{};return norm([record.officialMajorName,record.undergradMajorName,record.cleanMajor,record.mainMajorV29475,record.major,record.admissionMajor,record.undergradCategoryName,record.officialCategoryName,record.primaryDisciplineNames,record.subjectGroup].filter(Boolean).join(' '));}
  function hit(text, terms){terms=terms||[];for(var i=0;i<terms.length;i++){var t=norm(terms[i]);if(t&&text.indexOf(t)!==-1)return terms[i];}return '';}
  function scoreFor(level){return level==='core'?80:level==='related'?45:level==='fuzzy'?16:0;}
  function matchOne(record,pathId){
    var rb=window.LN_V3_LEGACY_RULEBOOK; var rule=rb&&rb.getProfessionalPath?rb.getProfessionalPath(pathId):null;
    var txt=textOf(record); if(!rule||!txt)return {pathId:pathId,level:'none',score:0,label:'未命中',matchedTerm:'',warning:'',reviewTasks:[],evidence:'专业名称未命中该路径'};
    var term=hit(txt,rule.core); if(term)return {pathId:pathId,level:'core',score:scoreFor('core'),label:rule.label+'｜正主',matchedTerm:term,warning:'',reviewTasks:rule.review||[],evidence:'命中正主专业：'+term};
    term=hit(txt,rule.related); if(term)return {pathId:pathId,level:'related',score:scoreFor('related'),label:rule.label+'｜相近',matchedTerm:term,warning:(rule.warnings||[])[0]||'相近方向需复核培养方案。',reviewTasks:rule.review||[],evidence:'命中相近专业：'+term};
    term=hit(txt,rule.fuzzy); if(term)return {pathId:pathId,level:'fuzzy',score:scoreFor('fuzzy'),label:rule.label+'｜泛相关需复核',matchedTerm:term,warning:(rule.warnings||[])[0]||'泛相关方向不宜直接等同正主。',reviewTasks:rule.review||[],evidence:'命中模糊/泛相关专业：'+term};
    return {pathId:pathId,level:'none',score:0,label:'未命中',matchedTerm:'',warning:'',reviewTasks:[],evidence:'未命中'+rule.label};
  }
  function pathIdsFromState(state){
    var ids=[]; state=state||{}; var child=state.childPreference||{};
    (child.selectedGroups||[]).forEach(function(g){var id=typeof g==='string'?g:g.id; if(id==='electric_energy')ids.push('electric'); if(id==='computer_ai')ids.push('computer'); if(id==='electronic_comm')ids.push('info'); if(id==='medicine_health')ids.push('medical'); if(id==='agri_animal_food')ids.push('medical'); if(id==='mechanical_instrument')ids.push('machine'); if(id==='finance_manage')ids.push('accounting'); if(id==='law_human_edu')ids.push('exam','teacher');});
    var target=(state.scenario||{}).targetPath||(state.scenario||{}).current||''; if(target==='grid')ids.push('electric'); if(target==='medical')ids.push('medical'); if(target==='exam')ids.push('exam'); if(target==='postgrad')ids.push('medical','computer','electric');
    if(!ids.length)ids=['electric','computer','medical','accounting','exam','teacher','machine','info'];
    return Array.from(new Set(ids));
  }
  function best(record,stateOrPathIds){
    var ids=Array.isArray(stateOrPathIds)?stateOrPathIds:pathIdsFromState(stateOrPathIds||{}); var bestHit=null;
    ids.forEach(function(id){var m=matchOne(record,id); if(!bestHit||m.score>bestHit.score)bestHit=m;});
    return bestHit||matchOne(record,'computer');
  }
  function all(record){var rb=window.LN_V3_LEGACY_RULEBOOK; var paths=(rb&&rb.professionalPaths)||{}; return Object.keys(paths).map(function(id){return matchOne(record,id);}).filter(function(m){return m.level!=='none';});}
  function matrix(){
    var samples=[
      ['电气工程及其自动化','electric','core'],['自动化','electric','related'],['测控技术与仪器','electric','fuzzy'],
      ['计算机科学与技术','computer','core'],['数据科学与大数据技术','computer','related'],['大数据管理与应用','computer','fuzzy'],
      ['临床医学','medical','core'],['医学影像技术','medical','related'],['生物医学工程','medical','fuzzy'],
      ['会计学','accounting','core'],['工商管理类','accounting','fuzzy'],['汉语言文学','exam','core']
    ];
    return samples.map(function(s){var got=matchOne({major:s[0]},s[1]);return {major:s[0],path:s[1],expected:s[2],got:got.level,ok:got.level===s[2],detail:got};});
  }
  window.LN_V3_PROFESSIONAL_PATH = {norm:norm,textOf:textOf,matchOne:matchOne,best:best,all:all,pathIdsFromState:pathIdsFromState,matrix:matrix,ready:true};
})();
