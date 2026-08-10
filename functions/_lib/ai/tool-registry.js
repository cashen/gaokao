
import { lookupScoreRank, getRankTableMeta } from '../rank-table-provider.js';
import { onRequest as majorBandsOnRequest } from '../../api/major-bands.js';
import { onRequest as schoolMajorsOnRequest } from '../../api/school-majors.js';
import { releaseSchoolQueryProviderCache } from '../school-query-provider.v3969.js';
import {
  getAcademicBackgroundSchoolSummaries,getAcademicBackgroundMajorSummaries,
  matchAcademicBackground,presentAcademicBackground,getAcademicBackgroundMeta
} from '../academic-background-provider.js';

export const AI_TOOL_REGISTRY_VERSION='ai-tool-registry-v3992_0';
export const AI_MAJOR_BANDS_ADAPTER_VERSION='ai-major-bands-adapter-v3990_1';
export const AI_SCHOOL_HISTORY_ADAPTER_VERSION='ai-school-history-adapter-v3992_0';
export const AI_BACKGROUND_ADAPTER_VERSION='ai-background-adapter-v3992_0';

export const AI_TOOL_REGISTRY=Object.freeze({
  rank_lookup:Object.freeze({name:'rank_lookup',deterministic:true,maxConcurrency:1}),
  major_band_search:Object.freeze({name:'major_band_search',deterministic:true,maxConcurrency:1}),
  school_major_history:Object.freeze({name:'school_major_history',deterministic:true,maxConcurrency:1}),
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
  const source=unique(values,8);if(!source.length||source.includes('all'))return['all'];if(source.includes('outside'))return['outside'];
  return unique(source.map(key=>key==='ln'?'province:辽宁':key),4);
}
function constraintValues(workspace={},key){const item=(workspace?.hardConstraints||[]).find(entry=>entry?.key===key);return unique(item?.values||[],12);}
export function resolveRegionExecution(view={},workspace={}){
  const familyInclude=constraintValues(workspace,'regionInclude'),familyExclude=constraintValues(workspace,'regionExclude'),active=normalizeRegionKeys(view.regionKeys||[]);
  let include=active.length?active:(familyInclude.length?normalizeRegionKeys(familyInclude):['all']);const exclude=unique(familyExclude,12);
  if(include.includes('all')&&exclude.length)return{includeKeys:['all'],excludeKeys:exclude,exact:false,warning:'家庭存在长期排除地区，但当前观察范围是全国；为避免用不完整集合做减法，本轮不自动删除，待用户明确观察范围后再执行。'};
  const remaining=include.filter(key=>!exclude.includes(key));if(!remaining.length)return{includeKeys:include,excludeKeys:exclude,exact:false,warning:'当前观察范围与家庭长期排除条件冲突，本轮不执行候选删除。'};
  return{includeKeys:normalizeRegionKeys(remaining),excludeKeys:exclude,exact:true,warning:''};
}

export function runRankLookup(score){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric)||numeric<150||numeric>750)return{ok:false,code:'invalid_score',message:'参考分数需在150—750之间。'};
  const row=lookupScoreRank({year:2026,region:'ln',subject:'physics',score:numeric}),meta=getRankTableMeta({year:2026,region:'ln',subject:'physics'})||{};
  if(!row)return{ok:false,code:'rank_unavailable',score:numeric,message:'2026辽宁物理类成绩统计表没有可识别的对应位置。'};
  return{ok:true,score:numeric,rankStart:Number(row.rankStart),rankEnd:Number(row.rankEnd),rankForGap:Number(row.rankForGap),sameCount:Number(row.sameCount||0),emptyScore:Boolean(row.emptyScore),source:{level:'A',sourceName:'辽宁省2026年普通高校招生考试成绩统计表',sourceUrl:'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063014014729932/index.shtml',dataYear:2026,internalSourceSha256:clean(meta.sourceSha256,100)}};
}

function requestForMajorBands(context,params={}){
  const sourceUrl=new URL(context.request.url),url=new URL('/api/major-bands',sourceUrl.origin);
  url.searchParams.set('candidateScore',String(params.score));url.searchParams.set('rangePreset',params.rangePreset||'standard');url.searchParams.set('region',params.region||'all');
  if(params.majorKeyword)url.searchParams.set('majorKeyword',params.majorKeyword);if(params.schoolKeyword)url.searchParams.set('schoolKeyword',params.schoolKeyword);
  url.searchParams.set('bottomLineMode',params.bottomLineMode||'all');url.searchParams.set('specialProjectMode','hide_eligibility_projects');url.searchParams.set('limit',String(Math.max(16,Math.min(24,Number(params.limit||16)))));
  return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});
}
async function executeMajorBandsOnce(context,params){
  const request=requestForMajorBands(context,params);const response=await majorBandsOnRequest({...context,request});let payload=null;try{payload=await response.json();}catch{}
  if(!response.ok||!payload?.ok)return{ok:false,status:response.status,message:clean(payload?.message||'专业候选查询失败。',260),payload,region:params.region||'all'};
  const records=[];for(const key of ['upper','near','steady'])for(const record of payload?.bands?.[key]?.records||[])records.push({...record,bandKey:record.bandKey||key});
  return{ok:true,meta:payload.meta,counts:payload.counts,records,searchAdvices:payload.searchAdvices||[],filterConflicts:payload.filterConflicts||[],keywordWarnings:payload.keywordWarnings||[],source:payload.source||{},region:params.region||'all'};
}
function mergeCandidateExecutions(executions=[]){
  const successful=executions.filter(x=>x?.ok),byId=new Map(),counts={upper:0,near:0,steady:0,total:0},warnings=[];
  for(const execution of successful){counts.upper+=Number(execution.counts?.upper||0);counts.near+=Number(execution.counts?.near||0);counts.steady+=Number(execution.counts?.steady||0);
    for(const record of execution.records||[]){const key=clean(record?.id,220)||`${record?.school||''}|${record?.major||''}`;if(key&&!byId.has(key))byId.set(key,record);}
    for(const advice of execution.searchAdvices||[]){const message=clean(advice?.message||advice,260);if(message&&!warnings.includes(message))warnings.push(message);}
  }
  counts.total=counts.upper+counts.near+counts.steady;
  return{ok:successful.length>0,regionsQueried:successful.map(x=>x.region),counts,records:[...byId.values()].slice(0,48),previewOnly:true,previewLimit:48,warnings:warnings.slice(0,8),failures:executions.filter(x=>!x?.ok).map(x=>({status:x?.status||0,message:x?.message||'查询失败'})),source:successful[0]?.source||{},meta:successful[0]?.meta||null,adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
function platformUpgradePreview(records=[],target=''){const tier=clean(target,12),matches=(records||[]).filter(record=>{const tierMatch=tier==='985'?record?.is985===true:(tier==='211'?record?.is211===true:false),budgetProject=record?.isSinoForeign===true||record?.isHighFee===true||['sino_foreign','high_fee'].includes(record?.feeType);return tierMatch&&budgetProject;});return{target:tier,records:matches.slice(0,16),countInPreview:matches.length,previewOnly:true,complete:false,boundary:'只检查当前候选预览中的211/985中外或高收费记录；预览未发现不能推出完整集合没有。'};}
export async function runMajorBandSearch(context,{score,majorKeywords=[],regionKeys=['all'],bottomLineMode='all',schoolKeyword='',platformTarget=''}={}){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric))return{ok:false,code:'score_required',message:'需要参考分数后才能执行候选查询。'};
  const regions=normalizeRegionKeys(regionKeys).slice(0,4),keyword=unique(majorKeywords,8).join('/'),executionRegion=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all');
  const executions=[await executeMajorBandsOnce(context,{score:numeric,rangePreset:'standard',region:executionRegion,majorKeyword:keyword,schoolKeyword,bottomLineMode,limit:16})];
  const merged=mergeCandidateExecutions(executions);merged.regionsRequested=regions;if(platformTarget)merged.platformUpgrade=platformUpgradePreview(merged.records,platformTarget);return merged;
}

export function normalizeOptionalCandidateScore(value){if(value===null||value===undefined||String(value).trim()==='')return null;const numeric=Math.round(Number(value));return Number.isFinite(numeric)?numeric:null;}
function schoolMajorsRequest(context,{school,majorKeyword='',candidateScore=null,limit=100}={}){
  const sourceUrl=new URL(context.request.url),url=new URL('/api/school-majors',sourceUrl.origin),normalizedCandidateScore=normalizeOptionalCandidateScore(candidateScore);url.searchParams.set('school',clean(school,120));url.searchParams.set('schoolIntent','school');url.searchParams.set('limit',String(Math.max(20,Math.min(100,Number(limit||100)))));
  if(majorKeyword)url.searchParams.set('majorKeyword',clean(majorKeyword,160));if(normalizedCandidateScore!==null)url.searchParams.set('candidateScore',String(normalizedCandidateScore));
  url.searchParams.set('sort',normalizedCandidateScore!==null?'position-near':'score-desc');return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});
}
async function schoolMajorsQuery(context,params){
  try{const response=await schoolMajorsOnRequest({...context,request:schoolMajorsRequest(context,params)});let payload=null;try{payload=await response.json();}catch{}
    if(!response.ok||!payload?.ok)return{ok:false,status:response.status,code:payload?.code||'school_history_failed',message:clean(payload?.message||payload?.userMessage||'学校专业记录查询失败。',300),candidates:payload?.candidates||[]};
    return payload;
  }finally{releaseSchoolQueryProviderCache();}
}
function historyRecord(record={}){
  return{id:clean(record.id,220),school:clean(record.school||record.schoolName,100),major:clean(record.major||record.majorName,160),score2026:Number(record.score2026??record.score)||null,rank2026:Number(record.rank2026??record.rank)||null,schoolCode2026:clean(record.schoolCode2026,40),majorCode2026:clean(record.majorCode2026,40),projectLabel:clean(record.projectLabel,80),displayLocation:clean(record.displayLocation||record.city,80),bandKey:clean(record.bandKey,30),scoreDelta:Number.isFinite(Number(record.scoreDelta2026??record.scoreDelta))?Number(record.scoreDelta2026??record.scoreDelta):null,rankGap:Number.isFinite(Number(record.rankGap2026??record.rankGap))?Number(record.rankGap2026??record.rankGap):null};
}
export async function runSchoolMajorHistory(context,{school,majorKeyword=''}={}){
  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const payload=await schoolMajorsQuery(context,{school,majorKeyword,candidateScore:null,limit:100});if(!payload.ok)return payload;
  const records=(payload.records||[]).map(historyRecord);
  return{ok:true,school:payload.meta?.school||school,majorKeyword:clean(majorKeyword,160),records,summary:payload.summary||{},meta:payload.meta||{},source:payload.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,scoreUsed:false,boundary:'只展示辽宁2026物理类实际投档记录；本轮不使用考生分数筛选。'};
}
export async function runFitAssessment(context,{school,majorKeyword='',score}={}){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric))return{ok:false,code:'score_required',message:'需要已知参考分数才能判断当前可达性。'};
  const payload=await schoolMajorsQuery(context,{school,majorKeyword,candidateScore:numeric,limit:100});if(!payload.ok)return payload;
  const records=(payload.records||[]).map(historyRecord),nearest=payload.summary?.nearestRecord||null;
  return{ok:true,school:payload.meta?.school||school,majorKeyword:clean(majorKeyword,160),candidateScore:numeric,candidateRank:payload.meta?.candidateReferenceRank2026||null,records,nearest,summary:payload.summary||{},meta:payload.meta||{},source:payload.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,boundary:'只比较2026辽宁物理类历史投档位置，不预测2027录取结果。'};
}

function summaryScore(item={}){return Number(item.primaryCount||0)*5+Number(item.secondaryCount||0)*2+Number(item.schoolCount||0);}
export function runSchoolBackground({school}={}){
  const needle=normalizeText(school);if(!needle)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const items=getAcademicBackgroundSchoolSummaries('liaoning'),matches=items.filter(x=>normalizeText(x.school)===needle||normalizeText(x.school).includes(needle)||needle.includes(normalizeText(x.school)));
  if(!matches.length)return{ok:false,code:'background_no_evidence',message:'当前辽宁背景知识库没有足够证据把这所学校标成具体强项；未显示不代表学校没有优势。',school};
  return{ok:true,school:matches[0].school,items:matches.slice(0,4),meta:getAcademicBackgroundMeta('liaoning'),adapterVersion:AI_BACKGROUND_ADAPTER_VERSION};
}
export function runMajorBackground({major}={}){
  const needle=normalizeText(major);if(!needle)return{ok:false,code:'major_required',message:'需要先明确一个专业或方向。'};
  const items=getAcademicBackgroundMajorSummaries('liaoning'),matches=items.filter(x=>normalizeText(x.major).includes(needle)||needle.includes(normalizeText(x.major))).sort((a,b)=>summaryScore(b)-summaryScore(a));
  if(!matches.length)return{ok:false,code:'background_no_evidence',message:'当前辽宁背景知识库没有足够证据把这个方向映射到具体学校；未显示不代表没有优势学校。',major};
  return{ok:true,major,items:matches.slice(0,12),meta:getAcademicBackgroundMeta('liaoning'),adapterVersion:AI_BACKGROUND_ADAPTER_VERSION};
}
function backgroundRegionMatch(schoolSummary={},regionKeys=['ln']){
  const keys=normalizeRegionKeys(regionKeys);if(keys.includes('all')||keys.includes('province:辽宁'))return true;
  const city=String(schoolSummary.city||'');
  if(keys.includes('shenyang'))return city.includes('沈阳');
  if(keys.includes('dalian'))return city.includes('大连');
  if(keys.includes('ln-other'))return Boolean(city)&&!city.includes('沈阳')&&!city.includes('大连');
  return true;
}
export function runBackgroundDiscovery({limit=12,regionKeys=['ln']}={}){
  const schoolSummaries=getAcademicBackgroundSchoolSummaries('liaoning'),schoolByName=new Map(schoolSummaries.map(x=>[normalizeText(x.school),x]));
  const keys=normalizeRegionKeys(regionKeys),items=[];
  for(const source of getAcademicBackgroundMajorSummaries('liaoning')){
    const sourceSchools=Array.isArray(source.schools)?source.schools:[];
    const filteredSchools=sourceSchools.filter(entry=>{const name=normalizeText(entry?.school||entry?.name);const summary=schoolByName.get(name);return summary?backgroundRegionMatch(summary,keys):keys.includes('all')||keys.includes('province:辽宁');});
    if(sourceSchools.length&&filteredSchools.length===0)continue;
    const item={...source,schools:sourceSchools.length?filteredSchools:sourceSchools,schoolCount:sourceSchools.length?filteredSchools.length:source.schoolCount,evidenceScore:summaryScore({...source,schoolCount:sourceSchools.length?filteredSchools.length:source.schoolCount})};
    if(Number(item.schoolCount||0)>0)items.push(item);
  }
  items.sort((a,b)=>b.evidenceScore-a.evidenceScore||String(a.major).localeCompare(String(b.major),'zh-CN'));
  return{ok:true,scope:'liaoning',regionKeys:keys,items:items.slice(0,Math.max(6,Math.min(20,Number(limit||12)))),totalWithEvidence:items.length,meta:getAcademicBackgroundMeta('liaoning'),adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这里只列当前地域内、背景证据门禁通过的方向；未显示不代表其他专业不值得报，也不直接等于就业优劣。'};
}
export async function runBackgroundFitDiscovery(context,{score,bottomLineMode='all',regionKeys=['ln']}={}){
  const candidates=await runMajorBandSearch(context,{score,majorKeywords:[],regionKeys,bottomLineMode});if(!candidates.ok)return{ok:false,code:'candidate_search_failed',message:candidates.message||'当前分数候选没有读取成功。'};
  const matched=[];for(const record of candidates.records||[]){const hit=matchAcademicBackground(record,'liaoning');if(!hit)continue;matched.push({record:historyRecord(record),background:presentAcademicBackground(hit)});}
  return{ok:true,score:Number(score),regionKeys:normalizeRegionKeys(regionKeys),items:matched.slice(0,24),candidateCounts:candidates.counts,previewOnly:true,meta:getAcademicBackgroundMeta('liaoning'),adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这是当前分数与地域窗口的代表性预览和背景证据交集，不是全量“最佳专业”排名。'};
}

function uniqueField(records,field,max=80){return unique((records||[]).map(item=>item?.[field]).filter(Boolean),max);}
function comparisonItem(label,result,objectType){const records=result?.records||[];return{label,objectType,ok:Boolean(result?.ok),counts:result?.counts||{upper:0,near:0,steady:0,total:0},reachableSchoolCount:uniqueField(records,'school',200).length,reachableMajorCount:uniqueField(records,'major',200).length,sampleSchools:uniqueField(records,'school',8),sampleMajors:uniqueField(records,'major',8),records:records.slice(0,8),note:'只比较当前分数、当前范围内的确定性可达空间；培养方案、就业、推免等没有统一官方口径时不作优劣结论。'};}
export async function runSchoolComparison(context,{score,schoolNames=[],majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){
  const schools=unique(schoolNames,3);if(schools.length<2)return{ok:false,code:'comparison_requires_two_schools',message:'至少需要两所明确学校才能执行学校比较。'};const items=[];
  for(const school of schools){const result=await runMajorBandSearch(context,{score,majorKeywords,regionKeys,bottomLineMode,schoolKeyword:school});items.push(comparisonItem(school,result,'school'));}
  return{ok:items.some(x=>x.ok),kind:'school',items,deterministic:true,comparableDimensions:['当前位次可达记录','稍高/接近/更稳结构','可见专业样本'],pendingEvidenceDimensions:['培养方案','就业口径','推免政策','校区与具体学费'],adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
export async function runMajorComparison(context,{score,majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){
  const majors=unique(majorKeywords,3);if(majors.length<2)return{ok:false,code:'comparison_requires_two_majors',message:'至少需要两个明确专业方向才能执行专业比较。'};const items=[];
  for(const major of majors){const result=await runMajorBandSearch(context,{score,majorKeywords:[major],regionKeys,bottomLineMode});items.push(comparisonItem(major,result,'major'));}
  return{ok:items.some(x=>x.ok),kind:'major',items,deterministic:true,comparableDimensions:['当前位次可达记录','候选学校覆盖','稍高/接近/更稳结构'],pendingEvidenceDimensions:['课程体系','培养方案','就业路径的学校级证据'],adapterVersion:AI_MAJOR_BANDS_ADAPTER_VERSION};
}
