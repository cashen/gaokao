import { lookupScoreRank, getRankTableMeta } from '../rank-table-provider.js';
import {
  loadAiBackgroundSnapshot,
  backgroundDiscoveryFromSnapshot,
  schoolBackgroundFromSnapshot,
  schoolBackgroundDirectionFromSnapshot,
  majorBackgroundFromSnapshot,
  matchCandidateBackgrounds,
  AI_BACKGROUND_RESOURCE_ADAPTER_VERSION
} from './background-resource-adapter.js';
import { matchesPlatformUpgradeRecord, normalizePlatformTarget } from '../platform-upgrade-policy.js';
import { querySchoolDirectory } from './school-directory-resource.js';
import {isScoreWindow,scoreWithinConstraint} from './human-query-frame.js';
import {runStudentVoice as runUnifiedStudentVoice} from './student-voice-tool-adapter.js';
import { AI_FACT_BRIDGE_CONTRACT_VERSION } from '../../../shared/ai/ai-workspace-contract.v3992_0.js';
import {normalizeProjectScope} from '../../../shared/ai/aiplus-product-contract.v002.js';
import { STANDARD_MAJOR_CATALOG_2026_FULL } from '../kb/standard-major-catalog-2026-full.generated.js';
import { createMajorIntentResolver } from '../../../shared/resources/majors/major-intent-resolver.v001.js';

export const AI_TOOL_REGISTRY_VERSION='ai-tool-registry-v0.02';
export const AI_MAJOR_BANDS_ADAPTER_VERSION='ai-major-bands-adapter-v3990_2';
export const AI_SCHOOL_HISTORY_ADAPTER_VERSION='ai-school-history-browser-bridge-v3992_9';
export const AI_MAJOR_HISTORY_ADAPTER_VERSION='ai-major-region-history-browser-bridge-v3992_4';
export const AI_BACKGROUND_ADAPTER_VERSION=AI_BACKGROUND_RESOURCE_ADAPTER_VERSION;
export const AI_SCHOOL_OFFICIAL_ADAPTER_VERSION='ai-school-official-browser-bridge-v3990_2';
export const AI_SCHOOL_EXPERIENCE_ADAPTER_VERSION='ai-school-experience-browser-bridge-v0.02';
export const AI_DETERMINISTIC_TOOL_BRIDGE_VERSION='ai-deterministic-browser-tool-bridge-v0.02';

export const AI_TOOL_REGISTRY=Object.freeze({
  rank_lookup:Object.freeze({name:'rank_lookup',deterministic:true,maxConcurrency:1}),
  major_band_search:Object.freeze({name:'major_band_search',deterministic:true,maxConcurrency:1}),
  school_major_history:Object.freeze({name:'school_major_history',deterministic:true,maxConcurrency:1}),
  major_region_history:Object.freeze({name:'major_region_history',deterministic:true,maxConcurrency:1}),
  region_school_directory:Object.freeze({name:'region_school_directory',deterministic:true,maxConcurrency:1}),
  school_official_info:Object.freeze({name:'school_official_info',deterministic:true,maxConcurrency:1}),
  school_experience:Object.freeze({name:'school_experience',deterministic:true,maxConcurrency:1}),
  fit_assessment:Object.freeze({name:'fit_assessment',deterministic:true,maxConcurrency:1}),
  school_background:Object.freeze({name:'school_background',deterministic:true,maxConcurrency:1}),
  major_background:Object.freeze({name:'major_background',deterministic:true,maxConcurrency:1}),
  background_discovery:Object.freeze({name:'background_discovery',deterministic:true,maxConcurrency:1}),
  background_fit_discovery:Object.freeze({name:'background_fit_discovery',deterministic:true,maxConcurrency:1}),
  school_compare:Object.freeze({name:'school_compare',deterministic:true,maxConcurrency:3}),
  major_compare:Object.freeze({name:'major_compare',deterministic:true,maxConcurrency:3}),
  selection_review:Object.freeze({name:'selection_review',deterministic:true,maxConcurrency:1})
});

function clean(value,max=220){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=12){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,100)).filter(Boolean))].slice(0,max);}
function normalizeText(value){return clean(value,200).normalize('NFKC').toLowerCase().replace(/[（【\[]/g,'(').replace(/[）】\]]/g,')').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g,'');}

export function listRegisteredAiTools(){return Object.keys(AI_TOOL_REGISTRY);}
function batchToolRequired(requests=[]){const out=[],seen=new Set();for(const request of requests){const key=clean(request?.key,900);if(!key||seen.has(key))continue;seen.add(key);out.push(request);if(out.length>=24)break;}return{ok:false,code:'client_tool_required',toolRequest:out[0]||null,toolRequests:out,requestCount:out.length,bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}

function normalizeRegionKeys(values=[]){
  const source=unique(values,8);
  if(!source.length||source.includes('all'))return['all'];
  if(source.includes('outside'))return['outside'];
  return unique(source.map(key=>key==='ln'?'province:辽宁':key),4);
}
function constraintValues(workspace={},key){const item=(workspace?.hardConstraints||[]).find(entry=>entry?.key===key);return unique(item?.values||[],12);}
export function resolveRegionExecution(view={},workspace={}){
  const familyInclude=constraintValues(workspace,'regionInclude'),familyExclude=constraintValues(workspace,'regionExclude'),active=normalizeRegionKeys(view.regionKeys||[]);
  let include=active.length?active:(familyInclude.length?normalizeRegionKeys(familyInclude):['all']);const exclude=unique(familyExclude,12);
  if(include.includes('all')&&exclude.length)return{includeKeys:['all'],excludeKeys:exclude,exact:false,warning:'家庭存在长期排除地区，但当前观察范围是全国；为避免用不完整集合做减法，本轮不自动删除，待用户明确观察范围后再执行。'};
  const remaining=include.filter(key=>!exclude.includes(key));
  if(!remaining.length)return{includeKeys:include,excludeKeys:exclude,exact:false,warning:'当前观察范围与家庭长期排除条件冲突，本轮不执行候选删除。'};
  return{includeKeys:normalizeRegionKeys(remaining),excludeKeys:exclude,exact:true,warning:''};
}

export function runRankLookup(score){
  const numeric=Math.round(Number(score));
  if(!Number.isFinite(numeric)||numeric<150||numeric>750)return{ok:false,code:'invalid_score',message:'参考分数需在150—750之间。'};
  const row=lookupScoreRank({year:2026,region:'ln',subject:'physics',score:numeric}),meta=getRankTableMeta({year:2026,region:'ln',subject:'physics'})||{};
  if(!row)return{ok:false,code:'rank_unavailable',score:numeric,message:'2026辽宁物理类成绩统计表没有可识别的对应位置。'};
  return{ok:true,score:numeric,rankStart:Number(row.rankStart),rankEnd:Number(row.rankEnd),rankForGap:Number(row.rankForGap),sameCount:Number(row.sameCount||0),emptyScore:Boolean(row.emptyScore),source:{level:'A',sourceName:'辽宁省2026年普通高校招生考试成绩统计表',sourceUrl:'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063014014729932/index.shtml',dataYear:2026,internalSourceSha256:clean(meta.sourceSha256,100)}};
}

const AI_MAJOR_BAND_KEYS=Object.freeze(['upper','near','steady']);
function requestForMajorBands(context,params={},band=''){
  const sourceUrl=new URL(context.request.url),url=new URL('/api/major-bands',sourceUrl.origin);
  url.searchParams.set('candidateScore',String(params.score));url.searchParams.set('rangePreset',params.rangePreset||'standard');url.searchParams.set('region',params.region||'all');
  if(params.majorKeyword)url.searchParams.set('majorKeyword',params.majorKeyword);if(params.schoolKeyword)url.searchParams.set('schoolKeyword',params.schoolKeyword);if(params.platformTarget)url.searchParams.set('platformTarget',params.platformTarget);
  url.searchParams.set('bottomLineMode',normalizeProjectScope(params.bottomLineMode));url.searchParams.set('specialProjectMode','hide_eligibility_projects');url.searchParams.set('limit',String(Math.max(16,Math.min(24,Number(params.limit||16)))));if(band)url.searchParams.set('band',band);
  return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});
}
function majorBandsToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function majorBandsClientToolRequest(request){const key=majorBandsToolKey(request);return{kind:'major_bands',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function requestForSchoolHistory(context,{school,majorKeyword='',candidateScore=null}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/school-history',sourceUrl.origin),normalizedScore=normalizeOptionalCandidateScore(candidateScore);url.searchParams.set('school',clean(school,120));url.searchParams.set('offset','0');url.searchParams.set('limit','120');url.searchParams.set('sort',normalizedScore===null?'score-desc':'position-near');if(majorKeyword)url.searchParams.set('majorKeyword',clean(majorKeyword,160));if(normalizedScore!==null)url.searchParams.set('candidateScore',String(normalizedScore));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}
const AI_MAJOR_HISTORY_PAGE_LIMIT=100;
const AI_MAJOR_HISTORY_MAX_RECORDS_PER_TURN=800;
const AI_MAJOR_HISTORY_MAX_PAGES_PER_QUERY=6;
const majorIntentResolver=createMajorIntentResolver(STANDARD_MAJOR_CATALOG_2026_FULL,[],{sourceVersion:'standard-major-catalog-2026'});
function majorHistoryPageLimitForQuery(majorKeyword=''){
  const intent=majorIntentResolver.resolve(majorKeyword,{limit:1});
  return intent.intentLevel==='direction'&&intent.status==='ready'?200:AI_MAJOR_HISTORY_PAGE_LIMIT;
}
function requestForMajorRegionHistory(context,{majorKeyword='',regionKeys=['all'],scoreConstraint={},bottomLineMode='all',offset=0}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/major-history',sourceUrl.origin),regions=normalizeRegionKeys(regionKeys).slice(0,4),region=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all'),windowed=isScoreWindow(scoreConstraint),min=windowed&&scoreConstraint?.min!==null&&scoreConstraint?.min!==undefined&&Number.isFinite(Number(scoreConstraint.min))?Number(scoreConstraint.min):null,max=windowed&&scoreConstraint?.max!==null&&scoreConstraint?.max!==undefined&&Number.isFinite(Number(scoreConstraint.max))?Number(scoreConstraint.max):null,pageLimit=majorHistoryPageLimitForQuery(majorKeyword);url.searchParams.set('major',clean(majorKeyword,160));url.searchParams.set('region',region);url.searchParams.set('bottomLineMode',normalizeProjectScope(bottomLineMode));if(min!==null)url.searchParams.set('minScore',String(Math.round(min)));if(max!==null)url.searchParams.set('maxScore',String(Math.round(max)));url.searchParams.set('offset',String(Math.max(0,Math.floor(Number(offset)||0))));url.searchParams.set('limit',String(pageLimit));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}}); }
function majorHistoryPagePlan(payload={},requestedCount=1,pageLimit=AI_MAJOR_HISTORY_PAGE_LIMIT){const limit=Math.max(1,Math.floor(Number(pageLimit)||AI_MAJOR_HISTORY_PAGE_LIMIT)),total=Math.max(0,Math.floor(Number(payload.total)||0)),count=Math.max(1,Math.floor(Number(requestedCount)||1)),maxPages=Math.max(1,Math.min(AI_MAJOR_HISTORY_MAX_PAGES_PER_QUERY,Math.floor(AI_MAJOR_HISTORY_MAX_RECORDS_PER_TURN/(count*limit)))),offsets=[];for(let offset=0;offset<Math.max(total,1)&&offsets.length<maxPages;offset+=limit)offsets.push(offset);return{total,limit,maxPages,offsets,capped:total>maxPages*limit};}
function schoolHistoryToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function majorHistoryToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function requestForSchoolOfficial(context,{school,question=''}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/school-official',sourceUrl.origin);url.searchParams.set('school',clean(school,120));if(question)url.searchParams.set('question',clean(question,600));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}
function schoolOfficialToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function schoolOfficialClientToolRequest(request){const key=schoolOfficialToolKey(request);return{kind:'school_official',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function delegatedSchoolOfficialEntry(context,request){const key=schoolOfficialToolKey(request),entry=context?.aiDeterministicToolResults?.[key];if(!entry)return{ok:false,code:'client_tool_required',toolRequest:schoolOfficialClientToolRequest(request)};if(entry.kind!=='school_official'||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'学校官方信息回传与本轮请求不匹配。'};const status=Number(entry.status),payload=entry.payload;if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'学校官方信息回传格式不完整。'};return{ok:true,status,payload};}
function requestForSchoolExperience(context,{school,topic='general'}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/tongxue-summary',sourceUrl.origin);url.searchParams.set('school',clean(school,120));url.searchParams.set('page','1');url.searchParams.set('topic',normalizeExperienceTopic(topic));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}
function schoolExperienceToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function schoolExperienceClientToolRequest(request){const key=schoolExperienceToolKey(request);return{kind:'school_experience',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function delegatedSchoolExperienceEntry(context,request){const key=schoolExperienceToolKey(request),entry=context?.aiDeterministicToolResults?.[key];if(!entry)return{ok:false,code:'client_tool_required',toolRequest:schoolExperienceClientToolRequest(request)};if(entry.kind!=='school_experience'||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'学校体验信息回传与本轮请求不匹配。'};const status=Number(entry.status),payload=entry.payload;if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'学校体验信息回传格式不完整。'};return{ok:true,status,payload};}
function schoolHistoryClientToolRequest(request){const key=schoolHistoryToolKey(request);return{kind:'school_history',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function majorHistoryClientToolRequest(request){const key=majorHistoryToolKey(request);return{kind:'major_history',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function delegatedSchoolHistoryEntry(context,request){const key=schoolHistoryToolKey(request),entry=context?.aiDeterministicToolResults?.[key];if(!entry)return{ok:false,code:'client_tool_required',toolRequest:schoolHistoryClientToolRequest(request)};if(entry.kind!=='school_history'||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'学校历史事实回传与本轮请求不匹配。'};const status=Number(entry.status),payload=entry.payload;if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'学校历史事实回传格式不完整。'};return{ok:true,status,payload};}
function delegatedMajorHistoryEntry(context,request){const key=majorHistoryToolKey(request),entry=context?.aiDeterministicToolResults?.[key];if(!entry)return{ok:false,code:'client_tool_required',toolRequest:majorHistoryClientToolRequest(request)};if(entry.kind!=='major_history'||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'专业地区历史事实回传与本轮请求不匹配。'};const status=Number(entry.status),payload=entry.payload;if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'专业地区历史事实回传格式不完整。'};return{ok:true,status,payload};}
function delegatedMajorBandsEntry(context,request){
  const key=majorBandsToolKey(request),entry=context?.aiDeterministicToolResults?.[key];
  if(!entry)return{ok:false,code:'client_tool_required',toolRequest:majorBandsClientToolRequest(request)};
  if(entry.kind!=='major_bands'||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'候选事实回传与本轮请求不匹配。'};
  const status=Number(entry.status),payload=entry.payload;
  if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'候选事实回传格式不完整。'};
  return{ok:true,status,payload};
}
async function executeMajorBandsOnce(context,params,band=''){
  const request=requestForMajorBands(context,params,band),delegated=delegatedMajorBandsEntry(context,request);
  if(!delegated.ok)return{...delegated,region:params.region||'all',band};
  const {status,payload}=delegated;
  if(status<200||status>=300||!payload?.ok)return{ok:false,status,message:clean(payload?.message||'专业候选查询失败。',260),payload,region:params.region||'all',band};
  const records=[],counts={upper:0,near:0,steady:0,total:0},bands=band?[band]:AI_MAJOR_BAND_KEYS;
  for(const key of bands){const item=payload?.bands?.[key]||{};counts[key]=Number(item.count||0);for(const record of item.records||[])records.push({...record,bandKey:record.bandKey||key});}
  counts.total=AI_MAJOR_BAND_KEYS.reduce((sum,key)=>sum+Number(counts[key]||0),0);
  return{ok:true,meta:payload.meta,counts,records,searchAdvices:payload.searchAdvices||[],filterConflicts:payload.filterConflicts||[],keywordWarnings:payload.keywordWarnings||[],source:payload.source||{},region:params.region||'all',band};
}
function mergeCandidateExecutions(executions=[]){
  const successful=executions.filter(x=>x?.ok),byId=new Map(),counts={upper:0,near:0,steady:0,total:0},warnings=[];
  for(const execution of successful){
    counts.upper+=Number(execution.counts?.upper||0);counts.near+=Number(execution.counts?.near||0);counts.steady+=Number(execution.counts?.steady||0);
    for(const record of execution.records||[]){const key=clean(record?.id,220)||`${record?.school||''}|${record?.major||''}`;if(key&&!byId.has(key))byId.set(key,record);}
    for(const advice of execution.searchAdvices||[]){const message=clean(advice?.message||advice,260);if(message&&!warnings.includes(message))warnings.push(message);}
  }
  counts.total=counts.upper+counts.near+counts.steady;
  return{ok:successful.length>0,regionsQueried:[...new Set(successful.map(x=>x.region))],counts,records:[...byId.values()].slice(0,48),previewOnly:true,previewLimit:48,warnings:warnings.slice(0,8),failures:executions.filter(x=>!x?.ok).map(x=>({status:x?.status||0,message:x?.message||'查询失败'})),source:successful[0]?.source||{},meta:successful[0]?.meta||null,adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
function platformUpgradePreview(records=[],target=''){
  const tier=normalizePlatformTarget(target),matches=(records||[]).filter(record=>matchesPlatformUpgradeRecord(record,tier));
  return{target:tier,records:matches.slice(0,16),countInPreview:matches.length,previewOnly:true,complete:false,boundary:'只检查当前候选预览中的211/985中外或高收费记录；预览未发现不能推出完整集合没有。'};
}
export async function runMajorBandSearch(context,{score,majorKeywords=[],regionKeys=['all'],bottomLineMode='all',schoolKeyword='',platformTarget=''}={}){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric))return{ok:false,code:'score_required',message:'需要参考分数后才能执行候选查询。'};
  const regions=normalizeRegionKeys(regionKeys).slice(0,4),keyword=unique(majorKeywords,8).join('/'),executionRegion=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all');
  const normalizedPlatformTarget=normalizePlatformTarget(platformTarget),params={score:numeric,rangePreset:'standard',region:executionRegion,majorKeyword:keyword,schoolKeyword,bottomLineMode:normalizeProjectScope(bottomLineMode),platformTarget:normalizedPlatformTarget,limit:16},executions=[],required=[];
  // A nationwide query with a short spoken major family (for example “电气” or “机械”) can scan a large rank window. The parent needs a useful first pass, not three repeated scans; keep the main reference band for broad wording and retain all bands for explicit major names.
  const broadSpokenMajor=keyword.split('/').some(item=>item.length>0&&item.length<=2);
  const localLiaoningQuery=executionRegion==='ln'||executionRegion==='province:辽宁';
  const requestedBands=broadSpokenMajor&&!localLiaoningQuery?['near']:AI_MAJOR_BAND_KEYS;
  for(const band of AI_MAJOR_BAND_KEYS){if(!requestedBands.includes(band))continue;const execution=await executeMajorBandsOnce(context,params,band);if(execution?.code==='client_tool_invalid')return execution;if(execution?.code==='client_tool_required'){required.push(...(execution.toolRequests||[execution.toolRequest]).filter(Boolean));continue;}executions.push(execution);}
  if(required.length)return batchToolRequired(required);
  const merged=mergeCandidateExecutions(executions);merged.regionsRequested=regions;merged.requestedBands=requestedBands;if(broadSpokenMajor)merged.warnings=[`“${keyword}”属于宽泛专业说法，首轮先展示主要参考分档，避免一次查询过重。`,...(merged.warnings||[])].slice(0,8);if(normalizedPlatformTarget)merged.platformUpgrade=platformUpgradePreview(merged.records,normalizedPlatformTarget);return merged;
}

export function normalizeOptionalCandidateScore(value){if(value===null||value===undefined||String(value).trim()==='')return null;const numeric=Math.round(Number(value));return Number.isFinite(numeric)?numeric:null;}
function historyRecord(record={}){
  return{id:clean(record.id,220),school:clean(record.school||record.schoolName,100),major:clean(record.major||record.majorName,160),score2026:Number(record.score2026??record.score)||null,rank2026:Number(record.rank2026??record.rank)||null,schoolCode2026:clean(record.schoolCode2026,40),majorCode2026:clean(record.majorCode2026,40),projectLabel:clean(record.projectLabel,80),displayLocation:clean(record.displayLocation||record.city,80),bandKey:clean(record.bandKey,30),scoreDelta:Number.isFinite(Number(record.scoreDelta2026??record.scoreDelta))?Number(record.scoreDelta2026??record.scoreDelta):null,rankGap:Number.isFinite(Number(record.rankGap2026??record.rankGap))?Number(record.rankGap2026??record.rankGap):null,matchLevel:clean(record.matchLevel,30),matchLabel:clean(record.matchLabel,40),matchReason:clean(record.matchReason,220),matchedKeyword:clean(record.matchedKeyword,120)};
}
function historyRecordIdentity(record={}){const schoolCode=clean(record.schoolCode2026,40),majorCode=clean(record.majorCode2026,40),codes=schoolCode&&majorCode?`${schoolCode}|${majorCode}`:'',fallback=[clean(record.school,100),clean(record.major,160),Number(record.score2026)||'',Number(record.rank2026)||''].join('|');return`${codes||fallback}|${clean(record.projectLabel,80)}`;}
function mergeHistoryRecords(records=[]){const merged=new Map();for(const record of records){const key=historyRecordIdentity(record),existing=merged.get(key),queries=unique([...(existing?.queryMajors||[]),existing?.queryMajor,record?.queryMajor].filter(Boolean),8);if(existing){existing.queryMajors=queries;continue;}merged.set(key,{...record,queryMajors:queries});}return[...merged.values()];}
function filterSchoolHistoryProjectScope(records=[],bottomLineMode='all'){const scope=normalizeProjectScope(bottomLineMode);if(scope!=='exclude_sino')return records;return records.filter(record=>!/(中外|高收费)/.test(clean(record?.projectLabel,80)));}
function majorSuggestionsFor(records=[],school=''){
  const suggestions=[],seen=new Set();
  for(const record of records){
    const query=clean(record.queryMajor,80),major=clean(record.major,160);
    if(!query||!major||major===query||query.length>6||record.matchLevel!=='exact'||seen.has(major))continue;
    seen.add(major);suggestions.push({major,prompt:`${school}${major}多少分`,reason:`你问的是“${query}”，这个学校还有名称更具体的同类专业；要不要把它单独拿出来看？`});
    if(suggestions.length>=3)break;
  }
  return suggestions;
}
export async function runSchoolOfficialInfo(context,{school,question=''}={}){
  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const request=requestForSchoolOfficial(context,{school,question}),delegated=delegatedSchoolOfficialEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,code:payload?.code||'official_source_failed',message:clean(payload?.message||'学校官方信息读取失败。',260)};
  return{ok:true,school:clean(payload.school||school,120),schId:clean(payload.schId,40),topic:clean(payload.topic,40),topicLabel:clean(payload.topicLabel,80),updatedAt:clean(payload.updatedAt,80),coverage:clean(payload.coverage,80),detailAvailable:payload.detailAvailable===true,evidenceText:clean(payload.evidenceText,16000),sources:Array.isArray(payload.sources)?payload.sources.slice(0,4).map(item=>({sourceName:clean(item?.sourceName,120),sourceUrl:clean(item?.sourceUrl,900),scope:clean(item?.scope,160),updatedAt:clean(item?.updatedAt,80)})):[],fetchedAt:clean(payload.fetchedAt,80),boundary:clean(payload.boundary,360),adapterVersion:AI_SCHOOL_OFFICIAL_ADAPTER_VERSION};
}

export async function runSchoolExperience(context,{school,topic='general'}={}){return runUnifiedStudentVoice(context,{scope:'school',school,topic,compatibility:'legacy_school_experience'});}
export async function runStudentVoice(context,options={}){return runUnifiedStudentVoice(context,options);}

function majorHistoryRecord(record={}){const base={...historyRecord(record),score2025:Number.isFinite(Number(record.score2025))?Number(record.score2025):null,rank2025:Number.isFinite(Number(record.rank2025))?Number(record.rank2025):null,score2024:Number.isFinite(Number(record.score2024))?Number(record.score2024):null,rank2024:Number.isFinite(Number(record.rank2024))?Number(record.rank2024):null,province:clean(record.province,80),city:clean(record.city,80),standardMajorName:clean(record.standardMajorName,160),standardMajorCode:clean(record.standardMajorCode,40)};if(record.isSinoForeign||record.feeType==='sino_foreign'||record.feeType==='high_fee')base.projectLabel='中外合作/高收费';if(Array.isArray(record.bottomLineTags)&&record.bottomLineTags.length)base.bottomLineTags=record.bottomLineTags;return base;}
export async function runMajorRegionHistory(context,{majorKeyword='',majorKeywords=[],regionKeys=['all'],scoreConstraint={},bottomLineMode='all'}={}){
  const requested=unique([...(Array.isArray(majorKeywords)?majorKeywords:[]),majorKeyword].map(value=>clean(value,160)).filter(Boolean),8);
  if(!requested.length)return{ok:false,code:'major_required',message:'需要先明确一个专业方向。'};
  const responses=[],queryResults=[],required=[];
  for(let index=0;index<requested.length;index+=1){
    const query=requested[index],firstRequest=requestForMajorRegionHistory(context,{majorKeyword:query,regionKeys,scoreConstraint,bottomLineMode,offset:0}),firstDelegated=delegatedMajorHistoryEntry(context,firstRequest);
    if(!firstDelegated.ok){if(firstDelegated.code==='client_tool_required'){required.push(firstDelegated.toolRequest);continue;}return firstDelegated;}
    const firstStatus=Number(firstDelegated.status),firstPayload=firstDelegated.payload,firstSuccess=firstStatus>=200&&firstStatus<300&&firstPayload?.ok===true;
    if(!firstSuccess){queryResults.push({query,index,status:'failed',recordCount:0,availableCount:0,complete:false,errorCode:clean(firstPayload?.code,80)||`http_${firstStatus||0}`,errorMessage:clean(firstPayload?.message||'本专业查询暂时失败。',240)});continue;}
    const plan=majorHistoryPagePlan(firstPayload,requested.length,majorHistoryPageLimitForQuery(query)),pagePayloads=[firstPayload];let pageFailed=null,missingPage=false;
    for(const offset of plan.offsets.slice(1)){
      const request=requestForMajorRegionHistory(context,{majorKeyword:query,regionKeys,scoreConstraint,bottomLineMode,offset}),delegated=delegatedMajorHistoryEntry(context,request);
      if(!delegated.ok){if(delegated.code==='client_tool_required'){required.push(delegated.toolRequest);missingPage=true;continue;}return delegated;}
      const status=Number(delegated.status),payload=delegated.payload,success=status>=200&&status<300&&payload?.ok===true;
      if(!success){pageFailed={status,payload};break;}
      pagePayloads.push(payload);
    }
    if(missingPage)continue;
    if(pageFailed){queryResults.push({query,index,status:'failed',recordCount:0,availableCount:plan.total,complete:false,errorCode:clean(pageFailed.payload?.code,80)||`http_${pageFailed.status||0}`,errorMessage:clean(pageFailed.payload?.message||'本专业后续分页暂时失败。',240)});continue;}
    const hasScoreConstraint=isScoreWindow(scoreConstraint);const records=pagePayloads.flatMap(payload=>(payload.records||[]).map(record=>({...majorHistoryRecord(record),queryMajor:query,queryIndex:index,queryStatus:'success'}))).filter(record=>!hasScoreConstraint||scoreWithinConstraint(record.score2026,scoreConstraint)),complete=!plan.capped&&records.length===plan.total;
    responses.push({query,payload:firstPayload,records,complete,availableCount:plan.total});
    queryResults.push({query,index,status:'success',recordCount:records.length,availableCount:plan.total,complete,errorCode:'',errorMessage:complete?'':`当前单轮传输预算最多读取${plan.maxPages*plan.limit}条，本专业仍有后续记录未展开。`});
  }
  if(required.length)return batchToolRequired(required);
  const successfulCount=responses.length,partial=successfulCount>0&&successfulCount<requested.length,allFailed=successfulCount===0,records=mergeHistoryRecords(responses.flatMap(item=>item.records)).sort((a,b)=>Number(b.score2026||0)-Number(a.score2026||0)||Number(a.rank2026||Infinity)-Number(b.rank2026||Infinity)||String(a.school||'').localeCompare(String(b.school||''),'zh-CN')),scores=records.map(item=>Number(item.score2026)).filter(Number.isFinite),firstPayload=responses[0]?.payload||{},total=records.length,schoolCount=new Set(records.map(item=>item.school).filter(Boolean)).size,complete=!partial&&!allFailed&&responses.every(item=>item.complete===true),incompleteQueries=queryResults.filter(item=>item.status==='success'&&item.complete===false).map(item=>item.query);
  const baseBoundary=clean(firstPayload.boundary,360)||'只展示2026辽宁物理类实际投档记录，不使用考生个人分数过滤。',deliveryBoundary=incompleteQueries.length?` ${incompleteQueries.join('、')}超过本轮有界传输预算，当前结果不是完整清单；未读取部分不会被静默算作不存在。`:'';
  return{ok:true,partial,allFailed,majorKeyword:requested.length===1?clean(firstPayload.major||requested[0],160):'',majorKeywords:requested,region:clean(firstPayload.region,220),scoreConstraint:firstPayload.scoreRange||{kind:clean(scoreConstraint?.kind,20)||'none',min:Number.isFinite(Number(scoreConstraint?.min))?Number(scoreConstraint.min):null,max:Number.isFinite(Number(scoreConstraint?.max))?Number(scoreConstraint.max):null},bottomLineMode:clean(firstPayload.bottomLineMode||bottomLineMode,40)||'all',matchedMajors:unique(responses.flatMap(item=>item.payload?.matchedMajors||[]),24),records,queryResults,summary:{total,schoolCount,minScore:scores.length?Math.min(...scores):null,maxScore:scores.length?Math.max(...scores):null},total,complete,hasMore:incompleteQueries.length>0,source:firstPayload.source||{},adapterVersion:AI_MAJOR_HISTORY_ADAPTER_VERSION,scoreUsed:false,boundary:`${baseBoundary}${deliveryBoundary}`.trim(),message:allFailed?'本轮各专业查询都暂时没有完成；请优先重试标记为失败的专业。':partial?'部分专业已完成，失败专业已单独标出。':incompleteQueries.length?'本轮已取得有界结果，但仍有专业存在未读取的后续记录。':''};
}

export async function runRegionSchoolDirectory(context,{region={},level='all'}={}){return querySchoolDirectory(context,{region,level});}

export async function runSchoolMajorHistory(context,{school,majorKeyword='',majorKeywords=[],bottomLineMode='all'}={}){
  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const projectScope=normalizeProjectScope(bottomLineMode),requested=unique([...(Array.isArray(majorKeywords)?majorKeywords:[]),majorKeyword].map(value=>clean(value,160)).filter(Boolean),8);
  const queries=requested.length?requested:[''];
  const responses=[],queryResults=[],required=[];
  for(let index=0;index<queries.length;index+=1){
    const query=queries[index],request=requestForSchoolHistory(context,{school,majorKeyword:query,candidateScore:null}),delegated=delegatedSchoolHistoryEntry(context,request);
    if(!delegated.ok){if(delegated.code==='client_tool_required'){required.push(delegated.toolRequest);continue;}return delegated;}
    const{status,payload}=delegated,success=status>=200&&status<300&&payload?.ok===true;
    if(!success){
      queryResults.push({query,index,status:'failed',recordCount:0,errorCode:clean(payload?.code,80)||`http_${status||0}`,errorMessage:clean(payload?.message||'本专业查询暂时失败。',240)});
      continue;
    }
    const queryRecords=filterSchoolHistoryProjectScope((payload.records||[]).map(record=>({...historyRecord(record),queryMajor:query,queryIndex:index,queryStatus:'success'})),projectScope);
    responses.push({query,payload,records:queryRecords});
    queryResults.push({query,index,status:'success',recordCount:queryRecords.length,errorCode:'',errorMessage:''});
  }
  if(required.length)return batchToolRequired(required);
  const first=responses[0],records=mergeHistoryRecords(responses.flatMap(item=>item.records)).sort((a,b)=>Number(b.score2026||0)-Number(a.score2026||0)||Number(a.rank2026||Infinity)-Number(b.rank2026||Infinity)||String(a.major||'').localeCompare(String(b.major||''),'zh-CN')),successfulCount=responses.length,partial=successfulCount>0&&successfulCount<queries.length,allFailed=successfulCount===0;
  const firstPayload=first?.payload||{};
  const schoolName=firstPayload?.meta?.school||school;
  const scores=records.map(record=>Number(record.score2026)).filter(Number.isFinite),sourceSummary=firstPayload.summary&&typeof firstPayload.summary==='object'?firstPayload.summary:{},summary=successfulCount?{...sourceSummary,total:records.length,schoolCount:records.length?1:0,uniqueMajorCount:new Set(records.map(record=>record.major).filter(Boolean)).size,minScore:scores.length?Math.min(...scores):null,maxScore:scores.length?Math.max(...scores):null}:({total:0,schoolCount:0,uniqueMajorCount:0,minScore:null,maxScore:null});
  let directionRedirect=null;
  if(requested.length===1&&records.length===0&&successfulCount>0){
    try{
      const snapshot=await loadAiBackgroundSnapshot(context),match=schoolBackgroundDirectionFromSnapshot(snapshot,schoolName,requested[0]);
      if(match)directionRedirect={kind:'background_direction',direction:clean(match.direction,160),admissionMajors:unique(match.admissionMajors||[],16),queryable:false};
    }catch{}
  }
  const majorSuggestions=directionRedirect?(directionRedirect.admissionMajors||[]).slice(0,3).map(major=>({major,prompt:`${schoolName}${major}多少分`,reason:`“${directionRedirect.direction}”是学校背景方向，不是招生专业名；请从该方向下的实际招生专业继续查。`})):majorSuggestionsFor(records,schoolName);
  const directionMessage=directionRedirect?`“${directionRedirect.direction}”是${schoolName}背景证据中的专业方向/专业群，不是当前招生专业名，不能直接用这个方向名查询招生分数。可继续查：${(directionRedirect.admissionMajors||[]).slice(0,8).join('、')||'该方向下的实际招生专业'}。`:'';
  return{ok:true,partial,allFailed,school:schoolName,majorKeyword:requested.length>1?'':clean(requested[0]||'',160),majorKeywords:requested,bottomLineMode:projectScope,records,queryResults,total:records.length,directionRedirect,majorSuggestions,summary,meta:firstPayload?.meta||{},source:firstPayload?.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,bridgeVersion:AI_FACT_BRIDGE_CONTRACT_VERSION,scoreUsed:false,boundary:`只展示辽宁2026物理类实际投档记录；学校历史事实由同源的按校预聚合分片读取，本轮不使用考生分数过滤${projectScope==='exclude_sino'?'，并已排除中外合作/高收费记录':''}${directionRedirect?'；背景方向名称不等于招生专业名称':''}。`,message:directionMessage||(allFailed?'本轮各专业查询都暂时没有完成；请优先重试标记为失败的专业。':partial?'部分专业已完成，失败专业已单独标出。':'')};
}
export async function runFitAssessment(context,{school,majorKeyword='',score}={}){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric))return{ok:false,code:'score_required',message:'需要已知参考分数才能判断当前可达性。'};
  const request=requestForSchoolHistory(context,{school,majorKeyword,candidateScore:numeric}),delegated=delegatedSchoolHistoryEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,message:clean(payload?.message||'学校历史查询失败。',260)};const records=(payload.records||[]).map(historyRecord),nearest=payload.summary?.nearestRecord||null;
  return{ok:true,school:payload?.meta?.school||school,majorKeyword:clean(majorKeyword,160),candidateScore:numeric,candidateRank:payload.meta?.candidateReferenceRank2026||null,records,nearest,summary:payload.summary||{},meta:payload.meta||{},source:payload.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,boundary:'只比较2026辽宁物理类历史投档位置，不预测2027录取结果；事实查询在独立的按校预聚合确定性请求中执行。'};
}

export async function runSchoolBackground(context,{school,major='',majorCode='',scope='auto'}={}){
  const needle=normalizeText(school);if(!needle)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const snapshot=await loadAiBackgroundSnapshot(context),resolved=schoolBackgroundFromSnapshot(snapshot,school,{scope,major,majorCode});
  if(!resolved.items.length){const scopeText=resolved.scope==='211'?'211专业背景':resolved.scope==='liaoning'?'辽宁省内专业背景':'省内与211专业背景';return{ok:false,code:'background_no_evidence',message:`当前${scopeText}资源没有达到展示门禁的${major?`“${major}”`:"具体专业"}证据；未显示不代表学校或专业弱。`,school:clean(school,120),major:clean(major,160),scope:resolved.scope};}
  return{ok:true,school:clean(school,120),major:clean(major,160),scope:resolved.scope,items:resolved.items.slice(0,8),meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'背景证据来自统一学校×canonical专业 projection；省内与211是证据视角，不相加成强弱分，学校平台身份不能代替具体专业证据。'};
}
export async function runMajorBackground(context,{major,majorCode='',scope='auto'}={}){
  const needle=normalizeText(major);if(!needle&&!majorCode)return{ok:false,code:'major_required',message:'需要先明确一个专业或方向。'};
  const snapshot=await loadAiBackgroundSnapshot(context),resolved=majorBackgroundFromSnapshot(snapshot,major,{scope,majorCode,regionKeys:['all']});
  if(!resolved.items.length){const scopeText=resolved.scope==='211'?'211专业背景':resolved.scope==='liaoning'?'辽宁省内专业背景':'省内与211专业背景';return{ok:false,code:'background_no_evidence',message:`当前${scopeText}资源没有足够证据把“${major||majorCode}”映射到具体学校×专业；未显示不代表没有优势学校。`,major:clean(major,160),scope:resolved.scope};}
  return{ok:true,major:clean(major,160),scope:resolved.scope,items:resolved.items.slice(0,16),total:resolved.total,schoolCount:resolved.schoolCount,meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'只展示统一背景资源中通过门禁的学校×canonical专业证据；列表不是学校排名，未显示不代表其他学校没有优势。'};
}
export async function runBackgroundDiscovery(context,{limit=12,regionKeys=['ln'],scope='auto'}={}){
  const snapshot=await loadAiBackgroundSnapshot(context),resolved=backgroundDiscoveryFromSnapshot(snapshot,{limit,regionKeys:normalizeRegionKeys(regionKeys),scope});
  return{ok:true,scope:resolved.scope,regionKeys:normalizeRegionKeys(regionKeys),items:resolved.items,totalWithEvidence:resolved.totalWithEvidence,meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这里只列当前请求证据范围内、通过门禁的专业背景方向；未显示不代表其他专业不值得报，也不直接等于就业优劣。'};
}
export async function runBackgroundFitDiscovery(context,{score,bottomLineMode='all',regionKeys=['ln'],scope='auto'}={}){
  const candidates=await runMajorBandSearch(context,{score,majorKeywords:[],regionKeys,bottomLineMode});if(candidates?.code==='client_tool_required'||candidates?.code==='client_tool_invalid')return candidates;if(!candidates.ok)return{ok:false,code:'candidate_search_failed',message:candidates.message||'当前分数候选没有读取成功。'};
  const snapshot=await loadAiBackgroundSnapshot(context),matched=matchCandidateBackgrounds(snapshot,candidates.records||[],{scope});
  return{ok:true,scope:matched.scope,score:Number(score),regionKeys:normalizeRegionKeys(regionKeys),items:matched.items.slice(0,24).map(item=>({record:historyRecord(item.record),background:item.background})),candidateCounts:candidates.counts,previewOnly:true,meta:matched.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这是当前分数与地域窗口的代表性预览和统一背景证据交集，不是全量“最佳专业”排名；候选事实仍来自当前确定性招生资源。'};
}

function uniqueField(records,field,max=80){return unique((records||[]).map(item=>item?.[field]).filter(Boolean),max);}
function comparisonItem(label,result,objectType){const records=result?.records||[];return{label,objectType,ok:Boolean(result?.ok),counts:result?.counts||{upper:0,near:0,steady:0,total:0},reachableSchoolCount:uniqueField(records,'school',200).length,reachableMajorCount:uniqueField(records,'major',200).length,sampleSchools:uniqueField(records,'school',8),sampleMajors:uniqueField(records,'major',8),records:records.slice(0,8),note:'只比较当前分数、当前范围内的确定性可达空间；培养方案、就业、推免等没有统一官方口径时不作优劣结论。'};}
export async function runSchoolComparison(context,{score,schoolNames=[],majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){
  const schools=unique(schoolNames,3),numericScore=Math.round(Number(score));if(schools.length<2)return{ok:false,code:'comparison_requires_two_schools',message:'至少需要两所明确学校才能执行学校比较。'};if(!Number.isFinite(numericScore)||numericScore<150||numericScore>750)return{ok:false,code:'score_required_for_reachability',message:'如果要比较两校在你当前位置的可达专业，需要先给一个参考分数；不带分数时可以先比较学校画像、专业背景和生活证据。'};const items=[],required=[];
  for(const school of schools){const result=await runMajorBandSearch(context,{score,majorKeywords,regionKeys,bottomLineMode,schoolKeyword:school});if(result?.code==='client_tool_invalid')return result;if(result?.code==='client_tool_required'){required.push(...(result.toolRequests||[result.toolRequest]).filter(Boolean));continue;}items.push(comparisonItem(school,result,'school'));}
  if(required.length)return batchToolRequired(required);
  return{ok:items.some(x=>x.ok),kind:'school',items,deterministic:true,comparableDimensions:['当前位次可达记录','稍高/接近/更稳结构','可见专业样本'],pendingEvidenceDimensions:['培养方案','就业口径','推免政策','校区与具体学费'],adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
export async function runMajorComparison(context,{score,majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){
  const majors=unique(majorKeywords,3),numericScore=Math.round(Number(score));if(majors.length<2)return{ok:false,code:'comparison_requires_two_majors',message:'至少需要两个明确专业方向才能执行专业比较。'};if(!Number.isFinite(numericScore)||numericScore<150||numericScore>750)return{ok:false,code:'score_required_for_reachability',message:'如果要比较两个专业在你当前位置的学校覆盖，需要先给一个参考分数；不带分数时可以先比较学习内容、培养周期和学校背景证据。'};const items=[],required=[];
  for(const major of majors){const result=await runMajorBandSearch(context,{score,majorKeywords:[major],regionKeys,bottomLineMode});if(result?.code==='client_tool_invalid')return result;if(result?.code==='client_tool_required'){required.push(...(result.toolRequests||[result.toolRequest]).filter(Boolean));continue;}items.push(comparisonItem(major,result,'major'));}
  if(required.length)return batchToolRequired(required);
  return{ok:items.some(x=>x.ok),kind:'major',items,deterministic:true,comparableDimensions:['当前位次可达记录','候选学校覆盖','稍高/接近/更稳结构'],pendingEvidenceDimensions:['课程体系','培养方案','就业路径的学校级证据'],adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
