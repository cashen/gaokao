const FLOW_ACTION_KEY = 'lnRank.flow.lastAction';
const FLOW_ACTION_AT_KEY = 'lnRank.flow.lastActionAt';
const FLOW_ACTION_TTL = 30 * 60 * 1000;

export const MAIN_FLOW_STEPS = [
  { key: 'input', label: '确认参考位置', short: '分数换算2026位次' },
  { key: 'filter', label: '圈出可讨论专业', short: '方向与家庭条件' },
  { key: 'select', label: '留下孩子愿意读的', short: '加入已选清单' },
  { key: 'report', label: '家庭逐项复核', short: '和孩子讨论' }
];

export const SCHOOL_FLOW_STEPS = [
  { key: 'input', label: '确认目标学校', short: '本部·分校·校区' },
  { key: 'filter', label: '看校内专业', short: '普通与特殊分开' },
  { key: 'select', label: '留下能讨论的', short: '加入同一已选清单' },
  { key: 'report', label: '家庭逐项复核', short: '和孩子讨论' }
];

export const PLAN_FLOW_STEPS = [
  { key: 'score', label: '确认分数' },
  { key: 'selected', label: '检查已选' },
  { key: 'structure', label: '看结构' },
  { key: 'report', label: '保存报告' }
];

function n(value) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function recentAction(action) {
  try {
    const saved = localStorage.getItem(FLOW_ACTION_KEY);
    const at = Number(localStorage.getItem(FLOW_ACTION_AT_KEY) || 0);
    return saved === action && at > 0 && Date.now() - at < FLOW_ACTION_TTL;
  } catch { return false; }
}
export function markFlowAction(action, meta = {}) {
  try {
    localStorage.setItem(FLOW_ACTION_KEY, String(action || ''));
    localStorage.setItem(FLOW_ACTION_AT_KEY, String(Date.now()));
    if (meta && typeof meta === 'object') localStorage.setItem('lnRank.flow.lastActionMeta', JSON.stringify(meta));
  } catch {}
}
export function clearFlowAction(action) {
  try {
    if (!action || localStorage.getItem(FLOW_ACTION_KEY) === action) {
      localStorage.removeItem(FLOW_ACTION_KEY);
      localStorage.removeItem(FLOW_ACTION_AT_KEY);
      localStorage.removeItem('lnRank.flow.lastActionMeta');
    }
  } catch {}
}

export function resolveMainFlowStep(context = {}) {
  const selectionCount = n(context.selectionCount);
  const hasValidScore = Boolean(context.hasValidScore);
  const hasFilters = Boolean(context.hasFilters);
  const hasResults = Boolean(context.hasResults || context.hasFreshResults);
  const hasStaleResults = Boolean(context.hasStaleResults || context.resultFreshness === 'stale');
  const hasBlockingConflicts = Boolean(context.hasBlockingConflicts);
  const reportFreshness = context.reportFreshness || 'none';
  const recentReport = selectionCount > 0 && !hasStaleResults && recentAction('report');
  const reportActive = Boolean(context.reportActive) || reportFreshness === 'generating' || (reportFreshness === 'fresh' && recentReport);
  const reportFailed = Boolean(context.reportFailed) || reportFreshness === 'failed';
  if (context.errorActive) return { current: selectionCount > 0 ? 'select' : 'filter', completed: hasValidScore ? ['input'] : [], status: 'failed', note: '查询暂时失败，请稍后重试或检查网络。' };
  if (hasBlockingConflicts) return { current: 'filter', completed: hasValidScore ? ['input'] : [], status: 'warn', note: '当前筛选条件会互相排除一部分结果，请先确认条件关系。' };
  if (hasStaleResults) return { current: 'filter', completed: hasValidScore ? ['input'] : [], status: 'stale', note: '条件已变化，请重新查看符合条件的专业。' };
  if (reportFreshness === 'stale') return { current: selectionCount > 0 ? 'select' : 'filter', completed: hasValidScore ? ['input','filter'] : [], status: 'stale', note: '已选清单或条件已变化，之前的报告可能不对应当前方案。' };
  if (reportActive || reportFailed) return { current: 'report', completed: ['input','filter','select'], status: reportFailed ? 'failed' : 'active', note: reportFailed ? '报告暂时没生成成功，可以复制文字版或稍后重试。' : '已进入报告整理，最后仍需人工核验章程、校区、学费和计划。' };
  if (selectionCount > 0) return { current: 'select', completed: ['input','filter'], status: 'active', note: `已有 ${selectionCount} 个自选专业，建议进入自选池看结构。` };
  if (hasValidScore || hasFilters || hasResults) return { current: 'filter', completed: hasValidScore ? ['input'] : [], status: 'active', note: hasResults ? '已有查询结果，可把能接受的专业加入自选池。' : '可以继续选择方向，也可以查看符合条件的专业。' };
  return { current: 'input', completed: [], status: 'active', note: '先输入孩子分数，确定查看位置。' };
}

export function resolvePlanFlowStep(context = {}) {
  const hasScore = Boolean(context.hasScore);
  const itemCount = n(context.itemCount);
  const analysisFresh = Boolean(context.analysisFresh);
  const analysisRunning = Boolean(context.analysisRunning);
  const reportFreshness = context.reportFreshness || 'none';
  const reportGenerating = Boolean(context.reportGenerating) || reportFreshness === 'generating';
  const reportFailed = Boolean(context.reportFailed) || reportFreshness === 'failed';
  if (!hasScore) return { current: 'score', completed: [], status: 'active', note: '先确认孩子分数，报告会按这个分数重新整理。' };
  if (!itemCount) return { current: 'selected', completed: ['score'], status: 'empty', note: '请先从查询页加入至少 1 个可讨论专业。' };
  if (reportFreshness === 'stale') return { current: 'structure', completed: ['score','selected'], status: 'stale', note: '已选清单或分数已变化，之前的报告可能不对应当前方案，建议重新看一眼。' };
  if (reportGenerating || reportFailed) return { current: 'report', completed: ['score','selected','structure'], status: reportFailed ? 'failed' : 'active', note: reportFailed ? '报告暂时没生成成功，可以复制文字版或重试。' : '正在保存家庭复核报告。' };
  if (reportFreshness === 'fresh') return { current: 'report', completed: ['score','selected','structure'], status: 'active', note: '报告已生成，仍需按章程、校区、学费和计划人工核验。' };
  if (analysisRunning || analysisFresh) return { current: 'structure', completed: ['score','selected'], status: analysisRunning ? 'loading' : 'active', note: analysisRunning ? '正在检查分段、方向和核验项。' : '已经看过结构，可以生成报告或复制文字版。' };
  return { current: 'selected', completed: ['score'], status: 'active', note: '先检查已选专业，再生成前看一眼。' };
}

export function stateClassFor(stepKey, resolved = {}) {
  if (resolved.current === stepKey) return 'is-current';
  if (Array.isArray(resolved.completed) && resolved.completed.includes(stepKey)) return 'is-complete';
  return 'is-todo';
}
