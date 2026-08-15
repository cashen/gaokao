from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text()
def write(path,text): (ROOT/path).write_text(text)
def replace_once(path,old,new):
    text=read(path)
    if new in text and old not in text:
        return
    count=text.count(old)
    if count!=1: raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    write(path,text.replace(old,new,1))
def insert_once(path,anchor,insertion,before=False):
    text=read(path)
    if insertion.strip() in text: return
    count=text.count(anchor)
    if count!=1: raise RuntimeError(f'{path}: expected one anchor, found {count}: {anchor[:100]!r}')
    repl=insertion+anchor if before else anchor+insertion
    write(path,text.replace(anchor,repl,1))

# Product contract current owner switches to v0.03; v0.02 remains as a historical stable file.
for path in ['functions/_lib/ai/intent-contract.js','functions/_lib/ai/tool-registry.js','functions/_lib/ai/turn-orchestrator.js']:
    replace_once(path,"../../../shared/ai/aiplus-product-contract.v002.js","../../../shared/ai/aiplus-product-contract.v003.js")

# Intent contract.
replace_once('functions/_lib/ai/intent-contract.js',"export const AI_INTENT_CONTRACT_VERSION='ai-intent-contract-v0.02';","export const AI_INTENT_CONTRACT_VERSION='ai-intent-contract-v0.03';")
replace_once('functions/_lib/ai/intent-contract.js',"school_comparison:'compare',major_comparison:'compare',plan_review:'verify',evidence_verification:'verify',","school_comparison:'compare',major_comparison:'compare',decision_research:'compare',plan_review:'verify',evidence_verification:'verify',")
replace_once('functions/_lib/ai/intent-contract.js',"school_comparison:'school',major_comparison:'major',plan_review:'plan',save_family:'profile'","school_comparison:'school',major_comparison:'major',decision_research:'decision',plan_review:'plan',save_family:'profile'")
replace_once('functions/_lib/ai/intent-contract.js',"school_comparison:'deterministic_only',major_comparison:'deterministic_only',evidence_verification:'official_only',","school_comparison:'deterministic_only',major_comparison:'deterministic_only',decision_research:'hybrid',evidence_verification:'official_only',")
replace_once('functions/_lib/ai/intent-contract.js',"task.includes('background')?'background':task.includes('history')?'admission':task.includes('comparison')?'comparison':'general'","task.includes('background')?'background':task.includes('history')?'admission':task==='decision_research'?'decision':task.includes('comparison')?'comparison':'general'")

# Task spec.
replace_once('functions/_lib/ai/task-spec-registry.js',"export const AI_TASK_SPEC_REGISTRY_VERSION='ai-task-spec-registry-v0.02';","export const AI_TASK_SPEC_REGISTRY_VERSION='ai-task-spec-registry-v0.03';")
replace_once('functions/_lib/ai/task-spec-registry.js',"school_comparison:['comparison'],major_comparison:['comparison'],plan_review:['selectionReview']","school_comparison:['comparison'],major_comparison:['comparison'],decision_research:['decisionResearch'],plan_review:['selectionReview']")
replace_once('functions/_lib/ai/task-spec-registry.js',"'school_background','major_background','school_comparison','major_comparison','plan_review','evidence_verification'","'school_background','major_background','school_comparison','major_comparison','decision_research','plan_review','evidence_verification'")

# Agent task owner: one new primary task, no second state machine.
insert_once('functions/_lib/ai/agent-task-kernel.js',"import {looksRegionSchoolDirectoryLanguage,looksRegionSchoolDirectoryFollowup} from './region-school-language.js';\n","import {isParentDecisionLanguage} from './parent-semantic-frame.js';\n")
replace_once('functions/_lib/ai/agent-task-kernel.js',"export const AI_AGENT_KERNEL_VERSION='ai-human-advisor-kernel-v3992_5';","export const AI_AGENT_KERNEL_VERSION='ai-human-advisor-kernel-v3992_6';")
replace_once('functions/_lib/ai/agent-task-kernel.js',"'school_comparison','major_comparison',\n  'background_discovery'","'school_comparison','major_comparison','decision_research',\n  'background_discovery'")
insert_once('functions/_lib/ai/agent-task-kernel.js',"  if(looksFit(source)&&(school||schools.length))return'fit_assessment';\n","  if(isParentDecisionLanguage(source,{schoolCount:schools.length,majorCount:explicitMajors.length,priorTask}))return'decision_research';\n",before=True)
replace_once('functions/_lib/ai/agent-task-kernel.js',"case'fit_assessment':return{score:'active',region:'remembered',major:'active',school:'active',bottomLine:'remembered',commitView:false};","case'decision_research':return{score:score==='suspended'?'suspended':score==='cleared'?'cleared':'active',region:'remembered',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};\n    case'fit_assessment':return{score:'active',region:'remembered',major:'active',school:'active',bottomLine:'remembered',commitView:false};")
replace_once('functions/_lib/ai/agent-task-kernel.js',"major_comparison:'比较专业',plan_review:'检查家庭方案'","major_comparison:'比较专业',decision_research:'做家庭决策研究',plan_review:'检查家庭方案'")

# Command interpreter: deterministic facts stay canonical; model may only enrich semantic concerns/evidence needs.
insert_once('functions/_lib/ai/command-interpreter.js',"import {looksRegionSchoolDirectoryLanguage,regionSchoolLevelFromText} from './region-school-language.js';\n","import {buildParentSemanticFrame,normalizeParentSemanticFrame} from './parent-semantic-frame.js';\n")
replace_once('functions/_lib/ai/command-interpreter.js',"export const AI_COMMAND_INTERPRETER_VERSION='ai-command-interpreter-v3992_9';","export const AI_COMMAND_INTERPRETER_VERSION='ai-command-interpreter-v3992_10';")
replace_once('functions/_lib/ai/command-interpreter.js',"export const AI_COMMAND_SCHEMA_VERSION='ai-semantic-agent-plan-v3992_9';","export const AI_COMMAND_SCHEMA_VERSION='ai-semantic-agent-plan-v3992_10';")
replace_once('functions/_lib/ai/command-interpreter.js',"'school_comparison','major_comparison','background_discovery'","'school_comparison','major_comparison','decision_research','background_discovery'")
insert_once('functions/_lib/ai/command-interpreter.js',"  const rawScoreUsage=explicitScoreUsage(source,workspace),","  const semanticFrame=buildParentSemanticFrame(source,{schools,majors,regionKeys:geo.keys,score,mentorProfile,workspace,agentTask});\n",before=True)
replace_once('functions/_lib/ai/command-interpreter.js',"['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery','fact_rank_lookup'].includes(agentTask)&&score","['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery','fact_rank_lookup','decision_research'].includes(agentTask)&&score")
replace_once('functions/_lib/ai/command-interpreter.js',"mentorProfile,retryRequested:","mentorProfile,semanticFrame,retryRequested:")
replace_once('functions/_lib/ai/command-interpreter.js',"'仅返回 JSON：{\"agentTask\":\"...\",\"scoreUsage\":\"...\",\"requiresConfirmation\":false,\"reason\":\"\",\"mentorProfile\":{...}}。'","'对于 decision_research，可补充 semanticFrame.careerTargets / evidenceNeeds / concerns；它们只能描述用户目标和待核验证据，不能修改分数、学校、专业、地区或 changeSet。',\n    '仅返回 JSON：{\"agentTask\":\"...\",\"scoreUsage\":\"...\",\"requiresConfirmation\":false,\"reason\":\"\",\"mentorProfile\":{...},\"semanticFrame\":{\"speechAct\":\"decide\",\"careerTargets\":[],\"evidenceNeeds\":[],\"concerns\":[]}}。'")
replace_once('functions/_lib/ai/command-interpreter.js',"deterministicGuess:{agentTask:fallback.agentTask,scoreUsage:fallback.scoreUsage,focus:fallback.focus}","deterministicGuess:{agentTask:fallback.agentTask,scoreUsage:fallback.scoreUsage,focus:fallback.focus,semanticFrame:fallback.semanticFrame}")
insert_once('functions/_lib/ai/command-interpreter.js',"  command.mentorProfile=normalizeMentorProfile(candidate.mentorProfile||{},fallback.mentorProfile||{},text);\n","  command.semanticFrame=normalizeParentSemanticFrame(candidate.semanticFrame||{},fallback.semanticFrame||{},text);\n")
replace_once('functions/_lib/ai/command-interpreter.js',"export function shouldShortCircuitAiProvider(command={}){return Boolean(command?.taskLocked&&!command?.requiresConfirmation&&Number(command?.confidence||0)>=.9);}","export function shouldShortCircuitAiProvider(command={}){return Boolean(command?.taskLocked&&command?.agentTask!=='decision_research'&&!command?.requiresConfirmation&&Number(command?.confidence||0)>=.9);}")

# Tool registry remains the deterministic bridge owner; only the product contract/current registry version advances.
replace_once('functions/_lib/ai/tool-registry.js',"export const AI_TOOL_REGISTRY_VERSION='ai-tool-registry-v0.02';","export const AI_TOOL_REGISTRY_VERSION='ai-tool-registry-v0.03';")

# Answer composer.
replace_once('functions/_lib/ai/answer-composer.js',"export const AI_ANSWER_COMPOSER_VERSION='ai-answer-composer-v0.02';","export const AI_ANSWER_COMPOSER_VERSION='ai-answer-composer-v0.03';")
insert_once('functions/_lib/ai/answer-composer.js',"  if(result.comparison){","  if(result.decisionResearch){if(result.decisionResearch.ok)return{status:'answered',text:clean(result.decisionResearch.answer||'这轮已经按你的家庭目标拆开比较；没有证据的就业、升学或成本部分不会补猜。')};return{status:'needs_fact',text:clean(result.decisionResearch.message||'这轮家庭决策还缺关键事实，已有候选条件没有被修改。')};}\n",before=True)

# Advisor presentation reuses the existing comparison/details renderers.
replace_once('functions/_lib/ai/advisor-presentation.js',"case'school_comparison':case'major_comparison':return'compare';","case'school_comparison':case'major_comparison':case'decision_research':return'compare';")
insert_once('functions/_lib/ai/advisor-presentation.js',"  if(task==='school_official_qa'){","  if(task==='decision_research'){const frame=command.semanticFrame||{};if((frame.preferenceSignals||[]).some(item=>item.dimension==='study_duration'&&item.value==='prefer_short'))add('decision-long-study','如果接受读研再看一次','那如果我愿意读研呢','只改变培养周期假设，不改分数和候选。');else add('decision-short-study','按本科就业再看','更希望本科直接就业，不把读研当必选项','把培养周期说清楚。');if((frame.careerTargets||[]).length)add('decision-career-proof','只核验职业路径证据','把刚才涉及就业、央企国企的部分只按具体学校官方证据再核验','没有学校级证据就不下强结论。');if(!(frame.schools||[]).length&&workspace?.examContext?.score)add('decision-schools','收敛到具体学校','按我当前分数，把这些方向各挑可达学校再继续比较','就业和升学最终要落到具体学校。');return actions.slice(0,3);}\n",before=True)

# Turn orchestrator: one owner executes a maximum-three-step evidence plan.
insert_once('functions/_lib/ai/turn-orchestrator.js',"import {normalizeProjectScope,ANSWER_STATUSES,EXPERIENCE_TOPIC_LABELS} from '../../../shared/ai/aiplus-product-contract.v003.js';\n","import {buildEvidencePlan} from './evidence-plan.js';\nimport {createEvidenceClaim,claimsFromOfficialText,claimToEvidence} from './claim-evidence.js';\nimport {runOfficialWebEvidence} from './official-web-evidence.js';\n")
replace_once('functions/_lib/ai/turn-orchestrator.js',"export const AI_TURN_ORCHESTRATOR_VERSION='ai-turn-orchestrator-v0.02';","export const AI_TURN_ORCHESTRATOR_VERSION='ai-turn-orchestrator-v0.03';")
replace_once('functions/_lib/ai/turn-orchestrator.js',"selectionReview?.snapshotVersion||''","selectionReview?.snapshotVersion||'',command.semanticFrame?.signature||''")
replace_once('functions/_lib/ai/turn-orchestrator.js',"focus:stableFocus,rawText:","focus:stableFocus,semanticFrame:fallback.semanticFrame,rawText:")
replace_once('functions/_lib/ai/turn-orchestrator.js',"updatedAt:new Date().toISOString()};}","semanticFrame:command.semanticFrame||null,updatedAt:new Date().toISOString()};}")
replace_once('functions/_lib/ai/turn-orchestrator.js',"result.background,result.comparison])","result.background,result.comparison,result.decisionResearch])")

DECISION_HELPER=r'''__DECISION_HELPER__'''
insert_once('functions/_lib/ai/turn-orchestrator.js',"async function isolatedResult(code,run){try{return await run();}catch(error){return{ok:false,code:`${code}_failed`,message:clean(error?.message||error,260)};}}\n",DECISION_HELPER)
replace_once('functions/_lib/ai/turn-orchestrator.js',"comparison:null,selectionReview:","comparison:null,decisionResearch:null,selectionReview:")
replace_once('functions/_lib/ai/turn-orchestrator.js',"command.agentTask==='school_research'?{mode:'multi_tool_research',stateMutation:false,steps:['official_profile','moe_directory_baseline','school_background','admission_history']}:{mode:'single_task',stateMutation:resolved.commitView===true,steps:[command.agentTask]}","command.agentTask==='school_research'?{mode:'multi_tool_research',stateMutation:false,steps:['official_profile','moe_directory_baseline','school_background','admission_history']}:command.agentTask==='decision_research'?{mode:'bounded_decision_research',stateMutation:false,...buildEvidencePlan(command,workspace,view)}:{mode:'single_task',stateMutation:resolved.commitView===true,steps:[command.agentTask]}")
insert_once('functions/_lib/ai/turn-orchestrator.js',"      case'background_discovery':","      case'decision_research':\n        result.decisionResearch=await executeDecisionResearch(executionContext,context,command,workspace,view,score);if(result.decisionResearch?.comparison)result.comparison=result.decisionResearch.comparison;result.partial=!result.decisionResearch?.ok||result.decisionResearch?.partial===true;break;\n",before=True)
insert_once('functions/_lib/ai/turn-orchestrator.js',"  if(result.officialSchool?.sources?.length)","  if(result.decisionResearch?.claims?.length)for(const claim of result.decisionResearch.claims)result.evidence.push(claimToEvidence(claim));\n",before=True)

# Browser-facing product text advances, while core JS/CSS asset identity remains 002_3 because no browser runtime module changed.
replace_once('aiplus/index.html','AIPLuS 产品版 · v0.02','AIPLuS 产品版 · v0.03')
replace_once('aiplus/index.html','学校官方资料优先核对阳光高考；招生分数走站内确定性数据。模型负责理解、归纳和组织答案，不用模型补猜事实。','学校官方资料优先核对阳光高考；招生分数走站内确定性数据。复杂取舍会先拆成有界证据计划，需要培养、就业或升学材料时只读取可验证官方页面；模型负责理解和归纳，不用模型补猜事实。')

# Architecture handoff / resource boundary.
replace_once('docs/architecture/START-HERE.md','`shared/ai/aiplus-product-contract.v002.js` — product/source policy vocabulary.','`shared/ai/aiplus-product-contract.v003.js` — current product/source policy vocabulary；v0.03 的复杂家长问题由 `parent-semantic-frame.js` 与 `evidence-plan.js` 形成受控语义框架和最多三步证据计划。')
insert_once('functions/_lib/ai/RESOURCE-BOUNDARY.md','## School directory by region\n','## Parent decision research and official web evidence\n\nAIPLuS v0.03 keeps one turn orchestrator. `parent-semantic-frame.js` describes what the parent is deciding, but it never owns score/region/school/major mutations. `evidence-plan.js` may schedule at most three evidence steps. A `decision_research` turn is knowledge/reasoning-only and never commits the candidate active view.\n\n`official-web-evidence.js` is the only general official-web gateway. It first relies on the existing CHSI school-official bridge; optional Jina Search is used only when `JINA_API_KEY` or `AI_WEB_SEARCH_API_KEY` is configured and only for discovery. Search-result snippets are never facts. The gateway must read the original HTTPS page and only accepts CHSI, `.gov.cn` or `.edu.cn` sources that also match the requested school. Per turn it is bounded to two schools / two fetched pages.\n\n`claim-evidence.js` is the provenance contract. Time-sensitive quantitative claims such as employment/升学 rates or salary numbers require an explicit year; otherwise they are discarded. Models may summarize accepted claims but may not create a claim, rewrite a deterministic admissions fact or turn a missing web source into a conclusion.\n\n')
replace_once('functions/_lib/ai/RESOURCE-BOUNDARY.md','this revision uses `v002_1` while the visible product version remains `v0.02`.','the current browser asset transaction is `v002_3`; AIPLuS product semantics are `v0.03` while the site release identity remains `v3.9.90.1` / `v3990_1`.')

# Workflow: keep old v0.02 regression as a stable preserved journey and add the v0.03 semantic/provenance gate.
wf='.github/workflows/verify-ai-workspace-v3990_1.yml'
replace_once(wf,"      - 'tools/verify-aiplus-v002-contract.mjs'\n","      - 'tools/verify-aiplus-v002-contract.mjs'\n      - 'tools/verify-aiplus-parent-semantics-v003.mjs'\n      - 'tools/fixtures/aiplus-parent-query-catalog-v003.mjs'\n")
# path block occurs twice (PR and push); second insertion if still only one v003 occurrence
text=read(wf)
if text.count("tools/verify-aiplus-parent-semantics-v003.mjs")<2:
    old="      - 'tools/verify-aiplus-v002-contract.mjs'\n"
    idx=text.find(old,text.find("tools/verify-aiplus-parent-semantics-v003.mjs")+1)
    if idx<0: raise RuntimeError('workflow second v002 path block not found')
    text=text[:idx+len(old)]+"      - 'tools/verify-aiplus-parent-semantics-v003.mjs'\n      - 'tools/fixtures/aiplus-parent-query-catalog-v003.mjs'\n"+text[idx+len(old):]
    write(wf,text)
replace_once(wf,"grep -q 'AIPLuS 产品版 · v0.02' aiplus/index.html","grep -q 'AIPLuS 产品版 · v0.03' aiplus/index.html")
replace_once(wf,"          node --check shared/ai/aiplus-product-contract.v002.js\n","          node --check shared/ai/aiplus-product-contract.v002.js\n          node --check shared/ai/aiplus-product-contract.v003.js\n          node --check functions/_lib/ai/parent-semantic-frame.js\n          node --check functions/_lib/ai/evidence-plan.js\n          node --check functions/_lib/ai/claim-evidence.js\n          node --check functions/_lib/ai/official-web-evidence.js\n")
replace_once(wf,"          node --check tools/verify-aiplus-v002-contract.mjs\n","          node --check tools/verify-aiplus-v002-contract.mjs\n          node --check tools/verify-aiplus-parent-semantics-v003.mjs\n          node --check tools/fixtures/aiplus-parent-query-catalog-v003.mjs\n")
replace_once(wf,"          node tools/verify-aiplus-v002-contract.mjs\n","          node tools/verify-aiplus-v002-contract.mjs\n          node tools/verify-aiplus-parent-semantics-v003.mjs\n")

# Final static ownership assertions.
for path in ['functions/_lib/ai/intent-contract.js','functions/_lib/ai/tool-registry.js','functions/_lib/ai/turn-orchestrator.js']:
    if 'aiplus-product-contract.v003.js' not in read(path): raise RuntimeError(f'{path}: v0.03 product contract not active')
if 'decision_research' not in read('functions/_lib/ai/agent-task-kernel.js'): raise RuntimeError('decision task missing')
print('AIPLuS v0.03 patch applied')
