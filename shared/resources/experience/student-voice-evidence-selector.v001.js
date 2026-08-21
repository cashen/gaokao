export const STUDENT_VOICE_EVIDENCE_SELECTOR_VERSION = 'student-voice-evidence-selector-v0.01';

const CATEGORY_RULES = Object.freeze([
  ['employment', ['就业', '工作', '实习', '岗位', '招聘']],
  ['course', ['课程', '专业课', '实验', '学习', '考试']],
  ['postgraduate', ['考研', '读研', '保研', '升学']],
  ['campus_life', ['宿舍', '食堂', '校园', '环境', '生活']],
  ['faculty', ['老师', '教师', '导师', '教学']]
]);

export function selectStudentVoiceEvidence(reviews = [], limit = 5) {
  const candidates = Array.isArray(reviews) ? reviews.map(normalizeReview).filter(Boolean) : [];
  const ranked = candidates
    .map((review) => ({
      ...review,
      score: scoreReview(review)
    }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const categories = new Set();
  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (categories.has(item.category) && selected.length < limit - 1) continue;
    selected.push({
      content: item.content,
      category: item.category,
      reason: item.reason,
      time: item.time
    });
    categories.add(item.category);
  }

  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((entry) => entry.content === item.content)) {
      selected.push({
        content: item.content,
        category: item.category,
        reason: item.reason,
        time: item.time
      });
    }
  }

  return selected;
}

function normalizeReview(review) {
  if (!review || typeof review !== 'object') return null;
  const content = String(review.content || review.text || review.comment || '').trim();
  if (!content) return null;
  return {
    content,
    time: review.time || review.createdAt || '',
    category: classify(content)
  };
}

function classify(text) {
  for (const [category, words] of CATEGORY_RULES) {
    if (words.some((word) => text.includes(word))) return category;
  }
  return 'general';
}

function scoreReview(review) {
  const lengthScore = Math.min(review.content.length / 30, 5);
  const categoryScore = review.category === 'general' ? 0 : 2;
  return lengthScore + categoryScore;
}

