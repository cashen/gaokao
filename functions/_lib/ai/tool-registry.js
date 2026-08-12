import { lookupScoreRank, getRankTableMeta } from '../rank-table-provider.js';
import {
  loadAiBackgroundSnapshot,
  backgroundDiscoveryFromSnapshot,
  schoolBackgroundFromSnapshot,
  majorBackgroundFromSnapshot,
  matchCandidateBackgrounds,
  AI_BACKGROUND_RESOURCE_ADAPTER_VERSION
} from './background-resource-adapter.js';
import { matchesPlatformUpgradeRecord, normalizePlatformTarget } from '../platform-upgrade-policy.js';

export const AI_TOOL_REGISTRY_VERSION='ai-tool-registry-v3992_0';
export const AI_MAJOR_BANDS_ADAPTER_VERSION='ai-major-bands-adapter-v3990_1';
export const AI_SCHOOL_HISTORY_ADAPTER_VERSION='ai-school-history-browser-bridge-v3992_2';
export const AI_MAJOR_HISTORY_ADAPTER_VERSION='ai-major-region-history-browser-bridge-v3992_3';
export const AI_BACKGROUND_ADAPTER_VERSION=AI_BACKGROUND_RESOURCE_ADAPTER_VERSION;
export const AI_SCHOOL_OFFICIAL_ADAPTER_VERSION='ai-school-official-browser-bridge-v3990_2';
export const AI_DETERMINISTIC_TOOL_BRIDGE_VERSION='ai-deterministic-browser-tool-bridge-v3992_1';

export const AI_TOOL_REGISTRY=Object.freeze({
  rank_lookup:Object.freeze({name:'rank_lookup',deterministic:true,maxConcurrency:1}),
  major_band_search:Object.freeze({name:'major_band_search',deterministic:true,maxConcurrency:1}),
  school_major_history:Object.freeze({name:'school_major_history',deterministic:true,maxConcurrency:1}),
  major_region_history:Object.freeze({name:'major_region_history',deterministic:true,maxConcurrency:1}),
  school_official_info:Object.freeze({name:'school_official_info',deterministic:true,maxConcurrency:1}),
  fit_assessment:Object.freeze({name:'fit_assessment',deterministic:true,maxConcurrency:1}),
  school_background:Object.freeze({name:'school_background',deterministic:true,maxConcurrency:1}),
  major_background:Object.freeze({name:'major_background',deterministic:true,maxConcurrency:1}),
  background_discovery:Object.freeze({name:'background_discovery',deterministic:true,maxConcurrency:1}),
  background_fit_discovery:Object.freeze({name:'background_fit_discovery',deterministic:true,maxConcurrency:1}),
  school_compare:Object.freeze({name:'school_compare',deterministic:true,maxConcurrency:1}),
  major_compare:Object.freeze({name:'major_compare',deterministic:true,maxConcurrency:1})
});

function clean(value,max=220){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=12){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,100)).filter(Boolean))].slice(0,max);}
function normalizeText(value){return clean(value,200).normalize('NFKC').toLowerCase().replace(/[（【\[]/g,'(').replace(/[）】\]]/g,')').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g,'');}

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
  url.searchParams.set('bottomLineMode',params.bottomLineMode||'all');url.searchParams.set('specialProjectMode','hide_eligibility_projects');url.searchParams.set('limit',String(Math.max(16,Math.min(24,Number(params.limit||16)))));if(band)url.searchParams.set('band',band);
  return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});
}
function majorBandsToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function majorBandsClientToolRequest(request){const key=majorBandsToolKey(request);return{kind:'major_bands',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function requestForSchoolHistory(context,{school,majorKeyword='',candidateScore=null}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/school-majors',sourceUrl.origin),normalizedScore=normalizeOptionalCandidateScore(candidateScore);url.searchParams.set('school',clean(school,120));url.searchParams.set('schoolIntent','school');url.searchParams.set('offset','0');url.searchParams.set('limit','100');url.searchParams.set('sort',normalizedScore===null?'score-desc':'position-near');if(majorKeyword)url.searchParams.set('majorKeyword',clean(majorKeyword,160));if(normalizedScore!==null)url.searchParams.set('candidateScore',String(normalizedScore));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}
function requestForMajorRegionHistory(context,{majorKeyword='',regionKeys=['all']}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/major-history',sourceUrl.origin),regions=normalizeRegionKeys(regionKeys).slice(0,4),region=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all');url.searchParams.set('major',clean(majorKeyword,160));url.searchParams.set('region',region);url.searchParams.set('offset','0');url.searchParams.set('limit','100');return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}
function schoolHistoryToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function majorHistoryToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function requestForSchoolOfficial(context,{school,question=''}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/school-official',sourceUrl.origin);url.searchParams.set('school',clean(school,120));if(question)url.searchParams.set('question',clean(question,600));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}
function schoolOfficialToolKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function schoolOfficialClientToolRequest(request){const key=schoolOfficialToolKey(request);return{kind:'school_official',key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:AI_DETERMINISTIC_TOOL_BRIDGE_VERSION};}
function delegatedSchoolOfficialEntry(context,request){const key=schoolOfficialToolKey(request),entry=context?.aiDeterministicToolResults?.[key];if(!entry)return{ok:false,code:'client_tool_required',toolRequest:schoolOfficialClientToolRequest(request)};if(entry.kind!=='school_official'||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'学校官方信息回传与本轮请求不匹配。'};const status=Number(entry.status),payload=entry.payload;if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'学校官方信息回传格式不完整。'};return{ok:true,status,payload};}
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
  const normalizedPlatformTarget=normalizePlatformTarget(platformTarget),params={score:numeric,rangePreset:'standard',region:executionRegion,majorKeyword:keyword,schoolKeyword,bottomLineMode,platformTarget:normalizedPlatformTarget,limit:16},executions=[];
  for(const band of AI_MAJOR_BAND_KEYS){const execution=await executeMajorBandsOnce(context,params,band);if(execution?.code==='client_tool_required'||execution?.code==='client_tool_invalid')return execution;executions.push(execution);}
  const merged=mergeCandidateExecutions(executions);merged.regionsRequested=regions;if(normalizedPlatformTarget)merged.platformUpgrade=platformUpgradePreview(merged.records,normalizedPlatformTarget);return merged;
}

export function normalizeOptionalCandidateScore(value){if(value===null||value===undefined||String(value).trim()==='')return null;const numeric=Math.round(Number(value));return Number.isFinite(numeric)?numeric:null;}
function historyRecord(record={}){
  return{id:clean(record.id,220),school:clean(record.school||record.schoolName,100),major:clean(record.major||record.majorName,160),score2026:Number(record.score2026??record.score)||null,rank2026:Number(record.rank2026??record.rank)||null,schoolCode2026:clean(record.schoolCode2026,40),majorCode2026:clean(record.majorCode2026,40),projectLabel:clean(record.projectLabel,80),displayLocation:clean(record.displayLocation||record.city,80),bandKey:clean(record.bandKey,30),scoreDelta:Number.isFinite(Number(record.scoreDelta2026??record.scoreDelta))?Number(record.scoreDelta2026??record.scoreDelta):null,rankGap:Number.isFinite(Number(record.rankGap2026??record.rankGap))?Number(record.rankGap2026??record.rankGap):null};
}
export async function runSchoolOfficialInfo(context,{school,question=''}={}){
  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const request=requestForSchoolOfficial(context,{school,question}),delegated=delegatedSchoolOfficialEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,code:payload?.code||'official_source_failed',message:clean(payload?.message||'学校官方信息读取失败。',260)};
  return{ok:true,school:clean(payload.school||school,120),schId:clean(payload.schId,40),topic:clean(payload.topic,40),topicLabel:clean(payload.topicLabel,80),updatedAt:clean(payload.updatedAt,80),coverage:clean(payload.coverage,80),detailAvailable:payload.detailAvailable===true,evidenceText:clean(payload.evidenceText,16000),sources:Array.isArray(payload.sources)?payload.sources.slice(0,4).map(item=>({sourceName:clean(item?.sourceName,120),sourceUrl:clean(item?.sourceUrl,900),scope:clean(item?.scope,160),updatedAt:clean(item?.updatedAt,80)})):[],fetchedAt:clean(payload.fetchedAt,80),boundary:clean(payload.boundary,360),adapterVersion:AI_SCHOOL_OFFICIAL_ADAPTER_VERSION};
}

function majorHistoryRecord(record={}){return{...historyRecord(record),score2025:Number.isFinite(Number(record.score2025))?Number(record.score2025):null,rank2025:Number.isFinite(Number(record.rank2025))?Number(record.rank2025):null,score2024:Number.isFinite(Number(record.score2024))?Number(record.score2024):null,rank2024:Number.isFinite(Number(record.rank2024))?Number(record.rank2024):null,province:clean(record.province,80),city:clean(record.city,80),standardMajorName:clean(record.standardMajorName,160),standardMajorCode:clean(record.standardMajorCode,40)};}
export async function runMajorRegionHistory(context,{majorKeyword='',regionKeys=['all']}={}){
  if(!majorKeyword)return{ok:false,code:'major_required',message:'需要先明确一个专业方向。'};
  const request=requestForMajorRegionHistory(context,{majorKeyword,regionKeys}),delegated=delegatedMajorHistoryEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,message:clean(payload?.message||'专业地区历史查询失败。',260)};
  return{ok:true,majorKeyword:clean(payload.major||majorKeyword,160),region:clean(payload.region,220),matchedMajors:unique(payload.matchedMajors||[],8),records:(payload.records||[]).map(majorHistoryRecord),summary:payload.summary||{},total:Number(payload.total||0),complete:payload.complete===true,source:payload.source||{},adapterVersion:AI_MAJOR_HISTORY_ADAPTER_VERSION,scoreUsed:false,boundary:clean(payload.boundary,360)||'只展示2026辽宁物理类实际投档记录，不使用考生个人分数过滤。'};
}

export async function runSchoolMajorHistory(context,{school,majorKeyword=''}={}){
  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const request=requestForSchoolHistory(context,{school,majorKeyword,candidateScore:null}),delegated=delegatedSchoolHistoryEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,message:clean(payload?.message||'学校历史查询失败。',260)};
  return{ok:true,school:payload?.meta?.school||school,majorKeyword:clean(majorKeyword,160),records:(payload.records||[]).map(historyRecord),summary:payload.summary||{},meta:payload.meta||{},source:payload.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,scoreUsed:false,boundary:'只展示辽宁2026物理类实际投档记录；学校历史事实由公开 school-majors 确定性接口执行，本轮不使用考生分数筛选。'};
}
export async function runFitAssessment(context,{school,majorKeyword='',score}={}){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric))return{ok:false,code:'score_required',message:'需要已知参考分数才能判断当前可达性。'};
  const request=requestForSchoolHistory(context,{school,majorKeyword,candidateScore:numeric}),delegated=delegatedSchoolHistoryEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,message:clean(payload?.message||'学校历史查询失败。',260)};const records=(payload.records||[]).map(historyRecord),nearest=payload.summary?.nearestRecord||null;
  return{ok:true,school:payload?.meta?.school||school,majorKeyword:clean(majorKeyword,160),candidateScore:numeric,candidateRank:payload.meta?.candidateReferenceRank2026||null,records,nearest,summary:payload.summary||{},meta:payload.meta||{},source:payload.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,boundary:'只比较2026辽宁物理类历史投档位置，不预测2027录取结果；事实查询在独立确定性 school-majors 请求中执行。'};
}

export async function runSchoolBackground(context,{school}={}){
  const needle=normalizeText(school);if(!needle)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const snapshot=await loadAiBackgroundSnapshot(context),resolved=schoolBackgroundFromSnapshot(snapshot,school);
  if(!resolved.items.length)return{ok:false,code:'background_no_evidence',message:'当前辽宁背景静态证据资源没有足够证据把这所学校标成具体强项；未显示不代表学校没有优势。',school};
  return{ok:true,school:clean(school,120),items:resolved.items.slice(0,4),meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'背景方向来自已发布静态证据资源；不改变当前招生事实，也不把未显示方向解释为弱项。'};
}
export async function runMajorBackground(context,{major}={}){
  const needle=normalizeText(major);if(!needle)return{ok:false,code:'major_required',message:'需要先明确一个专业或方向。'};
  const snapshot=await loadAiBackgroundSnapshot(context),resolved=majorBackgroundFromSnapshot(snapshot,major);
  if(!resolved.items.length)return{ok:false,code:'background_no_evidence',message:'当前辽宁背景静态证据资源没有足够证据把这个方向映射到具体学校；未显示不代表没有优势学校。',major};
  return{ok:true,major:clean(major,160),items:resolved.items.slice(0,12),meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'只展示已发布静态资源中通过背景证据门禁的方向；未显示不代表其他学校没有优势。'};
}
export async function runBackgroundDiscovery(context,{limit=12,regionKeys=['ln']}={}){
  const snapshot=await loadAiBackgroundSnapshot(context),resolved=backgroundDiscoveryFromSnapshot(snapshot,{limit,regionKeys:normalizeRegionKeys(regionKeys)});
  return{ok:true,scope:'liaoning',regionKeys:normalizeRegionKeys(regionKeys),items:resolved.items,totalWithEvidence:resolved.totalWithEvidence,meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这里只列当前地域内、已发布背景静态资源中证据门禁通过的方向；未显示不代表其他专业不值得报，也不直接等于就业优劣。'};
}
export async function runBackgroundFitDiscovery(context,{score,bottomLineMode='all',regionKeys=['ln']}={}){
  const candidates=await runMajorBandSearch(context,{score,majorKeywords:[],regionKeys,bottomLineMode});if(candidates?.code==='client_tool_required'||candidates?.code==='client_tool_invalid')return candidates;if(!candidates.ok)return{ok:false,code:'candidate_search_failed',message:candidates.message||'当前分数候选没有读取成功。'};
  const snapshot=await loadAiBackgroundSnapshot(context),matched=matchCandidateBackgrounds(snapshot,candidates.records||[]);
  return{ok:true,score:Number(score),regionKeys:normalizeRegionKeys(regionKeys),items:matched.items.slice(0,24).map(item=>({record:historyRecord(item.record),background:item.background})),candidateCounts:candidates.counts,previewOnly:true,meta:matched.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这是当前分数与地域窗口的代表性预览和已发布背景证据交集，不是全量“最佳专业”排名；候选事实仍来自当前确定性招生资源。'};
}

function uniqueField(records,field,max=80){return unique((records||[]).map(item=>item?.[field]).filter(Boolean),max);}
function comparisonItem(label,result,objectType){const records=result?.records||[];return{label,objectType,ok:Boolean(result?.ok),counts:result?.counts||{upper:0,near:0,steady:0,total:0},reachableSchoolCount:uniqueField(records,'school',200).length,reachableMajorCount:uniqueField(records,'major',200).length,sampleSchools:uniqueField(records,'school',8),sampleMajors:uniqueField(records,'major',8),records:records.slice(0,8),note:'只比较当前分数、当前范围内的确定性可达空间；培养方案、就业、推免等没有统一官方口径时不作优劣结论。'};}
export async function runSchoolComparison(context,{score,schoolNames=[],majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){
  const schools=unique(schoolNames,3);if(schools.length<2)return{ok:false,code:'comparison_requires_two_schools',message:'至少需要两所明确学校才能执行学校比较。'};const items=[];
  for(const school of schools){const result=await runMajorBandSearch(context,{score,majorKeywords,regionKeys,bottomLineMode,schoolKeyword:school});if(result?.code==='client_tool_required'||result?.code==='client_tool_invalid')return result;items.push(comparisonItem(school,result,'school'));}
  return{ok:items.some(x=>x.ok),kind:'school',items,deterministic:true,comparableDimensions:['当前位次可达记录','稍高/接近/更稳结构','可见专业样本'],pendingEvidenceDimensions:['培养方案','就业口径','推免政策','校区与具体学费'],adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
export async function runMajorComparison(context,{score,majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){
  const majors=unique(majorKeywords,3);if(majors.length<2)return{ok:false,code:'comparison_requires_two_majors',message:'至少需要两个明确专业方向才能执行专业比较。'};const items=[];
  for(const major of majors){const result=await runMajorBandSearch(context,{score,majorKeywords:[major],regionKeys,bottomLineMode});if(result?.code==='client_tool_required'||result?.code==='client_tool_invalid')return result;items.push(comparisonItem(major,result,'major'));}
  return{ok:items.some(x=>x.ok),kind:'major',items,deterministic:true,comparableDimensions:['当前位次可达记录','候选学校覆盖','稍高/接近/更稳结构'],pendingEvidenceDimensions:['课程体系','培养方案','就业路径的学校级证据'],adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
