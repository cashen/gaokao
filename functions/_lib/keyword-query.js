import { MAJOR_KEYWORD_ALIASES, BROAD_MAJOR_KEYWORDS } from './major-keyword-policy.js';
import { PROJECT_KEYWORD_ALIASES } from './project-keyword-policy.js';
import { INDUSTRY_KEYWORD_ALIASES } from './industry-keyword-policy.js';
import { createMajorIntentResolver } from '../../shared/resources/majors/major-intent-resolver.v001.js';
import { STANDARD_MAJOR_CATALOG_2026_FULL } from './kb/standard-major-catalog-2026-full.generated.js';

const MAJOR_INTENT_RESOLVER = createMajorIntentResolver(STANDARD_MAJOR_CATALOG_2026_FULL, [], { sourceVersion: 'standard-major-catalog-2026' });

export function normalizeKeyword(value) {
  return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

export function splitSearchKeywords(input) {
  return String(input || '')
    .split(/[,\s，、/；;|]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function unique(list) {
  return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))];
}

function addAll(target, values) {
  for (const value of values || []) target.push(value);
}

export function buildKeywordQuery(input) {
  const rawKeywords = splitSearchKeywords(input);
  const majorKeywords = [];
  const projectKeywords = [];
  const industryKeywords = [];
  const industrySchoolHints = [];
  const industryTags = [];
  const broadKeywords = [];

  for (const word of rawKeywords) {
    const key = normalizeKeyword(word);

    // 原词永远参与专业/综合搜索，防止土木、环境、材料、水产、测绘等未枚举词搜不到。
    majorKeywords.push(word);

    if (PROJECT_KEYWORD_ALIASES[key]) {
      addAll(projectKeywords, PROJECT_KEYWORD_ALIASES[key]);
    }

    if (MAJOR_KEYWORD_ALIASES[key]) {
      addAll(majorKeywords, MAJOR_KEYWORD_ALIASES[key]);
    }

    if (INDUSTRY_KEYWORD_ALIASES[key]) {
      const p = INDUSTRY_KEYWORD_ALIASES[key];
      industryKeywords.push(word);
      addAll(majorKeywords, p.aliases);
      addAll(industrySchoolHints, p.schoolHints);
      addAll(industryTags, p.industryTags);
    }

    if (BROAD_MAJOR_KEYWORDS.includes(word) || BROAD_MAJOR_KEYWORDS.includes(key)) {
      broadKeywords.push(word);
    }
  }

  const majorIntent = MAJOR_INTENT_RESOLVER.resolveMany(rawKeywords, { limit: 12 });
  const strictMajorCodes = majorIntent.status === 'ready' ? majorIntent.majorCodes : [];
  const majorIntentFailClosed = Boolean(rawKeywords.length && majorIntent.status !== 'ready' && majorIntent.items.some(item => ['too-broad', 'needs-choice'].includes(item.status)));

  return {
    rawInput: input || '',
    rawKeywords: unique(rawKeywords),
    majorKeywords: unique(majorKeywords),
    projectKeywords: unique(projectKeywords),
    industryKeywords: unique(industryKeywords),
    industrySchoolHints: unique(industrySchoolHints),
    industryTags: unique(industryTags),
    broadKeywords: unique(broadKeywords),
    hasMajorKeyword: majorKeywords.length > 0,
    hasProjectKeyword: projectKeywords.length > 0,
    hasIndustryKeyword: industryKeywords.length > 0,
    majorIntent,
    majorCodes: strictMajorCodes,
    majorIntentFailClosed
  };
}

export function keywordQueryWarnings(keywordQuery = {}) {
  const warnings = [];
  for (const word of keywordQuery.broadKeywords || []) {
    warnings.push(`“${word}”属于宽泛方向词，结果可能较多，可继续补充更具体的专业或行业关键词。`);
  }
  return warnings;
}
