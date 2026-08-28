import { safeGetLocalContextPresentation } from '../../knowledge/index.js?v=3949_3';
import { get211BackgroundHint } from '../../knowledge/211-background-hint.js?v=3949_3';

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
  if (entry.sourceKind === '211背景') return entry.strengthKind || '211背景';
  if (entry.kind === 'background') return /本校方向/.test(entry.title || '') ? '本校方向' : '本校相关';
  return '方向提醒';
}

function normalizeLocalItem(entry = {}) {
  return {
    kind: entry.kind || 'background',
    sourceKind: entry.kind === 'trajectory' ? '方向提醒' : '省内背景',
    title: clean(entry.title, 90),
    direction: directionFromEntry(entry),
    strengthKind: strengthKind(entry),
    reviewPoints: defaultVerifyItems(entry),
    reportTip: clean(entry.reportTip || entry.hit?.reportTip || entry.hit?.cardTip || '', 240),
    boundary: clean(entry.boundary || '不是录取判断，也不是填报建议；只提醒家庭重点了解和复核。', 220)
  };
}

function resolveLocalItems(record = {}) {
  const summary = safeGetLocalContextPresentation(record, 'summary');
  return (Array.isArray(summary?.items) ? summary.items : []).slice(0, 2).map(normalizeLocalItem);
}

function resolve211Items(record = {}) {
  const hint = get211BackgroundHint(record);
  if (!hint?.visible) return [];
  const review = unique([...(Array.isArray(hint.reviewPoints) ? hint.reviewPoints : []), '招生章程', '培养方案', '课程方向', '专业分流', '近年位次']).slice(0, 6);
  const direction = clean(hint.direction || hint.label || '211院校背景方向', 80);
  return [{
    kind: 'national211',
    sourceKind: '211背景',
    title: clean(`${hint.label || '211背景'}：${direction}`, 90),
    direction,
    strengthKind: '211背景',
    reviewPoints: review,
    reportTip: clean(`这条专业与学校公开的 211 院校学科背景存在可复核对应，建议重点查看培养方案、招生章程和专业方向。`, 240),
    boundary: clean(hint.boundary || '211背景只作复核线索，不代表填报建议，也不代表录取判断。', 220)
  }];
}

function itemPriority(item = {}) {
  if (item.sourceKind === '省内背景' && item.strengthKind === '本校方向') return 10;
  if (item.sourceKind === '211背景') return 8;
  if (item.sourceKind === '省内背景') return 7;
  if (item.sourceKind === '方向提醒') return 3;
  return 1;
}

function evidenceLevel(item = {}) {
  if (item.sourceKind === '省内背景' && item.strengthKind === '本校方向') return { key: 'school-direction', label: '本校方向' };
  if (item.sourceKind === '211背景') return { key: '211-major-evidence', label: '211 专业对应' };
  if (item.sourceKind === '省内背景') return { key: 'school-related', label: '本校相关' };
  return { key: 'direction-clue', label: '方向提醒' };
}

function choosePrimaryItem(items = []) {
  return [...items].sort((a, b) => itemPriority(b) - itemPriority(a))[0] || {};
}

function sourceKindsText(items = []) {
  const kinds = unique(items.map(x => x.sourceKind).filter(Boolean));
  return kinds.length ? kinds.join(' / ') : '学校背景';
}

export function resolveLocalStrengthMark(record = {}) {
  const items = [...resolveLocalItems(record), ...resolve211Items(record)];
  if (!items.length) return { matched: false, items: [] };
  const primary = choosePrimaryItem(items);
  const direction = primary.direction || '学校背景方向';
  const sourceKinds = unique(items.map(x => x.sourceKind).filter(Boolean));
  const why = clean(
    primary.reportTip
    || `这条专业与学校办学背景或行业方向有关，容易被只看学校综合名气时忽略，建议单独了解培养方向和行业场景。`,
    240
  );
  const verifyItems = Array.isArray(primary.reviewPoints) && primary.reviewPoints.length
    ? primary.reviewPoints
    : ['招生计划', '校区', '近年位次', '培养方向'];
  const evidence = evidenceLevel(primary);
  return {
    matched: true,
    label: '院校背景提示',
    direction,
    strengthKind: primary.strengthKind || '方向提醒',
    evidenceLevel: evidence.key,
    evidenceLabel: evidence.label,
    sourceKinds,
    sourceText: sourceKindsText(items),
    why,
    verifyItems,
    boundary: '不是录取判断，也不是填报建议；只提醒家庭重点了解和复核。211背景只作复核线索，不能替代招生章程和当年位次判断。',
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
  const sourceCount = { local: 0, national211: 0, trajectory: 0 };
  for (const record of Array.isArray(records) ? records : []) {
    const mark = resolveLocalStrengthMark(record);
    if (!mark.matched) continue;
    rows.push({ record, mark });
    if (mark.sourceKinds?.includes('省内背景')) sourceCount.local += 1;
    if (mark.sourceKinds?.includes('211背景')) sourceCount.national211 += 1;
    if (mark.sourceKinds?.includes('方向提醒')) sourceCount.trajectory += 1;
  }
  const sourceParts = [];
  if (sourceCount.local) sourceParts.push(`省内背景 ${sourceCount.local} 条`);
  if (sourceCount.national211) sourceParts.push(`211背景 ${sourceCount.national211} 条`);
  if (sourceCount.trajectory) sourceParts.push(`方向提醒 ${sourceCount.trajectory} 条`);
  return {
    total: rows.length,
    rows,
    sourceCount,
    sourceText: sourceParts.join('｜'),
    summaryText: rows.length
      ? `当前已加载结果中，有 ${rows.length} 条院校背景提示；它们来自可复核的省内背景、211 专业对应或方向线索。${sourceParts.length ? `其中：${sourceParts.join('，')}。` : ''}`
      : '当前已加载范围暂时没有院校背景提示，可以继续查看当前列表或加载更多专业。'
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