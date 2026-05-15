// V2.92RC1｜易混专业轻量索引：启动只加载 recordIndex，完整 pairs 在展开详情时加载
(function(){
  if(window.LN_CONFUSABLE_LIGHT_DISABLE===true) return;
  var VERSION='v292rc1-confusable-light';
  var STAMP='292rc1-20260515';
  var FILES={
    manifest:'data/confusable_major_model/v29462_manifest.json',
    groups:'data/confusable_major_model/confusable_major_groups_v2946.json',
    members:'data/confusable_major_model/confusable_major_members_v2946.json',
    detectedPairs:'data/confusable_major_model/confusable_major_detected_pairs_v29462.json',
    schoolIndex:'data/confusable_major_model/confusable_major_school_index_v2946.json',
    recordIndex:'data/confusable_major_model/confusable_major_record_index_v29462.json',
    parentExpectationPaths:'data/confusable_major_model/parent_expectation_paths_v2946.json',
    qualityReport:'data/confusable_major_model/confusable_warning_side_quality_report_v29462.json',
    anchorRules:'data/confusable_major_model/confusable_anchor_rules_v29462.json',
    manualConfirmed:'data/confusable_major_model/manual_confirmed_pairs_v2946.json',
    manualExcluded:'data/confusable_major_model/manual_excluded_pairs_v2946.json'
  };
  function baseUrl(){
    var u=new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){u.pathname=u.pathname.replace(/[^/]+$/,''); return u.href;}
    u.pathname+='/'; return u.href;
  }
  function dataUrl(file){var u=new URL(file,baseUrl()); u.searchParams.set('v','292rc1'); return u.href;}
  async function getJson(file){var r=await fetch(dataUrl(file),{cache:'default'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json();}
  function setStatus(status, extra){
    try{
      window.__LN_CONFUSABLE_LIGHT_STATE__=Object.assign(window.__LN_CONFUSABLE_LIGHT_STATE__||{}, {version:VERSION,stamp:STAMP,status:status}, extra||{});
      window.LN_DEBUG_V2983?.setFlags?.({confusableLight:status, confusableLightVersion:VERSION});
    }catch(e){}
  }
  function buildLight(parts){
    var manifest=parts[0], groups=parts[1], members=parts[2], schoolIndex=parts[3], recordIndex=parts[4], anchorRules=parts[5], manualConfirmed=parts[6], manualExcluded=parts[7];
    var groupsById=new Map((groups.items||[]).map(function(x){return [x.group_id,x];}));
    var recordPairs=new Map();
    (recordIndex.items||[]).forEach(function(x){
      var list=(x.pairs||[]).map(function(p){
        var g=groupsById.get(p.group_id)||{};
        return {
          __light:true,
          pair_id:p.pair_id,
          group_id:p.group_id,
          group_name:g.group_name||g.name||p.group_id||'易混专业',
          risk_level:p.risk_level||'medium',
          risk_score:p.risk_score||60,
          front_display:true,
          parent_warning:p.warning_side_reason||'该专业存在易混点，展开后加载完整依据。',
          basis:[p.warning_side_reason||'启动阶段使用轻量易混索引，完整依据展开后加载。'],
          items:[{record_id:x.record_id, admission_major_name_raw:'当前候选', plain_label:p.peer_major?('需与 '+p.peer_major+' 区分'):'需复核专业代码和培养方案', warning_summary_v29462:p.warning_side_reason||''}]
        };
      }).sort(function(a,b){return (b.risk_score||0)-(a.risk_score||0);});
      recordPairs.set(x.record_id,list);
    });
    var model={manifest:manifest,groups:groups,members:members,detectedPairs:{items:[],lazy:true,light:true},schoolIndex:schoolIndex,recordIndex:recordIndex,parentExpectationPaths:{items:[],lazy:true},qualityReport:{lazy:true},anchorRules:anchorRules,manualConfirmed:manualConfirmed,manualExcluded:manualExcluded,groupsById:groupsById,recordPairs:recordPairs,schoolPairs:new Map(),version:'V2.92RC1-light',__lightReady:true,__fullReady:false,__modelLazyVersion:STAMP};
    window.LN_CONFUSABLE_MAJOR_MODEL_2946=model;
    window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY=true;
    try{CONFUSABLE_MODEL_2946=model;}catch(e){}
    setStatus('light-ready',{recordCount:recordPairs.size});
    return model;
  }
  function buildFull(parts){
    var manifest=parts[0], groups=parts[1], members=parts[2], detectedPairs=parts[3], schoolIndex=parts[4], recordIndex=parts[5], parentExpectationPaths=parts[6], qualityReport=parts[7], anchorRules=parts[8], manualConfirmed=parts[9], manualExcluded=parts[10];
    var pairsById=new Map((detectedPairs.items||[]).map(function(x){return [x.pair_id,x];}));
    var groupsById=new Map((groups.items||[]).map(function(x){return [x.group_id,x];}));
    var recordPairs=new Map();
    (recordIndex.items||[]).forEach(function(x){
      var full=(x.pairs||[]).map(function(p){return pairsById.get(p.pair_id);}).filter(Boolean).sort(function(a,b){return (b.risk_score||0)-(a.risk_score||0);});
      recordPairs.set(x.record_id,full);
    });
    var schoolPairs=new Map();
    (schoolIndex.items||[]).forEach(function(x){schoolPairs.set(x.school,(x.pair_ids||[]).map(function(id){return pairsById.get(id);}).filter(Boolean).sort(function(a,b){return (b.risk_score||0)-(a.risk_score||0);}));});
    var model={manifest:manifest,groups:groups,members:members,detectedPairs:detectedPairs,schoolIndex:schoolIndex,recordIndex:recordIndex,parentExpectationPaths:parentExpectationPaths||{items:[],lazy:true},qualityReport:qualityReport||{lazy:true},anchorRules:anchorRules,manualConfirmed:manualConfirmed,manualExcluded:manualExcluded,pairsById:pairsById,groupsById:groupsById,recordPairs:recordPairs,schoolPairs:schoolPairs,version:'V2.92RC1-full',__lightReady:true,__fullReady:true,__modelLazyVersion:STAMP};
    window.LN_CONFUSABLE_MAJOR_MODEL_2946=model;
    window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY=true;
    try{CONFUSABLE_MODEL_2946=model;}catch(e){}
    setStatus('full-ready',{recordCount:recordPairs.size,pairCount:(detectedPairs.items||[]).length});
    return model;
  }
  var lightPromise=null, fullPromise=null;
  async function loadLight(){
    var cur=window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    if(cur && cur.__lightReady) return cur;
    if(lightPromise) return lightPromise;
    setStatus('light-loading');
    lightPromise=Promise.all([getJson(FILES.manifest),getJson(FILES.groups),getJson(FILES.members),getJson(FILES.schoolIndex),getJson(FILES.recordIndex),getJson(FILES.anchorRules),getJson(FILES.manualConfirmed),getJson(FILES.manualExcluded)]).then(buildLight).catch(function(e){setStatus('light-failed',{error:String(e&&e.message||e)}); throw e;});
    return lightPromise;
  }
  async function loadFull(reason){
    var cur=window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    if(cur && cur.__fullReady) return cur;
    if(fullPromise) return fullPromise;
    setStatus('full-loading',{reason:reason||'ensure'});
    fullPromise=Promise.all([getJson(FILES.manifest),getJson(FILES.groups),getJson(FILES.members),getJson(FILES.detectedPairs),getJson(FILES.schoolIndex),getJson(FILES.recordIndex),getJson(FILES.parentExpectationPaths),getJson(FILES.qualityReport),getJson(FILES.anchorRules),getJson(FILES.manualConfirmed),getJson(FILES.manualExcluded)]).then(buildFull).catch(function(e){setStatus('full-failed',{error:String(e&&e.message||e)}); throw e;});
    return fullPromise;
  }
  window.loadConfusableMajorModelV2946=function(options){
    if(options && (options.full===true || options.withFull===true || options.withCold===true)) return loadFull('api-full');
    return loadLight();
  };
  window.loadConfusableMajorFullV2946=loadFull;
  window.LN_CONFUSABLE_LIGHT_V292RC1={ready:true,version:VERSION,stamp:STAMP,loadLight:loadLight,loadFull:loadFull};
})();
