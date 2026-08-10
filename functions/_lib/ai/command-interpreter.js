
import { runAiProvider } from './provider-router.js';
import { deterministicMentorProfile, mentorCommandSchema, mentorSystemGuide, normalizeMentorProfile } from './mentor-profile.js';
import { PROVINCE_LEVEL_NAMES, REGION_OPTIONS, REGION_GROUPS, provinceRegionKey } from '../../../shared/resources/geo/china-region-catalog.v3990_1.js';
import { createSchoolNameResolver, SCHOOL_NAME_DATA_URL } from '../../../tongxue/data/school-name-resolver-v150.js';
import {
  AI_AGENT_KERNEL_VERSION, AGENT_TASKS, deterministicAgentTask, explicitScoreUsage,
  validateAgentTask, taskExecutionPolicy
} from './agent-task-kernel.js';

export const AI_COMMAND_INTERPRETER_VERSION='ai-command-interpreter-v3992_0';
export const AI_COMMAND_SCHEMA_VERSION='ai-semantic-agent-plan-v3992_0';

const MAJOR_TERMS=Object.freeze(['计算机','软件工程','软件','数据科学','人工智能','电子信息','电气','自动化','通信','机械','能源','石油','化工','材料','冶金','土木','建筑','医学','临床医学','口腔医学','药学','护理','法学','师范','数学','物理','化学','生物','会计','金融','经济','工商管理','新闻','中文','外语','英语','农学','动物医学','食品']);
const GROUP_LABELS=Object.freeze({江浙沪:'jiangzhehu',华中:'huazhong',西南:'southwest',西北:'northwest'});
const REGION_LABEL_BY_KEY=Object.freeze(Object.fromEntries(REGION_OPTIONS.map(item=>[item.key,item.label])));
const CORE_DIMENSIONS=Object.freeze(['score','region','major','school','bottomLine']);

function clean(value,max=300){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(value=>clean(value,120)).filter(Boolean))].slice(0,max);}
function parseJsonText(text){const source=clean(text,7000);if(!source)return null;const unfenced=source.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(unfenced);}catch{}const start=unfenced.indexOf('{'),end=unfenced.lastIndexOf('}');if(start>=0&&end>start){try{return JSON.parse(unfenced.slice(start,end+1));}catch{}}return null;}
function scoreFromText(text){const m=String(text||'').match(/(?:^|[^\d])(\d{3})(?:\s*分)?(?:[^\d]|$)/),score=Number(m?.[1]);return Number.isFinite(score)&&score>=150&&score<=750?score:null;}
function activeView(workspace={}){return workspace?.activeView&&typeof workspace.activeView==='object'?workspace.activeView:{};}
function hasMeaningfulActiveView(workspace={}){const v=activeView(workspace);return Boolean(Number(v.score)||(v.majorKeywords||[]).length||(v.schoolNames||[]).length||((v.regionKeys||[]).length&&!v.regionKeys.includes('all'))||(v.bottomLineMode&&v.bottomLineMode!=='all'));}

function majorMentions(text){
  const source=String(text||''),out=[];
  for(const term of MAJOR_TERMS){let from=0;while(from<source.length){const i=source.indexOf(term,from);if(i<0)break;const before=source.slice(Math.max(0,i-10),i),after=source.slice(i+term.length,i+term.length+10);const negative=/(不看|不要|不考虑|排除|不接受|别看|去掉|删掉|不是|不选).{0,3}$/.test(before)||/^(不看|不要|不考虑|排除|不接受|别看|去掉|删掉|算了|不要了|不选)/.test(after);out.push({term,index:i,negative});from=i+term.length;}}
  out.sort((a,b)=>a.index-b.index||b.term.length-a.term.length);
  return out.filter((item,index,list)=>!list.some((other,j)=>j!==index&&other.index===item.index&&other.term.length>item.term.length&&other.term.includes(item.term)));
}
function positiveMajors(text){return unique(majorMentions(text).filter(x=>!x.negative).map(x=>x.term),8);}
function negativeMajors(text){return unique(majorMentions(text).filter(x=>x.negative).map(x=>x.term),8);}
function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),matches=source.match(/[\u4e00-\u9fa5]{2,18}?(?:大学|学院)/g)||[],full=matches.map(v=>v.replace(/^(比较|对比|看看|再看|想问|帮我看|帮我比较|把|那|和|跟|与|就|先|还是)/,'').trim());return unique([...(resolvedSchoolNames||[]),...full],4);}
function likelySchoolMentionTokens(text){const source=clean(text,360);if(!source||/[\u4e00-\u9fa5]{2,18}?(?:大学|学院)/.test(source))return[];const tokens=[];const possessive=source.match(/(?:^|[，,。！？!?；;\s])([^，,。！？!?；;\s的]{2,12})的(?:电气|自动化|机械|计算机|软件|电子|通信|材料|化工|冶金|土木|建筑|医学|法学|金融|会计|专业|强项|背景)/);if(possessive?.[1])tokens.push(possessive[1]);let reduced=source.replace(/(?:^|[^\d])\d{3}\s*分?/g,' ');for(const term of [...MAJOR_TERMS].sort((a,b)=>b.length-a.length))reduced=reduced.split(term).join(' ');reduced=reduced.replace(/(所有专业|全部专业|全校专业|招生专业|最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|历史分数|历年分数|有证据的强项方向|强项方向|背景证据|学校背景|专业背景|强项|怎么样|如何|咋样|能不能上|能不能报|够不够|够吗|呢|吗|呀|啊|吧)/g,' ');reduced=reduced.replace(/^(那|再|还是|然后|顺便|看看|看下|看一下|帮我看|帮我查|我想看|想看|查下|查一下|请看|请查)+/,'').replace(/(的|呢|吗|呀|啊|吧)+$/g,'').replace(/[\s，,。！？!?；;：:]+/g,'').trim();const decisionNoise=/(?:省内|省外|全国|地区|范围|辽宁|沈阳|大连|新疆|西藏|公办|民办|中外|高收费|学校|专业|候选|能上|能报|预算|就业|工作|读研|考研|本科|平台|层次|机会|选择|取舍|平衡|志愿|方案|分数|位次|录取|城市|老师|家长|孩子|咨询|建议|怎么|如何|为什么|哪个|比较|对比)/.test(reduced);const directSource=source.replace(/[\s，,。！？!?；;：:]+/g,'').replace(/^(那|再|还是|然后|顺便|看看|看下|看一下|帮我看|帮我查|我想看|想看|查下|查一下|请看|请查)+/,'').replace(/(呢|吗|呀|啊|吧|怎么样|如何|咋样)+$/g,'');const directLike=directSource.includes(reduced)&&directSource.length<=10;if(reduced.length>=2&&reduced.length<=6&&!decisionNoise&&directLike)tokens.push(reduced);return unique(tokens,4);}
function resolverRowParts(row){return Array.isArray(row)?{name:clean(row[0],120),province:clean(row[1],40),city:clean(row[2],40),level:clean(row[3],20),initials:Array.isArray(row[4])?row[4].map(v=>clean(v,40).toLowerCase()):[]}:{name:clean(row?.name,120),province:clean(row?.province,40),city:clean(row?.city,40),level:clean(row?.level,20),initials:Array.isArray(row?.initialCodes)?row.initialCodes.map(v=>clean(v,40).toLowerCase()):[]};}
export function selectAiSchoolResolverRows(rows=[],queries=[],limit=220){const qs=unique(queries,4).map(q=>clean(q,20)).filter(Boolean),cap=Math.max(40,Math.min(320,Number(limit)||220));if(!qs.length)return[];const ranked=[];for(let index=0;index<(rows||[]).length;index++){const row=rows[index],parts=resolverRowParts(row);if(!parts.name||parts.level!=='本科')continue;let best=0;for(const query of qs){if(/^[a-z0-9]+$/i.test(query)){const code=query.toLowerCase(),exact=parts.initials.includes(code),prefix=parts.initials.some(item=>item.startsWith(code));best=Math.max(best,exact?220:(prefix?140:0));continue;}const chars=[...new Set([...query].filter(ch=>/[\u4e00-\u9fa5]/.test(ch)))];if(!chars.length)continue;const hay=`${parts.name}|${parts.province}|${parts.city}`,hits=chars.reduce((n,ch)=>n+(hay.includes(ch)?1:0),0),coverage=hits/chars.length,prefix=[parts.name,parts.province,parts.city].some(value=>value.startsWith(query[0])),literal=parts.name.includes(query);const score=coverage*100+hits*6+(prefix?18:0)+(literal?120:0);best=Math.max(best,score);}if(best>0)ranked.push({row,score:best,index});}ranked.sort((a,b)=>b.score-a.score||a.index-b.index);return ranked.slice(0,cap).map(item=>item.row);}
async function loadAiSchoolResolver(request,env={},queries=[]){const base=request?.url?new URL(request.url).origin:'https://example.invalid',url=new URL(SCHOOL_NAME_DATA_URL,base);let response=null;if(env?.ASSETS?.fetch)response=await env.ASSETS.fetch(new Request(url.toString(),{method:'GET'}));if(!response||!response.ok)response=await fetch(url.toString(),{method:'GET',cf:{cacheTtl:1800,cacheEverything:true}});if(!response.ok)throw new Error(`学校简称索引读取失败：${response.status}`);const payload=await response.json(),rows=Array.isArray(payload?.schools)?payload.schools:[];if(rows.length<2900)throw new Error('学校简称索引不完整。');const selected=selectAiSchoolResolverRows(rows,queries,220);if(!selected.length)return null;return createSchoolNameResolver(selected);}
export async function resolveAiSchoolMentions(text,contextOrResolver={}){const queries=likelySchoolMentionTokens(text);if(!queries.length)return[];let resolver=contextOrResolver?.resolve?contextOrResolver:null;if(!resolver){try{resolver=await loadAiSchoolResolver(contextOrResolver?.request||null,contextOrResolver?.env||{},queries);}catch{return[];}}if(typeof resolver?.resolve!=='function')return[];const resolved=[];for(const query of queries){try{const result=resolver.resolve(query,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName,120));break;}}catch{}}return unique(resolved,4);}

function geographyFromText(text){
  const source=String(text||'');
  const regionSource=source.replace(/[\u4e00-\u9fa5]{2,18}?(?:大学|学院)/g,' ');
  if(/(全国|不限地区|地区不限|全国范围|回到全国|地区先放开|(?:沈阳|大连|省内|辽宁).{0,8}(?:先)?(?:不限制|不限定|放开|不限了))/.test(regionSource))return{keys:['all'],explicit:true,label:'全国'};
  const isNegative=(at)=>{const before=regionSource.slice(Math.max(0,at-10),at);return /(不看|不要|不考虑|排除|别看|去掉|删掉|不留).{0,3}$/.test(before);};
  const found=[];
  const add=(token,key,label)=>{let from=0,seenNegative=false;while(from<regionSource.length){const i=regionSource.indexOf(token,from);if(i<0)break;if(isNegative(i))seenNegative=true;else found.push({key,label,index:i});from=i+token.length;}return seenNegative;};
  const negativeCities=[add('沈阳市','shenyang','沈阳'),add('沈阳','shenyang','沈阳'),add('大连市','dalian','大连'),add('大连','dalian','大连')].some(Boolean);
  if(/(辽宁其他|辽宁其它|除沈阳大连外的辽宁)/.test(regionSource))found.push({key:'ln-other',label:'辽宁其他',index:regionSource.search(/辽宁其他|辽宁其它|除沈阳大连外的辽宁/)});
  if(/(省内|辽宁省内|只在辽宁|只看辽宁|辽宁本地|留辽宁)/.test(regionSource))found.push({key:'ln',label:'辽宁省内',index:regionSource.search(/省内|辽宁省内|只在辽宁|只看辽宁|辽宁本地|留辽宁/)});
  if(/省外/.test(regionSource))found.push({key:'outside',label:'省外',index:regionSource.indexOf('省外')});
  for(const [label,key] of Object.entries(GROUP_LABELS)){const i=regionSource.indexOf(label);if(i>=0&&!isNegative(i))found.push({key,label,index:i});}
  if(/东北三省|东北/.test(regionSource)){const i=regionSource.search(/东北三省|东北/);if(!isNegative(i))found.push({key:'province:辽宁',label:'辽宁',index:i},{key:'province:吉林',label:'吉林',index:i},{key:'province:黑龙江',label:'黑龙江',index:i});}
  const ordered=[...PROVINCE_LEVEL_NAMES].sort((a,b)=>b.length-a.length);
  for(const province of ordered){for(const alias of [`${province}省`,`${province}市`,province]){const i=regionSource.indexOf(alias);if(i<0||isNegative(i))continue;const key=provinceRegionKey(province);if(key)found.push({key,label:province,index:i});break;}}
  const uniqueFound=[];for(const item of found.sort((a,b)=>a.index-b.index)){if(!uniqueFound.some(x=>x.key===item.key))uniqueFound.push(item);}
  if(uniqueFound.length)return{keys:uniqueFound.map(x=>x.key),explicit:true,label:uniqueFound.map(x=>x.label).join('、')};
  if(negativeCities)return{keys:['all'],explicit:true,label:'全国'};
  return{keys:[],explicit:false,label:''};
}
function regionLabel(keys=[]){const vals=unique(keys,8);if(!vals.length||vals.includes('all'))return'全国';return vals.map(k=>k.startsWith('province:')?k.slice(9):(REGION_LABEL_BY_KEY[k]||k)).join('、');}
function bottomLineFromText(text){const s=String(text||'');if(/(回到全部性质|学校性质不限|性质不限|都可以看|项目性质不限|(民办).{0,8}(也可以|能接受|也接受|也能看|不排斥))/.test(s))return'all';if(/(不接受|不要|排除).{0,8}(中外|高收费|民办)|只看公办普通|只要公办普通/.test(s))return'public_regular_only';if(/(公办优先|优先公办|尽量公办|最好公办|能公办.{0,4}公办)/.test(s))return'public_first';if(/(接受|可以).{0,8}(中外|高收费)|(中外|高收费).{0,10}(也可以|可以|能接受|接受)|公办含中外|预算.{0,8}(上浮|增加|多花|加钱).{0,12}(中外|高收费)|(?:多花点钱|加点预算|加预算).{0,12}(中外|高收费|换平台|211|985)/.test(s))return'public_include_sino';return'';}
function platformTargetFromText(text){const s=String(text||'');if(/985/.test(s))return'985';if(/211/.test(s))return'211';return'';}

function priorFocus(workspace={}){return workspace?.agentContext?.focus||{};}
function resolveReferenceMajors(source,positive,workspace){
  if(positive.length)return positive;
  if(/(这个专业|该专业|刚才这个专业|刚才的专业|这个方向|该方向|专业本身)/.test(source)){
    const p=priorFocus(workspace);if(p.major)return[p.major];if((p.majors||[]).length)return[p.majors[0]];
    const active=activeView(workspace);if((active.majorKeywords||[]).length===1)return[active.majorKeywords[0]];
  }
  if(/(这些专业|这几个专业|刚才这些专业|刚才那几个专业)/.test(source)){
    const p=priorFocus(workspace);if((p.majors||[]).length)return unique(p.majors,6);
    const active=activeView(workspace);if((active.majorKeywords||[]).length)return unique(active.majorKeywords,6);
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
function candidateLanguage(text){const source=String(text||'').replace(/(?:不|不能|别|不要)只看/g,'');return /(候选|能报哪些|能上哪些|有哪些学校|有什么学校|先看看.{0,10}(机械|电气|自动化|专业)|只看|缩到|收窄到|留在|省内$|沈阳$|大连$)/.test(source);}
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
  else if(['school_major_history','school_history','fit_assessment','school_background'].includes(agentTask)){operation='answer';target='school';}
  else if(['major_background','background_discovery','background_fit_discovery'].includes(agentTask)){operation='answer';target='major';}
  else if(agentTask==='plan_review'){operation='answer';target='context';}
  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&mentorProfile?.enabled){operation='save';target='family';relation='save_persistent';persistence='workspace';}
  return{operation,target,relation,persistence,combination};
}

function advisoryDiscussionLanguage(text){const s=String(text||'');const decisionObjects=/(学校平台|学校层次|专业质量|专业实力|培养路径|培养方式|本科就业|继续深造|读研|就业和深造|城市机会)/.test(s),tradeoff=/(怎么平衡|如何平衡|怎么取舍|如何取舍|优先比较|怎么选|怎么看|应该更看重|哪个更重要)/.test(s);return decisionObjects&&tradeoff;}
function explicitTaskLock(source,agentTask,candidateLexical=false){
  if(['fact_rank_lookup','school_major_history','school_history','fit_assessment','school_comparison','major_comparison','background_discovery','background_fit_discovery','school_background','major_background','evidence_verification','restore_view','plan_review','save_family'].includes(agentTask))return true;
  if(['candidate_discovery','candidate_refinement'].includes(agentTask)&&candidateLexical)return true;
  if(agentTask==='general_advice'&&advisoryDiscussionLanguage(source))return true;
  return false;
}
function explicitScoreDirective(source){return /(不考虑|不用管|先别管|别管|忽略).{0,8}(我的)?(分数|位次)|按我|按我的|我这个|我的.{0,6}(分|位次)|我\s*\d{3}\s*分?.{0,6}(够|能上|能报|现实)|按\d{3}分/.test(String(source||''));}

function deterministicBase(text,workspace={},resolvedSchoolNames=[]){
  const source=clean(text,1200),score=scoreFromText(source),positive0=positiveMajors(source),negative=negativeMajors(source),schools0=schoolNamesFromText(source,resolvedSchoolNames),geo=geographyFromText(source),bottomLineMode=bottomLineFromText(source),platformTarget=platformTargetFromText(source),clearMajor=clearMajorLanguage(source),clearSchool=clearSchoolLanguage(source),clearRegion=clearRegionLanguage(source),reference=ordinalReference(source,workspace);
  let majors=resolveReferenceMajors(source,positive0,workspace),schools=resolveReferenceSchools(source,schools0,workspace);
  if(reference?.school&&!schools.length&&/(第[一二三四五]|第一个|第二个|第三个|第四个|第五个)/.test(source))schools=[reference.school];
  if(reference?.major&&!majors.length&&/(第[一二三四五]|第一个|第二个|第三个|第四个|第五个)/.test(source))majors=[reference.major];
  const mentorProfile=deterministicMentorProfile(source),hasCompare=compareLanguage(source,majors),restore=restoreLanguage(source),rankIntent=Boolean(score&&rankQuestionLanguage(source)&&!schools0.length&&!positive0.length),candidateLexical=candidateLanguage(source),candidateIntent=candidateLexical||Boolean(platformTarget)||patchMutates(deterministicPatch(source,{score,positive:majors,negative,schools,geo,bottomLineMode,clearMajor,clearSchool,clearRegion})),patch=deterministicPatch(source,{score,positive:majors,negative,schools,geo,bottomLineMode,clearMajor,clearSchool,clearRegion});
  let agentTask=deterministicAgentTask({text:source,schools,majors,regionKeys:geo.keys,score,workspace,candidateIntent,compareIntent:hasCompare,rankIntent});
  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&mentorProfile?.enabled)agentTask='save_family';
  const rawScoreUsage=explicitScoreUsage(source,workspace),scoreUsage=(['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery','fact_rank_lookup'].includes(agentTask)&&score)?'active':rawScoreUsage,taskLocked=explicitTaskLock(source,agentTask,candidateLexical||Boolean(bottomLineMode)||Boolean(platformTarget)||Boolean(score&&majors.length&&!schools.length)),scoreUsageLocked=explicitScoreDirective(source)||Boolean(score&&['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery','fact_rank_lookup'].includes(agentTask)),executionPolicy=taskExecutionPolicy(agentTask,scoreUsage),legacy=deriveLegacyShape(agentTask,{workspace,patch,schools,majors,score,geo,hasCompare,restore,mentorProfile,source,negative,bottomLineMode});
  const previousFocus=priorFocus(workspace),needsSchool=['school_major_history','school_history','fit_assessment','school_background'].includes(agentTask),needsMajor=['school_major_history','fit_assessment','major_background'].includes(agentTask);
  const focus={school:schools[0]||(needsSchool?clean(previousFocus.school,120):''),major:majors[0]||(needsMajor?clean(previousFocus.major,160):''),schools:schools.length?schools:((agentTask==='school_comparison')?unique(previousFocus.schools||[],4):[]),majors:majors.length?majors:((agentTask==='major_comparison'||needsMajor)?unique(previousFocus.majors||[],6):[]),reference:reference||null,sourceText:source};
  const ambiguous=(/这个专业|这所学校|这个学校/.test(source)&&!focus.school&&!focus.major)||((agentTask==='school_comparison')&&schools.length<2)||((agentTask==='major_comparison')&&majors.length<2);
  const familyChanges=legacy.persistence==='family'?{regionIncludeKeys:geo.keys.filter(k=>k!=='all'),regionExcludeKeys:[],majorExcludeKeywords:negative,bottomLineMode:bottomLineMode||''}:{};
  return{
    schemaVersion:AI_COMMAND_SCHEMA_VERSION,agentKernelVersion:AI_AGENT_KERNEL_VERSION,agentTask,taskLocked,scoreUsage,scoreUsageLocked,executionPolicy,focus,
    ...legacy,score,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,schoolNames:schools,bottomLineMode,platformTarget,
    clearMajor,clearSchool,clearRegion,reference,familyChanges,negativeMajorKeywords:negative,changeSet:patch,mentorProfile,
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
  command.changeSet=fallback.changeSet;command.score=fallback.score;command.regionKeys=fallback.regionKeys;command.regionLabel=fallback.regionLabel;command.majorKeywords=fallback.majorKeywords;command.schoolNames=fallback.schoolNames;command.bottomLineMode=fallback.bottomLineMode;command.platformTarget=fallback.platformTarget;command.clearMajor=fallback.clearMajor;command.clearSchool=fallback.clearSchool;command.negativeMajorKeywords=fallback.negativeMajorKeywords;command.familyChanges=fallback.familyChanges;command.combination=fallback.combination;command.focus=fallback.focus;
  command.mentorProfile=normalizeMentorProfile(candidate.mentorProfile||{},fallback.mentorProfile||{},text);
  if(['school_major_history','school_history','fit_assessment','school_background'].includes(agentTask)&&!command.focus.school){command.requiresConfirmation=true;command.reason='这轮需要明确一所学校，我没有足够可靠的上一轮学校焦点。';}
  if(['school_major_history','fit_assessment','major_background'].includes(agentTask)&&!command.focus.major){command.requiresConfirmation=true;command.reason='这轮需要明确一个专业/方向，我没有足够可靠的上一轮专业焦点。';}
  return command;
}

export function deterministicCommand(text,workspace={},resolvedSchoolNames=[]){return deterministicBase(text,workspace,resolvedSchoolNames);}

export function shouldShortCircuitAiProvider(command={}){return Boolean(command?.taskLocked&&!command?.requiresConfirmation&&Number(command?.confidence||0)>=.9);}
export async function interpretAiCommand(text,workspace={},env={},request=null){
  const resolvedSchoolNames=await resolveAiSchoolMentions(text,{request,env});
  const fallback=deterministicBase(text,workspace,resolvedSchoolNames);
  if(shouldShortCircuitAiProvider(fallback))return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[],skipped:true,skipReason:'high-confidence-task-locked'}};
  if(fallback.agentTask==='fact_rank_lookup'&&fallback.score&&!fallback.mentorProfile?.enabled)return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[]}};
  const provider=await runAiProvider(env,promptMessages(text,workspace,fallback),{maxTokens:650,reasoningEffort:'low'});
  if(!provider.ok)return{command:fallback,provider};
  const parsed=parseJsonText(provider.text);
  return{command:normalizeModelCommand(parsed,text,workspace,fallback),provider};
}
