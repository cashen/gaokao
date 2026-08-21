export const AI_TASK_SPEC_REGISTRY_VERSION='ai-task-spec-registry-v0.04';

const FACT_KEYS=Object.freeze({
  fact_rank_lookup:['rank'],candidate_discovery:['candidates'],candidate_refinement:['candidates'],restore_view:['candidates'],
  major_region_history:['majorHistory'],region_school_directory:['regionSchools'],school_major_history:['history'],school_history:['history'],
  school_research:['officialSchool','profileSupplement','history','background'],school_official_qa:['officialSchool'],school_experience:['experience'],student_voice:['experience'],knowledge_explain:['knowledge'],
  fit_assessment:['fit'],background_discovery:['background'],background_fit_discovery:['background'],school_background:['background'],major_background:['background'],
  school_comparison:['comparison'],major_comparison:['comparison'],decision_research:['decisionResearch'],plan_review:['selectionReview']
});

const TASK_SPECS=Object.freeze(Object.fromEntries([
  'candidate_discovery','candidate_refinement','restore_view','fact_rank_lookup','major_region_history','region_school_directory','school_major_history','school_history',
  'school_research','school_official_qa','school_experience','student_voice','knowledge_explain','fit_assessment','background_discovery','background_fit_discovery',
  'school_background','major_background','school_comparison','major_comparison','decision_research','plan_review','evidence_verification','save_family','general_advice'
].map(task=>[task,Object.freeze({task,factKeys:Object.freeze(FACT_KEYS[task]||[]),frameworkAnswer:['general_advice','save_family','evidence_verification'].includes(task)})])));

export function taskSpec(task='general_advice'){return TASK_SPECS[task]||TASK_SPECS.general_advice;}
export function taskHasUsableFact(task,result={}){return taskSpec(task).factKeys.some(key=>result?.[key]?.ok===true||key==='selectionReview'&&Boolean(result?.selectionReview));}
export function taskRequiresPrimaryAnswer(task='general_advice'){return Boolean(taskSpec(task));}
export function listTaskSpecs(){return Object.values(TASK_SPECS);}
