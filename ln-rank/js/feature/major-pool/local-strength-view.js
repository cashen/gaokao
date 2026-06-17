import { safeGetLocalContextPresentation } from '../../knowledge/index.js?v=3933_14';

function clean(value, max = 120) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function unique(list = []) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const text = clean(item, 60);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function directionFromEntry(entry = {}) {
  const raw = entry.title || entry.hit?.chainName || entry.hit?.trajectoryName || '';
  return clean(raw.replace(/^本校方向：/, '').replace(/^本校相关：/, '').replace(/^方向提醒：/, ''), 80) || '学校背景方向';
}

function defaultVerifyItems(entry = {}) {
  const source = unique(entry.reviewPoints || entry.hit?.reviewPoints || []);
  const base = ['招生计划', '校区', '近年位次', '学费', '培养方向'];
  return unique([...source, ...base]).slice(0, 6);
}

function strengthKind(entry = {}) {
  if (entry.kind === 'background') return /本校方向/.test(entry.title || '') ? '本校方向' : '本校相关';
  return '方向提醒';
}

export function resolveLocalStrengthMark(record = {}) {
  const summary = safeGetLocalContextPresentation(record, 'summary');
  if (!summary?.items?.length) return { matched: false, items: [] };
  const primary = summary.items[0] || {};
  const items = summary.items.slice(0, 2).map(entry => ({
    kind: entry.kind || 'background',
    title: clean(entry.title, 90),
    direction: directionFromEntry(entry),
    strengthKind: strengthKind(entry),
    reviewPoints: defaultVerifyItems(entry),
    reportTip: clean(entry.reportTip || entry.hit?.reportTip || entry.hit?.cardTip || '', 220),
    boundary: clean(entry.boundary || '不是录取判断，也不是填报建议；只提醒家庭重点了解和复核。', 220)
  }));
  const direction = items[0]?.direction || '学校背景方向';
  const why = clean(
    items[0]?.reportTip
    || `这条专业与学校办学背景或行业方向有关，容易被只看学校综合名气时忽略，建议单独了解培养方向和行业场景。`,
    220
  );
  return {
    matched: true,
    label: '学校强项方向',
    direction,
    strengthKind: items[0]?.strengthKind || '方向提醒',
    why,
    verifyItems: items[0]?.reviewPoints || ['招生计划', '校区', '近年位次', '培养方向'],
    boundary: '不是录取判断，也不是填报建议；只提醒家庭重点了解和复核。',
    items
  };
}

export function isLocalStrengthRecord(record = {}) {
  return Boolean(resolveLocalStrengthMark(record).matched);
}

export function filterLocalStrengthRecords(records = []) {
  return (Array.isArray(records) ? records : []).filter(isLocalStrengthRecord);
}

export function buildLocalStrengthSummary(records = []) {
  const rows = [];
  for (const record of Array.isArray(records) ? records : []) {
    const mark = resolveLocalStrengthMark(record);
    if (!mark.matched) continue;
    rows.push({ record, mark });
  }
  return {
    total: rows.length,
    rows,
    summaryText: rows.length
      ? `当前结果中，有 ${rows.length} 条专业与学校背景、行业方向或专业建设线索关联较明显，可以单独看看。`
      : '当前范围暂时没有明显的学校强项提示，可以继续查看全部专业，或放宽地区、专业方向后再看。'
  };
}

export function localStrengthRelationText(record = {}, activeBand = '') {
  const delta = Number(record.scoreDelta);
  const position = clean(record.position || record.statusLabel || '', 40);
  if (activeBand === 'upper') return '位于稍高目标范围，需要谨慎对照近年位次和招生计划。';
  if (activeBand === 'steady') return '位于低分侧补充范围，可作为家庭讨论的后段补充。';
  if (Number.isFinite(delta)) {
    if (delta > 0) return `相对当前分数约 +${delta} 分，属于本次查看范围内的稍高侧条目。`;
    if (delta < -15) return `相对当前分数约 ${delta} 分，更偏低分侧补充。`;
    return `相对当前分数约 ${delta} 分，属于本次查看范围内的可讨论条目。`;
  }
  return position ? `当前显示位置：${position}。` : '位于本次查看范围内，仍需按当年位次复核。';
}
