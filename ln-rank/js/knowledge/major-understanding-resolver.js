import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../../kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { MAJOR_UNDERSTANDING_2026 } from '../../kb/major-understanding/major-understanding.generated.js?v=3949_0';
import { MAJOR_DISPLAY_CONTRACT_2026 } from '../../kb/major-understanding/major-display-contract.generated.js?v=3949_0';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../../kb/major-understanding/admission-major-alias.generated.js?v=3949_0';

function cleanText(value, max = 120) {
  return String(value == null ? '' : value).replace(/\s+/g, '').replace(/[（）]/g, m => m === '（' ? '(' : ')').trim().slice(0, max);
}
function stripAdmissionSuffix(value = '') {
  return cleanText(value, 180)
    .replace(/\([^)]*(中外|合作|校企|高收费|较高收费|国际|实验班|试验班|拔尖|方向|卓越|师范|非师范|英语|日语|俄语|民族|定向|专项)[^)]*\)/g, '')
    .replace(/（[^）]*(中外|合作|校企|高收费|较高收费|国际|实验班|试验班|拔尖|方向|卓越|师范|非师范|英语|日语|俄语|民族|定向|专项)[^）]*）/g, '')
    .replace(/[\s·・]/g, '');
}
const BY_CODE = MAJOR_UNDERSTANDING_2026;
const DISPLAY_BY_CODE = MAJOR_DISPLAY_CONTRACT_2026;
const NAME_TO_CODE = new Map(MAJOR_CATALOG_2026.map(x => [cleanText(x.name), x.code]));
const CLASS_TO_CODES = new Map();
for (const item of MAJOR_CATALOG_2026) {
  if (!item.majorClass) continue;
  const key = cleanText(item.majorClass);
  if (!CLASS_TO_CODES.has(key)) CLASS_TO_CODES.set(key, []);
  CLASS_TO_CODES.get(key).push(item.code);
}
const ALIASES = ADMISSION_MAJOR_ALIAS_2026.map(x => ({ ...x, key: cleanText(x.pattern) })).sort((a, b) => b.key.length - a.key.length);
function resolveCodeByName(rawName = '') {
  const cleaned = cleanText(rawName);
  const stripped = stripAdmissionSuffix(rawName);
  if (NAME_TO_CODE.has(cleaned)) return { code: NAME_TO_CODE.get(cleaned), matchType: 'exact', confidence: 'high' };
  if (NAME_TO_CODE.has(stripped)) return { code: NAME_TO_CODE.get(stripped), matchType: 'bracket-clean', confidence: 'high' };
  const alias = ALIASES.find(x => x.confidence === 'high' && x.key && (cleaned === x.key || stripped === x.key));
  if (alias?.targetCodes?.length) return { code: alias.targetCodes[0], matchType: alias.matchType || 'alias', confidence: alias.confidence || 'high' };
  return null;
}
function resolveClassByName(rawName = '') {
  const cleaned = cleanText(rawName);
  const stripped = stripAdmissionSuffix(rawName);
  const directClass = [cleaned, stripped].find(x => CLASS_TO_CODES.has(x));
  if (directClass) return { majorClass: directClass, candidateCodes: CLASS_TO_CODES.get(directClass).slice(0, 24), matchType: 'major-class', confidence: 'class-level' };
  const alias = ALIASES.find(x => x.confidence === 'class-level' && x.key && (cleaned === x.key || stripped === x.key));
  if (alias) return { majorClass: alias.targetMajorClass || alias.pattern, candidateCodes: alias.candidateCodes || [], matchType: 'major-class', confidence: 'class-level', warning: alias.warning };
  return null;
}
function byStandardMajor(record = {}) {
  const sm = record.standardMajor || {};
  if (sm.code && BY_CODE[sm.code]) return { code: sm.code, matchType: sm.mappingStatus || 'standardMajor', confidence: 'high' };
  if (sm.name) {
    const found = resolveCodeByName(sm.name);
    if (found) return found;
  }
  if (sm.categoryName) {
    const foundClass = resolveClassByName(sm.categoryName);
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
  return { oneLine: card.oneLine || info.report?.shortSummary || '', questions: Array.isArray(card.questions) ? card.questions.slice(0, 2) : [], confidence: info.confidence, boundary: info.boundary, isClassLevel: Boolean(info.isClassLevel) };
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
export const MAJOR_UNDERSTANDING_META = MAJOR_CATALOG_2026_META;
