/* v3.9.33.12 院校专业背景展示调度器
 * 统一整合：本校方向、本校相关、方向提醒。
 * 卡片/自选只给短提示；生成前确认/报告才给完整解释。
 */
import { matchLiaoningLocalStrongChain } from './liaoning-local-strong-chain.js?v=3949_0';
import { matchLiaoningMajorTrajectory } from './liaoning-major-trajectory-chain.js?v=3949_0';

const SURFACES = new Set(['card', 'selectionItem', 'summary', 'report']);
const BOUNDARY = '该提示不是录取判断，也不代表一定适合孩子；只提醒家长再看课程方向、就业场景和招生章程。';

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
const CONTEXT_TOKEN_GROUPS = [
  ['石油','化工','储运'], ['能源','电力'], ['轨道','交通','车辆'], ['航空','航天','飞行器'],
  ['电机','装备','制造'], ['冶金','材料'], ['矿业','测绘','安全'], ['建筑','土木','市政'],
  ['药学','制药'], ['农机','农业装备'], ['财经','管理'], ['医学','临床']
];
function contextTokens(value = '') {
  const text = clean(value, 120);
  const tokens = new Set();
  for (const group of CONTEXT_TOKEN_GROUPS) {
    for (const token of group) if (text.includes(token)) tokens.add(token);
  }
  return tokens;
}
function sameContext(strong = {}, trajectory = {}) {
  const a = contextTokens(strong.chainName || '');
  const b = contextTokens(trajectory.trajectoryName || trajectory.chainName || '');
  if (!a.size || !b.size) return false;
  for (const token of a) if (b.has(token)) return true;
  return false;
}
function localStrongOf(record = {}) {
  return record?.localStrongChain?.matched ? record.localStrongChain : matchLiaoningLocalStrongChain(record);
}
function trajectoryOf(record = {}) {
  return record?.trajectoryChain?.matched ? record.trajectoryChain : matchLiaoningMajorTrajectory(record);
}
function strongDepthLabel(hit = {}) {
  return hit.depth === 'core' ? '本校方向' : '本校相关';
}
function itemKind(hit = {}) {
  if (!hit) return '';
  return hit.kind === 'trajectory' ? 'trajectory' : 'background';
}
function summaryTitle(hit = {}) {
  if (itemKind(hit) === 'trajectory') return `方向提醒：${compactDirectionName(hit.trajectoryName || hit.chainName)}`;
  return `${strongDepthLabel(hit)}：${compactDirectionName(hit.chainName)}`;
}
function reportTitle(hit = {}) {
  if (itemKind(hit) === 'trajectory') return `方向提醒：${hit.trajectoryName || hit.chainName}`;
  return `${strongDepthLabel(hit)}：${hit.chainName}`;
}
function cardText(hit = {}) {
  if (itemKind(hit) === 'trajectory') return `方向提醒｜${compactDirectionName(hit.cardShort || hit.trajectoryName || hit.chainName)}`;
  return `${strongDepthLabel(hit)}｜${compactDirectionName(hit.chainName)}`;
}

function safeReviewHints(hit = {}) {
  const text = [hit.chainName, hit.trajectoryName, hit.cardShort, hit.selectionShort].filter(Boolean).join(' ');
  if (/石油|化工储运/.test(text)) return ['行业环境', '工作地点'];
  if (/能源|电力/.test(text)) return ['电力路径', '校招要求'];
  if (/轨道|交通|车辆/.test(text)) return ['行业路径', '工作场景'];
  if (/农机|农业/.test(text)) return ['课程', '校招'];
  if (/化工/.test(text)) return ['现场环境', '安全要求'];
  if (/冶金|钢铁/.test(text)) return ['工厂环境', '行业周期'];
  if (/药学|制药|医药/.test(text)) return ['培养周期', '行业规范'];
  if (/建筑|土木|市政/.test(text)) return ['行业周期', '项目现场'];
  if (/财经|金融|会计|管理/.test(text)) return ['证书', '实习资源'];
  if (/医学|临床|口腔/.test(text)) return ['培养周期', '体检限制'];
  return ['课程方向', '招生章程'];
}
function selectionText(hit = {}) {
  const points = safeReviewHints(hit).slice(0, 2);
  if (itemKind(hit) === 'trajectory') {
    const name = compactDirectionName(hit.cardShort || hit.trajectoryName || hit.chainName);
    return `提醒：${name}｜再看 ${points.join(' / ')}`;
  }
  const name = compactDirectionName(hit.chainName);
  return `背景：${name}｜再看 ${points.join(' / ')}`;
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

export function safeGetLocalContextPresentation(record = {}, surface = 'card') {
  try {
    return getLocalContextPresentation(record, surface);
  } catch (error) {
    console.warn('[ln-rank] local context presentation failed', {
      surface,
      school: record?.school || record?.schoolName || '',
      major: record?.major || record?.majorName || record?.rawMajorName || '',
      message: error?.message || String(error)
    });
    return null;
  }
}

export function renderLocalContextShortText(record = {}, surface = 'card') {
  return safeGetLocalContextPresentation(record, surface)?.text || '';
}

export function buildLocalContextSummary(items = []) {
  const rows = [];
  for (const item of Array.isArray(items) ? items : []) {
    const presentation = safeGetLocalContextPresentation(item, 'summary');
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
      ? `已选专业中，有 ${backgroundCount} 个专业和本校办学背景、行业方向关联较强，${trajectoryCount} 个专业存在方向提醒。这些信息不是录取判断，也不代表一定适合孩子；它的作用是提醒家长和孩子再看课程方向、就业场景和招生章程。`
      : ''
  };
}
