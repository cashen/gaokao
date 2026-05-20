/* V2.92RC.engine-cleanup｜刷新机制观察器。当前仅统计，不接管 applyFilters，避免改变业务结果。 */
(function(){
  'use strict';
  const VERSION='V2.92RC.engine-cleanup.refresh-observer';
  const state={version:VERSION,requests:[],timings:[],notes:['当前版本仅观察刷新，不接管原 applyFilters，保证逻辑保真。']};
  function note(event,data){state.requests.push({event,data:data||null,at:new Date().toISOString()}); if(state.requests.length>80)state.requests.shift();}
  function time(label,fn){const t=performance.now();try{return fn();}finally{state.timings.push({label,ms:Math.round(performance.now()-t),at:new Date().toISOString()});if(state.timings.length>80)state.timings.shift();}}
  function getStats(){return JSON.parse(JSON.stringify(state));}
  window.LN_REFRESH_CONTROLLER_V292RC={ready:true,version:VERSION,note,time,getStats};
  note('observer-ready');
})();
