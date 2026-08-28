export const STUDENT_VOICE_EVIDENCE_SELECTOR_VERSION = 'student-voice-evidence-selector-v0.02.2';

const CATEGORY_RULES = Object.freeze([
  ['workload', ['课多', '课程多', '作业', '大作业', '课业', '学习强度', '课程强度', '忙', '挂科']],
  ['employment', ['就业', '工作', '实习', '岗位', '招聘', '薪资', '工资', '入职', '行业']],
  ['postgraduate', ['考研', '读研', '保研', '升学', '研究生']],
  ['faculty', ['老师', '教师', '导师', '教学', '答疑']],
  ['campus_life', ['宿舍', '食堂', '校园', '环境', '生活', '寝室', '社团']],
  ['course', ['课程', '专业课', '实验', '学习', '考试', '培养', '项目', '课程设计']]
]);

const CATEGORY_LABELS = Object.freeze({
  workload: '学习负担',
  employment: '就业发展',
  postgraduate: '升学考研',
  faculty: '师资教学',
  campus_life: '校园生活',
  course: '课程学习',
  general: '学生体验'
});

const LOW_VALUE_PATTERNS = Object.freeze([
  /^很好[。！!]*$/,
  /^不错[。！!]*$/,
  /^挺好的[。！!]*$/,
  /^还行[。！!]*$/,
  /^一般[。！!]*$/
]);

const PROVENANCE_FIELDS = Object.freeze([
  'id', 'authorLabel', 'isAnonymous', 'isVerified', 'verificationWeight', 'campus', 'createdAt',
  'likes', 'replies', 'isQuestion', 'rating', 'sourceUrl', 'evidenceScope', 'schoolSourceId',
  'majorCode', 'sourceSpecialtyId'
]);

export function selectStudentVoiceEvidence(reviews = [], limit = 5) {
  const max = Math.max(0, Math.min(5, Math.floor(Number(limit) || 0)));
  if (!max || !Array.isArray(reviews)) return [];

  const seen = new Set();
  const candidates = [];
  for (const raw of reviews) {
    const review = normalizeReview(raw);
    if (!review) continue;
    const key = normalizeContentKey(review.content);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push(review);
  }

  const newestTimestamp = candidates.reduce((latest, review) => Math.max(latest, review.timestamp || 0), 0);
  const ranked = candidates
    .map((review, index) => ({ ...review, score: scoreReview(review, newestTimestamp), sourceIndex: index }))
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp || a.sourceIndex - b.sourceIndex);

  const selected = [];
  const categories = new Set();
  for (const item of ranked) {
    if (selected.length >= max) break;
    if (categories.has(item.category)) continue;
    selected.push(toEvidence(item));
    categories.add(item.category);
  }
  for (const item of ranked) {
    if (selected.length >= max) break;
    if (!selected.some((entry) => normalizeContentKey(entry.content) === normalizeContentKey(item.content))) {
      selected.push(toEvidence(item));
    }
  }
  return selected;
}

function toEvidence(item) {
  const evidence = {
    content: item.content,
    category: item.category,
    categoryLabel: CATEGORY_LABELS[item.category] || CATEGORY_LABELS.general,
    reason: item.reason,
    time: item.time
  };
  for (const field of PROVENANCE_FIELDS) {
    if (item[field] !== undefined) evidence[field] = item[field];
  }
  return evidence;
}

function normalizeReview(review) {
  if (!review || typeof review !== 'object') return null;
  const content = String(review.content || review.text || review.comment || '').replace(/\s+/g, ' ').trim();
  if (!content || isLowValue(content)) return null;
  const category = classify(content);
  const time = review.createdAt || review.time || '';
  const timestamp = parseTimestamp(time);
  const normalized = {
    content,
    time,
    timestamp,
    category,
    reason: buildReason(category, content)
  };
  for (const field of PROVENANCE_FIELDS) {
    if (review[field] !== undefined) normalized[field] = review[field];
  }
  return normalized;
}

function isLowValue(text) {
  return LOW_VALUE_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeContentKey(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s，。！？；：、,.!?;:'"“”‘’（）()【】\[\]—-]+/g, '');
}

function classify(text) {
  let best = 'general';
  let bestHits = 0;
  for (const [category, words] of CATEGORY_RULES) {
    const hits = words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
    if (hits > bestHits) {
      best = category;
      bestHits = hits;
    }
  }
  return best;
}

function scoreReview(review, newestTimestamp) {
  const lengthScore = Math.min(review.content.length / 30, 5);
  const categoryScore = review.category === 'general' ? 0 : 2;
  const detailScore = /但是|因为|比较|大一|大二|大三|大四|具体|课程|实验|就业|考研|项目|宿舍|老师|实习/.test(review.content) ? 2 : 0;
  const socialScore = Math.min((Number(review.likes) || 0) / 20, 0.75) + Math.min((Number(review.replies) || 0) / 10, 0.5);
  const recencyScore = scoreRecency(review.timestamp, newestTimestamp);
  return lengthScore + categoryScore + detailScore + socialScore + recencyScore;
}

function scoreRecency(timestamp, newestTimestamp) {
  if (!timestamp || !newestTimestamp) return 0;
  const ageDays = Math.max(0, (newestTimestamp - timestamp) / 86_400_000);
  if (ageDays <= 180) return 1.5;
  if (ageDays <= 365) return 1;
  if (ageDays <= 730) return 0.5;
  return 0;
}

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildReason(category, content) {
  const label = CATEGORY_LABELS[category] || CATEGORY_LABELS.general;
  const detail = /但是|因为|具体|大一|大二|大三|大四|实验|项目|实习|宿舍|考研|就业/.test(content)
    ? '，并包含具体经历或条件'
    : '';
  return `这条反馈用于补充${label}的真实体验${detail}。`;
}
