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
const RECENT_WINDOW_MS = 365 * DAY_MS;
const TOPIC_DEFINITIONS = Object.freeze([
  { key:'campus', label:'校区安排', patterns:[/校区/,/分校/,/搬校/,/本部/,/新校区/,/老校区/] },
  { key:'dormitory', label:'住宿条件', patterns:[/宿舍/,/寝室/,/独卫/,/空调/,/洗澡/,/几人寝/,/上床下桌/] },
  { key:'management', label:'管理方式', patterns:[/早操/,/晚自习/,/门禁/,/打卡/,/查寝/,/管理严/,/强制/] },
  { key:'cost', label:'费用成本', patterns:[/学费/,/住宿费/,/水电/,/洗浴费/,/费用/,/收费/] },
  { key:'transport', label:'交通位置', patterns:[/地铁/,/公交/,/交通/,/偏远/,/通勤/,/市区/] },
  { key:'transfer', label:'转专业与升学', patterns:[/转专业/,/保研/,/考研/,/推免/,/换专业/] },
  { key:'employment', label:'就业与实习', patterns:[/就业/,/校招/,/实习/,/招聘/,/offer/i,/去向/] },
  { key:'teaching', label:'课程与师资', patterns:[/老师/,/师资/,/课程/,/教学/,/实验室/,/培养方案/] }
]);

export function buildSchoolPortrait({ schoolMeta = {}, reviews = [], source = {}, fetchedAt = new Date().toISOString(), partial = false } = {}) {
  const cleanReviews = dedupeReviews(Array.isArray(reviews) ? reviews : []);
  const dimensions = aggregateDimensions(cleanReviews, fetchedAt);
  const campuses = aggregateCampuses(cleanReviews);
  const allQuestions = cleanReviews.filter((review) => review?.isQuestion);
  const questions = selectQuestions(cleanReviews);
  const sample = buildSample(schoolMeta, cleanReviews, dimensions, campuses, allQuestions.length, fetchedAt, partial);
  const evidence = buildEvidenceInterpretation({ reviews:cleanReviews, dimensions, campuses, sample, fetchedAt });
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
    evidence,
    attentionPoints: buildAttentionPoints({ sample, dimensions, campuses, questions, evidence }),
    source,
    fetchedAt
  };
}

export function aggregateDimensions(reviews = [], fetchedAt = new Date().toISOString()) {
  const now = validDate(fetchedAt)?.getTime() ?? Date.now();
  return PORTRAIT_DIMENSIONS.map((dimension) => {
    const values = [];
    const recentValues = [];
    const historicalValues = [];
    let verifiedCount = 0;
    for (const review of reviews) {
      const value = Number(review?.rating?.dimensions?.[dimension.key]);
      if (!Number.isFinite(value) || value < 0 || value > 5) continue;
      values.push(value);
      if (review?.isVerified) verifiedCount += 1;
      const time = validDate(review?.createdAt)?.getTime();
      if (Number.isFinite(time) && now >= time && now - time <= RECENT_WINDOW_MS) recentValues.push(value);
      else historicalValues.push(value);
    }
    const sampleSize = values.length;
    const rawScore = sampleSize ? average(values) : null;
    const confidence = sampleSize >= 10 ? 'enough' : sampleSize >= 3 ? 'small' : 'insufficient';
    const distribution = {
      low: values.filter((value) => value <= 2.5).length,
      mid: values.filter((value) => value > 2.5 && value < 4).length,
      high: values.filter((value) => value >= 4).length
    };
    const spread = sampleSize ? roundOne(Math.max(...values) - Math.min(...values)) : null;
    const agreement = agreementLabel(sampleSize, distribution, spread);
    const recentScore = recentValues.length >= 3 ? average(recentValues) : null;
    const historicalScore = historicalValues.length >= 3 ? average(historicalValues) : null;
    const trend = trendLabel(recentScore, historicalScore);
    return {
      key: dimension.key,
      label: dimension.label,
      score: confidence === 'insufficient' ? null : rawScore,
      rawScore,
      sampleSize,
      verifiedCount,
      confidence,
      distribution,
      spread,
      agreement,
      recentScore,
      recentSampleSize:recentValues.length,
      historicalScore,
      historicalSampleSize:historicalValues.length,
      trend
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

export function buildEvidenceInterpretation({ reviews = [], dimensions = [], campuses = [], sample = {}, fetchedAt = new Date().toISOString() } = {}) {
  const consensus = dimensions.filter((item) => item.sampleSize >= 3 && item.agreement === 'consistent').sort(sortDimensions).slice(0, 4).map(toEvidenceDimension);
  const disputes = dimensions.filter((item) => item.sampleSize >= 4 && item.agreement === 'mixed').sort(sortDimensions).slice(0, 4).map(toEvidenceDimension);
  const topicSignals = buildTopicSignals(reviews, fetchedAt);
  const checklist = buildVerificationChecklist({ topicSignals, campuses, sample, disputes });
  const verifiedShare = sample.fetchedReviews > 0 ? Math.round((sample.verifiedReviews / sample.fetchedReviews) * 100) : 0;
  const oldReviewCount = Math.max(0, Number(sample.fetchedReviews || 0) - Number(sample.recentYearCount || 0));
  const freshness = !sample.newestReviewAt ? 'unknown' : Number(sample.recentYearCount || 0) > 0 ? 'recent' : 'stale';
  return {
    version:'v1.6.0',
    consensus,
    disputes,
    topicSignals,
    checklist,
    timeliness:{
      status:freshness,
      recentYearCount:Math.max(0, Number(sample.recentYearCount || 0)),
      oldReviewCount,
      newestReviewAt:sample.newestReviewAt || '',
      oldestReviewAt:sample.oldestReviewAt || ''
    },
    context:{
      campusCount:campuses.length,
      verifiedReviews:Math.max(0, Number(sample.verifiedReviews || 0)),
      verifiedShare,
      partial:Boolean(sample.partial),
      evidenceLevel:sample.evidenceLevel || 'low'
    },
    note:'讨论频率、评分分布和评论时间只帮助理解公开样本，不等于学校官方事实或统一排名。'
  };
}

export function buildAttentionPoints({ sample, dimensions, campuses, questions, evidence }) {
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
  if (evidence?.disputes?.length) {
    points.push({ tone:'caution', text:`${evidence.disputes.map((item) => item.label).join('、')}的现有评分分化明显，平均分代表性有限。` });
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

function buildTopicSignals(reviews, fetchedAt) {
  const now = validDate(fetchedAt)?.getTime() ?? Date.now();
  const rows = TOPIC_DEFINITIONS.map((topic) => {
    let mentionCount = 0;
    let verifiedCount = 0;
    let recentCount = 0;
    let questionCount = 0;
    const campuses = new Set();
    const sourceUrls = [];
    for (const review of reviews) {
      const content = cleanShort(review?.content, 4000);
      if (!content || !topic.patterns.some((pattern) => pattern.test(content))) continue;
      mentionCount += 1;
      if (review?.isVerified) verifiedCount += 1;
      if (review?.isQuestion) questionCount += 1;
      const time = validDate(review?.createdAt)?.getTime();
      if (Number.isFinite(time) && now >= time && now - time <= RECENT_WINDOW_MS) recentCount += 1;
      const campus = cleanShort(review?.campus, 80);
      if (campus) campuses.add(campus);
      const url = safeSourceUrl(review?.sourceUrl);
      if (url && !sourceUrls.includes(url) && sourceUrls.length < 2) sourceUrls.push(url);
    }
    return {
      key:topic.key,
      label:topic.label,
      mentionCount,
      verifiedCount,
      recentCount,
      questionCount,
      campuses:[...campuses].slice(0, 4),
      sourceUrls
    };
  }).filter((item) => item.mentionCount > 0);
  return rows.sort((a, b) => b.mentionCount - a.mentionCount || b.verifiedCount - a.verifiedCount || a.label.localeCompare(b.label, 'zh-CN')).slice(0, 8);
}

function buildVerificationChecklist({ topicSignals, campuses, sample, disputes }) {
  const signalKeys = new Set(topicSignals.map((item) => item.key));
  const items = [];
  const add = (id, label, reason, priority = 2) => {
    if (!items.some((item) => item.id === id)) items.push({ id, label, reason, priority });
  };
  if (sample.fetchedReviews < 6 || sample.ratedReviews < 3) add('sample','先核验最新官方信息','现有评论或评分样本较少，不能用少量体验替代学校规则。',0);
  if (sample.newestReviewAt && sample.recentYearCount === 0) add('freshness','确认当前年份是否已经调整','现有评论距今较久，校区、住宿和管理制度可能已变化。',0);
  if (campuses.length >= 2 || signalKeys.has('campus')) add('campus','确认所报专业四年分别在哪个校区','评论中出现校区安排线索，不同学院和年级可能不同。',1);
  if (signalKeys.has('dormitory')) add('dormitory','确认宿舍人数、空调、卫浴和住宿费','住宿是高频讨论项，旧楼、新楼和不同校区可能差异很大。',1);
  if (signalKeys.has('management')) add('management','确认早操、晚自习、门禁等管理要求','管理规则通常按学院、年级或校区执行，需要问清适用范围。',1);
  if (signalKeys.has('cost')) add('cost','确认学费、住宿费及水电洗浴等额外费用','公开评论可能只反映个别年份或收费场景。',2);
  if (signalKeys.has('transfer')) add('transfer','确认转专业、推免和升学规则','名额、成绩要求和限制专业需要以学校当年文件为准。',2);
  if (signalKeys.has('employment')) add('employment','查看学院和专业口径的就业去向','学校总体就业情况不能替代具体专业、城市和行业去向。',2);
  if (disputes.length) add('disputes','针对分歧维度继续询问不同专业和校区学生','现有评分同时出现明显高低评价，平均分代表性有限。',1);
  if (sample.partial) add('partial','继续阅读更多原评论再下结论','当前画像只读取了部分公开样本。',2);
  if (!items.length) add('general','向招生办确认校区、培养和费用边界','现有公开样本没有形成稳定结论，仍需官方信息补足。',2);
  return items.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)).slice(0, 6).map(({ priority, ...item }) => item);
}

function buildSample(schoolMeta, reviews, dimensions, campuses, questionCount, fetchedAt, partial) {
  const dates = reviews.map((review) => normalizeDate(review.createdAt)).filter(Boolean);
  const newestReviewAt = newestDate(dates);
  const oldestReviewAt = oldestDate(dates);
  const now = validDate(fetchedAt)?.getTime() ?? Date.now();
  const recentYearCount = dates.filter((value) => {
    const date = validDate(value);
    return date && now - date.getTime() <= RECENT_WINDOW_MS && now >= date.getTime();
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

function toEvidenceDimension(item) {
  return {
    key:item.key,
    label:item.label,
    score:item.rawScore,
    sampleSize:item.sampleSize,
    verifiedCount:item.verifiedCount,
    distribution:{...item.distribution},
    spread:item.spread,
    agreement:item.agreement,
    recentScore:item.recentScore,
    recentSampleSize:item.recentSampleSize,
    historicalScore:item.historicalScore,
    historicalSampleSize:item.historicalSampleSize,
    trend:item.trend
  };
}

function sortDimensions(a, b) {
  return b.sampleSize - a.sampleSize || b.verifiedCount - a.verifiedCount || a.label.localeCompare(b.label, 'zh-CN');
}

function agreementLabel(sampleSize, distribution, spread) {
  if (sampleSize < 3) return 'insufficient';
  if (distribution.low > 0 && distribution.high > 0 && Number(spread) >= 1.5) return 'mixed';
  if (Number(spread) <= 0.8) return 'consistent';
  return 'varied';
}

function trendLabel(recentScore, historicalScore) {
  if (!Number.isFinite(recentScore) || !Number.isFinite(historicalScore)) return 'unknown';
  const delta = recentScore - historicalScore;
  if (delta >= 0.5) return 'improving';
  if (delta <= -0.5) return 'declining';
  return 'stable';
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

function average(values) {
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}
