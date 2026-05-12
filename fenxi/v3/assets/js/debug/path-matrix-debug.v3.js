(function(){
  'use strict';
  function check(name,ok,detail){return {name:name,ok:!!ok,detail:detail||''};}
  function line(x,i){return (x.ok?'PASS':'FAIL')+' '+String(i+1).padStart(2,'0')+'｜'+x.name+(x.detail?'｜'+x.detail:'');}
  function rulebook(){var rb=window.LN_V3_LEGACY_RULEBOOK;var m=rb&&rb.matrix?rb.matrix():{};return [check('RC2 rulebook 存在',!!rb),check('12个场景路径完整',m.scenarioCount===12,JSON.stringify(m)),check('9个目标路径完整',m.targetPathCount===9,JSON.stringify(m)),check('8个专业路径完整',m.professionalPathCount===8,JSON.stringify(m)),check('A/B/C规则完整',m.planCount===3,JSON.stringify(m)),check('复核规则完整',m.reviewCount>=3,JSON.stringify(m))];}
  function professional(){if(!window.LN_V3_PROFESSIONAL_PATH)return [check('专业路径引擎存在',false)];return window.LN_V3_PROFESSIONAL_PATH.matrix().map(function(x){return check('专业路径：'+x.major+' → '+x.path,x.ok,JSON.stringify({expected:x.expected,got:x.got,detail:x.detail&&x.detail.label}));});}
  function scenarios(){if(!window.LN_V3_SCENARIO_ADAPTER||!window.LN_V3_SCENARIO_ADAPTER.matrix)return [check('场景矩阵存在',false)];return window.LN_V3_SCENARIO_ADAPTER.matrix().map(function(x){return check('场景路径：'+x.name,x.ok,JSON.stringify(x.preview&&{recommended:x.preview.recommended,target:x.preview.target&&x.preview.target.id}));});}
  function targets(){var rb=window.LN_V3_LEGACY_RULEBOOK;return (rb?rb.targetPaths:[]).map(function(x){return check('目标路径：'+x.label,!!(x.planBias&&x.warning),JSON.stringify(x.planBias));});}
  function score(){if(!window.LN_V3_PROFILE_SCORE_ENGINE)return [check('推荐分引擎存在',false)];return window.LN_V3_PROFILE_SCORE_ENGINE.matrix().map(function(x){return check('推荐分：'+x.case.major+' / '+x.case.targetPath,x.ok,JSON.stringify({got:x.got,score:x.detail.score,prof:x.detail.professional&&x.detail.professional.label}));});}
  function compute(){if(!window.LN_V3_COMPUTE_CORE)return [check('计算核心存在',false)];return window.LN_V3_COMPUTE_CORE.matrix().map(function(x){return check('真实流程矩阵：'+(x.name||''),x.ok,JSON.stringify({planBands:x.planBands,rankRoles:x.rankRoles,first:x.first}));});}
  function device(){var d=window.LN_V3_DEVICE?window.LN_V3_DEVICE.detect():{};return [check('设备适配器存在',!!window.LN_V3_DEVICE),check('localStorage 可用',d.localStorageAvailable!==false,JSON.stringify(d)),check('视口已识别',!!(d.mobile||d.tablet||d.desktop),JSON.stringify(d))];}

  function reviewFilterIsolation(){
    var adv=window.LN_V3_ADVANCED_FILTER, core=window.LN_V3_COMPUTE_CORE;
    if(!adv||!core)return [check('候选复核筛选隔离模块存在',false)];
    var old=window.LN_V3_DATA_CACHE;
    var state={rank:{score:'600',rank:'15000',loadedRows:3},family:{regionMode:'none',provinces:[],rejects:[]},childPreference:{selectedGroups:[{id:'electric_energy',name:'电气能源'}],manualOnly:false},scenario:{currentScenario:'grid',targetPath:'grid'},advancedFilter:{}};
    window.LN_V3_DATA_CACHE={records:[{school:'东北大学',major:'人工智能',score2025:635,rank2025:4735,schoolNatureLabel:'公办倾向'},{school:'稳妥大学',major:'电气工程及其自动化',score2025:595,rank2025:17000,schoolNatureLabel:'公办倾向'},{school:'匹配大学',major:'自动化',score2025:602,rank2025:14500,schoolNatureLabel:'公办倾向'}]};
    var base=core.compute(state,'debug-base');
    var view=adv.apply(base.rows,{qSchool:'不存在学校',fullMode:true});
    var state2=Object.assign({},state,{advancedFilter:{qSchool:'不存在学校',fullMode:true}});
    var base2=core.compute(state2,'debug-base-with-review-filter');
    window.LN_V3_DATA_CACHE=old;
    return [check('候选复核筛选可压成0但不污染基础池',base.rows.length===base2.rows.length&&view.records.length===0,JSON.stringify({base:base.rows.length,view:view.records.length,baseAfterFilterState:base2.rows.length})),check('高级筛选漏斗可读',!!(view.funnel&&view.funnel.length>=2),JSON.stringify(view.funnel))];
  }

  function invalidation(){var inv=window.LN_V3_STATE_INVALIDATION;if(!inv)return [check('状态失效适配器存在',false)];var a=inv.hashState({rank:{score:'500'},family:{regionMode:'none'}});var b=inv.hashState({rank:{score:'510'},family:{regionMode:'none'}});var c=inv.compare(a,b);return [check('状态失效适配器存在',true),check('分数变化触发失效',c.needsRecompute&&c.staleModules.indexOf('plans')!==-1,JSON.stringify(c)),check('localStorage 报告可读',!!inv.storageReport().ok,JSON.stringify(inv.storageReport()))];}
  function run(kind){var arr=[];if(kind==='rulebook')arr=rulebook();else if(kind==='professional')arr=professional();else if(kind==='scenario')arr=scenarios();else if(kind==='target')arr=targets();else if(kind==='score')arr=score();else if(kind==='compute')arr=compute();else if(kind==='device')arr=device();else if(kind==='invalidation')arr=invalidation();else if(kind==='review')arr=reviewFilterIsolation();else arr=[].concat(rulebook(),professional(),scenarios(),targets(),score(),compute(),reviewFilterIsolation(),device(),invalidation());var pass=arr.filter(function(x){return x.ok;}).length;var text='【V3 RC2.fix2 全路径 Debug】\n运行时间：'+new Date().toLocaleString('zh-CN')+'\n总步骤：'+arr.length+'；通过：'+pass+'；失败：'+(arr.length-pass)+'\n\n'+arr.map(line).join('\n');return {results:arr,text:text,pass:pass,fail:arr.length-pass,ok:pass===arr.length};}

  function bindLegacyButtons(){document.addEventListener('click',function(e){var target=e.target&&e.target.closest?e.target.closest('[data-debug-run]'):null;if(!target)return;var kind=target.getAttribute('data-debug-run');if(kind==='oneclick'||kind==='pathmatrix'||kind==='rc2all'){var box=document.getElementById('debugSelftestBox');if(box){e.preventDefault();e.stopImmediatePropagation();box.textContent=run('all').text;}}},true);}

  function inject(){if(!document.getElementById)return;var box=document.getElementById('debugSelftestBox');var actions=document.querySelector('.debug-actions-oneclick')||document.querySelector('.debug-actions');if(!box||!actions||document.getElementById('rc2DebugButtons'))return;var wrap=document.createElement('div');wrap.id='rc2DebugButtons';wrap.className='rc2-debug-grid';[['all','RC2一键总检'],['rulebook','路径规则'],['scenario','场景矩阵'],['target','目标路径'],['professional','专业路径'],['score','推荐分'],['compute','分数段矩阵'],['review','候选筛选隔离'],['device','设备'],['invalidation','状态失效']].forEach(function(item){var b=document.createElement('button');b.type='button';b.textContent=item[1];b.addEventListener('click',function(){box.textContent=run(item[0]).text;});wrap.appendChild(b);});actions.parentNode.insertBefore(wrap,actions.nextSibling);} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bindLegacyButtons();inject();});else {bindLegacyButtons();setTimeout(inject,80);}
  window.LN_V3_RC2_DEBUG={run:run,ready:true,version:'v300rc2fix2'};
})();
