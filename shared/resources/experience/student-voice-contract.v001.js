export const STUDENT_VOICE_CONTRACT_VERSION = 'student-voice-contract-v0.01';

export const STUDENT_VOICE_SCOPES = Object.freeze(['school', 'major', 'school_major']);
export const STUDENT_VOICE_SCHOOL_TOPICS = Object.freeze([
  'general', 'living', 'dormitory', 'cafeteria', 'environment', 'management', 'teaching', 'campus'
]);
export const STUDENT_VOICE_MAJOR_TOPICS = Object.freeze([
  'general', 'major_learning', 'course_load', 'difficulty', 'math_physics', 'programming', 'lab_project',
  'internship', 'postgraduate', 'employment_perception', 'transfer_regret', 'expectation_gap'
]);

const SCOPE_SET = new Set(STUDENT_VOICE_SCOPES);
const SCHOOL_TOPIC_SET = new Set(STUDENT_VOICE_SCHOOL_TOPICS);
const MAJOR_TOPIC_SET = new Set(STUDENT_VOICE_MAJOR_TOPICS);

export const STUDENT_VOICE_TOPIC_LABELS = Object.freeze({
  general: '大学生声音',
  living: '住宿与食宿',
  dormitory: '宿舍体验',
  cafeteria: '食堂体验',
  environment: '校园环境与人文体验',
  management: '管理与日常规则',
  teaching: '教学与学习体验',
  campus: '校园生活',
  major_learning: '实际学什么',
  course_load: '课程与学习节奏',
  difficulty: '学习难度',
  math_physics: '数学与物理门槛',
  programming: '编程体验',
  lab_project: '实验与项目',
  internship: '实习体验',
  postgraduate: '考研与继续深造',
  employment_perception: '就业感受',
  transfer_regret: '转专业与后悔体验',
  expectation_gap: '入学前后预期差'
});

export const STUDENT_VOICE_TOPIC_KEYWORDS = Object.freeze({
  living: Object.freeze(['宿舍','住宿','食堂','食宿','寝室','公寓','洗浴','洗澡','空调','暖气','床位','饭菜']),
  dormitory: Object.freeze(['宿舍','住宿','寝室','公寓','洗浴','洗澡','空调','暖气','床位']),
  cafeteria: Object.freeze(['食堂','食宿','饭菜','餐厅','伙食']),
  environment: Object.freeze(['环境','校园','绿化','人文','氛围','社团','同学','老师','关怀','学风']),
  management: Object.freeze(['管理','门禁','查寝','纪律','请假','辅导员','制度']),
  teaching: Object.freeze(['教学','课程','老师','课堂','实验','学习','学风','考研']),
  campus: Object.freeze(['校园','社团','活动','生活','交通','周边','环境']),
  major_learning: Object.freeze(['学什么','主要学','课程','专业课','培养','方向','强电','弱电']),
  course_load: Object.freeze(['课多','课程多','作业','大作业','课业','忙','学习强度','课程强度']),
  difficulty: Object.freeze(['难','难度','劝退','挂科','学不动','吃力','四大天书']),
  math_physics: Object.freeze(['数学','高数','线代','概率','物理','大学物理']),
  programming: Object.freeze(['编程','代码','写代码','程序','算法','开发']),
  lab_project: Object.freeze(['实验','项目','课程设计','实训','竞赛','动手']),
  internship: Object.freeze(['实习','实训','企业实践']),
  postgraduate: Object.freeze(['考研','读研','保研','研究生','升学']),
  employment_perception: Object.freeze(['就业','工作','岗位','入职','薪资','工资','行业','国企','私企','体制']),
  transfer_regret: Object.freeze(['转专业','后悔','劝退','不建议','退学']),
  expectation_gap: Object.freeze(['以为','原以为','没想到','和想象','与想象','进来才发现','入学后发现'])
});

export function normalizeStudentVoiceScope(value, fallback = 'school') {
  const text = String(value || '').trim();
  return SCOPE_SET.has(text) ? text : (SCOPE_SET.has(fallback) ? fallback : 'school');
}

export function normalizeStudentVoiceTopic(value, { scope = 'school', fallback = 'general' } = {}) {
  const normalizedScope = normalizeStudentVoiceScope(scope);
  const set = normalizedScope === 'school' ? SCHOOL_TOPIC_SET : MAJOR_TOPIC_SET;
  const text = String(value || '').trim();
  return set.has(text) ? text : (set.has(fallback) ? fallback : 'general');
}

export function studentVoiceTopicFromText(value = '', { scope = 'school' } = {}) {
  const text = String(value || '');
  const normalizedScope = normalizeStudentVoiceScope(scope);
  const priority = normalizedScope === 'school'
    ? ['dormitory','cafeteria','management','teaching','environment','campus','living']
    : ['transfer_regret','expectation_gap','postgraduate','internship','programming','math_physics','lab_project','course_load','difficulty','employment_perception','major_learning'];
  for (const topic of priority) {
    if ((STUDENT_VOICE_TOPIC_KEYWORDS[topic] || []).some((word) => text.includes(word))) return topic;
  }
  return 'general';
}

function regexEscape(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordOnlyDescribesMissingEvidence(text, keyword) {
  const token = regexEscape(keyword);
  if (!token) return false;
  const missingBefore = new RegExp(`(?:没有|暂无|未提供|未提及|没提到|没有提到).{0,6}${token}(?:相关)?(?:信息|内容|评价|评论|数据|描述|提及)?`);
  const missingAfter = new RegExp(`${token}.{0,4}(?:没有|暂无|未提供|未提及|没提到)(?:相关)?(?:信息|内容|评价|评论|数据|描述|提及)`);
  return missingBefore.test(text) || missingAfter.test(text);
}

export function studentVoiceTextMatchesTopic(value = '', topic = 'general', { scope = 'school' } = {}) {
  const normalized = normalizeStudentVoiceTopic(topic, { scope });
  if (normalized === 'general') return true;
  const text = String(value || '');
  return (STUDENT_VOICE_TOPIC_KEYWORDS[normalized] || []).some((word) => text.includes(word) && !keywordOnlyDescribesMissingEvidence(text, word));
}

export function studentVoiceSampleLevel(count = 0) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return 'none';
  if (n === 1) return 'single_voice';
  if (n === 2) return 'two_voices';
  if (n <= 4) return 'recent_themes_no_consensus';
  return 'themes_with_visible_sample';
}

export const STUDENT_VOICE_BOUNDARY = Object.freeze({
  evidenceType: 'student_voice',
  officialFact: false,
  rankingInput: false,
  admissionsProbabilityInput: false,
  recommendationScoreInput: false,
  verificationIsProvenanceOnly: true,
  disagreementPolicy: 'preserve_not_average',
  scopeFallbackPolicy: 'explicit_only'
});
