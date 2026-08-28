import { normalizeSearchText } from './search-index-builder.js';
import { getKeywordMatchPolicy, MATCH_LEVELS } from './keyword-match-policy.js';

function arr(values) { return Array.isArray(values) ? values : []; }
function normalizedTerms(values = []) {
  return arr(values).map(v => ({ raw: String(v || '').trim(), key: normalizeSearchText(v) })).filter(x => x.key);
}
function findHit(text, terms = []) {
  const t = String(text || '');
  return normalizedTerms(terms).find(term => t.includes(term.key)) || null;
}
function hasAny(text, terms = []) { return Boolean(findHit(text, terms)); }
function better(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ar = MATCH_LEVELS[a.matchLevel]?.rank || 0;
  const br = MATCH_LEVELS[b.matchLevel]?.rank || 0;
  return (br > ar || (br === ar && Number(b.matchScore || 0) > Number(a.matchScore || 0))) ? b : a;
}
function mk({ level, keyword, term, reason, scoreOverride }) {
  const meta = MATCH_LEVELS[level] || MATCH_LEVELS.weak;
  return {
    matched: true,
    matchLevel: level,
    matchLabel: meta.label,
    matchScore: Number(scoreOverride || meta.score || 0),
    matchedKeyword: keyword,
    matchedTerms: term ? [term] : [],
    matchBadges: [meta.label],
    matchReason: reason || ''
  };
}

function evaluatePolicy(policy, keyword, texts) {
  const majorProjectText = `${texts.majorText || ''} ${texts.projectText || ''}`;

  // 项目属性词优先按项目属性处理，避免“中外/高收费”被误看成专业名。
  const projectHit = findHit(texts.projectText, policy.project?.terms || []);
  if (projectHit) return mk({ level: 'project', keyword, term: projectHit.raw, reason: policy.project.reason, scoreOverride: policy.project.score });

  const exactHit = findHit(majorProjectText, policy.exact?.terms || []);
  if (exactHit) return mk({ level: 'exact', keyword, term: exactHit.raw, reason: policy.exact.reason, scoreOverride: policy.exact.score });

  const relatedHit = findHit(majorProjectText, policy.related?.terms || []);
  if (relatedHit) return mk({ level: 'related', keyword, term: relatedHit.raw, reason: policy.related.reason, scoreOverride: policy.related.score });

  const industryTermHit = findHit(majorProjectText, policy.industry?.terms || []);
  const industrySchoolHit = findHit(texts.schoolText, policy.industry?.schoolHints || []);
  const industryTagHit = findHit(texts.industryText, policy.industry?.industryTags || []);
  const industryHit = industryTermHit || industrySchoolHit || industryTagHit;
  if (industryHit) return mk({ level: 'industry', keyword, term: industryHit.raw, reason: policy.industry.reason, scoreOverride: policy.industry.score });

  // weak / excludeStrong 只作为审计与降权储备，不作为独立召回入口。
  // 否则搜“石油”会把普通自动化、机械类专业召回，体验会明显变乱。
  return null;
}

function evaluateRawKeyword(keyword, texts) {
  const raw = normalizeSearchText(keyword);
  if (!raw) return null;
  if (String(texts.majorText || '').includes(raw)) return mk({ level: 'exact', keyword, term: keyword, reason: `你搜索“${keyword}”，专业名称或专业标签直接包含该词。` });
  if (String(texts.projectText || '').includes(raw)) return mk({ level: 'project', keyword, term: keyword, reason: `你搜索“${keyword}”，该词出现在招生备注、项目属性或原始招生信息中。` });
  if (String(texts.schoolText || '').includes(raw) || String(texts.industryText || '').includes(raw)) return mk({ level: 'industry', keyword, term: keyword, reason: `你搜索“${keyword}”，学校名称或行业标签包含该词，需核验具体专业方向。` });
  return null;
}

export function evaluateKeywordMatch({ indexed, keywordQuery = {} } = {}) {
  const rawKeywords = Array.isArray(keywordQuery.rawKeywords) ? keywordQuery.rawKeywords : [];
  if (!rawKeywords.length && !keywordQuery.hasMajorKeyword && !keywordQuery.hasProjectKeyword && !keywordQuery.hasIndustryKeyword) {
    return { matched: true, matchScore: 0, matchLevel: '', matchLabel: '', matchBadges: [], matchReason: '' };
  }
  const texts = {
    majorText: indexed?.majorText || '',
    projectText: indexed?.projectText || '',
    schoolText: indexed?.schoolText || '',
    industryText: indexed?.industryText || ''
  };

  if (keywordQuery.majorIntentFailClosed) {
    return {
      matched: false,
      matchScore: 0,
      matchLevel: '',
      matchLabel: '',
      matchBadges: [],
      matchReason: '这个专业说法范围过宽或尚未确认，先选择具体方向后再查询。'
    };
  }

  if (Array.isArray(keywordQuery.majorCodes) && keywordQuery.majorCodes.length) {
    const code = String(indexed?.majorCode || '').trim().toUpperCase();
    if (!keywordQuery.majorCodes.includes(code)) {
      return { matched: false, matchScore: 0, matchLevel: '', matchLabel: '', matchBadges: [], matchReason: '' };
    }
    const direction = keywordQuery.majorIntent?.items?.length === 1 && keywordQuery.majorIntent.items[0].intentLevel === 'direction';
    const label = direction ? '核心方向' : '精准专业';
    return {
      matched: true,
      matchScore: direction ? 92 : 100,
      matchLevel: 'exact',
      matchLabel: label,
      matchBadges: [label],
      matchedKeyword: keywordQuery.rawInput || '',
      matchedTerms: Array.isArray(keywordQuery.rawKeywords) ? keywordQuery.rawKeywords : [],
      matchReason: direction ? `“${keywordQuery.rawInput}”按目录方向识别为核心专业集合。` : `“${keywordQuery.rawInput}”按标准专业代码精确匹配。`
    };
  }

  let best = null;
  const candidates = rawKeywords.length ? rawKeywords : [keywordQuery.rawInput].filter(Boolean);
  for (const keyword of candidates) {
    const policy = getKeywordMatchPolicy(keyword);
    const hit = policy ? evaluatePolicy(policy, keyword, texts) : evaluateRawKeyword(keyword, texts);
    best = better(best, hit);
  }

  return best || { matched: false, matchScore: 0, matchLevel: '', matchLabel: '', matchBadges: [], matchReason: '' };
}
