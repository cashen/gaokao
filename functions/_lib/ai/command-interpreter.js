
import { runAiProvider } from './provider-router.js';
import { BROAD_MAJOR_TERMS, MAJOR_LANGUAGE_TERMS, normalizeMajorLanguage } from './major-language-resolver.js';
import { deterministicMentorProfile, mentorCommandSchema, mentorSystemGuide, normalizeMentorProfile } from './mentor-profile.js';
import { PROVINCE_LEVEL_NAMES, REGION_OPTIONS, REGION_GROUPS, provinceRegionKey } from '../../../shared/resources/geo/china-region-catalog.v3990_3.js';
import {
  AI_AGENT_KERNEL_VERSION, AGENT_TASKS, deterministicAgentTask, explicitScoreUsage,
  validateAgentTask, taskExecutionPolicy
} from './agent-task-kernel.js';
import {looksRegionSchoolDirectoryLanguage,regionSchoolLevelFromText} from './region-school-language.js';
import {backgroundScopeFromText,collectionScopeFromText,isScoreWindow,scoreConstraintFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';

export const AI_COMMAND_INTERPRETER_VERSION='ai-command-interpreter-v3992_9';
export const AI_COMMAND_SCHEMA_VERSION='ai-semantic-agent-plan-v3992_9';

const MAJOR_TERMS=Object.freeze([...new Set([...MAJOR_LANGUAGE_TERMS,...BROAD_MAJOR_TERMS])]);
function normalizeMajorTerm(value){return normalizeMajorLanguage(value);}
const GROUP_LABELS=Object.freeze({江浙沪:'jiangzhehu',华中:'huazhong',西南:'southwest',西北:'northwest'});
const REGION_LABEL_BY_KEY=Object.freeze(Object.fromEntries(REGION_OPTIONS.map(item=>[item.key,item.label])));
const CORE_DIMENSIONS=Object.freeze(['score','region','major','school','bottomLine']);
const AI_LOCAL_SCHOOL_ALIAS_RESOURCE='/ln-rank/data/local-strength/local-strength-audit.v3971_2.json';

function clean(value,max=300){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(value=>clean(value,120)).filter(Boolean))].slice(0,max);}
function parseJsonText(text){const source=clean(text,7000);if(!source)return null;const unfenced=source.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(unfenced);}catch{}const start=unfenced.indexOf('{'),end=unfenced.lastIndexOf('}');if(start>=0&&end>start){try{return JSON.parse(unfenced.slice(start,end+1));}catch{}}return null;}
function scoreFromText(text){const constraint=scoreConstraintFromText(text);return constraint.kind==='point'?constraint.value:null;}
function scoreConstraintForTurn(text,workspace={}){const explicit=scoreConstraintFromText(text);if(explicit.explicit)return explicit;const prior=workspace?.lastTurn?.command?.scoreConstraint;const followup=workspace?.agentContext?.currentTask==='major_region_history'&&/^(?:去掉|排除|不要|不看|只看|只留|保留|改成|换成|继续|再看|展开|还有|全部|都列|往下看)/.test(String(text||'').trim());if(followup&&prior&&isScoreWindow(prior))return{...prior,explicit:false,sourceText:'inherited'};return explicit;}
function activeView(workspace={}){return workspace?.activeView&&typeof workspace.activeView==='object'?workspace.activeView:{};}
function hasMeaningfulActiveView(workspace={}){const v=activeView(workspace);return Boolean(Number(v.score)||(v.majorKeywords||[]).length||(v.schoolNames||[]).length||((v.regionKeys||[]).length&&!v.regionKeys.includes('all'))||(v.bottomLineMode&&v.bottomLineMode!=='all'));}

function majorTermPriority(term){return BROAD_MAJOR_TERMS.includes(term)?1:2;}
function majorMentions(text){
  const source=String(text||''),out=[];
  for(const term of MAJOR_TERMS){let from=0;while(from<source.length){const i=source.indexOf(term,from);if(i<0)break;const before=source.slice(Math.max(0,i-10),i),after=source.slice(i+term.length,i+term.length+10);const negative=/(不看|不要|不考虑|排除|不接受|别看|去掉|删掉|不是|不选)[^，,。！？!?；;：:\n]{0,3}$/.test(before)||/^(不看|不要|不考虑|排除|不接受|别看|去掉|删掉|算了|不要了|不选)/.test(after);const irrelevant=['数学','物理','化学','生物','英语'].includes(term)&&/^(?:成绩|基础)?(?:不错|挺好|较好|很好|强|优势|一般|较弱|不好|不太好|弱)/.test(after);out.push({term,index:i,negative,irrelevant});from=i+term.length;}}
  out.sort((a,b)=>a.index-b.index||majorTermPriority(b.term)-majorTermPriority(a.term)||b.term.length-a.term.length);
  return out.filter((item,index,list)=>!list.some((other,j)=>j!==index&&other.term.length>item.term.length&&other.index<=item.index&&other.index+other.term.length>=item.index+item.term.length));
}
function schoolMentionSpans(text,schoolNames=[],matchedAliases=[]){
  const source=String(text||''),names=unique([...(schoolNames||[]),...(matchedAliases||[])],16).sort((a,b)=>b.length-a.length),spans=[];
  for(const name of names){let from=0;while(name&&from<source.length){const index=source.indexOf(name,from);if(index<0)break;spans.push({start:index,end:index+name.length});from=index+Math.max(1,name.length);}}
  return spans;
}
function majorMentionOverlapsSchool(text,mention,schoolNames=[],matchedAliases=[]){const mentionEnd=mention.index+String(mention.term||'').length;return schoolMentionSpans(text,schoolNames,matchedAliases).some(span=>mention.index<span.end&&mentionEnd>span.start);}
function positiveMajors(text,schoolNames=[],matchedAliases=[]){return unique(majorMentions(text).filter(item=>!item.negative&&!item.irrelevant&&!majorMentionOverlapsSchool(text,item,schoolNames,matchedAliases)).map(item=>normalizeMajorTerm(item.term)),8);}
function negativeMajors(text,schoolNames=[],matchedAliases=[]){return unique(majorMentions(text).filter(item=>item.negative&&!item.irrelevant&&!majorMentionOverlapsSchool(text,item,schoolNames,matchedAliases)).map(item=>normalizeMajorTerm(item.term)),8);}
const SCHOOL_ENTITY_LEADING_ACTION=/^(?:(?:帮我只看|筛选一下|介绍一下|介绍介绍|了解一下|认识一下|我想知道|帮我比较|帮我筛|帮我看|帮我查|我想看|我想查|我想问|只看|仅看|筛选|筛一下|只留|保留|换成|改成|收窄到|收窄|缩到|留在|介绍下|介绍|讲一下|讲下|讲讲|说一下|说下|说说|聊一下|聊聊|了解下|了解|看看|看下|看一下|我问你|问你|想知道|想看|想查|想问|查下|查一下|问下|问一下|请看|请查|比较|对比|改看|换|然后|顺便|等等|等下|算了|还是|先|再|那|把|和|跟|与|就))+/;
function stripSchoolEntityLeadingAction(value,max=120){return clean(value,max).replace(SCHOOL_ENTITY_LEADING_ACTION,'').trim();}
function schoolNamesFromText(text,resolvedSchoolNames=[],matchedAliases=[]){const source=String(text||''),resolved=unique(resolvedSchoolNames||[],4),aliasSpans=schoolMentionSpans(source,[],matchedAliases),matches=[...source.matchAll(/[\u4e00-\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)],full=matches.filter(match=>!aliasSpans.some(span=>Number(match.index)<span.end&&Number(match.index)+String(match[0]||'').length>span.start&&String(match[0]||'')!==source.slice(span.start,span.end))).map(match=>{let candidate=stripSchoolEntityLeadingAction(match[0],120);const parts=candidate.split(/(?:和|跟|与|、|以及)/),tail=parts[parts.length-1]||'';if(parts.length>1&&/[\u4e00-\u9fa5]{2,30}(?:高等专科学校|专科学校|大学|学院)$/.test(tail))candidate=tail;return candidate;}).filter(candidate=>candidate&&!resolved.some(name=>candidate!==name&&candidate.endsWith(name)));return unique([...resolved,...full],4);}
function cleanSchoolAliasCandidate(value){let result=stripSchoolEntityLeadingAction(value,40).replace(/[\s，,。！？!?；;：:]+/g,'').trim();result=result.replace(/(?:学校|的|呢|吗|呀|啊|吧|都|大概|大约|一般|分别|各自)+$/g,'').trim();return result;}
function likelySchoolMentionTokens(text){
  const source=clean(text,360);
  const semanticBoundary=schoolTopicBoundaryFromText(source),fullSchoolMatches=[...source.matchAll(/[\u4e00-\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)],hasValidFullSchool=fullSchoolMatches.some(match=>semanticBoundary.index<0||Number(match.index)+String(match[0]||'').length<=semanticBoundary.index);
  if(!source||hasValidFullSchool)return[];
  const tokens=[],regionOnly=new Set(['沈阳','大连','辽宁','辽宁省','省内','省外','全国','东北','西北','西南','华中']);
  const genericRe=/(?:候选|能上|能报|筛选|志愿|方案|预算|就业|工作|读研|考研|平台|选择|取舍|平衡|咨询|建议|家长|孩子|学校|专业|公办|民办|中外|高收费|本科|分数|位次|城市)/;
  const pushCandidate=value=>{
    let candidate=cleanSchoolAliasCandidate(value,60);
    if(!candidate||candidate.length<2||candidate.length>20||regionOnly.has(candidate))return;
    if(!/[\u4e00-\u9fa5]{2,}/.test(candidate)||genericRe.test(candidate))return;
    tokens.push(candidate);
  };
  const topicRe=/(学校环境|校园环境|校园氛围|学习氛围|人文关怀|管理人性|管理严格|老师负责|辅导员|同学评价|学生评价|学生口碑|真实体验|同学体验|在校体验|学校简介|学校介绍|学校定位|办学定位|什么学校|什么来头|最低录取分|最低投档分|所有专业|全部专业|全校专业|招生专业|最低分|投档分|录取分|专业都多少分|各专业多少分|分都多少|大概都多少分|大约都多少分|都多少分|多少分|分数线|位次|排名|去年|往年|历年|能不能上|能不能报|够不够|能上吗|能报吗|怎么样|如何|咋样|呢|吗|呀|啊|吧)/g;
  const segments=source.replace(/(?:^|[^\d])\d{3}\s*分?/g,' ').split(/[，,。！？!?；;：:]/).map(value=>value.trim()).filter(Boolean);
  for(const segment of segments){
    const candidate=stripSchoolEntityLeadingAction(segment,60);
    if(!candidate)continue;
    let foundTopic=false;
    const semanticBoundary=schoolTopicBoundaryFromText(candidate);
    if(semanticBoundary.index>0){foundTopic=true;pushCandidate(candidate.slice(0,semanticBoundary.index));}
    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}
    const possessive=candidate.match(/^([\u4e00-\u9fa5]{2,20})的(?:电气|自动化|测控|机械|计算机|软件|电子|通信|材料|化工|冶金|土木|建筑|医学|法学|金融|会计|专业|强项|背景)/);
    if(possessive?.[1])pushCandidate(possessive[1]);
    if(!foundTopic)pushCandidate(candidate);
  }
  return unique(tokens,8);
}
function inferSchoolHistoryMajor(source,matchedAliases=[],resolvedSchoolNames=[]){const historyFact=/(多少分|最低(?:录取|投档)?分|录取分|投档分|分数线|位次|排名|去年|往年|历年)/.test(source)||(/202[3456]/.test(source)&&!/(招生章程|章程|录取规则|宿舍|住宿|食堂|食宿|学费|收费|校区|主管部门|学校简介|学校介绍)/.test(source));if(!historyFact||collectionScopeFromText(source).kind==='all_school_majors'||/招生.{0,6}专业/.test(source))return'';let value=String(source||'');const removals=unique([...(matchedAliases||[]),...(resolvedSchoolNames||[]),...(resolvedSchoolNames||[]).map(name=>String(name||'').replace(/(?:大学|学院)$/,''))],12).sort((a,b)=>b.length-a.length);for(const token of removals)if(token)value=value.split(token).join(' ');for(const name of value.match(/[\u4e00-\u9fa5]{2,18}?(?:大学|学院)/g)||[])value=value.replace(name,' ');value=value.replace(/(?:^|[^\d])\d{3}\s*分?/g,' ');value=value.replace(/(最低录取分|最低投档分|最低分|投档分|录取分|专业都多少分|各专业多少分|大概都多少分|大约都多少分|都多少分|分都多少|多少分|几分|什么分|分数线|位次|排名|去年|往年|历年|202[3456]|这个学校|这所学校|那个学校|那所学校|该校|刚才这个学校|刚才那所学校|我不是问|不是问|我问|问一下|问下|看看|看下|等一下|等下|等等|算了|然后|顺便|换成|换|改成|改看|再看|再|先|大概|大约|一般|分别|各自|都|多少|几名|最低|录取|投档|分数|的|呢|吗|呀|啊|吧)/g,' ');value=value.replace(/[\s，,。！？!?；;：:]+/g,'').trim();if(!value||value.length<2||value.length>24||/(能不能上|能不能报|够不够|学校|所有专业|全部专业|全校专业|招生专业|^(?:多少|几分|几名|最低|录取|投档|分数|位次|排名)$)/.test(value))return'';return normalizeMajorTerm(value);}
function resolverRowParts(row){return Array.isArray(row)?{name:clean(row[0],120),province:clean(row[1],40),city:clean(row[2],40),level:clean(row[3],20),initials:Array.isArray(row[4])?row[4].map(v=>clean(v,40).toLowerCase()):[]}:{name:clean(row?.name,120),province:clean(row?.province,40),city:clean(row?.city,40),level:clean(row?.level,20),initials:Array.isArray(row?.initialCodes)?row.initialCodes.map(v=>clean(v,40).toLowerCase()):[]};}
export function selectAiSchoolResolverRows(rows=[],queries=[],limit=220){const qs=unique(queries,4).map(q=>clean(q,20)).filter(Boolean),cap=Math.max(40,Math.min(320,Number(limit)||220));if(!qs.length)return[];const ranked=[];for(let index=0;index<(rows||[]).length;index++){const row=rows[index],parts=resolverRowParts(row);if(!parts.name||!['本科','专科'].includes(parts.level))continue;let best=0;for(const query of qs){if(/^[a-z0-9]+$/i.test(query)){const code=query.toLowerCase(),exact=parts.initials.includes(code),prefix=parts.initials.some(item=>item.startsWith(code));best=Math.max(best,exact?220:(prefix?140:0));continue;}const chars=[...new Set([...query].filter(ch=>/[\u4e00-\u9fa5]/.test(ch)))];if(!chars.length)continue;const hay=`${parts.name}|${parts.province}|${parts.city}`,hits=chars.reduce((n,ch)=>n+(hay.includes(ch)?1:0),0),coverage=hits/chars.length,prefix=[parts.name,parts.province,parts.city].some(value=>value.startsWith(query[0])),literal=parts.name.includes(query);const score=coverage*100+hits*6+(prefix?18:0)+(literal?120:0);best=Math.max(best,score);}if(best>0)ranked.push({row,score:best,index});}ranked.sort((a,b)=>b.score-a.score||a.index-b.index);return ranked.slice(0,cap).map(item=>item.row);}
const AI_SCHOOL_REGION_ABBR=Object.freeze({北京:'北',上海:'上',天津:'天',重庆:'重',河北:'冀',山西:'晋',辽宁:'辽',吉林:'吉',黑龙江:'黑',江苏:'苏',浙江:'浙',安徽:'皖',福建:'闽',江西:'赣',山东:'鲁',河南:'豫',湖北:'鄂',湖南:'湘',广东:'粤',广西:'桂',海南:'琼',四川:'川',贵州:'贵',云南:'云',陕西:'陕',甘肃:'甘',青海:'青',宁夏:'宁',新疆:'新',西藏:'藏',内蒙古:'蒙'});
function normalizeAiSchoolAlias(value){return clean(value,80).normalize('NFKC').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g,'').trim();}
function vocationalCoreShortcuts(value){const source=normalizeAiSchoolAlias(value),out=new Set([source]);for(const[from,to]of [['交通','交'],['师范','师'],['医学','医'],['医药','医药'],['电力','电'],['铁路','铁'],['铁道','铁'],['航空','航'],['财经','财'],['工业','工'],['农业','农'],['林业','林'],['建筑','建'],['机电','机电']])if(source.includes(from))out.add(source.replace(from,to));return[...out].filter(Boolean);}
export function aiSchoolSpokenAliases(row){const parts=resolverRowParts(row);if(parts.level!=='专科'||!parts.name)return[];const suffixMatch=parts.name.match(/(高等专科学校|专科学校|职业技术学院|职业学院|高等职业学校|职业技术学校)$/),suffix=suffixMatch?.[1]||'';if(!suffix)return[];const stem=parts.name.slice(0,-suffix.length),suffixes=/专科学校/.test(suffix)?['高专','专']:['职院'];const province=parts.province.replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|省|市)$/,'');const city=parts.city.replace(/(自治州|地区|盟|市)$/,'');const regions=unique([province,city],4),aliases=new Set();for(const shortSuffix of suffixes){aliases.add(`${stem.replace(/省$/,'')}${shortSuffix}`);for(const region of regions){if(!region||!stem.startsWith(region))continue;const core=stem.slice(region.length).replace(/^省/,'');for(const shortCore of vocationalCoreShortcuts(core)){aliases.add(`${region}${shortCore}${shortSuffix}`);const regionShort=AI_SCHOOL_REGION_ABBR[region];if(regionShort)aliases.add(`${regionShort}${shortCore}${shortSuffix}`);}}}return[...aliases].map(normalizeAiSchoolAlias).filter(alias=>alias.length>=3);}
export function createAiSchoolResolver(resolverModule,rows=[]){const selected=Array.isArray(rows)?rows:[],base=resolverModule?.createSchoolNameResolver?.(selected);if(!base)return null;const aliases=new Map();for(const row of selected){const name=resolverRowParts(row).name;for(const alias of aiSchoolSpokenAliases(row)){if(!aliases.has(alias))aliases.set(alias,new Set());aliases.get(alias).add(name);}}return Object.freeze({...base,resolve(query,options={}){const key=normalizeAiSchoolAlias(query),matches=aliases.get(key);if(matches?.size===1)return{status:'resolved',input:clean(query,80),resolvedName:[...matches][0],candidates:[],matchType:'ai_spoken_alias',confidence:.99};return base.resolve(query,options);}});}
async function fetchAiSchoolJson(request,env={},pathname){const base=request?.url?new URL(request.url).origin:'https://example.invalid',url=new URL(pathname,base);let response=null;if(env?.ASSETS?.fetch){try{response=await env.ASSETS.fetch(new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}}));}catch{response=null;}}if(!response||!response.ok)response=await fetch(url.toString(),{method:'GET',headers:{accept:'application/json'},cf:{cacheTtl:1800,cacheEverything:true}});if(!response.ok)throw new Error(`学校简称资源读取失败：${response.status}`);return response.json();}
function localSchoolResolverRows(payload={}){return(Array.isArray(payload?.schools)?payload.schools:[]).map(item=>[clean(item?.officialName,120),clean(item?.province,40),clean(item?.city,40),'本科',[]]).filter(row=>row[0]);}
function explicitSchoolResolverMatch(result={}){return /^(official_exact|alias_exact|initial_exact|ai_spoken_alias|entity_exact)$/.test(clean(result?.matchType,60));}
function resolveSchoolQueryDetails(resolver,queries=[],{explicitOnly=false}={}){if(typeof resolver?.resolve!=='function')return{schoolNames:[],matchedAliases:[]};for(const rawQuery of queries){const query=clean(rawQuery,40),attempts=unique([query,...Array.from({length:Math.max(0,query.length-2)},(_,i)=>query.slice(0,query.length-i-1)).filter(item=>item.length>=2)],16);for(const attempt of attempts){try{const result=resolver.resolve(attempt,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact&&(!explicitOnly||explicitSchoolResolverMatch(result)))return{schoolNames:[exact],matchedAliases:[attempt]};if(explicitOnly)continue;const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){const official=clean(candidates[0]?.officialName,120);if(official)return{schoolNames:[official],matchedAliases:[attempt]};}}catch{}}}return{schoolNames:[],matchedAliases:[]};}
function resolveSchoolQueries(resolver,queries=[]){return resolveSchoolQueryDetails(resolver,queries).schoolNames;}
async function loadAiSchoolResolver(request,env={},queries=[],resolverModule=null){const module=resolverModule||await import('../../../tongxue/data/school-name-resolver-v150.js'),payload=await fetchAiSchoolJson(request,env,module.SCHOOL_NAME_DATA_URL),rows=Array.isArray(payload?.schools)?payload.schools:[];if(rows.length<2900)throw new Error('学校简称索引不完整。');const selected=selectAiSchoolResolverRows(rows,queries,220);if(!selected.length)return null;return createAiSchoolResolver(module,selected);}
export async function resolveAiSchoolMentionsDetailed(text,contextOrResolver={}){const queries=likelySchoolMentionTokens(text);if(!queries.length)return{schoolNames:[],matchedAliases:[]};const explicitOnly=Boolean(geographyFromText(text).explicit&&positiveMajors(text).length);let resolver=contextOrResolver?.resolve?contextOrResolver:null;if(resolver)return resolveSchoolQueryDetails(resolver,queries,{explicitOnly});try{const resolverModule=await import('../../../tongxue/data/school-name-resolver-v150.js');const localPayload=await fetchAiSchoolJson(contextOrResolver?.request||null,contextOrResolver?.env||{},AI_LOCAL_SCHOOL_ALIAS_RESOURCE),localRows=localSchoolResolverRows(localPayload);if(localRows.length>=50){const localResolver=createAiSchoolResolver(resolverModule,localRows),localResolved=resolveSchoolQueryDetails(localResolver,queries,{explicitOnly});if(localResolved.schoolNames.length)return localResolved;}resolver=await loadAiSchoolResolver(contextOrResolver?.request||null,contextOrResolver?.env||{},queries,resolverModule);}catch{return{schoolNames:[],matchedAliases:[]};}return resolveSchoolQueryDetails(resolver,queries,{explicitOnly});}
export async function resolveAiSchoolMentions(text,contextOrResolver={}){return(await resolveAiSchoolMentionsDetailed(text,contextOrResolver)).schoolNames;}

function geographyFromText(text){
  const source=String(text||'').replace(/省电(?=.{0,16}(?:专业|学校|分数|多少|电气|机械电子))/g,'省内');
  const regionSource=source.replace(/[\u4e00-\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g,' ');
  if(/(全国|不限地区|地区不限|全国范围|回到全国|地区先放开|(?:沈阳|大连|省内|辽宁).{0,8}(?:先)?(?:不限制|不限定|放开|不限了))/.test(regionSource))return{keys:['all'],explicit:true,label:'全国'};
  const isNegative=(at)=>{const before=regionSource.slice(Math.max(0,at-10),at);return /(不看|不要|不考虑|排除|别看|去掉|删掉|不留).{0,3}$/.test(before);};
  const found=[];
  const startsSchoolName=(token,at)=>/^(?:工业|理工|建筑|化工|农业|药科|医科|医学|师范|科技|石油|工程|航空|航天|财经|交通|海事|海洋|外国语|民族|林业|电力|工大|理工|医大|师大|科大|航大)/.test(regionSource.slice(at+token.length,at+token.length+8));
  const add=(token,key,label)=>{let from=0,seenNegative=false;while(from<regionSource.length){const i=regionSource.indexOf(token,from);if(i<0)break;if(startsSchoolName(token,i)){from=i+token.length;continue;}if(isNegative(i))seenNegative=true;else found.push({key,label,index:i});from=i+token.length;}return seenNegative;};
  const negativeCities=[add('沈阳市','shenyang','沈阳'),add('沈阳','shenyang','沈阳'),add('大连市','dalian','大连'),add('大连','dalian','大连')].some(Boolean);
  if(/(辽宁其他|辽宁其它|除沈阳大连外的辽宁)/.test(regionSource))found.push({key:'ln-other',label:'辽宁其他',index:regionSource.search(/辽宁其他|辽宁其它|除沈阳大连外的辽宁/)});
  if(/(省内|辽宁省内|只在辽宁|只看辽宁|辽宁本地|留辽宁)/.test(regionSource))found.push({key:'ln',label:'辽宁省内',index:regionSource.search(/省内|辽宁省内|只在辽宁|只看辽宁|辽宁本地|留辽宁/)});
  if(/省外/.test(regionSource))found.push({key:'outside',label:'省外',index:regionSource.indexOf('省外')});
  for(const [label,key] of Object.entries(GROUP_LABELS)){const i=regionSource.indexOf(label);if(i>=0&&!isNegative(i)&&!startsSchoolName(label,i))found.push({key,label,index:i});}
  if(/东北三省|东北/.test(regionSource)){const i=regionSource.search(/东北三省|东北/);const token=regionSource.startsWith('东北三省',i)?'东北三省':'东北';if(!isNegative(i)&&!startsSchoolName(token,i))found.push({key:'province:辽宁',label:'辽宁',index:i},{key:'province:吉林',label:'吉林',index:i},{key:'province:黑龙江',label:'黑龙江',index:i});}
  const ordered=[...PROVINCE_LEVEL_NAMES].sort((a,b)=>b.length-a.length);
  for(const province of ordered){for(const alias of [`${province}省`,`${province}市`,province]){const i=regionSource.indexOf(alias);if(i<0||isNegative(i)||startsSchoolName(alias,i))continue;const key=provinceRegionKey(province);if(key)found.push({key,label:province,index:i});break;}}
  const uniqueFound=[];for(const item of found.sort((a,b)=>a.index-b.index)){if(!uniqueFound.some(x=>x.key===item.key))uniqueFound.push(item);}
  if(uniqueFound.length)return{keys:uniqueFound.map(x=>x.key),explicit:true,label:uniqueFound.map(x=>x.label).join('、')};
  if(negativeCities)return{keys:['all'],explicit:true,label:'全国'};
  return{keys:[],explicit:false,label:''};
}
function regionLabel(keys=[]){const vals=unique(keys,8);if(!vals.length||vals.includes('all'))return'全国';return vals.map(k=>k.startsWith('province:')?k.slice(9):(REGION_LABEL_BY_KEY[k]||k)).join('、');}
function bottomLineFromText(text){const s=String(text||'');if(/(回到全部性质|学校性质不限|性质不限|都可以看|项目性质不限|(民办).{0,8}(也可以|能接受|也接受|也能看|不排斥))/.test(s))return'all';if(/只看公办普通|只要公办普通|(?:不接受|不要|排除|取消|去掉|不看).{0,8}民办/.test(s))return'public_regular_only';if(/(?:不接受|不要|排除|取消|去掉|不看).{0,8}(中外|高收费)/.test(s))return'exclude_sino';if(/(公办优先|优先公办|尽量公办|最好公办|能公办.{0,4}公办)/.test(s))return'public_first';if(/(接受|可以).{0,8}(中外|高收费)|(中外|高收费).{0,10}(也可以|可以|能接受|接受)|公办含中外|预算.{0,8}(上浮|增加|多花|加钱).{0,12}(中外|高收费)|(?:多花点钱|加点预算|加预算).{0,12}(中外|高收费|换平台|211|985)/.test(s))return'public_include_sino';return'';}
function platformTargetFromText(text){const s=String(text||'');if(/985/.test(s))return'985';if(/211/.test(s))return'211';return'';}

function priorFocus(workspace={}){return workspace?.agentContext?.focus||{};}
const RETRYABLE_TASKS=new Set(['candidate_discovery','candidate_refinement','school_major_history','school_history','major_region_history','region_school_directory','school_research','school_official_qa','school_experience','fit_assessment','school_comparison','major_comparison','background_discovery','background_fit_discovery','school_background','major_background']);
function retryFailedLanguage(text=''){return /(?:只)?重试.{0,12}(?:失败|没完成|未完成|没查到)|(?:失败|没完成|未完成).{0,12}重试/.test(String(text||''));}
function retryContextForText(text,workspace={}){
  if(!retryFailedLanguage(text))return null;
  const task=clean(workspace?.agentContext?.currentTask,80),focus=priorFocus(workspace),view=activeView(workspace);
  if(!RETRYABLE_TASKS.has(task))return null;
  const history=workspace?.lastResult?.history,majorHistory=workspace?.lastResult?.majorHistory,failedQueries=((task==='major_region_history'?majorHistory:history)?.queryResults||[]).filter(item=>item?.status==='failed').map(item=>clean(item?.query,160)).filter(Boolean);
  let retryTask=task,schools=unique(focus.schools||[],4),majors=unique(focus.majors||[],8);
  if(task==='school_major_history'){
    schools=unique([history?.school||focus.school],1);
    majors=failedQueries.length?unique(failedQueries,8):unique([...(focus.majors||[]),focus.major],8);
    if(!majors.length)retryTask='school_history';
  }else if(task==='school_history')schools=unique([history?.school||focus.school],1);
  else if(task==='major_region_history')majors=failedQueries.length?unique(failedQueries,8):unique([focus.major,...(focus.majors||[]),...(view.majorKeywords||[])],8);
  else if(['school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(task))schools=unique([focus.school],1);
  else if(task==='major_background')majors=unique([focus.major,...(focus.majors||[])],8);
  return{agentTask:retryTask,schools,majors,failedOnly:failedQueries.length>0};
}
function resolveReferenceMajors(source,positive,workspace){
  if(positive.length)return positive;
  if(/(这个专业|该专业|刚才这个专业|刚才的专业|这个方向|该方向|专业本身)/.test(source)){
    const p=priorFocus(workspace);if(p.major)return[p.major];if((p.majors||[]).length)return[p.majors[0]];
    const active=activeView(workspace);if((active.majorKeywords||[]).length===1)return[active.majorKeywords[0]];
  }
  if(/(这些专业|这几个专业|刚才这些专业|刚才那几个专业)/.test(source)){
    const p=priorFocus(workspace);if((p.majors||[]).length)return unique(p.majors,8);
    const active=activeView(workspace);if((active.majorKeywords||[]).length)return unique(active.majorKeywords,8);
  }
  return[];
}
function resolveReferenceSchools(source,schools,workspace){
  if(schools.length)return schools;
  if(/(这个学校|这所学校|该校|刚才这个学校|刚才那所学校)/.test(source)){
    const p=priorFocus(workspace);if(p.school)return[p.school];if((p.schools||[]).length)return[p.schools[0]];
    const active=activeView(workspace);if((active.schoolNames||[]).length===1)return[active.schoolNames[0]];
  }
  return[];
}
function ordinalReference(text,workspace={}){const source=String(text||''),map={第一:0,第一个:0,第二:1,第二个:1,第三:2,第三个:2,第四:3,第四个:3,第五:4,第五个:4};let index=null;for(const [word,value] of Object.entries(map))if(source.includes(word)){index=value;break;}if(index==null)return null;const record=workspace?.lastResult?.candidates?.records?.[index]||workspace?.lastResult?.history?.records?.[index];return record?{index,id:clean(record.id,220),school:clean(record.school||record.schoolName,80),major:clean(record.major||record.majorName,120)}:{index};}

function explicitFamilyPersistence(text){return /(家庭底线|以后都|以后不|我们家不接受|孩子明确不接受|绝对不|肯定不|无论如何不|长期只考虑|预算上限|以后只看)/.test(String(text||''));}
function compareLanguage(text,majors=[]){const s=String(text||'');return /(怎么选|哪个好|哪个更|比较|对比|差别|区别|优劣|取舍|横着看|谁更)/.test(s)||(majors.length>=2&&/还是/.test(s));}
function unionLanguage(text){return /(都看看|一起看|都看|同时看|一块看|一起有哪些|都有哪些|也看看|也看一下|顺便看看|也加上|一起放进来)/.test(String(text||''));}
function correctionLanguage(text){return /(不是.{0,18}是|改成|换成|刚才说错|纠正|只留|最后留)/.test(String(text||''));}
function candidateLanguage(text){const source=String(text||'').replace(/(?:不|不能|别|不要)只看/g,'');return /(候选|筛选|筛一下|帮我筛|能报(?:哪些|什么|哪)|能上(?:哪些|什么|哪)|有哪些学校|有什么学校|先看看.{0,10}(机械|电气|自动化|专业)|只看|只留|保留|换成|改成|缩到|收窄到|留在|省内$|沈阳$|大连$)/.test(source);}
function schoolKnowledgeLanguage(text){return /(介绍(?:下|一下)?|介绍介绍|讲讲|讲一下|讲下|说说|说一下|说下|聊聊|了解(?:下|一下)?|认识一下|什么学校|什么来头|学校定位|办学定位|整体怎么样|总体怎么样|大概怎么样|这所学校|这个学校|该校)/.test(String(text||''));}
function candidateFacetFollowup(text,workspace,{majors=[],schools=[],geo={},clearMajor=false,clearSchool=false,clearRegion=false}={}){const prior=workspace?.agentContext?.currentTask||'';if(!['candidate_discovery','candidate_refinement'].includes(prior))return false;if(schools.length)return false;if(majors.length||geo?.keys?.length||clearMajor||clearSchool||clearRegion)return true;return /^(专业不限|不限专业|地区放开|不限地区)$/.test(String(text||'').trim());}
function compactEntityTurn(text,{scoreConstraint={},majors=[],schools=[],geo={},matchedAliases=[]}={}){
  const source=String(text||'').normalize('NFKC').trim();
  if(!source)return{kind:'none',explicit:false};
  const action=/(?:多少|几分|最低|投档|录取|分数|位次|排名|去年|往年|历年|介绍|讲讲|说说|聊聊|了解|怎么样|如何|咋样|比较|对比|怎么选|能上|能报|够不够|只看|只留|筛选|筛一下|保留|换成|改成|收窄|查下|查一下|看看|看下|学校环境|校园环境|宿舍|食堂|背景|优势|强项|官方|章程|方案|为什么|是什么|什么是|哪些|哪个|什么|啥|哪里|哪儿|积累|底子|特色|推荐|值得|就业|前景|课程|学什么)/.test(source);
  if(action)return{kind:'none',explicit:false};
  const compact=source.replace(/[\s，,。！？!?；;：:]/g,'').replace(/^我(?:是|考了|考|有)?/,'');
  const point=scoreConstraint?.kind==='point',noScoreConstraint=scoreConstraint?.kind==='none';
  const short=source.length<=64;
  if(point&&schools.length===1&&majors.length>=1&&short)return{kind:'score_school_major',explicit:true};
  if(point&&schools.length===1&&short)return{kind:'score_school',explicit:true};
  if(point&&!schools.length&&(majors.length||geo?.explicit)&&short)return{kind:'candidate_scope',explicit:true};
  if(point&&!schools.length&&!majors.length&&!geo?.explicit&&/^\d{3}(?:分)?(?:左右)?$/.test(compact))return{kind:'score',explicit:true};
  if(noScoreConstraint&&!schools.length&&majors.length===1&&geo?.explicit&&source.length<=40)return{kind:'region_major',explicit:true};
  if(noScoreConstraint&&!schools.length&&!majors.length&&geo?.explicit&&source.length<=20)return{kind:'region',explicit:true};
  const schoolTokens=unique([...(schools||[]),...(matchedAliases||[])],12).sort((a,b)=>String(b).length-String(a).length);
  const mentions=majorMentions(source).filter(item=>!item.negative&&!item.irrelevant&&!majorMentionOverlapsSchool(source,item,schools,matchedAliases));
  let residue=source;
  for(const token of schoolTokens)if(token)residue=residue.split(String(token)).join(' ');
  for(const mention of mentions)if(mention.term)residue=residue.split(String(mention.term)).join(' ');
  residue=residue.replace(/[\s，,。！？!?；;：:]/g,'').replace(/(?:专业|方向|学校|院校|本科)+$/g,'').trim();
  if(noScoreConstraint&&!geo?.explicit&&schools.length===1&&majors.length===1&&!residue)return{kind:'school_major',explicit:true};
  if(noScoreConstraint&&!geo?.explicit&&schools.length===1&&!majors.length&&!residue)return{kind:'school',explicit:true};
  if(noScoreConstraint&&!geo?.explicit&&!schools.length&&majors.length===1&&!residue)return{kind:'major',explicit:true};
  return{kind:'none',explicit:false};
}
function infoQuestionLanguage(text){return /(怎么样|学什么|课程|就业|工作|前景|值不值|为什么|咋样|如何|干什么|以后做什么|适不适合)/.test(String(text||''));}
function rankQuestionLanguage(text){return /(位次|排名|第几名|多少名|一分一段)/.test(String(text||''));}
function restoreLanguage(text){return /(回到|恢复|上一批|上一个结果|刚才那批|之前那批|刚才的|前面的)/.test(String(text||''));}
function clearMajorLanguage(text){return /(不限专业|专业不限|先不看专业|先不限制专业|不限定专业|专业先放开|先看所有专业)/.test(String(text||''));}
function clearSchoolLanguage(text){return /(不限学校|学校不限|先不限定学校|学校先放开)/.test(String(text||''));}
function clearRegionLanguage(text){return /(不限地区|地区不限|回到全国|全国看看|地区先放开|(?:沈阳|大连|省内|辽宁).{0,8}(?:先)?(?:不限制|不限定|放开|不限了)|(?:不看|不要|排除|去掉|删掉).{0,4}(沈阳|大连)(?:了)?$)/.test(String(text||''));}

function inheritPatch(){return{score:{op:'inherit'},region:{op:'inherit',keys:[]},major:{op:'inherit',values:[]},school:{op:'inherit',values:[]},bottomLine:{op:'inherit',value:''}};}
function deterministicPatch(source,{score,positive,negative,schools,geo,bottomLineMode,clearMajor,clearSchool,clearRegion}){
  const patch=inheritPatch();
  if(score)patch.score={op:'set',value:score};
  if(clearRegion&&!geo.explicit)patch.region={op:'clear',keys:['all']};
  else if(geo.explicit)patch.region=geo.keys.includes('all')?{op:'clear',keys:['all']}:{op:'set',keys:geo.keys};
  if(clearMajor)patch.major={op:'clear',values:[]};
  else if(negative.length&&positive.length&&correctionLanguage(source))patch.major={op:'set',values:positive};
  else if(negative.length&&!positive.length)patch.major={op:'remove',values:negative};
  else if(positive.length&&unionLanguage(source))patch.major={op:'add',values:positive};
  else if(positive.length)patch.major={op:'set',values:positive};
  if(clearSchool)patch.school={op:'clear',values:[]};else if(schools.length)patch.school={op:'set',values:schools};
  if(bottomLineMode)patch.bottomLine={op:'set',value:bottomLineMode};
  return patch;
}
function patchMutates(patch={}){return CORE_DIMENSIONS.some(k=>patch?.[k]?.op&&patch[k].op!=='inherit');}

function deriveLegacyShape(agentTask,{workspace,patch,schools,majors,score,geo,hasCompare,restore,mentorProfile,source,negative,bottomLineMode}){
  let operation='answer',target='general',relation='answer_only',persistence='turn_only',combination=unionLanguage(source)?'union':'replace';
  if(agentTask==='candidate_discovery'){operation='search';target=schools.length?'school':'candidates';relation='new_view';persistence=explicitFamilyPersistence(source)?'family':'active_view';}
  else if(agentTask==='candidate_refinement'){operation='refine';target=schools.length?'school':'candidates';relation='patch_view';persistence=explicitFamilyPersistence(source)?'family':'active_view';}
  else if(agentTask==='fact_rank_lookup'){operation='answer';target='fact';}
  else if(agentTask==='school_comparison'){operation='compare';target='school';relation='compare_objects';}
  else if(agentTask==='major_comparison'){operation='compare';target='major';relation='compare_objects';}
  else if(agentTask==='evidence_verification'){operation='verify';target=schools.length?'school':majors.length?'major':'fact';}
  else if(agentTask==='restore_view'){operation='restore';target='view';relation='restore_view';persistence='active_view';}
  else if(agentTask==='save_family'){operation='save';target='family';relation='save_persistent';persistence='family';}
  else if(agentTask==='region_school_directory'){operation='answer';target='region';relation='region_school_directory';}
  else if(['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask)){operation='answer';target='school';}
  else if(['major_region_history','major_background','background_discovery','background_fit_discovery'].includes(agentTask)){operation='answer';target='major';}
  else if(agentTask==='plan_review'){operation='answer';target='context';}
  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&mentorProfile?.enabled){operation='save';target='family';relation='save_persistent';persistence='workspace';}
  return{operation,target,relation,persistence,combination};
}

function advisoryDiscussionLanguage(text){const s=String(text||'');const decisionObjects=/(学校平台|学校层次|专业质量|专业实力|培养路径|培养方式|本科就业|继续深造|读研|就业和深造|城市机会)/.test(s),tradeoff=/(怎么平衡|如何平衡|怎么取舍|如何取舍|优先比较|怎么选|怎么看|应该更看重|哪个更重要)/.test(s);return decisionObjects&&tradeoff;}
function explicitTaskLock(source,agentTask,candidateLexical=false){
  if(['fact_rank_lookup','school_major_history','school_history','major_region_history','region_school_directory','school_research','school_official_qa','school_experience','fit_assessment','school_comparison','major_comparison','background_discovery','background_fit_discovery','school_background','major_background','evidence_verification','restore_view','plan_review','save_family'].includes(agentTask))return true;
  if(['candidate_discovery','candidate_refinement'].includes(agentTask)&&candidateLexical)return true;
  if(agentTask==='general_advice'&&advisoryDiscussionLanguage(source))return true;
  return false;
}
function explicitScoreDirective(source){return /(不考虑|不用管|先别管|别管|忽略).{0,8}(我的)?(分数|位次)|按我|按我的|我这个|我的.{0,6}(分|位次)|我\s*\d{3}\s*分?.{0,6}(够|能上|能报|现实)|按\d{3}分/.test(String(source||''));}

function deterministicBase(text,workspace={},resolvedSchoolNames=[],resolvedSchoolAliases=[],resolvedRegion=null){
  const source=clean(text,1200),retryContext=retryContextForText(source,workspace),scoreConstraint=scoreConstraintForTurn(source,workspace),score=scoreConstraint.kind==='point'?scoreConstraint.value:null,directoryQuestion=looksRegionSchoolDirectoryLanguage(source),schoolNamesFromInput=directoryQuestion&&!resolvedSchoolNames.length?[]:schoolNamesFromText(source,resolvedSchoolNames,resolvedSchoolAliases),positive0=positiveMajors(source,schoolNamesFromInput,resolvedSchoolAliases),negative=negativeMajors(source,schoolNamesFromInput,resolvedSchoolAliases),schools0=schoolNamesFromInput,geoFallback=geographyFromText(source),geo=resolvedRegion?.keys?.length?resolvedRegion:geoFallback,bottomLineMode=bottomLineFromText(source),platformTarget=platformTargetFromText(source),clearMajor=clearMajorLanguage(source),clearSchool=clearSchoolLanguage(source),clearRegion=clearRegionLanguage(source),reference=ordinalReference(source,workspace),schoolLevel=regionSchoolLevelFromText(source);
  let majors=retryContext?.majors?.length?retryContext.majors:resolveReferenceMajors(source,positive0,workspace),schools=retryContext?.schools?.length?retryContext.schools:resolveReferenceSchools(source,schools0,workspace);if(schools.length&&!majors.length&&!retryContext){const inferredMajor=inferSchoolHistoryMajor(source,resolvedSchoolAliases,schools);if(inferredMajor)majors=[inferredMajor];}
  if(reference?.school&&!schools.length&&/(第[一二三四五]|第一个|第二个|第三个|第四个|第五个)/.test(source))schools=[reference.school];
  if(reference?.major&&!majors.length&&/(第[一二三四五]|第一个|第二个|第三个|第四个|第五个)/.test(source))majors=[reference.major];
  const mentorProfile=deterministicMentorProfile(source),hasCompare=compareLanguage(source,majors),restore=restoreLanguage(source),rankIntent=Boolean(score&&rankQuestionLanguage(source)&&!schools0.length&&!positive0.length),candidateLexical=candidateLanguage(source),patch=deterministicPatch(source,{score,positive:majors,negative,schools,geo,bottomLineMode,clearMajor,clearSchool,clearRegion}),schoolKnowledge=Boolean(schools.length&&schoolKnowledgeLanguage(source)),candidateFollowup=candidateFacetFollowup(source,workspace,{majors,schools,geo,clearMajor,clearSchool,clearRegion}),entityTurn=compactEntityTurn(source,{scoreConstraint,majors,schools,geo,matchedAliases:resolvedSchoolAliases}),candidateIntent=!schoolKnowledge&&(candidateLexical||Boolean(platformTarget)||Boolean(bottomLineMode)||Boolean(score)||candidateFollowup);
  let agentTask=retryContext?.agentTask||deterministicAgentTask({text:source,schools,majors,regionKeys:geo.keys,score,workspace,candidateIntent,compareIntent:hasCompare,rankIntent,bottomLineMode,entityTurn});
  const genericCityScope=(geo.keys||[]).some(key=>String(key||'').startsWith('city:'));
  if(['candidate_discovery','candidate_refinement'].includes(agentTask)&&genericCityScope)agentTask='region_school_directory';
  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&mentorProfile?.enabled)agentTask='save_family';
  const rawScoreUsage=explicitScoreUsage(source,workspace),entityOwnScore=Boolean(score&&['score','score_school','score_school_major','candidate_scope'].includes(entityTurn.kind)),scoreUsage=['major_region_history','region_school_directory'].includes(agentTask)?'suspended':((['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery'].includes(agentTask)&&score)?'active':(agentTask==='fact_rank_lookup'&&entityTurn.kind==='score'?'active':(entityOwnScore?'active':rawScoreUsage))),taskLocked=explicitTaskLock(source,agentTask,candidateLexical||Boolean(bottomLineMode)||Boolean(platformTarget)||Boolean(score&&majors.length&&!schools.length))||entityTurn.explicit===true,scoreUsageLocked=explicitScoreDirective(source)||entityOwnScore,executionPolicy=taskExecutionPolicy(agentTask,scoreUsage),legacy=deriveLegacyShape(agentTask,{workspace,patch,schools,majors,score,geo,hasCompare,restore,mentorProfile,source,negative,bottomLineMode});
  const previousFocus=priorFocus(workspace),needsSchool=['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask),needsMajor=['school_major_history','major_region_history','fit_assessment','major_background'].includes(agentTask),preserveEntityFocus=['score','region','candidate_scope'].includes(entityTurn.kind);
  const focus={school:schools[0]||((needsSchool||preserveEntityFocus)?clean(previousFocus.school,120):''),major:majors[0]||((needsMajor||preserveEntityFocus)?clean(previousFocus.major,160):''),schools:schools.length?schools:((agentTask==='school_comparison'||preserveEntityFocus)?unique(previousFocus.schools||[],4):[]),majors:majors.length?majors:((agentTask==='major_comparison'||needsMajor||preserveEntityFocus)?unique(previousFocus.majors||[],8):[]),reference:reference||null,sourceText:source};
  const ambiguous=(/这个专业|这所学校|这个学校/.test(source)&&!focus.school&&!focus.major)||((agentTask==='school_comparison')&&schools.length<2)||((agentTask==='major_comparison')&&majors.length<2);
  const backgroundScope=backgroundScopeFromText(source),familyChanges=legacy.persistence==='family'?{regionIncludeKeys:geo.keys.filter(k=>k!=='all'),regionExcludeKeys:[],majorExcludeKeywords:negative,bottomLineMode:bottomLineMode||''}:{};
  return{
    schemaVersion:AI_COMMAND_SCHEMA_VERSION,agentKernelVersion:AI_AGENT_KERNEL_VERSION,agentTask,taskLocked,scoreUsage,scoreUsageLocked,executionPolicy,focus,
    ...legacy,score,scoreConstraint,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,regionContext:{type:geo.type||'',province:geo.province||'',city:geo.city||'',label:geo.label||'',key:geo.key||(geo.keys||[])[0]||'',inherited:geo.inherited===true},backgroundScope:backgroundScope.scope,backgroundScopeExplicit:backgroundScope.explicit,schoolLevel,transientRegionView:agentTask==='major_region_history'&&genericCityScope,scoreDeferred:agentTask==='region_school_directory'&&Boolean(score),schoolNames:schools,bottomLineMode,platformTarget,
    clearMajor,clearSchool,clearRegion,reference,entityTurn,familyChanges,negativeMajorKeywords:negative,changeSet:patch,mentorProfile,retryRequested:Boolean(retryContext),retryFailedOnly:Boolean(retryContext?.failedOnly),
    rawText:source,question:source,taskTitle:'',confidence:ambiguous?.62:.93,requiresConfirmation:Boolean(ambiguous),
    reason:ambiguous?'这句话里的“这个/那个”没有足够明确的上一轮焦点，我不想替你猜。':'',
    source:'deterministic'
  };
}

function promptMessages(text,workspace,fallback){
  const focus=workspace?.agentContext?.focus||{},recent=(workspace?.recentTurns||workspace?.turnHistory||[]).slice(-6);
  const system=[
    '你是辽宁高考家庭顾问的“任务理解层”，不是招生事实生成器。',
    `只允许 agentTask 取值：${AGENT_TASKS.join(' | ')}。`,
    '你的职责是判断家长这一句话现在在做什么，并识别“这个专业/这所学校”等是否延续上一轮焦点。',
    '事实边界：不得生成分数、位次、学校招生记录、录取概率、就业率、薪资、学费或招生计划；这些由确定性工具执行。',
    '核心筛选 changeSet 永远由本地确定性解析器决定，你不能修改它。',
    '记忆不等于执行：scoreUsage 可为 active / remembered / suspended / cleared。查学校专业历史时，已知分数通常 remembered；用户明确“别管我的分数”时 suspended；问“我这个分够吗”时 active。',
    '同一候选探索任务才继承筛选条件；任务切换到学校/专业事实查询时，不相关旧筛选不得参与执行。',
    mentorSystemGuide(),
    `mentorProfile schema: ${JSON.stringify(mentorCommandSchema())}`,
    '仅返回 JSON：{"agentTask":"...","scoreUsage":"...","requiresConfirmation":false,"reason":"","mentorProfile":{...}}。'
  ].join('\n');
  const user=JSON.stringify({text,known:{examContext:workspace?.examContext||{},activeView:workspace?.activeView||{},focus,recentTurns:recent},deterministicGuess:{agentTask:fallback.agentTask,scoreUsage:fallback.scoreUsage,focus:fallback.focus}});
  return[{role:'system',content:system},{role:'user',content:user}];
}

function normalizeModelCommand(candidate,text,workspace,fallback){
  if(!candidate||typeof candidate!=='object')return fallback;
  const proposedTask=validateAgentTask(candidate.agentTask,fallback.agentTask),agentTask=fallback.taskLocked?fallback.agentTask:proposedTask;
  const proposedScoreUsage=['active','remembered','suspended','cleared'].includes(clean(candidate.scoreUsage,30))?clean(candidate.scoreUsage,30):fallback.scoreUsage,scoreUsage=fallback.scoreUsageLocked?fallback.scoreUsage:proposedScoreUsage;
  const executionPolicy=taskExecutionPolicy(agentTask,scoreUsage),legacy=deriveLegacyShape(agentTask,{workspace,patch:fallback.changeSet,schools:fallback.schoolNames,majors:fallback.majorKeywords,score:fallback.score,geo:{keys:fallback.regionKeys},hasCompare:agentTask.includes('comparison'),restore:agentTask==='restore_view',mentorProfile:fallback.mentorProfile,source:text,negative:fallback.negativeMajorKeywords,bottomLineMode:fallback.bottomLineMode});
  const command={...fallback,...legacy,agentTask,scoreUsage,executionPolicy,source:'ai-assisted',confidence:Math.max(0,Math.min(1,Number(candidate.confidence??fallback.confidence))),requiresConfirmation:Boolean(candidate.requiresConfirmation),reason:clean(candidate.reason,300)||fallback.reason};
  command.changeSet=fallback.changeSet;command.score=fallback.score;command.regionKeys=fallback.regionKeys;command.regionLabel=fallback.regionLabel;command.majorKeywords=fallback.majorKeywords;command.schoolNames=fallback.schoolNames;command.bottomLineMode=fallback.bottomLineMode;command.platformTarget=fallback.platformTarget;command.clearMajor=fallback.clearMajor;command.clearSchool=fallback.clearSchool;command.negativeMajorKeywords=fallback.negativeMajorKeywords;command.familyChanges=fallback.familyChanges;command.combination=fallback.combination;command.focus=fallback.focus;command.backgroundScope=fallback.backgroundScope;command.backgroundScopeExplicit=fallback.backgroundScopeExplicit;
  command.mentorProfile=normalizeMentorProfile(candidate.mentorProfile||{},fallback.mentorProfile||{},text);
  if(['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask)&&!command.focus.school){command.requiresConfirmation=true;command.reason='这轮需要明确一所学校，我没有足够可靠的上一轮学校焦点。';}
  if(['school_major_history','major_region_history','fit_assessment','major_background'].includes(agentTask)&&!command.focus.major){command.requiresConfirmation=true;command.reason='这轮需要明确一个专业/方向，我没有足够可靠的上一轮专业焦点。';}
  return command;
}

export function deterministicCommand(text,workspace={},resolvedSchoolNames=[],resolvedSchoolAliases=[]){return deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchoolAliases);}

export function shouldShortCircuitAiProvider(command={}){return Boolean(command?.taskLocked&&!command?.requiresConfirmation&&Number(command?.confidence||0)>=.9);}
export async function deterministicResolvedCommand(text,workspace={},env={},request=null){
  const directoryQuestion=looksRegionSchoolDirectoryLanguage(text);
  let resolvedRegion=null;
  if(directoryQuestion||positiveMajors(text).length||workspace?.agentContext?.currentTask==='region_school_directory'){try{const resource=await import('./school-directory-resource.js');resolvedRegion=await resource.resolveSchoolDirectoryRegion({request,env},text,workspace);}catch{resolvedRegion=null;}}
  const resolvedSchool=directoryQuestion&&resolvedRegion?.key?{schoolNames:[],matchedAliases:[]}:await resolveAiSchoolMentionsDetailed(text,{request,env});
  return deterministicBase(text,workspace,resolvedSchool.schoolNames,resolvedSchool.matchedAliases,resolvedRegion);
}
export async function interpretAiCommand(text,workspace={},env={},request=null){
  const fallback=await deterministicResolvedCommand(text,workspace,env,request);
  if(shouldShortCircuitAiProvider(fallback))return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[],skipped:true,skipReason:'high-confidence-task-locked'}};
  if(fallback.agentTask==='fact_rank_lookup'&&fallback.score&&!fallback.mentorProfile?.enabled)return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[]}};
  const provider=await runAiProvider(env,promptMessages(text,workspace,fallback),{maxTokens:650,reasoningEffort:'low'});
  if(!provider.ok)return{command:fallback,provider};
  const parsed=parseJsonText(provider.text);
  return{command:normalizeModelCommand(parsed,text,workspace,fallback),provider};
}
