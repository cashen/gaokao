// V2.9.5.4 fix3 config: paths, shared state, runtime rule helpers and compatibility constants
// 说明：公网使用 /fenxi/diagnostics 等 clean URL 时，普通相对路径容易落到错误目录。
// 这里由入口加载器写入 window.__LN_ASSET_BASE，并统一推导 data/ 路径。
const LN_ASSET_BASE_V2954FIX2 = (function(){
  let b = (window.__LN_ASSET_BASE || './');
  if(!b.endsWith('/')) b += '/';
  return b;
})();
function lnDataPathV2954Fix2(p){
  if(/^https?:\/\//.test(p) || p.startsWith('/')) return p;
  if(LN_ASSET_BASE_V2954FIX2 === './' || LN_ASSET_BASE_V2954FIX2 === '') return p;
  return LN_ASSET_BASE_V2954FIX2 + p;
}
const DATA_FILES={
  manifest:lnDataPathV2954Fix2('data/manifest.json'),
  rank:lnDataPathV2954Fix2('data/rank_2025_physics.json'),
  taxonomy:lnDataPathV2954Fix2('data/taxonomy_runtime/major_taxonomy.json'),
  rawMajorAlias:lnDataPathV2954Fix2('data/taxonomy_runtime/raw_major_alias.json'),
  subjectGroups:lnDataPathV2954Fix2('data/taxonomy_runtime/subject_groups.json'),
  admissionReview:lnDataPathV2954Fix2('data/taxonomy_runtime/admission_major_review_v2942.json'),
  officialCatalog:lnDataPathV2954Fix2('data/taxonomy_runtime/official_undergraduate_catalog_2026.json'),
  graduateCatalog:lnDataPathV2954Fix2('data/taxonomy_runtime/graduate_catalog_2022_2025.json'),
  schoolGeoManifest:lnDataPathV2954Fix2('data/school_geo_model/v29471_manifest.json'),
  schoolGeoReference:lnDataPathV2954Fix2('data/school_geo_model/school_geo_reference_v29471.json'),
  schoolGeoAlias:lnDataPathV2954Fix2('data/school_geo_model/school_name_alias_v29471.json'),
  studentProfileRules:lnDataPathV2954Fix2('data/student_profile_model/student_profile_rules_v29471.json')
};
const APP_VERSION_V29472 = 'V2.9.6｜控制区收纳与交互性能优化版';
const CITY_GEO_NOTE_V29472 = '城市为学校官方所在地，具体专业就读校区以招生章程为准';
const CHUNK_CACHE = new Map();
let MANIFEST = null;
let loadedChunkIds = new Set();
let dataEngineReady = false;
let TAXONOMY_MAP = new Map();
let RAW_MAJOR_ALIAS = {};
let SUBJECT_GROUPS = [];
let ADMISSION_REVIEW_MAP = new Map();
let TAXONOMY_READY = false;
let OFFICIAL_CATALOG_2026 = null;
let GRADUATE_CATALOG_2022_2025 = null;
let DATA=[],META={},RANK2025={},currentRank=null,filtered=[],candidates=[],currentPage=1,pageSize=12,currentStrategy='employment',exclusionStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0};

const RULES_V2951 = window.LN_GAOKAO_RULES_V2952 || window.LN_GAOKAO_RULES_V2951 || {scenarioPresets:{},strategyRules:{},preferenceRules:{},baselineRules:{},planRules:{},pathRules:{},reviewRules:{},defaults:{}};
let BASELINE_TOUCHED_V2951 = new Set();
let PREFERENCE_TOUCHED_V2952 = false;
function rulesV2951(){ return window.LN_GAOKAO_RULES_V2952 || window.LN_GAOKAO_RULES_V2951 || RULES_V2951 || {}; }
function scenarioRuleV2951(id){ const r=rulesV2951(); return (r.scenarioPresets||r.strategyRules||{})[id] || null; }
function allScenarioRulesV2951(){ const r=rulesV2951(); return Object.values(r.scenarioPresets||r.strategyRules||{}).sort((a,b)=>(a.order||999)-(b.order||999)); }
function preferenceRuleV2952(id){ const r=rulesV2951(); return (r.preferenceRules||{})[id] || null; }
function allPreferenceRulesV2952(){ const r=rulesV2951(); return Object.values(r.preferenceRules||{}); }
function scenarioPlanBiasV2951(type){
  const rule=scenarioRuleV2951(currentStrategy);
  const sb=Number(rule?.planBias?.[type]);
  const priority=document.getElementById('priority')?.value || rule?.preference?.priority || rulesV2951().defaults?.priority || 'employment';
  const pr=preferenceRuleV2952(priority);
  const pb=Number(pr?.planBias?.[type]);
  const s=Number.isFinite(sb)?sb:1;
  const p=Number.isFinite(pb)?pb:1;
  return s*p;
}

function currentScoreV2954Fix2(){
  const explicit=Number(document.getElementById('myScore')?.value || 0);
  if(explicit>0)return explicit;
  const rank=(typeof currentRank!=='undefined' && currentRank) || (typeof resolveRank==='function'?resolveRank():null);
  if(!rank || !RANK2025)return null;
  let bestScore=null, bestGap=Infinity;
  Object.entries(RANK2025||{}).forEach(([score, r])=>{
    const n=Number(r), s=Number(score);
    if(Number.isFinite(n)&&Number.isFinite(s)){
      const gap=Math.abs(n-rank);
      if(gap<bestGap){bestGap=gap;bestScore=s;}
    }
  });
  return bestScore;
}
function scoreBandFitV2954Fix2(rule){
  const band=rule?.scoreBand;
  if(!Array.isArray(band) || band.length<2)return {state:'neutral', label:'不限分段', delta:0};
  const score=currentScoreV2954Fix2();
  if(!score)return {state:'unknown', label:`建议分段 ${band[0]}-${band[1]} 分`, delta:0};
  const [lo,hi]=band.map(Number);
  if(score>=lo && score<=hi)return {state:'match', label:'当前分段较匹配', delta:8};
  const gap=score<lo ? lo-score : score-hi;
  if(gap<=20)return {state:'near', label:'当前分段接近，可作对照', delta:-2};
  return {state:'mismatch', label:'当前分段更适合作为对照', delta:-8};
}
function scenarioRuntimeV2954Fix2(id){
  const rule=scenarioRuleV2951(id || currentStrategy) || {};
  const pref=preferenceRuleV2952(rule?.preference?.priority || document.getElementById('priority')?.value || 'employment') || {};
  const scoreFit=scoreBandFitV2954Fix2(rule);
  return {rule, preference:pref, scoreFit, id: rule.id || id || currentStrategy};
}
function userRejectsHighFeeV2954Fix2(){
  return !!document.querySelector('#rejectChips .chip.active[data-reject="高收费"]');
}
function highFeeRejectTouchedV2954Fix2(){
  return hasTouchedV2951('rejectChips') || hasTouchedV2951('reject:高收费');
}
function markTouchedByElementV2954Fix2(el){
  if(!el)return;
  const t=el.closest ? el.closest('.chip,select,input,textarea') : el;
  if(!t)return;
  if(t.id) markBaselineTouchedV2951(t.id);
  const reject=t.closest?.('#rejectChips');
  if(reject){ markBaselineTouchedV2951('rejectChips'); if(t.dataset?.reject) markBaselineTouchedV2951('reject:'+t.dataset.reject); return; }
  if(t.closest?.('#provinceChips')){ markBaselineTouchedV2951('provinceChips'); return; }
  if(t.closest?.('#regionGroupChips')){ markBaselineTouchedV2951('regionGroupChips'); return; }
  const group=t.closest?.('[data-group]');
  if(group?.dataset?.group){ markBaselineTouchedV2951('group:'+group.dataset.group); return; }
}
function markBaselineTouchedV2951(key){ if(key) BASELINE_TOUCHED_V2951.add(key); }
function hasTouchedV2951(key){ return BASELINE_TOUCHED_V2951.has(key) || BASELINE_TOUCHED_V2951.has('all'); }

let CONFUSABLE_MODEL_2946=null;
let SCHOOL_GEO_MODEL_29471=null;
let STUDENT_PROFILE_MODEL_29471=null;
const PROVINCES=['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];
const REGION_GROUPS={'辽宁省内':['辽宁'],'东北':['辽宁','吉林','黑龙江'],'京津冀':['北京','天津','河北'],'长三角':['上海','江苏','浙江','安徽'],'珠三角':['广东'],'成渝':['重庆','四川'],'全国':PROVINCES};
const LIAONING_PUBLIC=['辽宁大学','大连理工大学','东北大学','大连海事大学','中国医科大学','大连医科大学','沈阳药科大学','辽宁师范大学','沈阳师范大学','沈阳工业大学','沈阳航空航天大学','沈阳理工大学','辽宁科技大学','辽宁工程技术大学','辽宁石油化工大学','沈阳化工大学','大连交通大学','大连工业大学','沈阳建筑大学','沈阳农业大学','大连海洋大学','沈阳工程学院','沈阳大学','大连大学','辽宁工业大学','营口理工学院','辽东学院','鞍山师范学院','沈阳医学院','锦州医科大学','辽宁中医药大学','辽宁警察学院'];
const provinceHints=[['辽宁',/辽宁|沈阳|大连|鞍山|抚顺|锦州|营口|阜新|辽阳|盘锦|葫芦岛|本溪|丹东|东北大学|大连理工|大连海事|中国医科/],['吉林',/吉林|长春|延边|东北师范|东北电力|长春理工/],['黑龙江',/黑龙江|哈尔滨|东北林业|东北农业|哈尔滨工业|哈尔滨工程|齐齐哈尔|佳木斯/],['北京',/北京|清华|中国人民大学|中央财经|对外经济贸易|北京航空|北京理工|中国农业|北京师范|北京交通|北京邮电|北京科技|首都/],['天津',/天津|南开|河北工业/],['河北',/河北|石家庄|燕山|华北理工|保定|唐山/],['上海',/上海|复旦|同济|华东师范|上海交通|华东理工|东华|上海财经|上海大学/],['江苏',/江苏|南京|苏州|无锡|常州|扬州|南通|徐州|河海|东南|江南|中国矿业|南京航空|南京理工/],['浙江',/浙江|杭州|宁波|温州|嘉兴|湖州|绍兴|金华/],['安徽',/安徽|合肥|中国科学技术|安徽大学|合肥工业/],['广东',/广东|广州|深圳|华南理工|暨南|中山|南方科技|香港中文大学/],['重庆',/重庆|西南大学/],['四川',/四川|成都|电子科技|西南交通|西南财经|四川大学/],['山东',/山东|济南|青岛|烟台|威海|曲阜|中国海洋|中国石油大学/],['陕西',/陕西|西安|长安大学|西北大学|西安交通|西北工业|西安电子|陕西师范/],['湖北',/湖北|武汉|华中科技|华中师范|武汉理工|中国地质|中南财经政法/],['湖南',/湖南|长沙|中南大学|湖南大学|湘潭/],['河南',/河南|郑州|洛阳|新乡|开封/],['福建',/福建|厦门|福州|华侨/],['江西',/江西|南昌|赣南|九江/],['广西',/广西|桂林|南宁/],['海南',/海南|海口|三亚/],['山西',/山西|太原|中北/],['内蒙古',/内蒙古|呼和浩特|包头/],['贵州',/贵州|贵阳/],['云南',/云南|昆明/],['甘肃',/甘肃|兰州/],['新疆',/新疆|乌鲁木齐|石河子/]];

window.LN_CONFIG = {
  version: 'V2.9.6｜控制区收纳与交互性能优化版',
  assetBase: LN_ASSET_BASE_V2954FIX2,
  dataFiles: DATA_FILES,
  debounceMs: 300,
  firstRenderLimit: 30,
  pageSize: 12,
  serverAuth: true,
  authBasePath: (location.pathname.startsWith('/fenxi') ? '/fenxi' : '/fenxi')
};
window.DATA_FILES = DATA_FILES;
window.APP_VERSION_V29472 = APP_VERSION_V29472;
