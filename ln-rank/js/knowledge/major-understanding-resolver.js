import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../../kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { MAJOR_UNDERSTANDING_2026 } from '../../kb/major-understanding/major-understanding.generated.js?v=3949_0';
import { MAJOR_DISPLAY_CONTRACT_2026 } from '../../kb/major-understanding/major-display-contract.generated.js?v=3949_0';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../../kb/major-understanding/admission-major-alias.generated.js?v=3949_0';
import { createMajorCatalogResolver, normalizeMajorText } from '../../../shared/resources/majors/major-catalog-contract.js';
import { createMajorIntentResolver, MAJOR_INTENT_META } from '../../../shared/resources/majors/major-intent-resolver.v001.js';
import { getMajorSourceProfile, majorSourceInterpretation, MAJOR_SOURCE_PROFILE_META } from '../../kb/major-understanding/major-source-profile.generated.js?v=pr194';

const CATALOG_RESOLVER = createMajorCatalogResolver(MAJOR_CATALOG_2026);
const INTENT_RESOLVER = createMajorIntentResolver(MAJOR_CATALOG_2026, ADMISSION_MAJOR_ALIAS_2026, { sourceVersion: MAJOR_CATALOG_2026_META.version });
const BY_CODE = MAJOR_UNDERSTANDING_2026;
const DISPLAY_BY_CODE = MAJOR_DISPLAY_CONTRACT_2026;
const SOURCE_PROFILES = MAJOR_SOURCE_PROFILE_META;
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

function splitMajorQueryTerms(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const direct = CATALOG_RESOLVER.resolve(raw, { allowContains: false });
  if (direct?.kind === 'major' || direct?.kind === 'category') return [raw];
  return [...new Set(raw.split(/[,，、/；;|]+/).map(part => part.trim()).filter(Boolean).flatMap(part => {
    const directPart = CATALOG_RESOLVER.resolve(part, { allowContains: false });
    if (directPart?.kind === 'major' || directPart?.kind === 'category') return [part];
    return part.split(/(?:\s+(?:和|与|及|或)\s+|(?<=.{2})(?:和|与|或)(?=.{2}))/).map(item => item.trim()).filter(Boolean);
  }))];
}
export function resolveMajorQueryCandidates(input = '') {
  const terms = splitMajorQueryTerms(input);
  const intent = INTENT_RESOLVER.resolveMany(terms, { limit: 12 });
  const items = intent.items.map(item => {
    const exactCode = item.intentLevel === 'exact-major' && item.coreMajorCodes.length === 1 ? item.coreMajorCodes[0] : '';
    const exactName = exactCode ? BY_CODE[exactCode]?.name || item.intentLabel : '';
    const isExact = Boolean(exactCode && exactName);
    const candidates = item.candidates.map(candidate => ({
      code: candidate.code,
      name: candidate.name,
      majorClass: candidate.majorClass,
      discipline: candidate.discipline,
      directionLabel: candidate.directionLabel,
      matchType: item.matchType
    }));
    return Object.freeze({
      input: item.rawInput,
      status: isExact ? 'resolved' : (item.status === 'unresolved' ? 'unresolved' : (item.intentLevel === 'major-class' ? 'class-level' : 'needs-confirmation')),
      intentStatus: item.status,
      intentLevel: item.intentLevel,
      intentKey: item.intentKey,
      intentLabel: item.intentLabel,
      confidence: item.confidence,
      code: exactCode,
      name: exactName || item.intentLabel,
      matchType: item.matchType,
      coreMajorCodes: Object.freeze([...item.coreMajorCodes]),
      relatedMajorCodes: Object.freeze([...item.relatedMajorCodes]),
      coreMajorNames: Object.freeze(item.coreMajorCodes.map(code => BY_CODE[code]?.name || code)),
      relatedMajorNames: Object.freeze(item.relatedMajorCodes.map(code => BY_CODE[code]?.name || code)),
      warnings: Object.freeze([...item.warnings]),
      candidates: Object.freeze(candidates)
    });
  });
  const resolvedCodes = [...new Set(items.filter(item => item.status === 'resolved').map(item => item.code))];
  return Object.freeze({
    terms: Object.freeze(terms),
    items: Object.freeze(items),
    resolvedCodes: Object.freeze(resolvedCodes),
    ready: items.length > 0 && items.every(item => item.status === 'resolved'),
    intentStatus: intent.status,
    intentMeta: MAJOR_INTENT_META,
    catalogCount: INTENT_RESOLVER.count
  });
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
      boundary: understanding.boundary || '仅用于本科专业理解和家庭讨论，不构成就业预测、录取判断或填报建议。',
      sourceProfile: getMajorSourceProfile(fromMajor.code),
      sourceInterpretation: majorSourceInterpretation(fromMajor.code)
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
      boundary: '大类招生需以学校培养方案和招生章程为准，本提示不构成就业预测或填报建议。',
      sourceProfile: null,
      sourceInterpretation: Object.freeze({ available: false, status: 'class-level', source: null, fields: Object.freeze({}) })
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
    isClassLevel: Boolean(info.isClassLevel),
    source: info.sourceInterpretation || majorSourceInterpretation(info.code)
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
  resolverVersion: CATALOG_RESOLVER.contract.version,
  sourceProfileVersion: SOURCE_PROFILES.version,
  sourceProfileVerifiedCount: SOURCE_PROFILES.verifiedCount,
  sourceProfileMissingCount: SOURCE_PROFILES.missingCount
});
