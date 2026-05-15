// V2.9.8.3.fix3 module navigation: scroll first, compute later. Tracks next-step latency in debug.
(function(){
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function stop(e){e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  function scrollTo(id){const el=document.getElementById(id); if(!el)return false; el.scrollIntoView({behavior:'smooth',block:'start'}); return true;}
  document.addEventListener('click',function(e){const btn=e.target.closest('[data-scroll-target]'); if(!btn)return; const target=btn.dataset.scrollTarget; if(!target)return; const t=perf(); stop(e); const ok=scrollTo(target); setTimeout(()=>{try{window.LN_DEBUG_V2983?.detail?.('nextStepLatency',{target,ok,ms:Math.round(perf()-t),text:(btn.textContent||'').trim().slice(0,40)});}catch(err){}},80);},true);
  window.LN_MODULE_STEP_PRIORITY_V2983FIX3={ready:true};
})();
