/* V2.92RC2.4.audit-data-safe-runner｜debug 共享工具。 */
(function(){
  'use strict';
  const VERSION='V2.92RC2.4.audit-data-safe-runner.debug-baseline';
  function hashText(s){s=String(s||'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0;}return h.toString(16);}
  function summarizeWindow(w){
    w=w||window;
    const boot=Array.isArray(w.__LN_BOOT_LOADS__)?w.__LN_BOOT_LOADS__:[];
    return {
      toolVersion:w.__LN_TOOL_VERSION||w.LN_TOOL_VERSION||'',cleanupVersion:w.LN_ENGINE_CLEANUP_VERSION||'',
      boot:{total:boot.length,failed:boot.filter(x=>!x.ok),files:boot.map(x=>x.file)},
      functions:{
        applyFilters:typeof w.applyFilters,
        renderPlanABC:typeof w.renderPlanABC,
        planScoreV29475:typeof w.planScoreV29475,
        detailCard:typeof w.LN_DETAIL_CARD_UI_V2981
      },
      data:{manifest:!!w.MANIFEST,data:Array.isArray(w.DATA)?w.DATA.length:null,filtered:Array.isArray(w.filtered)?w.filtered.length:null},
      registry:w.LN_RUNTIME_REGISTRY_V292RC?.getReport?.()||null,
      state:w.LN_STATE_ADAPTER_V292RC?.readRuntime?.()||null
    };
  }
  window.LN_DEBUG_BASELINE_V292RC={ready:true,version:VERSION,hashText,summarizeWindow};
})();
