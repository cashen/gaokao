import {
  AIPLUS_PRODUCT_CONTRACT_VERSION,experienceTopicFromText,normalizeExperienceTopic
} from '../../../shared/ai/aiplus-product-contract.v002.js';

export const AI_INTENT_CONTRACT_VERSION='ai-intent-contract-v0.04';

const TASK_ACTION=Object.freeze({
  candidate_discovery:'filter',candidate_refinement:'filter',restore_view:'filter',
  fact_rank_lookup:'lookup',major_region_history:'lookup',region_school_directory:'lookup',school_major_history:'lookup',school_history:'lookup',
  school_research:'explain',school_official_qa:'verify',school_experience:'explain',fit_assessment:'lookup',knowledge_explain:'explain',
  background_discovery:'lookup',background_fit_discovery:'lookup',school_background:'lookup',major_background:'lookup',
  school_comparison:'compare',major_comparison:'compare',decision_research:'compare',plan_review:'verify',evidence_verification:'verify',
  save_family:'save',general_advice:'explain'
});
const TASK_OBJECT=Object.freeze({
  fact_rank_lookup:'score',major_region_history:'major',region_school_directory:'region_school',school_major_history:'school_major',school_history:'school',
  school_research:'school',school_official_qa:'school',school_experience:'school',fit_assessment:'school_major',knowledge_explain:'education_knowledge',
  school_background:'school',major_background:'major',background_discovery:'major',background_fit_discovery:'major',
  school_comparison:'school',major_comparison:'major',decision_research:'decision',plan_review:'plan',save_family:'profile'
});
const TASK_SOURCE=Object.freeze({
  candidate_discovery:'deterministic_only',candidate_refinement:'deterministic_only',restore_view:'deterministic_only',
  fact_rank_lookup:'deterministic_only',major_region_history:'deterministic_only',region_school_directory:'deterministic_only',school_major_history:'deterministic_only',school_history:'deterministic_only',fit_assessment:'deterministic_only',
  school_research:'hybrid',school_official_qa:'official_only',school_experience:'experience_first',knowledge_explain:'hybrid',
  background_discovery:'evidence_only',background_fit_discovery:'evidence_only',school_background:'evidence_only',major_background:'evidence_only',
  school_comparison:'deterministic_only',major_comparison:'deterministic_only',decision_research:'hybrid',evidence_verification:'official_only',
  plan_review:'reasoning_only',save_family:'reasoning_only',general_advice:'reasoning_only'
});

function clean(value,max=220){return String(value==null?'':value).trim().slice(0,max);}
function scorePolicy(command={}){if(command.scoreUsage==='suspended'||command.scoreUsage==='cleared')return'suspended';if(command.scoreUsage==='active')return'active';return'remembered_only';}

export function buildIntentContract(command={},workspace={}){
  const task=clean(command.agentTask,80)||'general_advice',text=clean(command.rawText||command.question,1200),rawTopic=task==='school_experience'?experienceTopicFromText(text):(task==='school_official_qa'&&experienceTopicFromText(text)!=='general'?experienceTopicFromText(text):task==='knowledge_explain'?'education_knowledge':task.includes('background')?'background':task.includes('history')?'admission':task==='decision_research'?'decision':task.includes('comparison')?'comparison':'general'),topic=task==='school_experience'||task==='school_official_qa'?normalizeExperienceTopic(rawTopic):rawTopic;
  return{
    version:AI_INTENT_CONTRACT_VERSION,
    productContractVersion:AIPLUS_PRODUCT_CONTRACT_VERSION,
    action:TASK_ACTION[task]||'explain',
    object:TASK_OBJECT[task]||'general',
    topic,
    sourcePolicy:TASK_SOURCE[task]||'reasoning_only',
    scorePolicy:scorePolicy(command),
    scope:{
      schools:[...(command.schoolNames||[])].slice(0,4),
      majors:[...(command.majorKeywords||[])].slice(0,8),
      regions:[...(command.regionKeys||workspace?.activeView?.regionKeys||['all'])].slice(0,8),
      projectScope:command.bottomLineMode||workspace?.activeView?.bottomLineMode||'all'
    }
  };
}

export function intentTopic(command={}){
  return command?.intent?.topic||experienceTopicFromText(command.rawText||command.question||'');
}
