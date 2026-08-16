import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const write=(file,text)=>fs.writeFileSync(path.join(ROOT,file),text);
function replaceOnce(text,from,to,label){const count=text.split(from).length-1;if(count!==1)throw new Error(`${label}: expected one match, got ${count}`);return text.replace(from,to);}
function patch(file,fn){const before=read(file),after=fn(before);if(after===before)throw new Error(`${file}: no change`);write(file,after);}

patch('functions/_lib/ai/agent-task-kernel.js',text=>{
  text=replaceOnce(text,
    "function looksMajorRegionSchoolList(source){return /(?:哪些|那些|什么|啥|有什么|有啥|有哪些).{0,6}(?:学校|大学|高校|院校)|(?:学校|大学|高校|院校).{0,6}(?:有这个专业|有该专业|有吗)/.test(String(source||''));}\n",
    "function looksMajorRegionSchoolList(source){return /(?:哪些|那些|什么|啥|有什么|有啥|有哪些).{0,6}(?:学校|大学|高校|院校)|(?:学校|大学|高校|院校).{0,6}(?:有这个专业|有该专业|有吗)/.test(String(source||''));}\nfunction looksKnowledgeFollowup(source,priorTask=''){return priorTask==='knowledge_explain'&&/(这个|它|刚才(?:那个|说的)|这个政策|这个计划|这个专业|这个概念|那这个|那它|我家|户籍|学籍|能报吗|可以报吗|谁能报|怎么报|符合|资格|条件|今年|现在|沈工大|这所学校).{0,20}/.test(String(source||''));}\n",
    'knowledge followup helper');
  text=replaceOnce(text,
    "  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors}))return'knowledge_explain';",
    "  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors})||looksKnowledgeFollowup(source,priorTask))return'knowledge_explain';",
    'knowledge task preemption');
  text=replaceOnce(text,
    "  if(has(source,/(按我|按我的|我这个|我的).{0,6}(分|位次)|我.{0,8}(够不够|能不能上|能不能报|能上吗|能报吗|够吗|现实吗)|我\\s*\\d{3}\\s*分?.{0,6}(够|能上|能报|现实)|按\\d{3}分/))return'active';",
    "  if(has(source,/我\\s*\\d{3}\\s*分?.{0,8}(符合|资格|条件)/))return'active';\n  if(has(source,/(按我|按我的|我这个|我的).{0,6}(分|位次)|我.{0,8}(够不够|能不能上|能不能报|能上吗|能报吗|够吗|现实吗)|我\\s*\\d{3}\\s*分?.{0,6}(够|能上|能报|现实)|按\\d{3}分/))return'active';",
    'knowledge score reconnect');
  return text;
});

patch('functions/_lib/ai/education-knowledge-runtime.js',text=>{
  text=replaceOnce(text,
    "if(/2026年4月20日.{0,10}26日/.test(body))facts.push('2026年辽宁专项计划资格申请时间为4月20日至26日；这是年度时效信息，下一招生年度不能沿用。');",
    "if(/实施区域为：[^。]{0,260}岫岩县/.test(body))facts.push('辽宁2026专项计划公布的实施区域包含岫岩县；是否符合仍要继续核对农村户籍范围以及连续户籍、学籍和实际就读等条件。');if(/教育部高校专项计划.{0,100}高考成绩总分不低于我省特殊类型招生录取控制分数线/s.test(body))facts.push('辽宁2026文件明确：教育部高校专项计划要求高考总分不低于辽宁特殊类型招生录取控制分数线；辽宁省高校专项计划的资格与录取规则需按其独立条款理解。');if(/2026年4月20日.{0,10}26日/.test(body))facts.push('2026年辽宁专项计划资格申请时间为4月20日至26日；这是年度时效信息，下一招生年度不能沿用。');",
    'liaoning live facts');
  text=replaceOnce(text,
    "export async function runEducationKnowledge(context,{question='',schoolNames=[],majorKeywords=[]}={}){\n  const resolution=resolveEducationKnowledgeQuestion(question,{schoolNames,majorKeywords}),coverage=knowledgeCoverageSnapshot();",
    "export async function runEducationKnowledge(context,{question='',schoolNames=[],majorKeywords=[],previousQuestion=''}={}){\n  let resolution=resolveEducationKnowledgeQuestion(question,{schoolNames,majorKeywords});if(!resolution.ok&&previousQuestion&&/(这个|它|刚才|那这个|那它|我家|户籍|学籍|能报|可以报|谁能报|怎么报|符合|资格|条件|今年|现在|有吗)/.test(String(question||'')))resolution=resolveEducationKnowledgeQuestion(previousQuestion,{schoolNames:[],majorKeywords:[]});const coverage=knowledgeCoverageSnapshot();",
    'knowledge anaphora recovery');
  text=replaceOnce(text,
    "  const entities=resolution.entities||[],staticSources=(resolution.sources||[]).map(normalizeSource),primarySource=staticSources[0]||{},liveRequiredForClaim=currentClaimRequested(question,resolution.kind)||entities.some(item=>item.temperature==='T4'),liveDesired=liveRequiredForClaim||resolution.requiresLive===true;let liveEvidence=null,liveFacts=[];",
    "  const entities=resolution.entities||[],staticSources=(resolution.sources||[]).map(normalizeSource),primarySource=staticSources[0]||{},schoolSpecific=(schoolNames||[]).length>0,liveRequiredForClaim=currentClaimRequested(question,resolution.kind)||schoolSpecific||entities.some(item=>item.temperature==='T4'),liveDesired=liveRequiredForClaim||resolution.requiresLive===true;let liveEvidence=null,liveFacts=[];",
    'school-specific freshness');
  text=replaceOnce(text,
    "liveEvidence=await runEducationKnowledgeEvidence(context,{query:question,canonicalName:entities[0]?.name||resolution.subject,sourceUrl:primarySource.sourceUrl||'',sourceTitle:primarySource.title||'',issuer:primarySource.issuer||'',cycle:liveRequiredForClaim?'2026':'',jurisdiction:entities[0]?.jurisdiction||primarySource.jurisdiction||'',forceSearch:!sourceIsSpecific&&liveRequiredForClaim});",
    "liveEvidence=await runEducationKnowledgeEvidence(context,{query:[...(schoolNames||[]).slice(0,1),question].filter(Boolean).join(' '),canonicalName:entities[0]?.name||resolution.subject,sourceUrl:schoolSpecific?'':(primarySource.sourceUrl||''),sourceTitle:primarySource.title||'',issuer:primarySource.issuer||'',cycle:liveRequiredForClaim?'2026':'',jurisdiction:entities[0]?.jurisdiction||primarySource.jurisdiction||'',forceSearch:schoolSpecific||(!sourceIsSpecific&&liveRequiredForClaim),requiredTerms:schoolSpecific?(schoolNames||[]).slice(0,1):[]});",
    'school-specific authoritative lookup');
  text=replaceOnce(text,"const factEvidence=sources.map(sourceEvidence),answerStatus=liveRequiredForClaim&&!liveVerified?'partial':'answered';","const factEvidence=sources.map(sourceEvidence),answerStatus=liveRequiredForClaim&&!liveVerified?'needs_fact':'answered';",'valid answer status');
  return text;
});

patch('functions/_lib/ai/official-web-evidence.js',text=>{
  text=replaceOnce(text,
    "function knowledgePageRelevant(body='',pageTitle='',subject=''){const needle=normalize(subject);if(!needle)return true;const haystack=normalize(`${pageTitle} ${String(body||'').slice(0,12000)}`);if(haystack.includes(needle))return true;const compact=needle.replace(/(?:计划|专业|政策|制度|类别|工程|高校|辽宁省)/g,'');return compact.length>=2&&haystack.includes(compact);}",
    "function knowledgePageRelevant(body='',pageTitle='',subject='',requiredTerms=[]){const needle=normalize(subject),haystack=normalize(`${pageTitle} ${String(body||'').slice(0,16000)}`);for(const term of requiredTerms||[]){const key=normalize(term).replace(/(?:大学|学院|学校)$/,'');if(key&&!haystack.includes(key))return false;}if(!needle)return true;if(haystack.includes(needle))return true;const compact=needle.replace(/(?:计划|专业|政策|制度|类别|工程|高校|辽宁省)/g,'');return compact.length>=2&&haystack.includes(compact);}",
    'knowledge page scope gate');
  text=replaceOnce(text,
    "export async function runEducationKnowledgeEvidence(context,{query='',canonicalName='',sourceUrl='',sourceTitle='',issuer='',cycle='',jurisdiction='',forceSearch=false}={},fetchImpl=fetch){",
    "export async function runEducationKnowledgeEvidence(context,{query='',canonicalName='',sourceUrl='',sourceTitle='',issuer='',cycle='',jurisdiction='',forceSearch=false,requiredTerms=[]}={},fetchImpl=fetch){",
    'knowledge evidence signature');
  text=text.replaceAll("knowledgePageRelevant(body,pageTitle,subject)","knowledgePageRelevant(body,pageTitle,subject,requiredTerms)");
  return text;
});

patch('functions/_lib/ai/turn-orchestrator.js',text=>{
  text=replaceOnce(text,"import {runDecisionResearch} from './decision-research-runtime.js';","import {runDecisionResearch} from './decision-research-runtime.js';\nimport {runEducationKnowledge} from './education-knowledge-runtime.js';",'knowledge runtime import');
  text=replaceOnce(text,"export const AI_TURN_ORCHESTRATOR_VERSION='ai-turn-orchestrator-v0.03';","export const AI_TURN_ORCHESTRATOR_VERSION='ai-turn-orchestrator-v0.04';",'orchestrator version');
  const oldFocus="function focusForTurn(command={},workspace={}){const prior=workspace?.agentContext?.focus||{},seed=command.focus||{},task=command.agentTask;const school=seed.school||((['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(task))?prior.school:'');const major=seed.major||((['school_major_history','major_region_history','fit_assessment','major_background'].includes(task))?prior.major:'');const schools=seed.schools?.length?seed.schools:((task==='school_comparison'||task==='decision_research')?prior.schools:[]);const majors=seed.majors?.length?seed.majors:((task==='major_comparison'||task==='decision_research')?prior.majors:[]);return agentFocusSeed({school,major,schools,majors,sourceText:command.rawText},workspace);}";
  const newFocus="function focusForTurn(command={},workspace={}){const prior=workspace?.agentContext?.focus||{},seed=command.focus||{},task=command.agentTask;if(task==='knowledge_explain'){const school=(command.schoolNames||[])[0]||'',major=(command.majorKeywords||[])[0]||'';return agentFocusSeed({school,major,schools:command.schoolNames||[],majors:command.majorKeywords||[],sourceText:command.rawText},{});}const school=seed.school||((['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(task))?prior.school:'');const major=seed.major||((['school_major_history','major_region_history','fit_assessment','major_background'].includes(task))?prior.major:'');const schools=seed.schools?.length?seed.schools:((task==='school_comparison'||task==='decision_research')?prior.schools:[]);const majors=seed.majors?.length?seed.majors:((task==='major_comparison'||task==='decision_research')?prior.majors:[]);return agentFocusSeed({school,major,schools,majors,sourceText:command.rawText},workspace);}";
  text=replaceOnce(text,oldFocus,newFocus,'knowledge focus firewall');
  text=replaceOnce(text,"decisionLanguage=command.agentTask==='decision_research'||isParentDecisionLanguage(input,{schoolCount:decisionSchools.length,majorCount:decisionMajors.length,priorTask});","decisionLanguage=command.agentTask==='knowledge_explain'?false:(command.agentTask==='decision_research'||isParentDecisionLanguage(input,{schoolCount:decisionSchools.length,majorCount:decisionMajors.length,priorTask}));",'decision promotion firewall');
  text=replaceOnce(text,"if(command.agentTask!=='decision_research'&&explicitCompare&&command.schoolNames?.length>=2)","if(!['decision_research','knowledge_explain'].includes(command.agentTask)&&explicitCompare&&command.schoolNames?.length>=2)",'school compare firewall');
  text=replaceOnce(text,"else if(command.agentTask!=='decision_research'&&explicitCompare&&command.majorKeywords?.length>=2)","else if(!['decision_research','knowledge_explain'].includes(command.agentTask)&&explicitCompare&&command.majorKeywords?.length>=2)",'major compare firewall');
  text=replaceOnce(text,"  else if(command.agentTask==='school_major_history')changeText=", "  else if(command.agentTask==='knowledge_explain')changeText='这轮把问题当作教育/招生知识来解释；上一轮记住的学校、分数和候选筛选不会自动变成本轮事实对象，只有你在当前问题里明确重新提到时才参与核验。';\n  else if(command.agentTask==='school_major_history')changeText=",'knowledge change text');
  text=replaceOnce(text,"fit:null,background:null,officialSchool:null,profileSupplement:null,experience:null,comparison:null,decisionResearch:null,selectionReview:","fit:null,background:null,officialSchool:null,profileSupplement:null,experience:null,knowledge:null,comparison:null,decisionResearch:null,selectionReview:",'knowledge result slot');
  text=replaceOnce(text,"      case'fact_rank_lookup':\n        result.rank=runRankLookup(validScore(command.score)||score);result.partial=!result.rank.ok;break;","      case'fact_rank_lookup':\n        result.rank=runRankLookup(validScore(command.score)||score);result.partial=!result.rank.ok;break;\n      case'knowledge_explain':\n        result.knowledge=await runEducationKnowledge(executionContext,{question:command.question||command.rawText||input,schoolNames:command.schoolNames||[],majorKeywords:command.majorKeywords||[],previousQuestion:workspace?.agentContext?.focus?.sourceText||''});result.partial=result.knowledge?.answerStatus==='needs_fact';break;",'knowledge execution case');
  text=replaceOnce(text,"  if(result.decisionResearch?.claims?.length)for(const claim of result.decisionResearch.claims)result.evidence.push(claimToEvidence(claim));","  if(result.decisionResearch?.claims?.length)for(const claim of result.decisionResearch.claims)result.evidence.push(claimToEvidence(claim));\n  if(result.knowledge?.evidence?.length)for(const evidence of result.knowledge.evidence)result.evidence.push(evidence);",'knowledge evidence append');
  return text;
});

patch('functions/_lib/ai/answer-composer.js',text=>{
  text=replaceOnce(text,"  const task=command.agentTask||'general_advice';\n", "  const task=command.agentTask||'general_advice';\n  if(result.knowledge){const status=['answered','needs_fact','needs_clarification','unsupported'].includes(result.knowledge.answerStatus)?result.knowledge.answerStatus:(result.knowledge.ok?'answered':'unsupported');return{status,text:clean(result.knowledge.answer||result.knowledge.message||changeText||'本轮没有形成可验证的教育知识解释。')};}\n",'knowledge primary answer');
  return text;
});

patch('functions/_lib/ai/advisor-presentation.js',text=>{
  text=replaceOnce(text,"export function decisionStageFor({command,view,result,changes=[]}){switch(command.agentTask){case'fact_rank_lookup':return'verify';", "export function decisionStageFor({command,view,result,changes=[]}){switch(command.agentTask){case'fact_rank_lookup':case'knowledge_explain':return'verify';",'knowledge stage');
  text=replaceOnce(text,"if(result?.experience?.boundary)checks.push({key:'school-experience-boundary',level:'review',text:clean(result.experience.boundary,280)});", "if(result?.experience?.boundary)checks.push({key:'school-experience-boundary',level:'review',text:clean(result.experience.boundary,280)});if(result?.knowledge?.boundary)checks.push({key:'knowledge-boundary',level:result.knowledge.liveRequired&&!result.knowledge.liveVerified?'required':'review',text:clean(result.knowledge.boundary,280)});",'knowledge pending boundary');
  text=replaceOnce(text,"  const relationActions=nextActionsForTurn({task,school:focus.school,major:focus.major,score:workspace?.examContext?.score,backgroundMajor:result?.background?.items?.[0]?.major||result?.background?.items?.[0]?.majorName||'',topic:command?.intent?.topic||result?.experience?.topic||'general',result,workspace});", "  if(task==='knowledge_explain'&&result?.knowledge?.nextActions?.length){for(const item of result.knowledge.nextActions)add(item.id,item.label,item.prompt,item.reason||'');return actions;}\n  const relationActions=nextActionsForTurn({task,school:focus.school,major:focus.major,score:workspace?.examContext?.score,backgroundMajor:result?.background?.items?.[0]?.major||result?.background?.items?.[0]?.majorName||'',topic:command?.intent?.topic||result?.experience?.topic||'general',result,workspace});",'knowledge next actions');
  text=replaceOnce(text,"  if(result.rank)blocks.push({type:'fact_summary',title:'分数 / 位次参考',text:rankSummary(result.rank),source:result.rank.source});", "  if(result.rank)blocks.push({type:'fact_summary',title:'分数 / 位次参考',text:rankSummary(result.rank),source:result.rank.source});\n  if(result.knowledge)blocks.push({type:'fact_summary',title:`${result.knowledge.canonical?.name||result.knowledge.subject||'教育知识'} · ${result.knowledge.canonical?.type==='undergraduate_major'?'规范本科专业':'怎么理解'}`,text:supportingText(result.knowledge.detailText||''),source:result.knowledge.sources?.[0]||{},boundary:result.knowledge.boundary||''});",'knowledge supporting block');
  return text;
});

for(const file of ['tools/tmp-aek-integrate.mjs','.github/workflows/tmp-aek-integrate.yml']){const target=path.join(ROOT,file);if(fs.existsSync(target))fs.rmSync(target);}
console.log('AEK integration patch applied and temporary builder files removed.');
