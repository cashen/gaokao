import {
  STUDENT_VOICE_SCHOOL_TOPICS,
  STUDENT_VOICE_TOPIC_KEYWORDS,
  STUDENT_VOICE_TOPIC_LABELS,
  normalizeStudentVoiceTopic,
  studentVoiceTopicFromText
} from '../resources/experience/student-voice-contract.v001.js';

export const AIPLUS_PRODUCT_VERSION='v0.02';
export const AIPLUS_PRODUCT_CONTRACT_VERSION='aiplus-product-contract-v0.02';

export const PROJECT_SCOPE_MODES=Object.freeze([
  'all',
  'public_first',
  'public_regular_only',
  'exclude_sino',
  'public_include_sino'
]);

export const ANSWER_STATUSES=Object.freeze(['answered','needs_fact','needs_clarification','unsupported']);
// Compatibility surface only. Student Voice owns the actual experience taxonomy.
export const EXPERIENCE_TOPICS=STUDENT_VOICE_SCHOOL_TOPICS;
export const SOURCE_POLICIES=Object.freeze(['deterministic_only','official_only','experience_first','evidence_only','hybrid','reasoning_only']);

const PROJECT_SCOPE_SET=new Set(PROJECT_SCOPE_MODES);
const ANSWER_STATUS_SET=new Set(ANSWER_STATUSES);

export function normalizeProjectScope(value,fallback='all'){
  const text=String(value||'').trim();
  return PROJECT_SCOPE_SET.has(text)?text:(PROJECT_SCOPE_SET.has(fallback)?fallback:'all');
}

export function normalizeExperienceTopic(value,fallback='general'){
  return normalizeStudentVoiceTopic(value,{scope:'school',fallback});
}

export function normalizeAnswerStatus(value,fallback='unsupported'){
  const text=String(value||'').trim();
  return ANSWER_STATUS_SET.has(text)?text:(ANSWER_STATUS_SET.has(fallback)?fallback:'unsupported');
}

export const EXPERIENCE_TOPIC_LABELS=STUDENT_VOICE_TOPIC_LABELS;
export const EXPERIENCE_TOPIC_KEYWORDS=STUDENT_VOICE_TOPIC_KEYWORDS;

export function experienceTopicFromText(value=''){
  const topic=studentVoiceTopicFromText(value,{scope:'school'});
  // AIPLuS v0.02 historically exposes one combined living/food topic. Keep that
  // public intent stable while the shared Student Voice gateway may use finer
  // dormitory/cafeteria topics in new direct surfaces.
  return topic==='dormitory'||topic==='cafeteria'?'living':topic;
}
