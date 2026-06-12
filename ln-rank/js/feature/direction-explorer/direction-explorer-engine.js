import { DIRECTION_GROUPS, DEFAULT_EXPLORE_DIRECTIONS, CONFIRM_NOTES, QUESTION_SECTIONS } from './direction-explorer-data.js?v=3928';

function uniq(list = []) { return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))]; }
function addScore(scores, dirs = {}) {
  for (const [id, value] of Object.entries(dirs || {})) {
    if (!DIRECTION_GROUPS[id]) continue;
    scores[id] = (scores[id] || 0) + Number(value || 0);
  }
}
function selectedOptions(answers = {}) {
  const selected = [];
  for (const section of QUESTION_SECTIONS) {
    for (const q of section.questions || []) {
      const set = new Set(Array.isArray(answers[q.key]) ? answers[q.key] : []);
      for (const opt of q.options || []) if (set.has(opt.id)) selected.push({ question: q.key, option: opt });
    }
  }
  return selected;
}
function directionItem(id, reason = '') {
  const group = DIRECTION_GROUPS[id];
  if (!group) return null;
  return { id, label: group.label, shortLabel: group.shortLabel || group.label, keywords: group.keywords || [], reason };
}
function pickDirections(ids = [], limit = 5) {
  return uniq(ids).map(id => directionItem(id)).filter(Boolean).slice(0, limit);
}

function compactLabels(items = [], limit = 4) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  const names = arr.slice(0, limit).map(x => x.shortLabel || x.label || String(x));
  return names.join('、') + (arr.length > limit ? `等 ${arr.length} 个方向` : '');
}

function notesFromTags(tags = []) {
  return uniq(tags.map(tag => CONFIRM_NOTES[tag]).filter(Boolean));
}
function addDefaultExplore(reason = '') {
  return DEFAULT_EXPLORE_DIRECTIONS.map(id => directionItem(id, reason)).filter(Boolean);
}
export function buildDirectionExplorerResult(answers = {}) {
  const scores = {};
  const tags = [];
  const touchedDirectionIds = [];
  for (const { option } of selectedOptions(answers)) {
    addScore(scores, option.dirs);
    if (option.dirs) touchedDirectionIds.push(...Object.keys(option.dirs));
    if (Array.isArray(option.tags)) tags.push(...option.tags);
  }
  const lowExposure = tags.includes('low_exposure') || tags.includes('unclear') || !selectedOptions(answers).length;
  const sorted = Object.entries(scores)
    .filter(([id]) => DIRECTION_GROUPS[id])
    .sort((a, b) => b[1] - a[1]);
  let focusIds = sorted.filter(([, score]) => score >= 3).map(([id]) => id).slice(0, 4);
  let exploreIds = sorted.filter(([id]) => !focusIds.includes(id)).map(([id]) => id);
  if (lowExposure) exploreIds.push(...DEFAULT_EXPLORE_DIRECTIONS);
  if (!focusIds.length && sorted.length) {
    focusIds = sorted.slice(0, 2).map(([id]) => id);
    exploreIds = sorted.slice(2).map(([id]) => id).concat(DEFAULT_EXPLORE_DIRECTIONS);
  }
  if (!focusIds.length && !exploreIds.length) exploreIds = [...DEFAULT_EXPLORE_DIRECTIONS];
  const focus = pickDirections(focusIds, 4);
  const explore = pickDirections(exploreIds.filter(id => !focus.some(x => x.id === id)), 6);
  const confirmNotes = notesFromTags(tags);
  const directionConfirmNotes = focus.concat(explore).flatMap(item => (DIRECTION_GROUPS[item.id]?.confirm || [])).slice(0, 3);
  const confirm = uniq(confirmNotes.concat(directionConfirmNotes)).slice(0, 5);
  const queryBase = focus.length ? focus : explore.slice(0, 4);
  const visibleDirections = queryBase.map(item => item.shortLabel || item.label).slice(0, 4);
  const queryKeywords = uniq(queryBase.flatMap(item => item.keywords || [])).slice(0, 18);
  const summary = lowExposure
    ? '孩子接触过的方向还不多，先从几个低成本了解方向开始，不要因为“没感觉”过早排除。'
    : '先把这些方向放到专业查询里看看，再结合分数附近真实专业逐条讨论。';
  return {
    version: 'v1',
    focus,
    explore: explore.length ? explore : addDefaultExplore('可以先了解，不急着排除。').slice(0, 5),
    confirm,
    visibleDirections,
    queryKeywords,
    lowExposure,
    summary,
    updatedAt: Date.now()
  };
}
export function buildDirectionExplorerPlainText(result = null) {
  if (!result || (!result.focus?.length && !result.explore?.length && !result.confirm?.length)) return '';
  const lines = [];
  lines.push('【孩子方向参考】');
  lines.push('这部分不是给孩子定专业，只是帮助家里讨论：哪些方向更值得看，哪些方向只是没接触过，哪些地方需要再确认。');
  if (result.focus?.length) {
    lines.push('');
    lines.push('更值得重点讨论：');
    lines.push(compactLabels(result.focus, 4));
  }
  if (result.explore?.length) {
    lines.push('');
    lines.push('可以先了解：');
    lines.push(compactLabels(result.explore, 4));
    lines.push('孩子接触不多的方向，不建议因为“没感觉”就直接排除。');
  }
  if (result.confirm?.length) {
    lines.push('');
    lines.push('需要再确认：');
    result.confirm.slice(0, 5).forEach((x, i) => lines.push(`${i + 1}. ${x}`));
  }
  return lines.join('\n');
}
