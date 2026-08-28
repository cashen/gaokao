from pathlib import Path
import json,re,shutil,sys
ROOT=Path(__file__).resolve().parents[2] if 'tools/ln-2026' in str(Path(__file__)) else Path.cwd()
if (Path.cwd()/'.git').exists(): ROOT=Path.cwd()
VERSION='v3.9.51.0'; ASSET='v3951_0'

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s):
    path=ROOT/p; path.parent.mkdir(parents=True,exist_ok=True); path.write_text(s,encoding='utf-8')
def rep(p,a,b,required=True,count=-1):
    s=read(p)
    if a not in s:
        if required: raise RuntimeError(f'{p}: missing replacement pattern {a[:100]!r}')
        return False
    write(p,s.replace(a,b,count)); return True

def regex(p,pat,repl,required=True,count=0):
    s=read(p); out,n=re.subn(pat,repl,s,count=count,flags=re.S)
    if required and n==0: raise RuntimeError(f'{p}: regex not matched {pat[:100]!r}')
    if n: write(p,out)
    return n

# 1. Active year configuration and rank provider.
write('functions/_lib/exam-year-config.js', """export const LN_PHYSICS_EXAM_CONFIG = {
  version: 'v3.9.51.0', audienceYear: 2027, year: 2026, dataYear: 2026,
  region: 'ln', subject: 'physics', provinceName: '辽宁', subjectName: '物理类',
  specialControlScore: 508, undergraduateControlScore: 344, vocationalControlScore: 150,
  rankYear: 2026, admissionBaseYear: 2026,
  rankTablePath: 'functions/_lib/ln-2026-physics-score-rank.js',
  note: '面向2027备考家庭；以辽宁2026普通类本科批物理类专业投档记录和2026一分一段为主要历史参考，2025、2024用于同口径对照。'
};
export function getExamYearConfig(input = {}) {
  const year = Number(input.year || input.rankYear || input.dataYear || LN_PHYSICS_EXAM_CONFIG.year);
  const region = String(input.region || LN_PHYSICS_EXAM_CONFIG.region).trim().toLowerCase();
  const subject = String(input.subject || LN_PHYSICS_EXAM_CONFIG.subject).trim().toLowerCase();
  const supported = [2025,2026].includes(year) && ['ln','liaoning','辽宁'].includes(region) && ['physics','物理','物理类','physical'].includes(subject);
  return {...LN_PHYSICS_EXAM_CONFIG, year, dataYear:year, rankYear:year, region:input.region||region, subject:input.subject||subject,
    note: supported ? LN_PHYSICS_EXAM_CONFIG.note : '当前只内置辽宁物理类2025、2026一分一段；其他年份或科类需要补充官方数据。'};
}
""")
write('functions/_lib/rank-table-provider.js', """import {findLn2025PhysicsScoreByRank,getLn2025PhysicsRankRows,lookupLn2025PhysicsRank,LN_2025_PHYSICS_SCORE_RANK_META} from './ln-2025-physics-score-rank.js';
import {lookupLn2026PhysicsScore,lookupLn2026PhysicsRank,getLn2026PhysicsRows,LN_2026_PHYSICS_SCORE_RANK_META} from './ln-2026-physics-score-rank.js';
function norm(v){return String(v==null?'':v).trim().toLowerCase()}
function isLnPhysics(region,subject){return ['ln','liaoning','辽宁'].includes(norm(region||'ln'))&&['physics','物理','物理类','physical'].includes(norm(subject||'physics'))}
export function lookupScoreRank({year=2026,region='ln',subject='physics',score}={}){if(!isLnPhysics(region,subject))return null;if(Number(year)===2026)return lookupLn2026PhysicsScore(score);if(Number(year)===2025)return lookupLn2025PhysicsRank(score);return null}
export function getRankTableMeta({year=2026,region='ln',subject='physics'}={}){if(!isLnPhysics(region,subject))return null;if(Number(year)===2026)return {...LN_2026_PHYSICS_SCORE_RANK_META};if(Number(year)===2025)return {...LN_2025_PHYSICS_SCORE_RANK_META};return null}
export function getRankTableRows({year=2026,region='ln',subject='physics'}={}){if(!isLnPhysics(region,subject))return[];if(Number(year)===2026)return getLn2026PhysicsRows();if(Number(year)===2025)return getLn2025PhysicsRankRows();return[]}
export function findEquivalentScoreByRank({targetYear=2026,region='ln',subject='physics',rank}={}){if(!isLnPhysics(region,subject))return null;if(Number(targetYear)===2026)return lookupLn2026PhysicsRank(rank);if(Number(targetYear)===2025)return findLn2025PhysicsScoreByRank(rank);return null}
export function describeEquivalentRankRoadmap({sourceYear=2026,targetYear=2025,region='ln',subject='physics'}={}){const sourceReady=!!getRankTableMeta({year:sourceYear,region,subject}),targetReady=!!getRankTableMeta({year:targetYear,region,subject});return{sourceYear:Number(sourceYear),targetYear:Number(targetYear),region,subject,sourceReady,targetReady,enabled:sourceReady&&targetReady,note:sourceReady&&targetReady?'可按官方一分一段进行跨年等位参考；结果仍需结合当年招生计划。':'对应年份一分一段尚未接入。'}}
""")

# 2. Dedicated ln-rank manifest, leaving /fenxi/ runtime untouched.
write('functions/_lib/ln-rank-manifest.js', """const TTL=5*60*1000;let manifestCache=null;const chunkCache=new Map();
function fresh(x){return x&&Date.now()-x.time<TTL}
function base(request){const u=new URL(request.url);return `${u.protocol}//${u.host}`}
async function fetchJson(request,path){const url=`${base(request)}/fenxi/${String(path).replace(/^\\/+/, '')}`;const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`ln-rank 2026 data fetch failed ${r.status}: ${path}`);return r.json()}
export async function loadManifest(request,env){if(fresh(manifestCache))return manifestCache.data;const data=await fetchJson(request,'data/ln-rank-2026/manifest.json');if(Number(data.dataYear)!==2026)throw new Error('ln-rank active manifest is not 2026');manifestCache={time:Date.now(),data};return data}
export async function loadAllRecords(request,env){const manifest=await loadManifest(request,env);const chunks=Array.isArray(manifest.chunks)?manifest.chunks:[];const lists=await Promise.all(chunks.map(async c=>{const file=c.file||c.path;if(!file)return[];if(fresh(chunkCache.get(file)))return chunkCache.get(file).data;const data=await fetchJson(request,file);const records=Array.isArray(data)?data:(Array.isArray(data.records)?data.records:[]);chunkCache.set(file,{time:Date.now(),data:records});return records}));return{manifest,records:lists.flat()}}
""")

# 3. Generic three-year history and active 2026 normalizer.
write('functions/_lib/history-score-engine.js', """function num(v){if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const m=String(v).replace(/[,，\\s]/g,'').match(/-?\\d+(?:\\.\\d+)?/);return m&&Number.isFinite(Number(m[0]))?Number(m[0]):null}
function first(raw,keys){for(const k of keys)if(raw&&Object.prototype.hasOwnProperty.call(raw,k)){const n=num(raw[k]);if(n!=null)return n}return null}
export function extractYearScore(raw,year){const y=String(year),yy=y.slice(-2);return first(raw,[`score${y}`,`minScore${y}`,`score_${y}`,`${y}Score`,`${y}_score`,`${y}最低分`,`${y}最低投档分`,`${y}投档最低分`,`${y}分数`,`${yy}分`,`最低分${y}`])}
export function extractYearRank(raw,year){const y=String(year),yy=y.slice(-2);return first(raw,[`rank${y}`,`minRank${y}`,`rank_${y}`,`${y}Rank`,`${y}_rank`,`${y}最低位次`,`${y}最低投档位次`,`${y}位次`,`${yy}位次`,`最低位次${y}`])}
function changeText(year,newRank,oldYear,oldRank){if(newRank==null||oldRank==null)return'';const d=newRank-oldRank,a=Math.abs(d).toLocaleString('zh-CN');if(Math.abs(d)<=1000)return`${year}与${oldYear}对应位次接近`;return d<0?`${year}对应位次较${oldYear}前移约 ${a} 位`:`${year}对应位次较${oldYear}后移约 ${a} 位`}
export function buildHistoryScore(input={}){const s26=num(input.score2026),r26=num(input.rank2026),s25=num(input.score2025),r25=num(input.rank2025),s24=num(input.score2024),r24=num(input.rank2024);const d26=r26!=null&&r25!=null?r26-r25:null,d25=r25!=null&&r24!=null?r25-r24:null;return{primaryYear:2026,has2026:s26!=null||r26!=null,has2025:s25!=null||r25!=null,has2024:s24!=null||r24!=null,scoreDelta26vs25:s26!=null&&s25!=null?s26-s25:null,rankDelta26vs25:d26,scoreDelta25vs24:s25!=null&&s24!=null?s25-s24:null,rankDelta25vs24:d25,rankTrendText:changeText(2026,r26,2025,r25),rankTrendText25vs24:changeText(2025,r25,2024,r24),rankTrendLabel:d26==null?'':Math.abs(d26)<=1000?'两年位次接近':d26<0?'2026位次更靠前':'2026位次更靠后',years:{2026:{score:s26,rank:r26},2025:{score:s25,rank:r25},2024:{score:s24,rank:r24}}}}
""")
write('functions/_lib/fenxi-normalizer.js', """import {extractYearScore,extractYearRank,buildHistoryScore} from './history-score-engine.js';
import {normalizeLocation} from './location-normalizer.js';
function text(v){return String(v==null?'':v).trim()}function num(v){if(v==null||v==='')return null;const m=String(v).replace(/[,，\\s]/g,'').match(/-?\\d+(?:\\.\\d+)?/);return m&&Number.isFinite(Number(m[0]))?Number(m[0]):null}function rank(v){const n=num(v);return n!=null&&n>0?n:null}
export function normalizeRecord(raw={}){const school=text(raw.school||raw.schoolName||raw['院校名称']||raw['学校名称']),major=text(raw.major||raw.majorName||raw['专业名称']);const s26=extractYearScore(raw,2026)??num(raw.score),r26=extractYearRank(raw,2026)??rank(raw.rank),s25=extractYearScore(raw,2025),r25=rank(extractYearRank(raw,2025)),s24=extractYearScore(raw,2024),r24=rank(extractYearRank(raw,2024));const location=normalizeLocation(raw,school,major);const historyCompare=buildHistoryScore({score2026:s26,rank2026:r26,score2025:s25,rank2025:r25,score2024:s24,rank2024:r24});return{...raw,id:text(raw.id)||`${school}-${major}-${s26}-${r26}`,school,major,dataYear:2026,primaryYear:2026,score:s26,rank:r26,score2026:s26,rank2026:r26,rankStart2026:rank(raw.rankStart2026),rankEnd2026:rank(raw.rankEnd2026)||r26,sameCount2026:num(raw.sameCount2026),score2025:s25,rank2025:r25,score2024:s24,rank2024:r24,historyCompare,lnArea:location.lnArea,region:location.lnArea,province:location.province,city:location.city,displayLocation:location.displayLocation,locationSource:location.locationSource,locationConfidence:location.locationConfidence,locationWarning:location.locationWarning,geoEntity:location.geoEntity||'',schoolCanonical:location.schoolCanonical||'',regionGroups:location.regionGroups||[],geoSourceMethod:location.geoSourceMethod||'',geoSourceName:location.geoSourceName||'',geoSourceUrl:location.geoSourceUrl||'',geoSourceYear:location.geoSourceYear||'',geoMatchNote:location.geoMatchNote||'',schoolIdentifier:location.schoolIdentifier||'',nature:text(raw.schoolNatureLabel||raw.nature||location.natureHint||''),natureRaw:text(raw.schoolNatureLabel||raw.nature||location.natureHint||''),tuition:text(raw.tuition2026||raw.tuition||raw.tuition2025||''),tuitionSourceYear:raw.tuition2026?2026:(raw.tuition||raw.tuition2025?2025:null),flags:Array.isArray(raw.riskFlags)?raw.riskFlags.slice(0,6):[]}}
export function rawScore(r){return num(r?.score2026??r?.score??r?.minScore)}export function rawLnArea(r){return text(r?.lnArea??r?.schoolProvince??r?.province)}export function rawSchool(r){return text(r?.school??r?.schoolName??r?.['院校名称'])}export function rawMajor(r){return text(r?.major??r?.majorName??r?.['专业名称'])}
""")

# 4. API data source isolation.
rep('functions/api/major-bands.js', "from '../_lib/fenxi-manifest.js'", "from '../_lib/ln-rank-manifest.js'", required=True)
rep('functions/_lib/background-position-engine.js', "from './fenxi-manifest.js'", "from './ln-rank-manifest.js'", required=True)
# Active fields in background engine.
for p in ['functions/_lib/background-position-engine.js']:
    s=read(p)
    s=s.replace('referenceYear = 2025','referenceYear = 2026').replace('2025 历史记录','2026 投档记录').replace('score2025','score2026').replace('rank2025','rank2026')
    s=s.replace("dataYear: 2025","dataYear: 2026").replace("referenceYear: 2025","referenceYear: 2026")
    write(p,s)

# 5. Score guard and history rendering.
write('ln-rank/js/core/score-guard.js', """export function getScoreGuard(score){const n=Number(score);if(score==null||String(score).trim()===''||!Number.isFinite(n))return{key:'empty',canQuery:false,guide:'请先输入模考或预估参考分数，例如 580。'};if(n>750)return{key:'invalidHigh',canQuery:false,guide:'分数不能高于 750，请检查输入。'};if(n<150)return{key:'belowCoverage',canQuery:false,guide:'该参考分数低于2026年辽宁普通类专科控制线150分，请检查输入或另行了解其他升学路径。'};if(n<344)return{key:'belowCoverage',canQuery:false,guide:'该参考分数低于2026年辽宁物理类本科控制线344分。当前普通本科批专业数据不适合作为主要参考。'};if(n<508)return{key:'underSpecial',canQuery:true,guide:'该参考分数位于2026本科线344分至特控线508分之间，建议重点确认学校性质、学费、校区和特殊项目。'};return{key:'normal',canQuery:true,guide:'可以按2026专业投档最低分查看可讨论专业；位次用于解释历史位置。'}}
""")
write('ln-rank/js/feature/major-pool/history-score-render.js', """function fmt(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('zh-CN'):'—'}
export function compactHistoryScoreText(r={}){const a=[];if(r.score2025!=null||r.rank2025!=null)a.push(`2025 ${fmt(r.score2025)}分｜${fmt(r.rank2025)}位`);if(r.score2024!=null||r.rank2024!=null)a.push(`2024 ${fmt(r.score2024)}分｜${fmt(r.rank2024)}位`);return a.join('；')}
export function historyScoreText(r={},opt={}){const base=compactHistoryScoreText(r);const d=Number(r.rank2026)-Number(r.rank2025);const change=Number.isFinite(d)&&r.rank2026!=null&&r.rank2025!=null?(Math.abs(d)<=1000?'2026与2025对应位次接近':`2026较2025对应位次${d<0?'前移':'后移'}约${Math.abs(d).toLocaleString('zh-CN')}位`):'';return [base,change].filter(Boolean).join('；')||opt.empty||'历史同口径记录暂无'}
export function renderHistoryScore(r={}){const t=historyScoreText(r);return t?`<div class="history-score-line"><span>近三年</span><b>${t}</b></div>`:''}
""")

# 6. Frontend primary field/copy migration.
for p in ['ln-rank/js/feature/major-pool/render.js']:
    s=read(p)
    s=s.replace('UNDERGRADUATE_CONTROL_SCORE = 367','UNDERGRADUATE_CONTROL_SCORE = 344').replace('SPECIAL_CONTROL_SCORE = 515','SPECIAL_CONTROL_SCORE = 508')
    s=s.replace('record.schoolCode2025','record.schoolCode2026').replace('record.majorCode2025','record.majorCode2026')
    s=s.replace('record.score2025 ?? record.score','record.score2026 ?? record.score').replace('record.rank2025 ?? record.rank','record.rank2026 ?? record.rank')
    s=s.replace('item.score2025)) ? `${item.score2025} 分`','item.score2026 ?? item.score)) ? `${item.score2026 ?? item.score} 分`')
    s=s.replace('item.rank2025)) ? `位次 ${fmt(item.rank2025)}`','item.rank2026 ?? item.rank)) ? `位次 ${fmt(item.rank2026 ?? item.rank)}`')
    s=s.replace('2025最低分','2026投档最低分').replace('当前按 2025 辽宁物理类','当前按 2026 辽宁物理类')
    s=s.replace('score2025 ?? item.score','score2026 ?? item.score').replace('rank2025 ?? item.rank','rank2026 ?? item.rank')
    write(p,s)
# Explicit compare function in renderer.
s=read('ln-rank/js/feature/major-pool/render.js')
s=s.replace("const s2025 = record.score2025 ?? record.score;\n  const r2025 = record.rank2025 ?? record.rank;", "const s2026 = record.score2026 ?? record.score;\n  const r2026 = record.rank2026 ?? record.rank;\n  const s2025 = record.score2025;\n  const r2025 = record.rank2025;")
s=s.replace("const year2025 = `2025 ${fmt(s2025)}分 / ${fmt(r2025)}位`;\n  const year2024", "const year2026 = `2026 ${fmt(s2026)}分 / ${fmt(r2026)}位`;\n  const year2025 = (s2025 || r2025) ? `2025 ${fmt(s2025)}分 / ${fmt(r2025)}位` : '2025同口径待核验';\n  const year2024")
s=s.replace('return { year2025, year2024 };','return { year2026, year2025, year2024 };')
write('ln-rank/js/feature/major-pool/render.js',s)

# 7. Selection contract/store and report payload.
write('ln-rank/js/domain/selection-contract.js', """import{toHumanCopy,HUMAN_BAND_LABELS}from'./human-copy-dictionary.js?v=3951_0';
function clean(v,m=180){return toHumanCopy(String(v==null?'':v).trim()).slice(0,m)}function num(v,f=null){const n=Number(v);return Number.isFinite(n)?n:f}
function bandKey(i={}){const raw=i.poolBand?.key||i.bandKey||i.band||'',g=i.poolBand?.group||i.group||'';if(['upper','up'].includes(raw)||g==='rush')return'upper';if(['steady','safe','lower'].includes(raw)||g==='safe')return'steady';if(['near','main'].includes(raw)||g==='stable')return'near';const d=num(i.scoreDelta2026??i.scoreDelta,null);return d!=null&&d>=1?'upper':d!=null&&d>=-10?'near':'steady'}
export function normalizeSelectedMajor(item={},order=1,context={}){const k=bandKey(item),score2026=num(item.score2026??item.score),rank2026=num(item.rank2026??item.rank),scoreDelta=num(item.scoreDelta2026??item.scoreDelta??item.computedScoreDelta);return{...item,order,userOrder:order,id:clean(item.id||`${item.school||''}|${item.major||''}|2026|${item.schoolCode2026||''}|${item.majorCode2026||''}`,260),dataYear:2026,primaryYear:2026,school:clean(item.school||'学校待核验',120),major:clean(item.major||'专业待核验',180),score2026,score:score2026,rank2026,rank:rank2026,score2025:num(item.score2025),rank2025:num(item.rank2025),score2024:num(item.score2024),rank2024:num(item.rank2024),scoreDelta2026:scoreDelta,scoreDelta,bandKey:k,bandLabel:HUMAN_BAND_LABELS[k]||'主要参考',statusLabel:HUMAN_BAND_LABELS[k]||'主要参考',poolBand:{...(item.poolBand||{}),key:k,detail:HUMAN_BAND_LABELS[k]||'主要参考',group:k==='upper'?'rush':k==='near'?'stable':'safe'},sourceContext:{candidateScore:context.candidateScore??null,rankYear:2026,dataYear:2026,rangePreset:context.rangePreset||item.sourceContext?.rangePreset||'standard',activeBand:context.activeBand||k}}}
export function normalizeSelectedMajors(items=[],context={}){return(Array.isArray(items)?items:[]).map((x,i)=>normalizeSelectedMajor(x,i+1,context))}export function selectedMajorsSignature(items=[]){return normalizeSelectedMajors(items).map(x=>`${x.order}:${x.id}:${x.scoreDelta??''}`).join('|')}
""")
write('ln-rank/js/domain/report-payload-contract.js', """import{normalizeSelectedMajors}from'./selection-contract.js?v=3951_0';import{toHumanCopy,hasForbiddenVisibleText}from'./human-copy-dictionary.js?v=3951_0';
export function buildReportPayload({selectedMajors=[],candidateScore=null,candidateContext={},reportContext={},mode='list',analysis=null,warnings=[]}={}){const majors=normalizeSelectedMajors(selectedMajors,{candidateScore,rangePreset:reportContext.rangePreset,activeBand:reportContext.activeBand});return{title:'辽宁物理类专业初选参考报告',subtitle:'面向2027备考家庭；以2026专业投档数据为主要历史参考，2025、2024用于同口径对照。正式填报以2027一分一段、招生计划和志愿系统为准。',version:'v3.9.51.0',audienceYear:2027,activeDataYear:2026,rankYear:2026,candidateScore:candidateScore||candidateContext?.score||null,candidateReferenceRank2026:candidateContext?.rank||null,candidateContext,selectedMajors:majors,selectedCount:majors.length,reportMode:mode,reportContext,analysis,warnings:Array.isArray(warnings)?warnings.map(toHumanCopy):[],generatedAt:new Date().toISOString()}}
export function reportPayloadHasVisibleProblems(payload={}){return hasForbiddenVisibleText(toHumanCopy(JSON.stringify(payload)))}
""")
# selection store: new key, keep legacy migration.
s=read('ln-rank/js/feature/selection-pool/store.js')
s=s.replace("const STORAGE_KEY = 'lnRank.selectionPool.physics2025.v3933_12';", "const STORAGE_KEY = 'lnRank.selectionPool.lnPhysics.2026.v3951';")
s=s.replace("const LEGACY_STORAGE_KEYS = [", "const LEGACY_STORAGE_KEYS = ['lnRank.selectionPool.physics2025.v3933_12',")
s=s.replace('item.score2025 ?? item.score','item.score2026 ?? item.score').replace('item.rank2025 ?? item.rank','item.rank2026 ?? item.rank')
s=s.replace("`${item.school || ''}::${item.major || ''}::${score || ''}::${rank || ''}`", "`${item.school || ''}::${item.major || ''}::2026::${item.schoolCode2026 || ''}::${item.majorCode2026 || ''}`")
write('ln-rank/js/feature/selection-pool/store.js',s)

# Feishu builders and AI facts: 2026 primary, 2025/2024 retained as history.
p='functions/_lib/feishu-selection-pool-report-builder.js'
if (ROOT/p).exists():
    f=read(p)
    f=f.replace('score2025: num(item.score2025 ?? item.score, null),','score2026: num(item.score2026 ?? item.score, null),\n      rank2026: num(item.rank2026 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null),\n      score2025: num(item.score2025, null),')
    f=f.replace('rank2025: num(item.rank2025 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null),','rank2025: num(item.rank2025, null),')
    f=f.replace("function historyText(item = {}, { empty = '2024同口径参考：暂无' } = {}) {", "function historyText(item = {}, { empty = '历史同口径参考：暂无' } = {}) {")
    f=f.replace("  const has2024 = item?.historyCompare?.has2024 || item.score2024 != null || item.rank2024 != null;\n  if (!has2024) return empty;\n  const score = item.score2024 != null ? `${fmt(item.score2024)} 分` : '分数待核验';\n  const rank = item.rank2024 != null ? `${fmt(item.rank2024)} 位` : '位次待核验';\n  const trend = item?.historyCompare?.rankTrendText ? `｜${String(item.historyCompare.rankTrendText).replace(/^两年位次：前移约\s*/,'2025位次更靠前约 ').replace(/^两年位次：后移约\s*/,'2025位次更靠后约 ')}` : '';\n  return `2024同口径参考：${score} / ${rank}${trend}`;", "  const rows=[];\n  if(item.score2025!=null||item.rank2025!=null)rows.push(`2025：${item.score2025!=null?fmt(item.score2025)+' 分':'分数待核验'} / ${item.rank2025!=null?fmt(item.rank2025)+' 位':'位次待核验'}`);\n  if(item.score2024!=null||item.rank2024!=null)rows.push(`2024：${item.score2024!=null?fmt(item.score2024)+' 分':'分数待核验'} / ${item.rank2024!=null?fmt(item.rank2024)+' 位':'位次待核验'}`);\n  const trend=item?.historyCompare?.rankTrendText?`｜${item.historyCompare.rankTrendText}`:'';\n  return rows.length?rows.join('；')+trend:empty;")
    f=f.replace('item.score2025)) ? `${fmt(item.score2025)} 分`','item.score2026)) ? `${fmt(item.score2026)} 分`').replace('item.rank2025)) ? `${fmt(item.rank2025)} 位`','item.rank2026)) ? `${fmt(item.rank2026)} 位`').replace('｜2025最低分 ${score}｜2025最低位次 ${rank}','｜2026投档最低分 ${score}｜对应累计位次约 ${rank}')
    write(p,f)
p='functions/_lib/feishu-selection-pool-styled-builder.js'
if (ROOT/p).exists():
    f=read(p)
    f=f.replace('item.score2025)) ? `${fmt(item.score2025)} 分`','item.score2026 ?? item.score)) ? `${fmt(item.score2026 ?? item.score)} 分`').replace('item.rank2025)) ? `${fmt(item.rank2025)} 位`','item.rank2026 ?? item.rank)) ? `${fmt(item.rank2026 ?? item.rank)} 位`').replace('return `2025最低 ${score} / ${rank}`;','return `2026投档最低 ${score} / 对应累计位次约 ${rank}`;')
    f=f.replace("  const has2024 = item?.historyCompare?.has2024 || item.score2024 != null || item.rank2024 != null;\n  if (!has2024) return '2024同口径参考：暂无';\n  const score = item.score2024 != null ? `${formatNumber(item.score2024)} 分` : '分数待核验';\n  const rank = item.rank2024 != null ? `${formatNumber(item.rank2024)} 位` : '位次待核验';\n  return `2024同口径参考：${score} / ${rank}`;", "  const rows=[];\n  if(item.score2025!=null||item.rank2025!=null)rows.push(`2025：${item.score2025!=null?formatNumber(item.score2025)+' 分':'分数待核验'} / ${item.rank2025!=null?formatNumber(item.rank2025)+' 位':'位次待核验'}`);\n  if(item.score2024!=null||item.rank2024!=null)rows.push(`2024：${item.score2024!=null?formatNumber(item.score2024)+' 分':'分数待核验'} / ${item.rank2024!=null?formatNumber(item.rank2024)+' 位':'位次待核验'}`);\n  return rows.join('；')||'历史同口径参考：暂无';")
    write(p,f)
for pth in list((ROOT/'functions/_lib').glob('*selection*ai*facts*.js'))+list((ROOT/'functions/_lib').glob('*report*snapshot*.js')):
    x=pth.read_text(encoding='utf-8').replace('fenxi-2025-physics-current','ln-rank-2026-physics-current').replace('2025 辽宁物理类','2026 辽宁物理类')
    x=x.replace('score2025: item.score2025,','score2026: item.score2026 ?? item.score,\n    rank2026: item.rank2026 ?? item.rank,\n    score2025: item.score2025,').replace('rank2025: item.rank2025,','rank2025: item.rank2025,')
    pth.write_text(x,encoding='utf-8')

# 8. HTML copy/version/cache links.
def html_migrate(p):
    s=read(p)
    replacements={
      'data-release="v3.9.50.0"':'data-release="v3.9.51.0"','版本：v3.9.50.0':'版本：v3.9.51.0',
      '辽宁 2026 物理类专业初选参考':'辽宁 2027 物理类专业初选参考',
      '辽宁 2026 物理类专业初选':'辽宁 2027 物理类专业初选参考',
      '孩子高考分数':'模考 / 预估参考分数','孩子当前分数':'参考分数','请输入，如 666':'例如 580','如 666':'如 580',
      '当前基于辽宁 2025 年物理类历史数据进行初选参考。正式填报应以 2026 年一分一段表、招生计划、院校招生章程和辽宁志愿填报系统为准。':'当前主要依据辽宁2026年普通类本科批物理类专业投档记录和2026一分一段。2025、2024仅作同口径历史对照；正式填报应以2027年一分一段、招生计划、院校招生章程和志愿系统为准。',
      '数据口径：辽宁 2025 物理类':'数据口径：辽宁 2026 物理类专业投档',
      '2024/2025 同校同专业普通项目':'2024—2026 同校同专业同项目属性',
      '当前先用输入分数对照辽宁 2025 物理类历史记录；2026 一分一段接入后，会统一按位次/等位参考查看。':'当前按输入参考分数对照辽宁2026专业投档记录，位次只用于解释历史位置。',
      '当前先对照 2025 历史记录':'当前对照2026专业投档记录',
      '2026 一分一段接入后，统一按位次/等位参考查看':'当前已接入2026一分一段，位次用于解释历史位置',
      '?v=3949_4':'?v=3951_0','?v=3950_0':'?v=3951_0'}
    for a,b in replacements.items(): s=s.replace(a,b)
    write(p,s)
for p in ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html']:
    html_migrate(p)
# Point entry scripts to new copied entries.
for src,dst in [('ln-rank/js/app.v3949_0.js','ln-rank/js/app.v3951_0.js'),('ln-rank/js/selection-pool.v3949_0.js','ln-rank/js/selection-pool.v3951_0.js'),('ln-rank/js/local-mainline/local-mainline-app.v3949_0.js','ln-rank/js/local-mainline/local-mainline-app.v3951_0.js'),('ln-rank/js/211-mainline/211-mainline-app.v3949_0.js','ln-rank/js/211-mainline/211-mainline-app.v3951_0.js')]:
    if not (ROOT/src).exists(): continue
    e=read(src).replace('?v=3949_3','?v=3951_0').replace('?v=3949_0','?v=3951_0').replace('2025 辽宁物理类','2026 辽宁物理类').replace('2025最低分','2026投档最低分')
    e=e.replace('UNDERGRADUATE_CONTROL_SCORE = 367','UNDERGRADUATE_CONTROL_SCORE = 344').replace('SPECIAL_CONTROL_SCORE = 515','SPECIAL_CONTROL_SCORE = 508')
    e=e.replace('record.score2025 ?? record.score','record.score2026 ?? record.score').replace('record.rank2025 ?? record.rank','record.rank2026 ?? record.rank')
    e=e.replace('item.score2025)) ? `${item.score2025} 分`','item.score2026 ?? item.score)) ? `${item.score2026 ?? item.score} 分`').replace('item.rank2025)) ? `位次 ${fmt(item.rank2025)}`','item.rank2026 ?? item.rank)) ? `位次 ${fmt(item.rank2026 ?? item.rank)}`')
    if '/local-mainline/' in src or '/211-mainline/' in src:
        e=e.replace('score2025','score2026').replace('rank2025','rank2026')
    write(dst,e)
rep('ln-rank/index.html','/ln-rank/js/app.v3949_0.js?v=3951_0','/ln-rank/js/app.v3951_0.js?v=3951_0',required=False)
rep('ln-rank/selection-pool.html','/ln-rank/js/selection-pool.v3949_0.js?v=3951_0','/ln-rank/js/selection-pool.v3951_0.js?v=3951_0',required=False)
rep('ln-rank/local-mainline.html','/ln-rank/js/local-mainline/local-mainline-app.v3949_0.js?v=3951_0','/ln-rank/js/local-mainline/local-mainline-app.v3951_0.js?v=3951_0',required=False)
rep('ln-rank/211-mainline.html','/ln-rank/js/211-mainline/211-mainline-app.v3949_0.js?v=3951_0','/ln-rank/js/211-mainline/211-mainline-app.v3951_0.js?v=3951_0',required=False)

# Root and countdown current report links/storage.
for p in ['index.html','e.html']:
    s=read(p).replace('./ln2025.html','./ln2026.html').replace('./lngk.html','./lngk2026.html').replace('2025 报考观察','2026 报考观察').replace('看年度变化、冷热迁移和位次松紧','看2024—2026连续变化、最新变化和反转').replace('专业热度和历史变化','2026分数段专业投档热度观察').replace('专业难度观察','2026分数段专业投档热度观察').replace('辅助判断专业热度、报考难度和安全边界','按2026分数段查看三年投档位置变化，不代表报名人数或就业热度')
    s=s.replace('"lnRank.selectionPool.physics2025.v3933_12",','"lnRank.selectionPool.lnPhysics.2026.v3951",\n        "lnRank.selectionPool.physics2025.v3933_12",')
    write(p,s)

# Trend route current page; historical pages retained.
old=read('ln-rank/major-trend-2025.html')
new=old.replace('2025','2026').replace('2024/2026 两年','2024—2026 三年').replace('近两年','近三年').replace('更挤、哪些方向相对缓和','连续变化、最新变化和反转').replace('/ln-rank/js/major-trend-render.v3949_0.js?v=3949_4','/ln-rank/js/major-trend-render.v3949_0.js?v=3951_0').replace('v3.9.50.0','v3.9.51.0')
write('ln-rank/major-trend-2026.html',new)
# Make trend data loader current.
if (ROOT/'ln-rank/js/feature/trend/data.js').exists():
    s=read('ln-rank/js/feature/trend/data.js').replace('major-trend-2025.json','major-trend-2026.json')
    write('ln-rank/js/feature/trend/data.js',s)

# Release metadata and active assets.
meta=json.loads(read('ln-rank/release-meta.json'));meta.update({'version':VERSION,'assetVersion':ASSET,'releaseName':'v3.9.51.0-ln-rank-2026-three-year-family-analysis-12-role-no-fenxi','generatedAt':'2026-07-22T00:00:00+08:00','runtimeCacheQueryVersion':ASSET,'activeDataYear':2026,'audienceYear':2027,'threeYearAnalysis':True,'ln2026AnnualObservation':True,'lngk2026HeatObservation':True,'selectionPool2026Migration':True,'feishuThreeYearContract':True});write('ln-rank/release-meta.json',json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
if (ROOT/'ln-rank/active-assets.json').exists():
    aa=json.loads(read('ln-rank/active-assets.json'));aa['version']=VERSION;aa['assetVersion']=ASSET;aa['mainJs']='js/app.v3951_0.js';aa['selectionPoolJs']='js/selection-pool.v3951_0.js';write('ln-rank/active-assets.json',json.dumps(aa,ensure_ascii=False,indent=2)+'\n')

# Add a transparent release self-test.
write('tools/check-ln-2026-release.mjs', r"""import fs from 'node:fs';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));const t=p=>fs.readFileSync(p,'utf8');const ok=(c,m)=>{if(!c)throw new Error(m)};
const m=j('fenxi/data/ln-rank-2026/manifest.json');ok(m.dataYear===2026,'manifest year');ok(m.totalRecords===11628,'record count');ok(m.schoolCount===956,'school count');
const r=j('fenxi/data/rank_2026_physics.json');for(const [s,v] of [[700,41],[600,14235],[508,49824],[344,119069],[150,141691]])ok(r[String(s)]===v,`rank anchor ${s}`);
const pages=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln2026.html','lngk2026.html','index.html','e.html'];for(const p of pages){const x=t(p);ok(!/版本：v3\.9\.50\.0/.test(x),`${p} old footer`);if(p.startsWith('ln-rank/'))ok(x.includes('v3.9.51.0'),`${p} version`)}
ok(t('index.html').includes('./ln2026.html')&&t('index.html').includes('./lngk2026.html'),'root links');ok(t('e.html').includes('./ln2026.html')&&t('e.html').includes('./lngk2026.html'),'countdown links');
ok(!t('ln-rank/js/core/score-guard.js').includes('<400'),'no 400 guard');ok(t('functions/_lib/exam-year-config.js').includes('specialControlScore: 508')&&t('functions/_lib/exam-year-config.js').includes('undergraduateControlScore: 344'),'controls');
ok(t('functions/api/major-bands.js').includes('ln-rank-manifest.js'),'major bands data isolation');ok(t('functions/_lib/background-position-engine.js').includes('ln-rank-manifest.js'),'background data isolation');
console.log('LN 2026 release checks passed');
""")

# Search/replace residual visible active-year copy in ln-rank only (history references are allowed).
for p in (ROOT/'ln-rank').rglob('*.html'):
    if p.name=='major-trend-2025.html': continue
    s=p.read_text(encoding='utf-8').replace('版本：v3.9.50.0','版本：v3.9.51.0').replace('data-release="v3.9.50.0"','data-release="v3.9.51.0"')
    p.write_text(s,encoding='utf-8')
print('integrated LN 2026 runtime and full-site links')
