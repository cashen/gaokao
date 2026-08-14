from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))

def sub_once(path, pattern, replacement, flags=0):
    text = read(path)
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{path}: regex expected exactly one match, found {count}: {pattern[:120]!r}')
    write(path, out)

resource = r'''import { SCHOOL_NAME_DATA_URL, extractSchoolRecords } from '../../../tongxue/data/school-name-resolver-v150.js';

export const AI_SCHOOL_DIRECTORY_RESOURCE_VERSION='ai-school-directory-resource-v0.02';
const CACHE_TTL_MS=5*60*1000;
const MAX_RETURNED_SCHOOLS=240;
let directoryCache=null;
let directoryPromise=null;

function clean(value,max=220){return String(value==null?'':value).trim().slice(0,max);}
function compact(value){return clean(value,1200).normalize('NFKC').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g,'');}
function provinceName(value){return clean(value,80).replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/u,'');}
function cityName(value){return clean(value,80).replace(/(自治州|地区|盟|市)$/u,'');}
function unique(values,max=400){return [...new Set((values||[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,max);}
function levelValue(value){const text=clean(value,40);return text.includes('本科')?'本科':/(专科|高职)/.test(text)?'专科':'';}
function assetRequest(context,pathname){const origin=new URL(context?.request?.url||'https://example.test').origin;return new Request(new URL(pathname,origin).toString(),{method:'GET',headers:{accept:'application/json'}});}
async function readDirectoryPayload(context){const request=assetRequest(context,SCHOOL_NAME_DATA_URL),response=context?.env?.ASSETS?.fetch?await context.env.ASSETS.fetch(request):await fetch(request);if(!response.ok)throw new Error(`高校地域目录读取失败：HTTP ${response.status}`);const contentType=String(response.headers.get('content-type')||'').toLowerCase();if(contentType.includes('text/html'))throw new Error('高校地域目录错误返回 HTML');return response.json();}
function aliasRows(records){const provinces=new Map(),cities=new Map();for(const record of records){const province=provinceName(record.province),city=cityName(record.city);if(province){for(const alias of unique([province,`${province}省`,`${province}市`],6)){const key=compact(alias);if(key&&!provinces.has(key))provinces.set(key,{type:'province',province,label:province,alias});}}if(city){for(const alias of unique([city,`${city}市`],4)){const key=compact(alias);if(!key)continue;if(!cities.has(key))cities.set(key,[]);const list=cities.get(key);if(!list.some(item=>item.city===city&&item.province===province))list.push({type:'city',province,city,label:city,alias});}}}return{provinces,cities};}
function buildDirectory(payload){const records=extractSchoolRecords(payload).filter(row=>row.name&&row.province&&row.city&&['本科','专科'].includes(levelValue(row.level)));if(records.length<2900)throw new Error(`高校地域目录不完整：${records.length}`);return Object.freeze({payload,records:Object.freeze(records),aliases:aliasRows(records)});}
async function loadDirectory(context){if(directoryCache&&Date.now()-directoryCache.time<CACHE_TTL_MS)return directoryCache.value;if(!directoryPromise)directoryPromise=readDirectoryPayload(context).then(buildDirectory).then(value=>{directoryCache={time:Date.now(),value};return value;}).finally(()=>{directoryPromise=null;});return directoryPromise;}
function mentionIndex(source,alias){const index=source.indexOf(compact(alias));return index<0?Number.MAX_SAFE_INTEGER:index;}
function chooseProvince(source,map){const rows=[];for(const [alias,item] of map){const index=source.indexOf(alias);if(index>=0)rows.push({...item,index,matchLength:alias.length,matchedAlias:alias});}rows.sort((a,b)=>a.index-b.index||b.matchLength-a.matchLength||a.province.localeCompare(b.province,'zh-CN'));return rows[0]||null;}
function chooseCity(source,map,province){const rows=[];for(const [alias,items] of map){const index=source.indexOf(alias);if(index<0)continue;for(const item of items){if(province&&item.province&&item.province!==province)continue;rows.push({...item,index,matchLength:alias.length,matchedAlias:alias});}}rows.sort((a,b)=>a.index-b.index||b.matchLength-a.matchLength||a.city.localeCompare(b.city,'zh-CN'));return rows[0]||null;}
function regionKey(region={}){if(region.type==='city'){if(region.city==='沈阳')return'shenyang';if(region.city==='大连')return'dalian';return`city:${region.city}`;}if(region.province==='辽宁')return'ln';return region.province?`province:${region.province}`:'';}
function priorRegion(workspace={}){const region=workspace?.lastResult?.regionSchools?.region;if(!region?.key)return null;return{...region,keys:[region.key],explicit:false,inherited:true};}
export function schoolDirectoryLevelFromText(text=''){const source=String(text||'');if(/本科|本科院校|本科大学/.test(source))return'本科';if(/专科|高职|专科学校|高职院校/.test(source))return'专科';return'all';}
export function looksRegionSchoolDirectoryLanguage(text=''){const source=String(text||'');return /(?:有|都|共|一共)?(?:哪些|那些|什么|啥|多少|几所).{0,8}(?:大学|高校|院校|学校|本科|专科|高职)|(?:大学|高校|院校|学校|本科|专科|高职).{0,8}(?:有哪些|有那些|有什么|有啥|多少|几所|名单)|(?:高校|院校|大学)(?:名单|数量)/.test(source);}
export async function resolveSchoolDirectoryRegion(context,text='',workspace={}){const source=compact(text);if(!source)return priorRegion(workspace);if(/省内/.test(source)&&!/(省外|全国)/.test(source))return{type:'province',province:'辽宁',city:'',label:'辽宁',key:'ln',keys:['ln'],explicit:true};const directory=await loadDirectory(context),province=chooseProvince(source,directory.aliases.provinces),city=chooseCity(source,directory.aliases.cities,province?.province||'');let selectedProvince=province,selectedCity=city;if(selectedProvince&&selectedCity&&selectedProvince.province===selectedCity.city&&!source.includes(`${compact(selectedCity.city)}市`))selectedCity=null;if(!selectedCity&&!selectedProvince)return priorRegion(workspace);if(selectedCity&&!selectedProvince&&selectedCity.province)selectedProvince={type:'province',province:selectedCity.province,label:selectedCity.province};const region=selectedCity?{type:'city',province:selectedProvince?.province||selectedCity.province||'',city:selectedCity.city,label:selectedCity.city}:{type:'province',province:selectedProvince.province,city:'',label:selectedProvince.province};const key=regionKey(region);return{...region,key,keys:key?[key]:[],explicit:true,inherited:false};}
function sameRegion(record,region={}){const province=provinceName(record.province),city=cityName(record.city);if(region.type==='city')return city===cityName(region.city)&&(!region.province||province===provinceName(region.province));return province===provinceName(region.province);}
function schoolRecord(record){return{school:clean(record.name,120),officialName:clean(record.name,120),province:provinceName(record.province),city:cityName(record.city),level:levelValue(record.level)};}
function dedupe(records){const seen=new Set(),out=[];for(const record of records){const key=compact(record.school);if(!key||seen.has(key))continue;seen.add(key);out.push(record);}return out;}
export async function querySchoolDirectory(context,{region={},level='all'}={}){const directory=await loadDirectory(context),normalizedLevel=['本科','专科'].includes(level)?level:'all';if(!region?.key&&!region?.province&&!region?.city)return{ok:false,code:'region_required',message:'需要先明确一个省份或城市。'};const allRegion=dedupe(directory.records.filter(row=>sameRegion(row,region)).map(schoolRecord));allRegion.sort((a,b)=>(a.level==='本科'?0:1)-(b.level==='本科'?0:1)||a.school.localeCompare(b.school,'zh-CN'));const selected=normalizedLevel==='all'?allRegion:allRegion.filter(row=>row.level===normalizedLevel),undergraduateCount=allRegion.filter(row=>row.level==='本科').length,juniorCollegeCount=allRegion.filter(row=>row.level==='专科').length,returned=selected.slice(0,MAX_RETURNED_SCHOOLS);return{ok:true,region:{type:region.type||'',province:provinceName(region.province),city:cityName(region.city),label:clean(region.label||region.city||region.province,80),key:clean(region.key,100)},level:normalizedLevel,total:selected.length,records:returned,complete:returned.length===selected.length,summary:{total:selected.length,regionTotal:allRegion.length,undergraduateCount:normalizedLevel==='专科'?0:undergraduateCount,juniorCollegeCount:normalizedLevel==='本科'?0:juniorCollegeCount,regionUndergraduateCount:undergraduateCount,regionJuniorCollegeCount:juniorCollegeCount},source:{name:'统一高校地域目录',path:SCHOOL_NAME_DATA_URL,buildId:clean(directory.payload?.buildId,120),asOfDate:clean(directory.payload?.asOfDate,80),sourceRecordCount:directory.records.length},resourceVersion:AI_SCHOOL_DIRECTORY_RESOURCE_VERSION,boundary:'这里回答的是统一高校地域目录中的学校存在与所在地，不等于该校一定在辽宁2026物理类招生；招生覆盖、专业和投档分数属于下一层独立确定性事实。'};}
export function clearSchoolDirectoryResourceCacheForTest(){directoryCache=null;directoryPromise=null;}
'''
write('functions/_lib/ai/school-directory-resource.js', resource)

# agent task kernel
replace_once('functions/_lib/ai/agent-task-kernel.js',
"  'school_major_history','school_history','major_region_history','school_research','school_official_qa','school_experience','fit_assessment',",
"  'school_major_history','school_history','major_region_history','region_school_directory','school_research','school_official_qa','school_experience','fit_assessment',")
replace_once('functions/_lib/ai/agent-task-kernel.js',
"function looksRestore(source){return /(回到|恢复|上一批|上一个结果|刚才那批|之前那批|前面的)/.test(source);}",
"function looksRestore(source){return /(回到|恢复|上一批|上一个结果|刚才那批|之前那批|前面的)/.test(source);}\nfunction looksRegionSchoolDirectory(source){return /(?:有|都|共|一共)?(?:哪些|那些|什么|啥|多少|几所).{0,8}(?:大学|高校|院校|学校|本科|专科|高职)|(?:大学|高校|院校|学校|本科|专科|高职).{0,8}(?:有哪些|有那些|有什么|有啥|多少|几所|名单)|(?:高校|院校|大学)(?:名单|数量)/.test(String(source||''));}\nfunction looksRegionSchoolDirectoryFollowup(source){return /^(?:本科|本科院校|专科|高职|专科院校|全部|都要|都有哪些|还有哪些|多少所|几所)(?:呢|有哪些|有多少|多少|吗|？|\\?)?$/.test(String(source||'').replace(/[\\s，,。！!；;：:]/g,''));}\nfunction looksMajorRegionSchoolList(source){return /(?:哪些|那些|什么|啥|有什么|有啥|有哪些).{0,6}(?:学校|大学|高校|院校)|(?:学校|大学|高校|院校).{0,6}(?:有这个专业|有该专业|有吗)/.test(String(source||''));}")
replace_once('functions/_lib/ai/agent-task-kernel.js',
"  if(rankIntent&&score&&!schools.length&&!majors.length)return'fact_rank_lookup';\n  if(majorHistoryFollowup)return'major_region_history';",
"  if(rankIntent&&score&&!schools.length&&!majors.length)return'fact_rank_lookup';\n  const hasRegionScope=Array.isArray(regionKeys)&&regionKeys.length>0&&!regionKeys.includes('all');\n  if(!score&&!school&&!explicitMajors.length&&hasRegionScope&&(looksRegionSchoolDirectory(source)||(priorTask==='region_school_directory'&&looksRegionSchoolDirectoryFollowup(source))))return'region_school_directory';\n  if(!score&&!school&&explicitMajors.length&&hasRegionScope&&!looksFit(source)&&(looksHistory(source)||looksMajorRegionSchoolList(source)||priorTask==='region_school_directory'))return'major_region_history';\n  if(majorHistoryFollowup)return'major_region_history';")
replace_once('functions/_lib/ai/agent-task-kernel.js',
"    case'major_region_history':return{score:'suspended',region:'active',major:'active',school:'remembered',bottomLine:'remembered',commitView:true};",
"    case'major_region_history':return{score:'suspended',region:'active',major:'active',school:'remembered',bottomLine:'remembered',commitView:true};\n    case'region_school_directory':return{score:score==='suspended'?'suspended':'remembered',region:'active',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};")
replace_once('functions/_lib/ai/agent-task-kernel.js',
"major_region_history:'查询专业地区历史分数',school_research:'研究这所学校'",
"major_region_history:'查询专业地区历史分数',region_school_directory:'查询地区高校目录',school_research:'研究这所学校'")

# command interpreter helpers and task semantics
replace_once('functions/_lib/ai/command-interpreter.js',
"const RETRYABLE_TASKS=new Set(['candidate_discovery','candidate_refinement','school_major_history','school_history','major_region_history','school_research'",
"const RETRYABLE_TASKS=new Set(['candidate_discovery','candidate_refinement','school_major_history','school_history','major_region_history','region_school_directory','school_research'")
replace_once('functions/_lib/ai/command-interpreter.js',
"function candidateLanguage(text){const source=String(text||'').replace(/(?:不|不能|别|不要)只看/g,'');return",
"function regionSchoolDirectoryLanguage(text){const source=String(text||'');return /(?:有|都|共|一共)?(?:哪些|那些|什么|啥|多少|几所).{0,8}(?:大学|高校|院校|学校|本科|专科|高职)|(?:大学|高校|院校|学校|本科|专科|高职).{0,8}(?:有哪些|有那些|有什么|有啥|多少|几所|名单)|(?:高校|院校|大学)(?:名单|数量)/.test(source);}\nfunction schoolLevelFromText(text){const source=String(text||'');if(/本科|本科院校|本科大学/.test(source))return'本科';if(/专科|高职|专科学校|高职院校/.test(source))return'专科';return'all';}\nfunction candidateLanguage(text){const source=String(text||'').replace(/(?:不|不能|别|不要)只看/g,'');return")
replace_once('functions/_lib/ai/command-interpreter.js',
"  else if(['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask)){operation='answer';target='school';}\n  else if(['major_region_history','major_background','background_discovery','background_fit_discovery'].includes(agentTask)){operation='answer';target='major';}",
"  else if(agentTask==='region_school_directory'){operation='answer';target='region';relation='region_school_directory';}\n  else if(['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask)){operation='answer';target='school';}\n  else if(['major_region_history','major_background','background_discovery','background_fit_discovery'].includes(agentTask)){operation='answer';target='major';}")
replace_once('functions/_lib/ai/command-interpreter.js',
"if(['fact_rank_lookup','school_major_history','school_history','major_region_history','school_research'",
"if(['fact_rank_lookup','school_major_history','school_history','major_region_history','region_school_directory','school_research'")
sub_once('functions/_lib/ai/command-interpreter.js',
r"function deterministicBase\(text,workspace=\{\},resolvedSchoolNames=\[\],resolvedSchoolAliases=\[\]\)\{\n  const source=clean\(text,1200\),retryContext=.*?reference=ordinalReference\(source,workspace\);",
"""function deterministicBase(text,workspace={},resolvedSchoolNames=[],resolvedSchoolAliases=[],resolvedRegion=null){
  const source=clean(text,1200),retryContext=retryContextForText(source,workspace),score=scoreFromText(source),directoryQuestion=regionSchoolDirectoryLanguage(source),schoolNamesFromInput=directoryQuestion&&!resolvedSchoolNames.length?[]:schoolNamesFromText(source,resolvedSchoolNames),positive0=positiveMajors(source,schoolNamesFromInput,resolvedSchoolAliases),negative=negativeMajors(source,schoolNamesFromInput,resolvedSchoolAliases),schools0=schoolNamesFromInput,geoFallback=geographyFromText(source),geo=resolvedRegion?.keys?.length?resolvedRegion:geoFallback,bottomLineMode=bottomLineFromText(source),platformTarget=platformTargetFromText(source),clearMajor=clearMajorLanguage(source),clearSchool=clearSchoolLanguage(source),clearRegion=clearRegionLanguage(source),reference=ordinalReference(source,workspace),schoolLevel=schoolLevelFromText(source);""", re.S)
replace_once('functions/_lib/ai/command-interpreter.js',
"  let agentTask=retryContext?.agentTask||deterministicAgentTask({text:source,schools,majors,regionKeys:geo.keys,score,workspace,candidateIntent,compareIntent:hasCompare,rankIntent,bottomLineMode});\n  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&mentorProfile?.enabled)agentTask='save_family';\n  const rawScoreUsage=explicitScoreUsage(source,workspace),scoreUsage=agentTask==='major_region_history'?'suspended':",
"  let agentTask=retryContext?.agentTask||deterministicAgentTask({text:source,schools,majors,regionKeys:geo.keys,score,workspace,candidateIntent,compareIntent:hasCompare,rankIntent,bottomLineMode});\n  const genericCityScope=(geo.keys||[]).some(key=>String(key||'').startsWith('city:'));\n  if(['candidate_discovery','candidate_refinement'].includes(agentTask)&&genericCityScope)agentTask='region_school_directory';\n  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&mentorProfile?.enabled)agentTask='save_family';\n  const rawScoreUsage=explicitScoreUsage(source,workspace),scoreUsage=['major_region_history','region_school_directory'].includes(agentTask)?'suspended':")
replace_once('functions/_lib/ai/command-interpreter.js',
"...legacy,score,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,schoolNames:schools,bottomLineMode,platformTarget,",
"...legacy,score,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,regionContext:{type:geo.type||'',province:geo.province||'',city:geo.city||'',label:geo.label||'',key:geo.key||(geo.keys||[])[0]||'',inherited:geo.inherited===true},schoolLevel,transientRegionView:agentTask==='major_region_history'&&genericCityScope,scoreDeferred:agentTask==='region_school_directory'&&Boolean(score),schoolNames:schools,bottomLineMode,platformTarget,")
replace_once('functions/_lib/ai/command-interpreter.js',
"export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchool=await resolveAiSchoolMentionsDetailed(text,{request,env}),resolvedSchoolNames=resolvedSchool.schoolNames;\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchool.matchedAliases);",
"export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchool=await resolveAiSchoolMentionsDetailed(text,{request,env}),resolvedSchoolNames=resolvedSchool.schoolNames;\n  let resolvedRegion=null;\n  if(!resolvedSchoolNames.length&&(regionSchoolDirectoryLanguage(text)||positiveMajors(text).length||workspace?.agentContext?.currentTask==='region_school_directory')){try{const resource=await import('./school-directory-resource.js');resolvedRegion=await resource.resolveSchoolDirectoryRegion({request,env},text,workspace);}catch{resolvedRegion=null;}}\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchool.matchedAliases,resolvedRegion);")

# intent contract
replace_once('functions/_lib/ai/intent-contract.js',
"fact_rank_lookup:'lookup',major_region_history:'lookup',school_major_history:'lookup',school_history:'lookup',",
"fact_rank_lookup:'lookup',major_region_history:'lookup',region_school_directory:'lookup',school_major_history:'lookup',school_history:'lookup',")
replace_once('functions/_lib/ai/intent-contract.js',
"fact_rank_lookup:'score',major_region_history:'major',school_major_history:'school_major',school_history:'school',",
"fact_rank_lookup:'score',major_region_history:'major',region_school_directory:'region_school',school_major_history:'school_major',school_history:'school',")
replace_once('functions/_lib/ai/intent-contract.js',
"fact_rank_lookup:'deterministic_only',major_region_history:'deterministic_only',school_major_history:'deterministic_only'",
"fact_rank_lookup:'deterministic_only',major_region_history:'deterministic_only',region_school_directory:'deterministic_only',school_major_history:'deterministic_only'")

# task spec
replace_once('functions/_lib/ai/task-spec-registry.js',
"major_region_history:['majorHistory'],school_major_history:['history'],school_history:['history'],",
"major_region_history:['majorHistory'],region_school_directory:['regionSchools'],school_major_history:['history'],school_history:['history'],")
replace_once('functions/_lib/ai/task-spec-registry.js',
"'candidate_discovery','candidate_refinement','restore_view','fact_rank_lookup','major_region_history','school_major_history','school_history',",
"'candidate_discovery','candidate_refinement','restore_view','fact_rank_lookup','major_region_history','region_school_directory','school_major_history','school_history',")

# tool registry
replace_once('functions/_lib/ai/tool-registry.js',
"import { matchesPlatformUpgradeRecord, normalizePlatformTarget } from '../platform-upgrade-policy.js';",
"import { matchesPlatformUpgradeRecord, normalizePlatformTarget } from '../platform-upgrade-policy.js';\nimport { querySchoolDirectory } from './school-directory-resource.js';")
replace_once('functions/_lib/ai/tool-registry.js',
"  major_region_history:Object.freeze({name:'major_region_history',deterministic:true,maxConcurrency:1}),",
"  major_region_history:Object.freeze({name:'major_region_history',deterministic:true,maxConcurrency:1}),\n  region_school_directory:Object.freeze({name:'region_school_directory',deterministic:true,maxConcurrency:1}),")
replace_once('functions/_lib/ai/tool-registry.js',
"export async function runSchoolMajorHistory(context,{school,majorKeyword='',majorKeywords=[],bottomLineMode='all'}={}){",
"export async function runRegionSchoolDirectory(context,{region={},level='all'}={}){return querySchoolDirectory(context,{region,level});}\n\nexport async function runSchoolMajorHistory(context,{school,majorKeyword='',majorKeywords=[],bottomLineMode='all'}={}){")

# generic city support in major-history only
replace_once('functions/api/ai/major-history.js',
"import { matchRegionRule } from '../../../shared/resources/geo/china-region-catalog.v3990_1.js';",
"import { matchRegionRule, normalizeCityName } from '../../../shared/resources/geo/china-region-catalog.v3990_1.js';")
replace_once('functions/api/ai/major-history.js',
"function regionMatch(record, region) {\n  const key = clean(region, 220) || 'all';\n  if (key === 'all') return true;\n  return matchRegionRule(record, key);\n}",
"function regionMatch(record, region) {\n  const key = clean(region, 220) || 'all';\n  if (key === 'all') return true;\n  if (key.startsWith('city:')) return normalizeCityName(record.city) === normalizeCityName(key.slice(5));\n  return matchRegionRule(record, key);\n}")

# orchestrator
replace_once('functions/_lib/ai/turn-orchestrator.js',
"resolveRegionExecution,runMajorBandSearch,runRankLookup,runSchoolComparison,runMajorComparison,\n  runSchoolMajorHistory,runMajorRegionHistory,runSchoolOfficialInfo",
"resolveRegionExecution,runMajorBandSearch,runRankLookup,runSchoolComparison,runMajorComparison,\n  runSchoolMajorHistory,runMajorRegionHistory,runRegionSchoolDirectory,runSchoolOfficialInfo")
replace_once('functions/_lib/ai/turn-orchestrator.js',
"function resolveActiveView(command={},workspace={}){const base=baseView(workspace),patch=command.changeSet&&typeof command.changeSet==='object'?command.changeSet:fallbackPatch(command),mutates=VIEW_MUTATING_TASKS.has(command.agentTask);if(!mutates)return{view:clone(base),commitView:false,patch,previousView:base};const next=applyAiViewPatch(base,patch,workspace?.examContext||{});next.sourceText=clean(command.rawText,320);return{view:next,commitView:true,patch,previousView:base};}",
"function resolveActiveView(command={},workspace={}){const base=baseView(workspace),patch=command.changeSet&&typeof command.changeSet==='object'?command.changeSet:fallbackPatch(command),ownsView=VIEW_MUTATING_TASKS.has(command.agentTask),transient=command.agentTask==='major_region_history'&&command.transientRegionView===true;if(!ownsView)return{view:clone(base),commitView:false,patch,previousView:base};const next=applyAiViewPatch(base,patch,workspace?.examContext||{});next.sourceText=clean(command.rawText,320);return{view:next,commitView:!transient,patch,previousView:base};}")
replace_once('functions/_lib/ai/turn-orchestrator.js',
"function resultIdentity({view,command,selectionReview}){return[command.agentTask,view.score||'',view.majorKeywords.join('/'),view.regionKeys.join(','),view.schoolNames.join('/'),view.bottomLineMode,command.platformTarget||'',command.focus?.school||'',command.focus?.major||'',selectionReview?.snapshotVersion||''].join('|');}",
"function resultIdentity({view,command,selectionReview}){return[command.agentTask,view.score||'',view.majorKeywords.join('/'),view.regionKeys.join(','),(command.regionKeys||[]).join(','),command.schoolLevel||'',view.schoolNames.join('/'),view.bottomLineMode,command.platformTarget||'',command.focus?.school||'',command.focus?.major||'',selectionReview?.snapshotVersion||''].join('|');}")
replace_once('functions/_lib/ai/turn-orchestrator.js',
"  else if(command.agentTask==='major_region_history')changeText=`${changeSummary(resolved.previousView,view,command)} 同时直接查",
"  else if(command.agentTask==='region_school_directory')changeText=`这轮只回答${command.regionLabel||command.regionContext?.label||'当前地区'}的高校目录${command.schoolLevel&&command.schoolLevel!=='all'?`（${command.schoolLevel}）`:''}；不会修改你正在使用的候选筛选。`;\n  else if(command.agentTask==='major_region_history'&&command.transientRegionView)changeText=`这轮只把${command.regionLabel||command.regionContext?.label||'当前城市'}作为临时专业历史查询范围，不写入候选筛选；直接查${(focus.majors?.length?focus.majors:view.majorKeywords).join(' / ')||focus.major}的2026辽宁物理类实际投档记录。`;\n  else if(command.agentTask==='major_region_history')changeText=`${changeSummary(resolved.previousView,view,command)} 同时直接查")
replace_once('functions/_lib/ai/turn-orchestrator.js',
"history:null,majorHistory:null,fit:null,background:null,officialSchool:null",
"history:null,majorHistory:null,regionSchools:null,fit:null,background:null,officialSchool:null")
replace_once('functions/_lib/ai/turn-orchestrator.js',
"      case'school_major_history':\n        result.history=await runSchoolMajorHistory",
"      case'region_school_directory':\n        result.regionSchools=await runRegionSchoolDirectory(executionContext,{region:command.regionContext||{key:(command.regionKeys||[])[0]||'',label:command.regionLabel||''},level:command.schoolLevel||'all'});result.partial=!result.regionSchools?.ok;break;\n      case'school_major_history':\n        result.history=await runSchoolMajorHistory")
replace_once('functions/_lib/ai/turn-orchestrator.js',
"  const taskAction=VIEW_MUTATING_TASKS.has(command.agentTask)?(workspace?.mainTaskId?'update_main':'create_main'):",
"  const taskAction=resolved.commitView===true?(workspace?.mainTaskId?'update_main':'create_main'):")

# answer composer
replace_once('functions/_lib/ai/answer-composer.js',
"  if(result.majorHistory){if(result.majorHistory.ok&&!result.majorHistory.allFailed){",
"  if(result.regionSchools){if(result.regionSchools.ok){const summary=result.regionSchools.summary||{},label=result.regionSchools.region?.label||command.regionLabel||'当前地区',level=result.regionSchools.level||'all',deferred=command.scoreDeferred?'你给的分数仍保留，但任意城市不能偷换成全国候选；这轮先把学校目录回答准确。':'';if(level==='all')return{status:'answered',text:`按统一高校地域目录，${label}共${Number(summary.regionTotal??summary.total??0)}所高校，其中本科${Number(summary.regionUndergraduateCount??summary.undergraduateCount??0)}所、专科${Number(summary.regionJuniorCollegeCount??summary.juniorCollegeCount??0)}所。${deferred}`};return{status:'answered',text:`按统一高校地域目录，${label}${level}院校共${Number(summary.total||0)}所。${deferred}`};}return{status:'unsupported',text:clean(result.regionSchools.message||'当前没有取得可验证的高校地域目录。')};}\n  if(result.majorHistory){if(result.majorHistory.ok&&!result.majorHistory.allFailed){")

# next action engine
replace_once('functions/_lib/ai/next-action-engine.js',
"  if(task==='school_research')return[",
"  if(task==='region_school_directory'){const directory=result?.regionSchools||{},region=clean(directory?.region?.label)||'当前地区',level=directory?.level||'all',first=clean(directory?.records?.[0]?.school||directory?.records?.[0]?.officialName),key=clean(directory?.region?.key),out=[];if(level==='all')out.push(action('region-undergraduate','只看本科',`${region}有哪些本科院校`,'把学校层次单独收窄，不改变候选筛选。',100));else out.push(action('region-all-schools','看全部高校',`${region}有哪些大学`,'回到本科和专科的完整地域目录。',100));out.push(action('region-major-history','看一个专业的学校和分数',`${region}电气工程及其自动化有哪些学校，2026都多少分`,'从学校目录进入确定性专业投档事实。',94));if(first)out.push(action('region-first-school',`继续看${first}`,`介绍下${first}`,'从地域列表进入具体学校研究。',90));if(scoreText&&(key==='ln'||key==='shenyang'||key==='dalian'||key.startsWith('province:')))out.unshift(action('region-score-fit','按我的分数看可达性',`按我${scoreText}分，只看${region}有哪些学校更现实`,'这一步才把地区写入候选筛选。',105));return out;}\n  if(task==='school_research')return[")

# presentation
replace_once('functions/_lib/ai/advisor-presentation.js',
"export function regionLabel(keys=[]){const values=unique(keys,8);if(!values.length||values.includes('all'))return'全国';return values.map(regionKeyLabel).join('、');}",
"export function regionLabel(keys=[]){const values=unique(keys,8);if(!values.length||values.includes('all'))return'全国';return values.map(key=>String(key||'').startsWith('city:')?String(key).slice(5):regionKeyLabel(key)).join('、');}")
replace_once('functions/_lib/ai/advisor-presentation.js',
"case'school_major_history':case'school_history':case'major_region_history':return'history_lookup';",
"case'school_major_history':case'school_history':case'major_region_history':return'history_lookup';case'region_school_directory':return'school_focus';")
replace_once('functions/_lib/ai/advisor-presentation.js',
"if(result?.background?.boundary)checks.push({key:'background-boundary'",
"if(result?.regionSchools?.boundary)checks.push({key:'region-school-directory-boundary',level:'review',text:clean(result.regionSchools.boundary,280)});if(result?.background?.boundary)checks.push({key:'background-boundary'")
replace_once('functions/_lib/ai/advisor-presentation.js',
"  if(result.majorHistory)blocks.push({type:'history_records'",
"  if(result.regionSchools?.ok){const schoolRows=result.regionSchools.records||[],undergraduate=schoolRows.filter(item=>item.level==='本科'),junior=schoolRows.filter(item=>item.level==='专科'),items=[];if(undergraduate.length)items.push({label:'本科院校',schoolCount:undergraduate.length,schools:undergraduate.map(item=>({school:item.school,officialName:item.officialName,province:item.province,city:item.city}))});if(junior.length)items.push({label:'专科院校',schoolCount:junior.length,schools:junior.map(item=>({school:item.school,officialName:item.officialName,province:item.province,city:item.city}))});blocks.push({type:'background_routes',title:`${result.regionSchools.region?.label||command.regionLabel||'当前地区'}高校目录`,text:'学校名称来自统一高校地域目录；点击学校可继续查该校辽宁2026物理类专业分数，“全部专业”进入现有 ln-rank 单校专业页。',background:{scope:'region_school_directory',region:result.regionSchools.region,level:result.regionSchools.level,items,boundary:result.regionSchools.boundary}});}\n  if(result.majorHistory)blocks.push({type:'history_records'")

# resource boundary documentation
path='functions/_lib/ai/RESOURCE-BOUNDARY.md'
text=read(path)
marker='## School history\n'
section="""## School directory by region

AIPLuS region-school questions (for example “沈阳有哪些大学”“辽宁有多少大学”“深圳有哪些本科”) read the existing canonical school-location resource `/tongxue/data/school-search-index.20260617-v150.json` through `school-directory-resource.js`. This adapter does not copy the 2,900+ school rows into a second database and does not use the language model to generate school names or counts.

School-existence truth and Liaoning-admission truth are deliberately separate. A region directory count must be computed from the complete school-location directory; it must not be reduced to schools that happen to have Liaoning 2026 physics admission records. When the user continues into a major or score question, the existing admission/history owners perform that next query and state their narrower admissions boundary.

City names are resolved from the cities actually present in the canonical directory rather than a growing hard-coded city regex list. Knowledge-only region queries do not mutate the candidate active view. Generic-city major-history queries may use a transient `city:*` execution scope, but that scope is not persisted as a candidate filter unless the active candidate engine has an explicit supported region contract.

The directory payload cache is isolate-local, promise-coalesced and time-bounded. It is an execution cache over the canonical asset, not a second truth source.

"""
if section.strip() not in text:
    if marker not in text: raise SystemExit('RESOURCE-BOUNDARY marker missing')
    text=text.replace(marker,section+marker,1)
    write(path,text)

# verifier
verifier = r'''import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpretAiCommand } from '../functions/_lib/ai/command-interpreter.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import { onRequestGet as majorHistoryGet } from '../functions/api/ai/major-history.js';
import { createAiWorkspace } from '../shared/ai/ai-workspace-contract.v3992_0.js';
import { extractSchoolRecords } from '../tongxue/data/school-name-resolver-v150.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function assert(value,message){if(!value)throw new Error(message);}
function normProvince(value){return String(value||'').replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/u,'').trim();}
function normCity(value){return String(value||'').replace(/(自治州|地区|盟|市)$/u,'').trim();}
function fileForUrl(url){return path.join(ROOT,new URL(url).pathname.replace(/^\//,''));}
const assets={async fetch(request){const file=fileForUrl(request.url);if(!fs.existsSync(file))return new Response('not found',{status:404,headers:{'content-type':'text/plain'}});const type=file.endsWith('.json')?'application/json':'text/javascript';return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':type}});}};
const context={request:new Request('https://example.test/api/ai/turn',{method:'POST'}),env:{ASSETS:assets}};
const directoryPayload=JSON.parse(fs.readFileSync(path.join(ROOT,'tongxue/data/school-search-index.20260617-v150.json'),'utf8'));
const truth=extractSchoolRecords(directoryPayload).filter(row=>['本科','专科'].includes(String(row.level||'')));
function truthRows({province='',city='',level='all'}){return truth.filter(row=>(!province||normProvince(row.province)===province)&&(!city||normCity(row.city)===city)&&(level==='all'||String(row.level||'')===level));}
async function command(input,workspace=createAiWorkspace()){return (await interpretAiCommand(input,workspace,context.env,context.request)).command;}
async function run(input,workspace=createAiWorkspace()){let confirmed=null,toolResults={};for(let i=0;i<4;i+=1){const out=await orchestrateAiTurn(context,{input,workspace,confirmedCommand:confirmed,deterministicToolResults:toolResults});assert(out?.ok!==false,`${input} failed: ${out?.message}`);if(!out.pendingDeterministicTool)return out;for(const tool of out.toolRequests||[out.toolRequest]){assert(tool.kind==='major_history',`${input} unexpected tool ${tool.kind}`);const response=await majorHistoryGet({request:new Request(new URL(tool.url,'https://example.test').toString()),env:{ASSETS:assets}}),payload=await response.json();toolResults[tool.key]={kind:tool.kind,key:tool.key,url:tool.url,status:response.status,payload};}confirmed=out.command;}throw new Error(`${input} did not converge`);}
function continuedWorkspace(base,out){return createAiWorkspace({...base,agentContext:out.agentContext,lastResult:out.result,lastTurn:out.turnRecord,activeView:out.commitView?out.resolvedView:base.activeView,turnHistory:[...(base.turnHistory||[]),out.turnRecord]});}
function assertDirectory(out,{province='',city='',level='all'}){assert(out.command.agentTask==='region_school_directory',`unexpected task ${out.command.agentTask}`);assert(out.commitView===false,'directory query must not commit candidate view');assert(out.result?.regionSchools?.ok===true,'region school result missing');const expected=truthRows({province,city,level}),actual=out.result.regionSchools.records||[];assert(out.result.regionSchools.total===expected.length,`truth count mismatch expected ${expected.length} got ${out.result.regionSchools.total}`);assert(new Set(actual.map(x=>x.school)).size===actual.length,'duplicate schools returned');assert(actual.every(x=>(!province||x.province===province)&&(!city||x.city===city)&&(level==='all'||x.level===level)),'region/level leaked');assert(out.blocks.some(x=>x.type==='background_routes'),'region school UI block missing');assert(out.blocks.some(x=>x.type==='next_questions'),'next questions missing');}

const empty=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
const shenyang=await run('沈阳有哪些大学？',empty);assertDirectory(shenyang,{province:'辽宁',city:'沈阳'});assert(JSON.stringify(shenyang.resolvedView.regionKeys)===JSON.stringify(empty.activeView.regionKeys),'knowledge query changed active region');assert(shenyang.result.regionSchools.summary.regionTotal===shenyang.result.regionSchools.summary.regionUndergraduateCount+shenyang.result.regionSchools.summary.regionJuniorCollegeCount,'count split mismatch');assert(shenyang.blocks.find(x=>x.type==='next_questions')?.items?.some(x=>/介绍下/.test(x.prompt)),'school research continuation missing');
assertDirectory(await run('辽宁有多少大学？'),{province:'辽宁'});
assertDirectory(await run('辽宁有哪些本科院校？'),{province:'辽宁',level:'本科'});
assertDirectory(await run('沈阳有多少专科？'),{province:'辽宁',city:'沈阳',level:'专科'});
const shenzhen=await run('深圳有哪些大学？');assertDirectory(shenzhen,{province:'广东',city:'深圳'});assert(shenzhen.command.regionKeys?.[0]==='city:深圳','generic city key not normalized');
assertDirectory(await run('广东深圳有哪些本科？'),{province:'广东',city:'深圳',level:'本科'});
const followWorkspace=continuedWorkspace(empty,shenyang),undergradFollow=await run('本科呢？',followWorkspace);assertDirectory(undergradFollow,{province:'辽宁',city:'沈阳',level:'本科'});assert(undergradFollow.command.regionContext?.inherited===true,'region follow-up did not inherit conversation region');

const syMajor=await command('沈阳电气有哪些学校');assert(syMajor.agentTask==='major_region_history',`沈阳+专业 task drifted ${syMajor.agentTask}`);assert(syMajor.regionKeys.includes('shenyang'),'沈阳专业查询 region missing');
const szMajor=await command('深圳电气有哪些学校');assert(szMajor.agentTask==='major_region_history',`深圳+专业 task drifted ${szMajor.agentTask}`);assert(szMajor.regionKeys.includes('city:深圳'),'深圳专业查询 city key missing');assert(szMajor.transientRegionView===true,'generic city major query must be transient');const szMajorOut=await run('深圳电气有哪些学校');assert(szMajorOut.commitView===false,'generic city major history polluted candidate view');assert((szMajorOut.result?.majorHistory?.records||[]).every(row=>normCity(row.city)==='深圳'),'generic city major-history leaked other cities');

assert((await command('沈阳工业大学怎么样')).agentTask==='school_research','沈阳工业大学 must remain school research');
assert((await command('辽宁大学怎么样')).agentTask==='school_research','辽宁大学 must remain school research');
const scoreSy=await command('580分沈阳有哪些学校');assert(['candidate_discovery','candidate_refinement'].includes(scoreSy.agentTask),`score+沈阳 must remain candidate query: ${scoreSy.agentTask}`);
const candidateWorkspace=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:[],bottomLineMode:'all'}});assert((await command('只看沈阳',candidateWorkspace)).agentTask==='candidate_refinement','explicit candidate region refinement drifted');
const scoreSz=await command('580分深圳有哪些学校');assert(scoreSz.agentTask==='region_school_directory','unsupported generic-city candidate must degrade to truthful directory instead of silently querying nationwide');assert(scoreSz.scoreDeferred===true,'deferred score boundary missing');

console.log(JSON.stringify({ok:true,buildId:directoryPayload.buildId,count:truth.length,shenyang:shenyang.result.regionSchools.summary,shenzhen:shenzhen.result.regionSchools.summary,genericCityMajorRecords:szMajorOut.result?.majorHistory?.records?.length||0},null,2));
'''
write('tools/verify-ai-region-school-directory-v002.mjs', verifier)

# workflow gates
wf='.github/workflows/verify-ai-workspace-v3990_1.yml'
replace_once(wf,
"      - 'tools/verify-aiplus-human-dialog-v3990_2.mjs'\n      - 'tools/verify-ai-school-history-bridge-v3992_2.mjs'",
"      - 'tools/verify-aiplus-human-dialog-v3990_2.mjs'\n      - 'tools/verify-ai-region-school-directory-v002.mjs'\n      - 'tools/verify-ai-school-history-bridge-v3992_2.mjs'")
# same block occurs twice; first replacement only, do second intentionally
replace_once(wf,
"      - 'tools/verify-aiplus-human-dialog-v3990_2.mjs'\n      - 'tools/verify-ai-school-history-bridge-v3992_2.mjs'",
"      - 'tools/verify-aiplus-human-dialog-v3990_2.mjs'\n      - 'tools/verify-ai-region-school-directory-v002.mjs'\n      - 'tools/verify-ai-school-history-bridge-v3992_2.mjs'")
replace_once(wf,
"node --check functions/_lib/ai/command-interpreter.js\n          node --check functions/_lib/ai/major-language-resolver.js",
"node --check functions/_lib/ai/command-interpreter.js\n          node --check functions/_lib/ai/school-directory-resource.js\n          node --check functions/_lib/ai/major-language-resolver.js")
replace_once(wf,
"node --check tools/verify-aiplus-human-dialog-v3990_2.mjs\n          node --check tools/verify-ai-school-history-bridge-v3992_2.mjs",
"node --check tools/verify-aiplus-human-dialog-v3990_2.mjs\n          node --check tools/verify-ai-region-school-directory-v002.mjs\n          node --check tools/verify-ai-school-history-bridge-v3992_2.mjs")
replace_once(wf,
"node tools/verify-aiplus-human-dialog-v3990_2.mjs\n          node tools/verify-aiplus-school-official-v3990_2.mjs",
"node tools/verify-aiplus-human-dialog-v3990_2.mjs\n          node tools/verify-ai-region-school-directory-v002.mjs\n          node tools/verify-aiplus-school-official-v3990_2.mjs")
replace_once(wf,
"          comparison_payload='{\"workspace\":{\"contractVersion\":\"ai-workspace-contract-v3992_1\"",
"          region_directory_payload='{\"workspace\":{\"contractVersion\":\"ai-workspace-contract-v3992_1\",\"examContext\":{\"score\":580},\"activeView\":{\"score\":580,\"regionKeys\":[\"all\"],\"majorKeywords\":[]},\"viewHistory\":[],\"tasks\":[],\"hardConstraints\":[],\"softPreferences\":[]},\"input\":\"沈阳有哪些大学？\"}'\n          region_directory=\"$(request_post region-directory \"${PREVIEW_BASE}/api/ai/turn?candidate=${EXPECTED_SHA}\" \"$region_directory_payload\")\"\n          require_json region-directory '.command.agentTask == \"region_school_directory\" and .commitView == false and .result.regionSchools.ok == true and .result.regionSchools.region.city == \"沈阳\" and .result.regionSchools.summary.regionTotal > 0 and .result.regionSchools.summary.regionTotal == (.result.regionSchools.summary.regionUndergraduateCount + .result.regionSchools.summary.regionJuniorCollegeCount)' \"$region_directory\"\n\n          shenzhen_directory_payload='{\"workspace\":{\"contractVersion\":\"ai-workspace-contract-v3992_1\",\"examContext\":{},\"activeView\":{\"regionKeys\":[\"all\"],\"majorKeywords\":[]},\"viewHistory\":[],\"tasks\":[],\"hardConstraints\":[],\"softPreferences\":[]},\"input\":\"深圳有哪些大学？\"}'\n          shenzhen_directory=\"$(request_post shenzhen-directory \"${PREVIEW_BASE}/api/ai/turn?candidate=${EXPECTED_SHA}\" \"$shenzhen_directory_payload\")\"\n          require_json shenzhen-directory '.command.agentTask == \"region_school_directory\" and .command.regionKeys[0] == \"city:深圳\" and .commitView == false and .result.regionSchools.ok == true and .result.regionSchools.region.city == \"深圳\" and .result.regionSchools.total > 0' \"$shenzhen_directory\"\n\n          comparison_payload='{\"workspace\":{\"contractVersion\":\"ai-workspace-contract-v3992_1\"")

print('AIPLuS region-school patch applied')
