/* v3.9.32 院校专业背景展示调度器
 * 统一整合：本校主干方向、本校特色相关、学习就业方向提醒。
 * 卡片/自选只给短提示；生成前确认/报告才给完整解释。
 */
import { matchLiaoningLocalStrongChain } from './liaoning-local-strong-chain.js?v=3932';
import { matchLiaoningMajorTrajectory } from './liaoning-major-trajectory-chain.js?v=3932';

const SURFACES = new Set(['card', 'selectionItem', 'summary', 'report']);
const BOUNDARY = '该提示不代表录取优势，只说明这个专业与学校办学背景和行业方向关联较强，建议家长再看课程方向、就业场景和招生章程。';

function clean(value, max = 160) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}
function compactDirectionName(value = '') {
  return clean(value, 80)
    .replace(/方向$/, '')
    .replace(/与过程控制$/, '')
    .trim() || '院校背景';
}
function compactReviewPoints(points = [], max = 2) {
  return (Array.isArray(points) ? points : [])
    .map(x => clean(x, 40))
    .filter(Boolean)
    .slice(0, max);
}
function normalizeText(value = '') {
  return clean(value, 120)
    .replace(/方向|与|和|及|装备|专业|工程|智能/g, '')
    .replace(/\s+/g, '')
    .trim();
}
function sameContext(strong = {}, trajectory = {}) {
  const a = normalizeText(strong.chainName || '');
  const b = normalizeText(trajectory.trajectoryName || trajectory.chainName || '');
  return Boolean(a && b && (a.includes(b) || b.includes(a) || strong.school === trajectory.school));
}
function localStrongOf(record = {}) {
  return record?.localStrongChain?.matched ? record.localStrongChain : matchLiaoningLocalStrongChain(record);
}
function trajectoryOf(record = {}) {
  return record?.trajectoryChain?.matched ? record.trajectoryChain : matchLiaoningMajorTrajectory(record);
}
function strongDepthLabel(hit = {}) {
  return hit.depth === 'core' ? '本校主干方向' : '本校特色相关';
}
function itemKind(hit = {}) {
  if (!hit) return '';
  return hit.kind === 'trajectory' ? 'trajectory' : 'background';
}
function summaryTitle(hit = {}) {
  if (itemKind(hit) === 'trajectory') return `学习就业方向提醒：${compactDirectionName(hit.trajectoryName || hit.chainName)}`;
  return `${strongDepthLabel(hit)}：${compactDirectionName(hit.chainName)}`;
}
function reportTitle(hit = {}) {
  if (itemKind(hit) === 'trajectory') return `学习就业方向提醒：${hit.trajectoryName || hit.chainName}`;
  return `${strongDepthLabel(hit)}：${hit.chainName}`;
}
function cardText(hit = {}) {
  if (itemKind(hit) === 'trajectory') return `方向提醒｜${compactDirectionName(hit.cardShort || hit.trajectoryName || hit.chainName)}`;
  return `${strongDepthLabel(hit)}｜${compactDirectionName(hit.chainName)}`;
}
function selectionText(hit = {}) {
  const points = compactReviewPoints(hit.reviewPoints, 2);
  if (itemKind(hit) === 'trajectory') {
    const raw = clean(hit.selectionShort || '', 80);
    if (raw) return `提醒：${raw}`;
    const name = compactDirectionName(hit.cardShort || hit.trajectoryName || hit.chainName);
    return `提醒：${name}${points.length ? `｜${points.join(' / ')}` : ''}`;
  }
  const name = compactDirectionName(hit.chainName);
  return `背景：${name}${points.length ? `｜${points.join(' / ')}` : ''}`;
}

export function resolveLocalContext(record = {}) {
  const strongChain = localStrongOf(record);
  const trajectory = trajectoryOf(record);
  if (strongChain && trajectory) {
    if (sameContext(strongChain, trajectory)) {
      return { primary: { ...strongChain, kind: 'background' }, secondary: null, strongChain, trajectory, merged: true };
    }
    return { primary: { ...strongChain, kind: 'background' }, secondary: trajectory, strongChain, trajectory, merged: false };
  }
  if (strongChain) return { primary: { ...strongChain, kind: 'background' }, secondary: null, strongChain, trajectory: null, merged: false };
  if (trajectory) return { primary: trajectory, secondary: null, strongChain: null, trajectory, merged: false };
  return { primary: null, secondary: null, strongChain: null, trajectory: null, merged: false };
}

export function getLocalContextPresentation(record = {}, surface = 'card') {
  const safeSurface = SURFACES.has(surface) ? surface : 'card';
  const context = resolveLocalContext(record);
  if (!context.primary) return null;
  const primary = context.primary;
  if (safeSurface === 'card') {
    return {
      matched: true,
      mode: 'compact',
      text: cardText(primary),
      label: itemKind(primary) === 'trajectory' ? '方向提醒' : strongDepthLabel(primary),
      name: compactDirectionName(primary.cardShort || primary.chainName || primary.trajectoryName),
      fullTextAllowed: false,
      items: [primary],
      context
    };
  }
  if (safeSurface === 'selectionItem') {
    return {
      matched: true,
      mode: 'chip',
      text: selectionText(primary),
      label: itemKind(primary) === 'trajectory' ? '提醒' : '背景',
      name: compactDirectionName(primary.chainName || primary.trajectoryName),
      fullTextAllowed: false,
      items: [primary],
      context
    };
  }
  const items = [primary, context.secondary].filter(Boolean);
  if (safeSurface === 'summary') {
    return {
      matched: true,
      mode: 'summary',
      items: items.map(hit => ({
        kind: itemKind(hit),
        title: summaryTitle(hit),
        reviewPoints: compactReviewPoints(hit.reviewPoints, 5),
        boundary: hit.boundary || BOUNDARY,
        hit
      })),
      fullTextAllowed: true,
      context
    };
  }
  return {
    matched: true,
    mode: 'report',
    items: items.map(hit => ({
      kind: itemKind(hit),
      title: reportTitle(hit),
      reportTip: hit.reportTip || hit.cardTip || '',
      reviewPoints: Array.isArray(hit.reviewPoints) ? hit.reviewPoints : [],
      boundary: hit.boundary || BOUNDARY,
      hit
    })),
    fullTextAllowed: true,
    context
  };
}

export function renderLocalContextShortText(record = {}, surface = 'card') {
  return getLocalContextPresentation(record, surface)?.text || '';
}

export function buildLocalContextSummary(items = []) {
  const rows = [];
  for (const item of Array.isArray(items) ? items : []) {
    const presentation = getLocalContextPresentation(item, 'summary');
    if (!presentation?.items?.length) continue;
    for (const entry of presentation.items) {
      rows.push({ item, ...entry });
    }
  }
  const seen = new Set();
  const uniqueRows = [];
  for (const row of rows) {
    const key = `${row.item?.school || row.hit?.school || ''}|${row.item?.major || row.hit?.matchedMajor || ''}|${row.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRows.push(row);
  }
  const backgroundCount = uniqueRows.filter(x => x.kind === 'background').length;
  const trajectoryCount = uniqueRows.filter(x => x.kind === 'trajectory').length;
  const lines = uniqueRows.slice(0, 8).map(row => ({
    text: `${row.item?.school || row.hit?.school || '学校待核验'} · ${row.item?.major || row.hit?.matchedMajor || '专业待核验'} · ${row.title}`,
    reviewPoints: row.reviewPoints || []
  }));
  return {
    total: uniqueRows.length,
    backgroundCount,
    trajectoryCount,
    lines,
    summaryText: uniqueRows.length
      ? `已选专业中，有 ${backgroundCount} 个专业和本校办学背景、行业方向关联较强，${trajectoryCount} 个专业存在学习就业方向提醒。这些提示不代表录取优势，只用于帮助家长再看课程方向、就业场景和招生章程。`
      : ''
  };
}
