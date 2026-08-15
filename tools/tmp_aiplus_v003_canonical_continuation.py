from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new)

# 1. Persist/compact bounded parent semantic frame through the one workspace owner.
p = Path('shared/ai/ai-workspace-contract.v3992_0.js')
s = p.read_text()
s = replace_once(
    s,
    "nowIso,makeId,cloneValue,cleanText,uniqueStrings,normalizedScore,normalizedRank,viewSeed,turnSeed,agentContextSeed,createAiWorkspace,activeViewLabel,regionKeyLabel,applyAiViewPatch",
    "nowIso,makeId,cloneValue,cleanText,uniqueStrings,normalizedScore,normalizedRank,viewSeed,turnSeed,agentContextSeed,semanticFrameSeed,createAiWorkspace,activeViewLabel,regionKeyLabel,applyAiViewPatch",
    'workspace import',
)
s = replace_once(
    s,
    "export {AI_WORKSPACE_CONTRACT_VERSION,AI_EVENT_CONTRACT_VERSION,AI_RESULT_DELTA_VERSION,AI_ACTIVE_VIEW_VERSION,AI_DECISION_PROFILE_VERSION,AI_CONVERSATION_MEMORY_VERSION,AI_TURN_HISTORY_VERSION,AI_AGENT_CONTEXT_VERSION,createAiWorkspace,activeViewLabel,regionKeyLabel,applyAiViewPatch};",
    "export {AI_WORKSPACE_CONTRACT_VERSION,AI_EVENT_CONTRACT_VERSION,AI_RESULT_DELTA_VERSION,AI_ACTIVE_VIEW_VERSION,AI_DECISION_PROFILE_VERSION,AI_CONVERSATION_MEMORY_VERSION,AI_TURN_HISTORY_VERSION,AI_AGENT_CONTEXT_VERSION,createAiWorkspace,activeViewLabel,regionKeyLabel,applyAiViewPatch,semanticFrameSeed};",
    'workspace export',
)
s = replace_once(
    s,
    "agentContext:{version:cleanText(workspace.agentContext?.version,80),currentTask:cleanText(workspace.agentContext?.currentTask,80),previousTask:cleanText(workspace.agentContext?.previousTask,80),focus:compactFocusForServer(workspace.agentContext?.focus||{}),contextUsage:workspace.agentContext?.contextUsage||{}},",
    "agentContext:{version:cleanText(workspace.agentContext?.version,80),currentTask:cleanText(workspace.agentContext?.currentTask,80),previousTask:cleanText(workspace.agentContext?.previousTask,80),focus:compactFocusForServer(workspace.agentContext?.focus||{}),semanticFrame:semanticFrameSeed(workspace.agentContext?.semanticFrame),contextUsage:workspace.agentContext?.contextUsage||{}},",
    'workspace server compaction',
)
p.write_text(s)

# 2. Canonical resolved school names win over regex fragments that prefix a resolved school.
p = Path('functions/_lib/ai/command-interpreter.js')
s = p.read_text()
s = replace_once(
    s,
    "function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),matches=source.match(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)||[],full=matches.map(v=>stripSchoolEntityLeadingAction(v,120));return unique([...(resolvedSchoolNames||[]),...full],4);}",
    "function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),resolved=unique(resolvedSchoolNames||[],4),matches=source.match(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)||[],full=matches.map(v=>stripSchoolEntityLeadingAction(v,120)).filter(candidate=>candidate&&!resolved.some(name=>candidate!==name&&candidate.endsWith(name)));return unique([...resolved,...full],4);}",
    'schoolNamesFromText',
)
old = """export async function interpretAiCommand(text,workspace={},env={},request=null){
  const directoryQuestion=looksRegionSchoolDirectoryLanguage(text);
  let resolvedRegion=null;
  if(directoryQuestion||positiveMajors(text).length||workspace?.agentContext?.currentTask==='region_school_directory'){try{const resource=await import('./school-directory-resource.js');resolvedRegion=await resource.resolveSchoolDirectoryRegion({request,env},text,workspace);}catch{resolvedRegion=null;}}
  const resolvedSchool=directoryQuestion&&resolvedRegion?.key?{schoolNames:[],matchedAliases:[]}:await resolveAiSchoolMentionsDetailed(text,{request,env}),resolvedSchoolNames=resolvedSchool.schoolNames;
  const fallback=deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchool.matchedAliases,resolvedRegion);
  if(shouldShortCircuitAiProvider(fallback))return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[],skipped:true,skipReason:'high-confidence-task-locked'}};
  if(fallback.agentTask==='fact_rank_lookup'&&fallback.score&&!fallback.mentorProfile?.enabled)return{command:fallback,provider:{ok:false,provider:'deterministic',model:'',latencyMs:0,failures:[]}};
  const provider=await runAiProvider(env,promptMessages(text,workspace,fallback),{maxTokens:650,reasoningEffort:'low'});
  if(!provider.ok)return{command:fallback,provider};
  const parsed=parseJsonText(provider.text);
  return{command:normalizeModelCommand(parsed,text,workspace,fallback),provider};
}"""
new = """export async function deterministicResolvedCommand(text,workspace={},env={},request=null){
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
}"""
s = replace_once(s, old, new, 'interpretAiCommand')
p.write_text(s)

# 3. confirmedCommand is only a continuation protocol marker. Business semantics are re-derived server-side.
p = Path('functions/_lib/ai/turn-orchestrator.js')
s = p.read_text()
s = replace_once(
    s,
    "import {interpretAiCommand,deterministicCommand} from './command-interpreter.js';",
    "import {interpretAiCommand,deterministicCommand,deterministicResolvedCommand} from './command-interpreter.js';",
    'orchestrator import',
)
s = replace_once(
    s,
    "function validateConfirmedCommand(value,input,workspace,preserveResolvedFocus=false){if(!value||typeof value!=='object')return null;const fallback=deterministicCommand(input,workspace),stableFocus=preserveResolvedFocus&&value.focus&&typeof value.focus==='object'?clone(value.focus):fallback.focus;return{...fallback,...value,changeSet:fallback.changeSet,score:fallback.score,regionKeys:fallback.regionKeys,majorKeywords:fallback.majorKeywords,schoolNames:fallback.schoolNames,bottomLineMode:fallback.bottomLineMode,focus:stableFocus,semanticFrame:null,rawText:clean(input,1200),question:clean(input,1200),requiresConfirmation:false,confidence:Math.max(.8,Number(value.confidence||.8)),source:`${clean(value.source,30)||'confirmed'}-confirmed`};}",
    "async function validateConfirmedCommand(value,input,workspace,env={},request=null){if(!value||typeof value!=='object')return null;const fallback=await deterministicResolvedCommand(input,workspace,env,request);return{...fallback,semanticFrame:null,rawText:clean(input,1200),question:clean(input,1200),source:`${clean(fallback.source,30)||'deterministic'}-confirmed`};}",
    'validateConfirmedCommand',
)
s = replace_once(
    s,
    "let interpreted;const deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0,confirmed=validateConfirmedCommand(payload.confirmedCommand,input||payload.confirmedCommand?.rawText||'',workspace,deterministicContinuation);",
    "let interpreted;const deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0,confirmed=await validateConfirmedCommand(payload.confirmedCommand,input||payload.confirmedCommand?.rawText||'',workspace,context.env||{},context.request||null);",
    'confirmed invocation',
)
p.write_text(s)
