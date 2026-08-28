import { DIRECTION_GROUPS, DEFAULT_EXPLORE_DIRECTIONS, CONFIRM_NOTES, FAMILY_CONSTRAINT_NOTES, QUESTION_SECTIONS, DIRECTION_EXPLORER_VERSION } from './direction-explorer-data.js?v=3949_0';
import { findDirectionConflicts } from './direction-explorer-conflicts.js?v=3949_0';

function uniq(list = []) { return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))]; }
function selectedOptions(answers = {}) {
  const selected = [];
  for (const section of QUESTION_SECTIONS) {
    for (const q of section.questions || []) {
      const raw = answers[q.key];
      const set = new Set(Array.isArray(raw) ? raw : (raw ? [raw] : []));
      for (const opt of q.options || []) if (set.has(opt.id)) selected.push({ section, question: q, option: opt });
    }
  }
  return selected;
}
function emptyStats(id) {
  const group = DIRECTION_GROUPS[id];
  return {
    id,
    label: group.label,
    shortLabel: group.shortLabel || group.label,
    keywords: group.keywords || [],
    majors: group.majors || [],
    learn: group.learn || '',
    confirmTemplate: group.confirm || [],
    exposureScore: 0,
    behaviorScore: 0,
    evidence: [],
    conflicts: [],
    confirmNotes: [],
    confidence: 'low',
    resultBucket: 'learn'
  };
}
function getStats(map, id) {
  if (!DIRECTION_GROUPS[id]) return null;
  if (!map[id]) map[id] = emptyStats(id);
  return map[id];
}
function addDirectionalEvidence(statsMap, dirs = {}, kind = 'behavior', label = '') {
  for (const [id, value] of Object.entries(dirs || {})) {
    const stat = getStats(statsMap, id);
    if (!stat) continue;
    const score = Number(value || 0);
    if (kind === 'exposure') stat.exposureScore += score;
    else stat.behaviorScore += score;
    if (label) stat.evidence.push(label);
  }
}
function compactLabels(items = [], limit = 4) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  const names = arr.slice(0, limit).map(x => x.shortLabel || x.label || String(x));
  return names.join('、') + (arr.length > limit ? `等 ${arr.length} 个方向` : '');
}
function respondentMeta(tags = []) {
  if (tags.includes('respondent_child')) return { type: 'child', label: '孩子自己选', confidenceNote: '这次主要来自孩子自己的选择，可作为较直接的讨论线索。' };
  if (tags.includes('respondent_parent')) return { type: 'parent', label: '家长观察选', confidenceNote: '这次主要来自家长观察，建议让孩子自己再选一次；两次不同不是坏事。' };
  if (tags.includes('respondent_family')) return { type: 'family', label: '家里一起讨论选', confidenceNote: '这次来自家庭一起讨论，可以作为家庭沟通记录。' };
  return { type: 'unknown', label: '未说明填写来源', confidenceNote: '建议标明是孩子自己选、家长观察选，还是家里一起讨论。' };
}
function notesFromTags(tags = [], dict = CONFIRM_NOTES) {
  return uniq(tags.map(tag => dict[tag]).filter(Boolean));
}
function familyNotesFromTags(tags = []) { return notesFromTags(tags, FAMILY_CONSTRAINT_NOTES); }
function sortStats(list = []) {
  return [...list].sort((a, b) => {
    const aScore = a.exposureScore + a.behaviorScore;
    const bScore = b.exposureScore + b.behaviorScore;
    return bScore - aScore || b.exposureScore - a.exposureScore || a.label.localeCompare(b.label, 'zh-Hans-CN');
  });
}
function applyConflicts(statsMap, conflicts = []) {
  for (const conflict of conflicts) {
    for (const id of conflict.directions || []) {
      const stat = statsMap[id];
      if (!stat) continue;
      stat.conflicts.push(conflict);
      stat.confirmNotes.push(conflict.message, conflict.action);
    }
  }
}
function bucketizeStats(stats = []) {
  for (const stat of stats) {
    const total = stat.exposureScore + stat.behaviorScore;
    const hasBoth = stat.exposureScore > 0 && stat.behaviorScore > 0;
    if (stat.conflicts.length) {
      stat.resultBucket = 'confirm';
      stat.confidence = 'medium';
    } else if (hasBoth && total >= 3) {
      stat.resultBucket = 'apply';
      stat.confidence = 'high';
    } else if (total > 0) {
      stat.resultBucket = 'learn';
      stat.confidence = 'medium';
    }
    stat.evidence = uniq(stat.evidence).slice(0, 5);
    stat.confirmNotes = uniq(stat.confirmNotes.concat(stat.confirmTemplate || [])).slice(0, 4);
  }
}
function defaultLearnItems(reason = '孩子接触还不多，先了解真实课程和专业名称，不急着排除。') {
  return DEFAULT_EXPLORE_DIRECTIONS.map(id => {
    const g = DIRECTION_GROUPS[id];
    return { ...emptyStats(id), evidence: [reason], confidence: 'low', resultBucket: 'learn' };
  }).filter(Boolean);
}
export function buildDirectionKeywordsByIds(directionIds = []) {
  return uniq(directionIds.flatMap(id => (DIRECTION_GROUPS[id]?.keywords || []).slice(0, 3))).slice(0, 9);
}
export function withDirectionSelection(result = {}, selectedDirectionIds = []) {
  const available = new Set([...(result.apply || []), ...(result.learn || []), ...(result.confirm || [])].map(x => x.id));
  const clean = uniq(selectedDirectionIds).filter(id => available.has(id)).slice(0, 3);
  return {
    ...result,
    selectedDirectionIds: clean,
    queryKeywords: buildDirectionKeywordsByIds(clean),
    visibleDirections: clean.map(id => DIRECTION_GROUPS[id]?.shortLabel || DIRECTION_GROUPS[id]?.label || id)
  };
}
export function buildDirectionExplorerResult(answers = {}) {
  const statsMap = {};
  const tags = [];
  const familyTags = [];
  const selected = selectedOptions(answers);
  for (const { question, option } of selected) {
    const kind = question.kind || 'behavior';
    if (option.dirs && (kind === 'exposure' || kind === 'behavior')) addDirectionalEvidence(statsMap, option.dirs, kind, option.label);
    if (Array.isArray(option.tags)) {
      tags.push(...option.tags);
      if (kind === 'family') familyTags.push(...option.tags);
    }
  }
  const activeIds = Object.keys(statsMap);
  const conflicts = findDirectionConflicts({ activeDirectionIds: activeIds, tags });
  applyConflicts(statsMap, conflicts);
  let all = Object.values(statsMap);
  bucketizeStats(all);
  all = sortStats(all);
  const lowExposure = tags.includes('low_exposure') || tags.includes('unclear') || !selected.length;
  let apply = all.filter(x => x.resultBucket === 'apply').slice(0, 4);
  let confirm = all.filter(x => x.resultBucket === 'confirm').slice(0, 5);
  let learn = all.filter(x => x.resultBucket === 'learn').slice(0, 6);
  if (lowExposure) {
    const existing = new Set(all.map(x => x.id));
    learn = learn.concat(defaultLearnItems().filter(x => !existing.has(x.id))).slice(0, 6);
  }
  if (!apply.length && !confirm.length && !learn.length && !familyTags.length) learn = defaultLearnItems().slice(0, 5);
  const selectedDirectionIds = apply.length ? apply.slice(0, 3).map(x => x.id) : [];
  const familyConstraints = familyNotesFromTags(familyTags);
  const respondent = respondentMeta(tags);
  const globalConfirm = notesFromTags(tags).filter(note => !Object.values(FAMILY_CONSTRAINT_NOTES).includes(note));
  const summary = lowExposure
    ? '孩子接触过的方向还不多，先从低成本了解开始，不要因为“没感觉”过早排除。'
    : '下面不是定向结论，只是方向讨论路标；请勾选 1-3 个方向，再回到分数附近专业池验证。';
  return withDirectionSelection({
    version: DIRECTION_EXPLORER_VERSION,
    respondent,
    apply,
    learn,
    confirm,
    familyConstraints,
    globalConfirm,
    conflicts,
    lowExposure,
    summary,
    selectedDirectionIds,
    queryKeywords: [],
    visibleDirections: [],
    updatedAt: Date.now()
  }, selectedDirectionIds);
}
export function buildDirectionExplorerPlainText(result = null) {
  if (!result) return '';
  const lines = [];
  lines.push('【孩子方向讨论记录】');
  lines.push('这不是直接定专业，只是帮助家里先圈出几个可以继续了解的方向，再回到分数附近专业池核验。');
  if (result.respondent?.label) lines.push(`填写来源：${result.respondent.label}`);
  if (result.apply?.length) { lines.push('', '可以先放进查询：', compactLabels(result.apply, 4)); }
  if (result.learn?.length) { lines.push('', '可以先了解：', compactLabels(result.learn, 4)); }
  if (result.confirm?.length || result.conflicts?.length) {
    lines.push('', '需要先确认：');
    uniq([...(result.confirm || []).flatMap(x => x.confirmNotes || []), ...(result.globalConfirm || [])]).slice(0, 6).forEach((x, i) => lines.push(`${i + 1}. ${x}`));
  }
  if (result.familyConstraints?.length) {
    lines.push('', '家庭约束提醒：');
    result.familyConstraints.slice(0, 5).forEach((x, i) => lines.push(`${i + 1}. ${x}`));
  }
  if (result.selectedDirectionIds?.length) lines.push('', `已准备应用到查询：${(result.visibleDirections || []).join(' / ')}`);
  return lines.join('\n');
}
