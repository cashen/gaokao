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
export const EXPERIENCE_TOPICS=Object.freeze(['general','living','environment','management','teaching','campus']);
export const SOURCE_POLICIES=Object.freeze(['deterministic_only','official_only','experience_first','evidence_only','hybrid','reasoning_only']);

const PROJECT_SCOPE_SET=new Set(PROJECT_SCOPE_MODES);
const EXPERIENCE_TOPIC_SET=new Set(EXPERIENCE_TOPICS);
const ANSWER_STATUS_SET=new Set(ANSWER_STATUSES);

export function normalizeProjectScope(value,fallback='all'){
  const text=String(value||'').trim();
  return PROJECT_SCOPE_SET.has(text)?text:(PROJECT_SCOPE_SET.has(fallback)?fallback:'all');
}

export function normalizeExperienceTopic(value,fallback='general'){
  const text=String(value||'').trim();
  return EXPERIENCE_TOPIC_SET.has(text)?text:(EXPERIENCE_TOPIC_SET.has(fallback)?fallback:'general');
}

export function normalizeAnswerStatus(value,fallback='unsupported'){
  const text=String(value||'').trim();
  return ANSWER_STATUS_SET.has(text)?text:(ANSWER_STATUS_SET.has(fallback)?fallback:'unsupported');
}

export const EXPERIENCE_TOPIC_LABELS=Object.freeze({
  general:'学校与同学体验',
  living:'住宿与食宿',
  environment:'校园环境与人文体验',
  management:'管理与日常规则',
  teaching:'教学与学习体验',
  campus:'校园生活'
});

export const EXPERIENCE_TOPIC_KEYWORDS=Object.freeze({
  living:Object.freeze(['宿舍','住宿','食堂','食宿','寝室','公寓','洗浴','洗澡','空调','暖气','床位','饭菜']),
  environment:Object.freeze(['环境','校园','绿化','人文','氛围','社团','同学','老师','关怀','学风']),
  management:Object.freeze(['管理','门禁','查寝','纪律','请假','辅导员','制度']),
  teaching:Object.freeze(['教学','课程','老师','课堂','实验','学习','学风','考研']),
  campus:Object.freeze(['校园','社团','活动','生活','交通','周边','环境'])
});

export function experienceTopicFromText(value=''){
  const text=String(value||'');
  if(EXPERIENCE_TOPIC_KEYWORDS.living.some(word=>text.includes(word)))return'living';
  if(EXPERIENCE_TOPIC_KEYWORDS.management.some(word=>text.includes(word)))return'management';
  if(EXPERIENCE_TOPIC_KEYWORDS.teaching.some(word=>text.includes(word)))return'teaching';
  if(EXPERIENCE_TOPIC_KEYWORDS.environment.some(word=>text.includes(word)))return'environment';
  if(EXPERIENCE_TOPIC_KEYWORDS.campus.some(word=>text.includes(word)))return'campus';
  return'general';
}
