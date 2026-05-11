// V2.9.6 refresh scheduler: merge rapid UI events into one refresh and avoid overlapping full calculations.
(function(){
  let timer=null, running=false, queued=null, serial=0;
  const rank={"ui-only":0,"render-only":1,"soft":2,"full":3};
  function normalize(req){
    const policy=window.LN_INTERACTION_POLICY_V296?.get?.(req?.reason||'')||{};
    return Object.assign({reason:'unknown', level:policy.level||'soft', delay:policy.delay??180, run:null}, req||{});
  }
  function stronger(a,b){return (rank[a]||0)>=(rank[b]||0)?a:b;}
  function merge(a,b){if(!a)return b; if(!b)return a; return Object.assign({}, a, b, {level:stronger(a.level,b.level), reason:[a.reason,b.reason].filter(Boolean).join('+'), delay:Math.max(a.delay??180,b.delay??180)});}
  function request(raw){
    const req=normalize(raw); queued=merge(queued, req);
    try{window.LN_DEBUG_V2983?.setQueue?.({pending:!!queued,running,reason:queued?.reason,level:queued?.level,delay:queued?.delay,requestedAt:new Date().toLocaleTimeString()});}catch(e){}
    if(timer) clearTimeout(timer);
    return new Promise(resolve=>{
      queued.resolve=resolve;
      timer=setTimeout(run, Math.max(0, queued.delay||0));
    });
  }
  async function run(){
    if(running){ timer=setTimeout(run,120); return; }
    const req=queued; queued=null; timer=null; if(!req)return;
    running=true; serial++; try{window.LN_DEBUG_V2983?.setQueue?.({pending:false,running:true,serial,reason:req.reason,level:req.level,startedAt:new Date().toLocaleTimeString()});}catch(e){}
    try{
      window.LN_PERF_MONITOR_V296?.start?.({serial,reason:req.reason,level:req.level});
      if(req.level==='ui-only' || req.level==='render-only'){
        if(typeof req.render==='function') req.render();
        window.LN_PERF_MONITOR_V296?.end?.({skippedFull:true});
        req.resolve?.({ok:true, skippedFull:true});
      }else{
        window.LN_STATE_SNAPSHOT_V296?.reset?.();
        window.LN_CANDIDATE_CACHE_V296?.reset?.();
        const out=typeof req.run==='function' ? await req.run() : (typeof window.__LN_AUTO_REFRESH_DIRECT__==='function' ? await window.__LN_AUTO_REFRESH_DIRECT__() : null);
        window.LN_PERF_MONITOR_V296?.end?.({skippedFull:false});
        req.resolve?.({ok:true,out});
      }
    }catch(e){
      window.LN_PERF_MONITOR_V296?.end?.({error:String(e&&e.message||e)});
      console.error('[V2.9.6 refresh scheduler]',e);
      req.resolve?.({ok:false,error:e});
    }finally{
      running=false; try{window.LN_DEBUG_V2983?.setQueue?.({running:false,pending:!!queued,finishedAt:new Date().toLocaleTimeString(),nextReason:queued?.reason||''});}catch(e){}
      if(queued){ timer=setTimeout(run, Math.max(0, queued.delay||0)); }
    }
  }
  window.LN_REFRESH_SCHEDULER_V296={request, ready:true};
})();
