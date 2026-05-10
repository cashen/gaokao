// V2.9.6 light performance monitor. Visible in diagnostics/debug; no external reporting.
(function(){
  const history=[]; let current=null;
  function now(){return (performance&&performance.now)?performance.now():Date.now();}
  function start(meta){current={meta:meta||{}, start:now(), marks:[]}; return current;}
  function mark(name){if(current) current.marks.push({name, t:now()-current.start});}
  function end(extra){if(!current)return null; const item=Object.assign({}, current, {duration:Math.round(now()-current.start), endAt:new Date().toISOString()}, extra||{}); history.unshift(item); if(history.length>20)history.pop(); current=null; return item;}
  function last(){return history[0]||null;}
  function all(){return history.slice();}
  window.LN_PERF_MONITOR_V296={start,mark,end,last,all,ready:true};
})();
