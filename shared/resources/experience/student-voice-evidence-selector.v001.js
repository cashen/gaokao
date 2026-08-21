export const STUDENT_VOICE_EVIDENCE_SELECTOR_VERSION = 'student-voice-evidence-selector-v0.02.1';

const CATEGORY_RULES = Object.freeze([
  ['employment', ['就业', '工作', '实习', '岗位', '招聘', '薪资', '入职']],
  ['course', ['课程', '专业课', '实验', '学习', '考试', '培养', '项目']],
  ['postgraduate', ['考研', '读研', '保研', '升学', '研究生']],
  ['campus_life', ['宿舍', '食堂', '校园', '环境', '生活', '寝室']],
  ['faculty', ['老师', '教师', '导师', '教学', '答疑']]
]);

const CATEGORY_LABELS = Object.freeze({
  employment: '就业发展',
  course: '课程学习',
  postgraduate: '升学考研',
  campus_life: '校园生活',
  faculty: '师资教学',
  general: '学生体验'
});

const LOW_VALUE_PATTERNS = Object.freeze([
  /^很好[。！!]*$/,
  /^不错[。！!]*$/,
  /^挺好的[。！!]*$/,
  /^还行[。！!]*$/
]);

export function selectStudentVoiceEvidence(reviews = [], limit = 5) {
  const candidates = Array.isArray(reviews)
    ? reviews.map(normalizeReview).filter(Boolean)
    : [];

  const ranked = candidates
    .map((review) => ({ ...review, score: scoreReview(review) }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const categories = new Set();

  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (categories.has(item.category) && selected.length < limit - 1) continue;
    selected.push(toEvidence(item));
    categories.add(item.category);
  }

  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((entry) => entry.content === item.content)) {
      selected.push(toEvidence(item));
    }
  }

  return selected;
}

function toEvidence(item) {
  return {
    content: item.content,
    category: item.category,
    categoryLabel: CATEGORY_LABELS[item.category] || CATEGORY_LABELS.general,
    reason: item.reason,
    time: item.time
  };
}

function normalizeReview(review) {
  if (!review || typeof review !== 'object') return null;
  const content = String(review.content || review.text || review.comment || '').trim();
  if (!content || isLowValue(content)) return null;

  const category = classify(content);
  return {
    content,
    time: review.time || review.createdAt || '',
    category,
    reason: buildReason(category)
  };
}

function isLowValue(text) {
  return LOW_VALUE_PATTERNS.some((pattern) => pattern.test(text));
}

function classify(text) {
  for (const [category, words] of CATEGORY_RULES) {
    if (words.some((word) => text.includes(word))) return category;
  }
  return 'general';
}

function scoreReview(review) {
  const lengthScore = Math.min(review.content.length / 25, 6);
  const categoryScore = review.category === 'general' ? 0 : 2;
  const detailScore = /但是|因为|比较|大一|大二|课程|实验|就业|考研|项目/.test(review.content) ? 2 : 0;
  const timeScore = review.time ? 0.5 : 0;
  return lengthScore + categoryScore + detailScore + timeScore;
}

function buildReason(category) {
  return `该反馈用于补充${CATEGORY_LABELS[category] || CATEGORY_LABELS.general}体验证据。`;
}
