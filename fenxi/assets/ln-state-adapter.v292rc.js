/* V2.92RC2.4.audit-data-safe-runner｜统一状态读取适配器。只读 DOM，不改业务。 */
(function(){
  'use strict';
  const VERSION='V2.92RC2.4.audit-data-safe-runner.state-adapter';
  function byId(id){return document.getElementById(id);}
  function value(id,def){const el=byId(id); return el?String(el.value||''):def||'';}
  function number(id){const n=Number(value(id,'')); return Number.isFinite(n)&&n>0?n:null;}
  function checked(id){const el=byId(id); return !!(el&&el.checked);}
  function activeText(selector,attr){return Array.from(document.querySelectorAll(selector)).map(el=>attr?el.getAttribute(attr):el.textContent).filter(Boolean).map(s=>String(s).trim());}
  function hash(obj){const s=JSON.stringify(obj);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0;}return h.toString(16);}
  function readContext(){
    const ctx={
      score:number('myScore'),rank:number('myRank'),model:value('model','normal'),
      gender:value('studentGender','unspecified'),scenario:window.currentStrategy||value('currentStrategy','employment'),priority:value('priority',''),budget:value('budget','normal'),
      regionMode:value('regionMode','hard'),cityMode:value('cityMode','none'),targetCities:value('targetCities',''),
      schoolKeyword:value('qSchool',''),majorKeyword:value('qMajor',''),subjectGroup:value('filterSubjectGroup',''),primary:value('filterPrimary',''),
      schoolTier:value('filterSchoolTier',''),feeType:value('filterFeeType','all'),level:value('filterLevel',''),sortBy:value('sortBy','profile'),
      strictProfile:checked('strictProfile'),onlyConfusable:checked('onlyConfusable'),onlyKey:checked('onlyKey'),
      rejects:activeText('#rejectChips .chip.active','data-reject'),
      regions:activeText('#regionGroupChips .chip.active','data-region-group'),
      provinces:activeText('#provinceChips .chip.active'),
      childInterestGroups:activeText('[data-interest-group].active','data-interest-group'),
      at:new Date().toISOString()
    };
    ctx.contextHash=hash(Object.assign({},ctx,{at:undefined}));
    return ctx;
  }
  function readRuntime(){
    return {
      version:VERSION,
      url:location.href,
      bodyClass:document.body?.className||'',
      bootLoads:Array.isArray(window.__LN_BOOT_LOADS__)?window.__LN_BOOT_LOADS__.slice():[],
      toolVersion:window.__LN_TOOL_VERSION||window.LN_TOOL_VERSION||'',
      cleanupVersion:window.LN_ENGINE_CLEANUP_VERSION||'',
      dataCounts:{DATA:Array.isArray(window.DATA)?window.DATA.length:null,filtered:Array.isArray(window.filtered)?window.filtered.length:null,candidates:Array.isArray(window.candidates)?window.candidates.length:null},
      context:readContext()
    };
  }
  window.LN_STATE_ADAPTER_V292RC={ready:true,version:VERSION,readContext,readRuntime,hash};
})();
