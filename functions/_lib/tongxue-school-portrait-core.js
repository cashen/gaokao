export const PORTRAIT_DIMENSIONS = Object.freeze([
  { key: 'employment', label: '就业体验' },
  { key: 'culture', label: '人文氛围' },
  { key: 'faculty', label: '师资体验' },
  { key: 'environment', label: '校园环境' },
  { key: 'dormitory', label: '宿舍体验' },
  { key: 'cafeteria', label: '食堂体验' },
  { key: 'safety', label: '校园安全' }
]);

const DAY_MS = 86_400_000;

export function buildSchoolPortrait({ schoolMeta = {}, reviews = [], source = {}, fetchedAt = new Date().toISOString(), partial = false } = {}) {
  const cleanReviews = dedupeReviews(Array.isArray(reviews) ? reviews : []);
  const dimensions = aggregateDimensions(cleanReviews);
  const campuses = aggregateCampuses(cleanReviews);
  const allQuestions = cleanReviews.filter((review) => review?.isQuestion);
  const questions = selectQuestions(cleanReviews);
  const sample = buildSample(schoolMeta, cleanReviews, dimensions, campuses, allQuestions.length, fetchedAt, partial);
  return {
    ok: true,
    school: schoolMeta.name || '',
    identity: {
      name: schoolMeta.name || '',
      province: schoolMeta.province || '',
      city: schoolMeta.city || '',
      type: schoolMeta.type || '',
      tags: normalizeTags(schoolMeta.tags)
    },
    sample,
    dimensions,
    questions,
    campuses,
    attentionPoints: buildAttentionPoints({ sample, dimensions, campuses, questions }),
    source,
    fetchedAt
  };
}

export function aggregateDimensions(reviews = []) {
  return PORTRAIT_DIMENSIONS.map((dimension) => {
    const values = [];
    let verifiedCount = 0;
    for (const review of reviews) {
      const value = Number(review?.rating?.dimensions?.[dimension.key]);
      if (!Number.isFinite(value) || value < 0 || value > 5) continue;
      values.push(value);
      if (review?.isVerified) verifiedCount += 1;
    }
    const sampleSize = values.length;
    const rawScore = sampleSize ? roundOne(values.reduce((sum, value) => sum + value, 0) / sampleSize) : null;
    const confidence = sampleSize >= 10 ? 'enough' : sampleSize >= 3 ? 'small' : 'insufficient';
    return {
      key: dimension.key,
      label: dimension.label,
      score: confidence === 'insufficient' ? null : rawScore,
      rawScore,
      sampleSize,
      verifiedCount,
      confidence
    };
  });
}

export function aggregateCampuses(reviews = []) {
  const groups = new Map();
  for (const review of reviews) {
    const campus = cleanShort(review?.campus, 80);
    if (!campus) continue;
    if (!groups.has(campus)) groups.set(campus, []);
    groups.get(campus).push(review);
  }
  return [...groups.entries()].map(([name, rows]) => {
    const newestReviewAt = newestDate(rows.map((row) => row.createdAt));
    const ratedReviews = rows.filter(hasAnyRating).length;
    return {
      name,
      reviewCount: rows.length,
      verifiedCount: rows.filter((row) => row.isVerified).length,
      ratedReviews,
      newestReviewAt,
      evidence: rows.length >= 5 ? 'medium' : rows.length >= 2 ? 'limited' : 'single'
    };
  }).sort((a, b) => b.reviewCount - a.reviewCount || compareDateDesc(a.newestReviewAt, b.newestReviewAt)).slice(0, 8);
}

export function selectQuestions(reviews = []) {
  return reviews.filter((review) => review?.isQuestion && cleanShort(review.content, 4000)).sort((a, b) => {
    const replyDiff = safeInteger(b.replies) - safeInteger(a.replies);
    if (replyDiff) return replyDiff;
    const verifiedDiff = Number(Boolean(b.isVerified)) - Number(Boolean(a.isVerified));
    if (verifiedDiff) return verifiedDiff;
    return compareDateDesc(a.createdAt, b.createdAt);
  }).slice(0, 5).map((review) => ({
    id: review.id ?? null,
    content: cleanShort(review.content, 500),
    replies: Math.max(0, safeInteger(review.replies)),
    likes: Math.max(0, safeInteger(review.likes)),
    isVerified: Boolean(review.isVerified),
    campus: cleanShort(review.campus, 80),
    createdAt: normalizeDate(review.createdAt),
    sourceUrl: safeSourceUrl(review.sourceUrl)
  }));
}

export function normalizeTags(value) {
  const rows = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[，,、|/·;；\s]+/) : [];
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const tag = cleanShort(typeof row === 'object' ? row?.name ?? row?.label ?? '' : row, 30);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result.slice(0, 12);
}

function buildSample(schoolMeta, reviews, dimensions, campuses, questionCount, fetchedAt, partial) {
  const dates = reviews.map((review) => normalizeDate(review.createdAt)).filter(Boolean);
  const newestReviewAt = newestDate(dates);
  const oldestReviewAt = oldestDate(dates);
  const now = validDate(fetchedAt)?.getTime() ?? Date.now();
  const recentYearCount = dates.filter((value) => {
    const date = validDate(value);
    return date && now - date.getTime() <= 365 * DAY_MS && now >= date.getTime();
  }).length;
  const ratedReviews = reviews.filter(hasAnyRating).length;
  const fetchedReviews = reviews.length;
  const declaredTotal = Math.max(0, safeInteger(schoolMeta.reviewCount));
  const evidenceLevel = ratedReviews >= 10 && fetchedReviews >= 15 ? 'high' : ratedReviews >= 3 || fetchedReviews >= 6 ? 'medium' : 'low';
  return {
    totalReviews: Math.max(declaredTotal, fetchedReviews),
    fetchedReviews,
    ratedReviews,
    verifiedReviews: reviews.filter((review) => review.isVerified).length,
    questionCount,
    campusCount: campuses.length,
    newestReviewAt,
    oldestReviewAt,
    recentYearCount,
    dimensionSampleMax: Math.max(0, ...dimensions.map((item) => item.sampleSize)),
    evidenceLevel,
    partial: Boolean(partial)
  };
}

export function buildAttentionPoints({ sample, dimensions, campuses, questions }) {
  const points = [];
  if (sample.fetchedReviews < 6 || sample.ratedReviews < 3) {
    points.push({ tone: 'caution', text: '现有结构化样本较少，建议先阅读具体评论，不要只看分数。' });
  }
  if (sample.newestReviewAt && sample.recentYearCount === 0) {
    points.push({ tone: 'caution', text: '当前读取到的评论距今较久，报考前需要继续核验最新校区、住宿和培养安排。' });
  }
  if (campuses.length >= 2) {
    points.push({ tone: 'caution', text: `已识别 ${campuses.length} 个校区标签，不同专业所在校区可能不同。` });
  }
  const comparable = dimensions.filter((item) => item.sampleSize >= 3 && Number.isFinite(item.rawScore));
  const highest = [...comparable].sort((a, b) => b.rawScore - a.rawScore)[0];
  const lowest = [...comparable].sort((a, b) => a.rawScore - b.rawScore)[0];
  if (highest && highest.rawScore >= 3.8) {
    points.push({ tone: 'positive', text: `${highest.label}是现有分项评分中相对较高的一项（${highest.sampleSize} 条样本）。` });
  }
  if (lowest && lowest.rawScore <= 3.6 && lowest.key !== highest?.key) {
    points.push({ tone: 'caution', text: `${lowest.label}是现有分项评分中相对需要留意的一项（${lowest.sampleSize} 条样本）。` });
  }
  if (questions.length) {
    points.push({ tone: 'neutral', text: `当前读取到 ${sample.questionCount} 个真实提问，可继续核验管理、校区或专业安排。` });
  }
  if (!points.length) points.push({ tone: 'neutral', text: '当前可用结构化信息有限，建议结合具体评论和学校官方信息判断。' });
  return points.slice(0, 4);
}

function dedupeReviews(reviews) {
  const seen = new Set();
  const result = [];
  for (const review of reviews) {
    if (!review || typeof review !== 'object') continue;
    const content = cleanShort(review.content, 4000);
    if (!content) continue;
    const key = review.id !== null && review.id !== undefined ? `id:${review.id}` : `content:${content.replace(/\s+/g, '').slice(0, 500)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...review, content });
  }
  return result.sort((a, b) => compareDateDesc(a.createdAt, b.createdAt));
}

function hasAnyRating(review) {
  const dimensions = review?.rating?.dimensions;
  return dimensions && typeof dimensions === 'object' && Object.values(dimensions).some((value) => Number.isFinite(Number(value)));
}

function newestDate(values) {
  return normalizedDates(values).sort((a, b) => b.time - a.time)[0]?.value || '';
}

function oldestDate(values) {
  return normalizedDates(values).sort((a, b) => a.time - b.time)[0]?.value || '';
}

function normalizedDates(values) {
  return values.map((value) => ({ value: normalizeDate(value), date: validDate(value) })).filter((item) => item.value && item.date).map((item) => ({ value: item.value, time: item.date.getTime() }));
}

function compareDateDesc(a, b) {
  return (validDate(b)?.getTime() || 0) - (validDate(a)?.getTime() || 0);
}

function normalizeDate(value) {
  const date = validDate(value);
  return date ? date.toISOString() : cleanShort(value, 40);
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeSourceUrl(value) {
  const text = String(value || '').trim();
  return /^https:\/\/srgaoxiao\.com\/school\//.test(text) ? text.slice(0, 500) : '';
}

function cleanShort(value, maxLength) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}
