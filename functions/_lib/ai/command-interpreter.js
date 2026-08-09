import { runAiProvider } from './provider-router.js';
import { deterministicMentorProfile, mentorCommandSchema, mentorSystemGuide, normalizeMentorProfile } from './mentor-profile.js';
import { PROVINCE_LEVEL_NAMES, REGION_OPTIONS, REGION_GROUPS, provinceRegionKey } from '../../../shared/resources/geo/china-region-catalog.v3990_1.js';

export const AI_COMMAND_INTERPRETER_VERSION = 'ai-command-interpreter-v3991_0';
export const AI_COMMAND_SCHEMA_VERSION = 'ai-semantic-patch-v3991_0';

const MAJOR_TERMS=Object.freeze(['计算机','软件工程','软件','数据科学','人工智能','电子信息','电气','自动化','通信','机械','能源','石油','化工','材料','土木','建筑','医学','临床医学','口腔医学','药学','护理','法学','师范','数学','物理','化学','生物','会计','金融','经济','工商管理','新闻','中文','外语','英语','农学','动物医学','食品']);
const GROUP_LABELS=Object.freeze({江浙沪:'jiangzhehu',华中:'huazhong',西南:'southwest',西北:'northwest'});
const REGION_LABEL_BY_KEY=Object.freeze(Object.fromEntries(REGION_OPTIONS.map(item=>[item.key,item.label])));
const CORE_DIMENSIONS=Object.freeze(['score','region','major','school','bottomLine']);

function clean(value,max=300){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(value=>clean(value,120)).filter(Boolean))].slice(0,max);}
function parseJsonText(text){const source=clean(text,7000);if(!source)return null;const unfenced=source.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(unfenced);}catch{}const start=unfenced.indexOf('{'),end=unfenced.lastIndexOf('}');if(start>=0&&end>start){try{return JSON.parse(unfenced.slice(start,end+1));}catch{}}return null;}
function scoreFromText(text){const match=String(text||'').match(/(?:^|[^\d])(\d{3})(?:\s*分)?(?:[^\d]|$)/);const score=Number(match?.[1]);return Number.isFinite(score)&&score>=150&&score<=750?score:null;}
function activeView(workspace={}){return workspace?.activeView&&typeof workspace.activeView==='object'?workspace.activeView:{};}
function hasMeaningfulActiveView(workspace={}){const view=activeView(workspace);return Boolean(Number(view.score)||(view.majorKeywords||[]).length||(view.schoolNames||[]).length||((view.regionKeys||[]).length&&!view.regionKeys.includes('all'))||(view.bottomLineMode&&view.bottomLineMode!=='all'));}

function majorMentions(text){
  const source=String(text||''),mentions=[];
  for(const term of MAJOR_TERMS){let from=0;while(from<source.length){const index=source.indexOf(term,from);if(index<0)break;const before=source.slice(Math.max(0,index-10),index),after=source.slice(index+term.length,index+term.length+10);const negative=/(不看|不要|不考虑|排除|不接受|别看|去掉|删掉|不是|不选).{0,3}$/.test(before)||/^(不看|不要|不考虑|排除|不接受|别看|去掉|删掉|算了|不要了|不选)/.test(after);mentions.push({term,index,negative});from=index+term.length;}}
  mentions.sort((a,b)=>a.index-b.index||b.term.length-a.term.length);
  return mentions.filter((item,index,list)=>!list.some((other,otherIndex)=>otherIndex!==index&&other.index===item.index&&other.term.length>item.term.length&&other.term.includes(item.term)));
}
function positiveMajors(text){return unique(majorMentions(text).filter(item=>!item.negative).map(item=>item.term),8);}
function negativeMajors(text){return unique(majorMentions(text).filter(item=>item.negative).map(item=>item.term),8);}
function schoolNamesFromText(text){const matches=String(text||'').match(/[\u4e00-\u9fa5]{2,18}?(?:大学|学院)/g)||[];return unique(matches.map(value=>value.replace(/^(比较|对比|看看|再看|想问|帮我看|帮我比较|把|那|和|跟|与|就|先|还是)/,'').trim()),4);}

function geographyFromText(text){
  const source=String(text||'');
  if(/(全国|不限地区|地区不限|全国范围|回到全国|地区先放开)/.test(source))return{keys:['all'],explicit:true,label:'全国'};
  if(/(沈阳市|沈阳)/.test(source))return{keys:['shenyang'],explicit:true,label:'沈阳'};
  if(/(大连市|大连)/.test(source))return{keys:['dalian'],explicit:true,label:'大连'};
  if(/(辽宁其他|辽宁其它|除沈阳大连外的辽宁)/.test(source))return{keys:['ln-other'],explicit:true,label:'辽宁其他'};
  if(/(省内|辽宁省内|只在辽宁|只看辽宁|辽宁本地|留辽宁)/.test(source))return{keys:['ln'],explicit:true,label:'辽宁省内'};
  if(/省外/.test(source))return{keys:['outside'],explicit:true,label:'省外'};
  for(const [label,key] of Object.entries(GROUP_LABELS))if(source.includes(label))return{keys:[key],explicit:true,label};
  if(/东北三省|东北/.test(source))return{keys:['province:辽宁','province:吉林','province:黑龙江'],explicit:true,label:'东北三省'};
  const ordered=[...PROVINCE_LEVEL_NAMES].sort((a,b)=>b.length-a.length);
  for(const province of ordered){const aliases=[province,`${province}省`,`${province}市`];if(!aliases.some(token=>source.includes(token)))continue;const key=provinceRegionKey(province);if(key)return{keys:[key],explicit:true,label:province};}
  return{keys:[],explicit:false,label:''};
}
function regionLabel(keys=[]){const values=unique(keys,8);if(!values.length||values.includes('all'))return'全国';return values.map(key=>key.startsWith('province:')?key.slice(9):(REGION_LABEL_BY_KEY[key]||key)).join('、');}

function bottomLineFromText(text){const source=String(text||'');if(/(回到全部性质|学校性质不限|性质不限|都可以看|项目性质不限)/.test(source))return'all';if(/(不接受|不要|排除|只看|只要).{0,8}(中外|高收费|民办)|只看公办普通|只要公办普通/.test(source))return'public_regular_only';if(/公办优先/.test(source))return'public_first';if(/(接受|可以).{0,8}(中外|高收费)|公办含中外/.test(source))return'public_include_sino';return'';}
function ordinalReference(text,workspace={}){const source=String(text||''),map={第一:0,第一个:0,第二:1,第二个:1,第三:2,第三个:2,第四:3,第四个:3,第五:4,第五个:4};let index=null;for(const [word,value] of Object.entries(map))if(source.includes(word)){index=value;break;}if(index==null&&/(刚才那个|前面那个|这个学校|这个专业)/.test(source))index=0;if(index==null)return null;const record=workspace?.lastResult?.candidates?.records?.[index];return record?{index,id:clean(record.id,220),school:clean(record.school||record.schoolName,80),major:clean(record.major||record.majorName,120)}:{index};}

function explicitFamilyPersistence(text){return /(家庭底线|以后都|以后不|我们家不接受|孩子明确不接受|绝对不|肯定不|无论如何不|长期只考虑|预算上限|以后只看)/.test(String(text||''));}
function compareLanguage(text,majors=[]){const source=String(text||'');return /(怎么选|哪个好|哪个更|比较|对比|差别|区别|优劣|取舍|横着看)/.test(source)||(majors.length>=2&&/还是/.test(source));}
function unionLanguage(text){return /(都看看|一起看|都看|同时看|一块看|一起有哪些|都有哪些|也看看|也看一下|顺便看看|也加上|一起放进来)/.test(String(text||''));}
function correctionLanguage(text){return /(不是.{0,18}是|改成|换成|刚才说错|纠正|只留|最后留)/.test(String(text||''));}
function candidateLanguage(text){return /(想看|看看|再看|换成|改看|有哪些|有什么|能上|能报|合适|候选|学校|范围|只看|先看|就看|来点|给我看|还是.{0,12}吧|呢[？?]?|缩到|收窄到|留在)/.test(String(text||''));}
function infoQuestionLanguage(text){return /(怎么样|学什么|课程|就业|工作|前景|值不值|为什么|咋样|如何|干什么|以后做什么|适不适合)/.test(String(text||''));}
function rankQuestionLanguage(text){return /(位次|排名|第几名|多少名|一分一段)/.test(String(text||''));}
function restoreLanguage(text){return /(回到|恢复|上一批|上一个结果|刚才那批|之前那批|刚才的|前面的)/.test(String(text||''));}
function clearMajorLanguage(text){return /(不限专业|专业不限|先不看专业|先不限制专业|不限定专业|专业先放开|先看所有专业)/.test(String(text||''));}
function clearSchoolLanguage(text){return /(不限学校|学校不限|先不限定学校|学校先放开)/.test(String(text||''));}
function clearRegionLanguage(text){return /(不限地区|地区不限|回到全国|全国看看|地区先放开)/.test(String(text||''));}

function inheritPatch(){return{score:{op:'inherit'},region:{op:'inherit',keys:[]},major:{op:'inherit',values:[]},school:{op:'inherit',values:[]},bottomLine:{op:'inherit',value:''}};}
function deterministicPatch(source,{score,positive,negative,schools,geo,bottomLineMode,clearMajor,clearSchool}){
  const patch=inheritPatch();
  if(score)patch.score={op:'set',value:score};
  if(geo.explicit)patch.region=geo.keys.includes('all')?{op:'clear',keys:['all']}:{op:'set',keys:geo.keys};
  if(clearMajor)patch.major={op:'clear',values:[]};
  else if(negative.length&&positive.length&&correctionLanguage(source))patch.major={op:'set',values:positive};
  else if(negative.length&&!positive.length)patch.major={op:'remove',values:negative};
  else if(positive.length&&unionLanguage(source))patch.major={op:'add',values:positive};
  else if(positive.length)patch.major={op:'set',values:positive};
  if(clearSchool)patch.school={op:'clear',values:[]};
  else if(schools.length)patch.school={op:'set',values:schools};
  if(bottomLineMode)patch.bottomLine={op:'set',value:bottomLineMode};
  return patch;
}
function patchMutates(patch={}){return CORE_DIMENSIONS.some(key=>patch?.[key]?.op&&patch[key].op!=='inherit');}

function deterministicBase(text,workspace={}){
  const source=clean(text,1200),score=scoreFromText(source),positive=positiveMajors(source),negative=negativeMajors(source),schools=schoolNamesFromText(source),geo=geographyFromText(source),bottomLineMode=bottomLineFromText(source),reference=ordinalReference(source,workspace),hasCompare=compareLanguage(source,positive),hasUnion=unionLanguage(source),restore=restoreLanguage(source),infoQuestion=infoQuestionLanguage(source),rankQuestion=Boolean(score&&rankQuestionLanguage(source)&&!positive.length&&!schools.length&&!geo.explicit&&!hasCompare&&!hasUnion),clearMajor=clearMajorLanguage(source),clearSchool=clearSchoolLanguage(source),verifyLanguage=/(章程|招生计划|学费|校区|体检|选科|官方|来源|核验|资格|培养方案)/.test(source),mentorProfile=deterministicMentorProfile(source);
  let majors=positive;
  const patch=deterministicPatch(source,{score,positive:majors,negative,schools,geo,bottomLineMode,clearMajor,clearSchool});
  const candidate=patchMutates(patch)||candidateLanguage(source);
  let operation='answer',target='general',relation='answer_only',persistence='turn_only',combination=hasUnion?'union':'replace';
  if(rankQuestion){operation='answer';target='fact';}
  else if(restore){operation='restore';target='view';relation='restore_view';persistence='active_view';}
  else if(hasCompare){operation='compare';relation='compare_objects';target=schools.length>=2?'school':positive.length>=2?'major':'context';majors=positive;}
  else if(candidate){operation=hasMeaningfulActiveView(workspace)?'refine':'search';target=schools.length?'school':'candidates';relation=hasMeaningfulActiveView(workspace)?'patch_view':'new_view';persistence=explicitFamilyPersistence(source)?'family':'active_view';}
  else if(verifyLanguage){operation='verify';target=schools.length?'school':positive.length?'major':'fact';}
  else if(infoQuestion){operation='answer';target=reference?'context':positive.length?'major':schools.length?'school':'general';}
  if(explicitFamilyPersistence(source)&&!patchMutates(patch)&&(mentorProfile?.enabled))persistence='workspace';
  if(explicitFamilyPersistence(source)&&(negative.length||bottomLineMode||geo.explicit)&&!candidate){operation='save';target='family';relation='save_persistent';persistence='family';}
  const ambiguousPair=positive.length>=2&&!hasCompare&&!hasUnion&&!correctionLanguage(source);
  const familyChanges=persistence==='family'?{regionIncludeKeys:geo.keys.filter(key=>key!=='all'),regionExcludeKeys:[],majorExcludeKeywords:negative,bottomLineMode:bottomLineMode||''}:{};
  const requiresConfirmation=(operation==='compare'&&target==='context')||(operation==='restore'&&!(workspace?.viewHistory||[]).length)||ambiguousPair;
  const recognized=restore||hasCompare||candidate||infoQuestion||rankQuestion||verifyLanguage||mentorProfile?.enabled||Boolean(reference);
  return{
    schemaVersion:AI_COMMAND_SCHEMA_VERSION,operation,target,relation,persistence,
    score,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,schoolNames:schools,bottomLineMode,combination,
    clearMajor,clearSchool,reference,familyChanges,negativeMajorKeywords:negative,changeSet:patch,mentorProfile,
    rawText:source,question:source,taskTitle:'',confidence:requiresConfirmation?0.62:recognized?0.93:0.56,requiresConfirmation,
    reason:requiresConfirmation?'这句话存在多个可能的决策动作，需要先确认。':'按增量语义处理：只修改这句话明确提到的维度，其余条件继承当前范围。',source:'deterministic'
  };
}

function promptMessages(text,workspace,fallback){
  const context={examContext:workspace?.examContext||{},activeView:workspace?.activeView||{},decisionStage:workspace?.decisionStage||'start',decisionProfile:workspace?.decisionProfile||{},conversationMemory:workspace?.conversationMemory||{},recentTurns:(workspace?.recentTurns||workspace?.turnHistory||[]).slice(-6),recentViews:(workspace?.viewHistory||[]).slice(0,5),hardConstraints:workspace?.hardConstraints||[],lastCandidates:(workspace?.lastResult?.candidates?.records||[]).slice(0,8)};
  return[
    {role:'system',content:`你是辽宁高考家庭连续决策顾问的语义解析器，不回答招生事实，不推荐学校，不生成录取概率。你的核心任务不是重建整套筛选，而是识别“这一句话只改变了什么”。未明确提到的维度必须 inherit；只有明确“加上/也看”才 add，明确“去掉/不要”才 remove，明确“不限”才 clear，明确“改成/只留”才 set。必须理解“580机械→省内→沈阳”是连续收窄：第二句只改地区，第三句仍只改地区。城市必须使用现有地域资源：沈阳=shenyang，大连=dalian，辽宁省内=ln。不要因为用户问了一个信息问题就清空学校、专业或地区。${mentorSystemGuide()}只输出 JSON。`},
    {role:'user',content:JSON.stringify({schema:{operation:'search | refine | answer | compare | verify | restore | save',target:'candidates | school | major | region | view | fact | general | context',persistence:'active_view | family | turn_only | workspace',changeSet:{score:'{op: inherit|set, value?}',region:'{op: inherit|set|clear, keys?}',major:'{op: inherit|set|add|remove|clear, values?}',school:'{op: inherit|set|clear, values?}',bottomLine:'{op: inherit|set, value?}'},reference:'object|null',mentorProfile:mentorCommandSchema(),confidence:'0-1',requiresConfirmation:'boolean',reason:'<=100 Chinese chars'},existingContext:context,deterministicHints:fallback,userText:clean(text,1200)})}
  ];
}

function normalizePatch(candidatePatch={},fallbackPatch={}){
  const next=JSON.parse(JSON.stringify(fallbackPatch||inheritPatch()));
  const allowedOps={score:new Set(['inherit','set']),region:new Set(['inherit','set','clear']),major:new Set(['inherit','set','add','remove','clear']),school:new Set(['inherit','set','clear']),bottomLine:new Set(['inherit','set'])};
  for(const dim of CORE_DIMENSIONS){const candidate=candidatePatch?.[dim];if(!candidate||typeof candidate!=='object')continue;const op=clean(candidate.op,20);if(!allowedOps[dim].has(op))continue;next[dim]={...next[dim],op};if(dim==='score'&&op==='set'){const score=scoreFromText(String(candidate.value??''));if(score)next[dim].value=score;else next[dim]=fallbackPatch[dim];}if(dim==='region'&&['set','clear'].includes(op))next[dim].keys=unique(candidate.keys||[],8);if(['major','school'].includes(dim)&&['set','add','remove','clear'].includes(op))next[dim].values=unique(candidate.values||[],dim==='school'?4:8);if(dim==='bottomLine'&&op==='set'){const value=clean(candidate.value,40);if(['all','public_first','public_regular_only','public_include_sino'].includes(value))next[dim].value=value;else next[dim]=fallbackPatch[dim];}}
  return next;
}

function normalizeModelCommand(candidate,text,workspace,fallback){
  if(!candidate||typeof candidate!=='object')return fallback;
  const operations=['search','refine','answer','compare','verify','restore','save'],targets=['candidates','school','major','region','view','fact','general','context'],persist=['active_view','family','turn_only','workspace'];
  const command={...fallback,operation:operations.includes(clean(candidate.operation,40))?clean(candidate.operation,40):fallback.operation,target:targets.includes(clean(candidate.target,40))?clean(candidate.target,40):fallback.target,persistence:persist.includes(clean(candidate.persistence,30))?clean(candidate.persistence,30):fallback.persistence,reference:candidate.reference&&typeof candidate.reference==='object'?candidate.reference:fallback.reference,taskTitle:clean(candidate.taskTitle,100),confidence:Math.max(0,Math.min(1,Number(candidate.confidence??fallback.confidence))),requiresConfirmation:Boolean(candidate.requiresConfirmation),reason:clean(candidate.reason,300)||fallback.reason,rawText:clean(text,1200),question:clean(text,1200),source:'ai'};
  // Core candidate facts are deterministic-first. A model may not invent a new filter dimension.
  command.changeSet=fallback.changeSet;
  command.score=fallback.score;command.regionKeys=fallback.regionKeys;command.regionLabel=fallback.regionLabel;command.majorKeywords=fallback.majorKeywords;command.schoolNames=fallback.schoolNames;command.bottomLineMode=fallback.bottomLineMode;command.clearMajor=fallback.clearMajor;command.clearSchool=fallback.clearSchool;command.negativeMajorKeywords=fallback.negativeMajorKeywords;command.familyChanges=fallback.familyChanges;command.combination=fallback.combination;
  command.mentorProfile=normalizeMentorProfile(candidate.mentorProfile||{},fallback.mentorProfile||{},text);
  if(fallback.confidence>=0.88){command.operation=fallback.operation;command.target=fallback.target;command.persistence=fallback.persistence;command.requiresConfirmation=fallback.requiresConfirmation;command.reference=fallback.reference;}
  return command;
}

export function deterministicCommand(text,workspace={}){return deterministicBase(text,workspace);}

export async function interpretAiCommand(text,workspace={},env={}){
  const fallback=deterministicBase(text,workspace);
  // Pure rank lookup is fully deterministic and does not need a language-model round trip.
  if(fallback.operation==='answer'&&fallback.target==='fact'&&fallback.score&&!fallback.mentorProfile?.enabled)return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[]}};
  const provider=await runAiProvider(env,promptMessages(text,workspace,fallback),{maxTokens:850,reasoningEffort:'low'});
  if(!provider.ok)return{command:fallback,provider};
  const parsed=parseJsonText(provider.text);
  return{command:normalizeModelCommand(parsed,text,workspace,fallback),provider};
}
