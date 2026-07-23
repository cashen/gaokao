import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../../kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { MAJOR_UNDERSTANDING_2026 } from '../../kb/major-understanding/major-understanding.generated.js?v=3949_0';
import { MAJOR_DISPLAY_CONTRACT_2026 } from '../../kb/major-understanding/major-display-contract.generated.js?v=3949_0';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../../kb/major-understanding/admission-major-alias.generated.js?v=3949_0';
import { createMajorCatalogResolver, normalizeMajorText } from '../../../shared/resources/majors/major-catalog-contract.js';

const CATALOG_RESOLVER = createMajorCatalogResolver(MAJOR_CATALOG_2026);
const BY_CODE = MAJOR_UNDERSTANDING_2026;
const DISPLAY_BY_CODE = MAJOR_DISPLAY_CONTRACT_2026;
const ALIASES = ADMISSION_MAJOR_ALIAS_2026
  .map(item => ({ ...item, key: normalizeMajorText(item.pattern) }))
  .sort((a, b) => b.key.length - a.key.length);

function resolveCodeByName(rawName = '') {
  const direct = CATALOG_RESOLVER.resolve(rawName, { allowContains: false });
  if (direct?.kind === 'major') {
    return {
      code: direct.item.code,
      matchType: direct.matchType,
      confidence: direct.confidence >= 90 ? 'high' : 'medium'
    };
  }
  const key = normalizeMajorText(rawName);
  const alias = ALIASES.find(item => item.confidence === 'high' && item.key && key === item.key);
  if (alias?.targetCodes?.length) {
    return {
      code: alias.targetCodes[0],
      matchType: alias.matchType || 'alias',
      confidence: alias.confidence || 'high'
    };
  }
  const contains = CATALOG_RESOLVER.resolve(rawName);
  if (contains?.kind === 'major') {
    return {
      code: contains.item.code,
      matchType: contains.matchType,
      confidence: contains.confidence >= 90 ? 'high' : 'medium'
    };
  }
  return null;
}

function resolveClassByName(rawName = '') {
  const direct = CATALOG_RESOLVER.resolve(rawName, { allowContains: false });
  if (direct?.kind === 'category') {
    return {
      majorClass: direct.item.name,
      candidateCodes: direct.item.codes || [],
      matchType: direct.matchType,
      confidence: 'class-level'
    };
  }
  const key = normalizeMajorText(rawName);
  const alias = ALIASES.find(item => item.confidence === 'class-level' && item.key && key === item.key);
  if (alias) {
    const majorClass = alias.targetMajorClass || alias.pattern;
    return {
      majorClass,
      candidateCodes: alias.candidateCodes || CATALOG_RESOLVER.codesForCategory(majorClass),
      matchType: 'major-class',
      confidence: 'class-level',
      warning: alias.warning
    };
  }
  const contains = CATALOG_RESOLVER.resolve(rawName);
  if (contains?.kind === 'category') {
    return {
      majorClass: contains.item.name,
      candidateCodes: contains.item.codes || [],
      matchType: contains.matchType,
      confidence: 'class-level'
    };
  }
  return null;
}

function byStandardMajor(record = {}) {
  const standard = record.standardMajor || {};
  if (standard.code && BY_CODE[standard.code]) return { code: standard.code, matchType: standard.mappingStatus || 'standardMajor', confidence: 'high' };
  if (standard.name) {
    const found = resolveCodeByName(standard.name);
    if (found) return found;
  }
  if (standard.categoryName) {
    const foundClass = resolveClassByName(standard.categoryName);
    if (foundClass) return foundClass;
  }
  return null;
}

export function resolveMajorUnderstanding(record = {}) {
  const standard = byStandardMajor(record);
  const fromMajor = standard || resolveCodeByName(record.major || record.majorName || record.name || '');
  if (fromMajor?.code && BY_CODE[fromMajor.code]) {
    const understanding = BY_CODE[fromMajor.code];
    const display = DISPLAY_BY_CODE[fromMajor.code] || {};
    return {
      matched: true,
      matchType: fromMajor.matchType,
      confidence: fromMajor.confidence || 'high',
      code: fromMajor.code,
      name: understanding.name,
      discipline: understanding.discipline,
      majorClass: understanding.majorClass,
      qualityLevel: understanding.qualityLevel || 'B',
      understanding,
      displayContract: display,
      card: display.card || {},
      diagnose: display.diagnose || {},
      selectionPool: display.selectionPool || {},
      report: display.report || {},
      feishu: display.feishu || {},
      boundary: understanding.boundary || '仅用于本科专业理解和家庭讨论，不构成就业预测、录取判断或填报建议。'
    };
  }
  const classMatch = standard?.majorClass ? standard : resolveClassByName(record.major || record.majorName || '');
  if (classMatch?.majorClass) {
    const className = classMatch.majorClass;
    return {
      matched: true,
      matchType: classMatch.matchType || 'major-class',
      confidence: 'class-level',
      code: '',
      name: className,
      majorClass: className,
      qualityLevel: 'C',
      isClassLevel: true,
      candidateCodes: classMatch.candidateCodes || [],
      card: {
        oneLine: `${className}属于大类招生或专业类名称，具体分流方向要看学校培养方案。`,
        questions: ['具体分流到哪些专业？', '分流规则、校区和培养学院是什么？']
      },
      selectionPool: {
        childQuestion: '孩子是否了解该大类可能分流到哪些专业？',
        parentReview: '家长需查看学校培养方案、分流规则、校区和招生章程。'
      },
      report: {
        shortSummary: `${className}属于专业类/大类招生，不能只按一个具体专业理解。`,
        reviewItems: ['专业分流规则', '培养学院', '校区和学费', '招生章程备注']
      },
      feishu: { compactSummary: `${className}为专业类/大类招生；建议确认分流规则、培养学院和校区。` },
      boundary: '大类招生需以学校培养方案和招生章程为准，本提示不构成就业预测或填报建议。'
    };
  }
  return { matched: false, meta: MAJOR_CATALOG_2026_META };
}

export function majorUnderstandingCard(record = {}) {
  const info = resolveMajorUnderstanding(record);
  if (!info.matched) return null;
  const card = info.card || {};
  return {
    oneLine: card.oneLine || info.report?.shortSummary || '',
    questions: Array.isArray(card.questions) ? card.questions.slice(0, 2) : [],
    confidence: info.confidence,
    boundary: info.boundary,
    isClassLevel: Boolean(info.isClassLevel)
  };
}

export function majorUnderstandingReportLines(item = {}, { limit = 3 } = {}) {
  const info = item.majorUnderstanding?.matched ? item.majorUnderstanding : resolveMajorUnderstanding(item);
  if (!info.matched) return [];
  const lines = [];
  if (info.report?.shortSummary) lines.push(`专业理解：${info.report.shortSummary}`);
  const review = Array.isArray(info.report?.reviewItems) ? info.report.reviewItems.slice(0, limit).join(' / ') : '';
  if (review) lines.push(`家庭复核：${review}`);
  lines.push(info.boundary || '仅用于家庭讨论和人工复核。');
  return lines;
}

export const MAJOR_UNDERSTANDING_META = Object.freeze({
  ...MAJOR_CATALOG_2026_META,
  resolverVersion: CATALOG_RESOLVER.contract.version
});
