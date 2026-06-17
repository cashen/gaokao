export const HUMAN_WORKFLOW_STATES = {
  INPUT: 'input',
  EDITING: 'editing',
  RESULT_READY: 'result_ready',
  RESULT_STALE: 'result_stale',
  CONFLICT_PENDING: 'conflict_pending',
  SELECTING: 'selecting',
  REPORT_READY: 'report_ready',
  REPORT_STALE: 'report_stale',
  ERROR: 'error'
};

export function resolveHumanWorkflowState(context = {}) {
  const selectionCount = Number(context.selectionCount || 0);
  const blockingConflicts = Array.isArray(context.blockingConflicts) ? context.blockingConflicts : [];
  const resultFreshness = context.resultFreshness || 'none';
  const reportFreshness = context.reportFreshness || 'none';
  const hasValidScore = Boolean(context.hasValidScore);
  const hasFilters = Boolean(context.hasFilters);
  const hasFreshResults = resultFreshness === 'fresh' || Boolean(context.hasFreshResults);

  if (context.errorState?.active || resultFreshness === 'error') {
    return { taskState: HUMAN_WORKFLOW_STATES.ERROR, mainStep: selectionCount > 0 ? 'select' : 'filter', status: 'failed', note: '查询暂时失败，请稍后重试或检查网络。', nextAction: '重试查询' };
  }
  if (blockingConflicts.length) {
    return { taskState: HUMAN_WORKFLOW_STATES.CONFLICT_PENDING, mainStep: 'filter', status: 'warn', note: '当前筛选条件会互相排除一部分结果，请先确认。', nextAction: '调整筛选条件' };
  }
  if (resultFreshness === 'stale') {
    return { taskState: HUMAN_WORKFLOW_STATES.RESULT_STALE, mainStep: 'filter', status: 'stale', note: '条件已变化，请重新查看符合条件的专业。', nextAction: '重新查看专业' };
  }
  if (reportFreshness === 'stale') {
    return { taskState: HUMAN_WORKFLOW_STATES.REPORT_STALE, mainStep: selectionCount > 0 ? 'select' : 'filter', status: 'stale', note: '已选清单或条件已变化，之前的报告可能不对应当前方案。', nextAction: '重新生成前看一眼' };
  }
  if (selectionCount > 0) {
    if (reportFreshness === 'fresh') {
      return { taskState: HUMAN_WORKFLOW_STATES.REPORT_READY, mainStep: 'report', status: 'active', note: '已生成报告，仍需按章程、校区、学费和计划人工核验。', nextAction: '查看或复制报告' };
    }
    return { taskState: HUMAN_WORKFLOW_STATES.SELECTING, mainStep: 'select', status: 'active', note: `已有 ${selectionCount} 个自选专业，建议进入自选池看结构。`, nextAction: '整理自选池' };
  }
  if (hasFreshResults) {
    return { taskState: HUMAN_WORKFLOW_STATES.RESULT_READY, mainStep: 'filter', status: 'active', note: '已有查询结果，可把能接受的专业加入自选池。', nextAction: '加入自选' };
  }
  if (hasValidScore || hasFilters) {
    return { taskState: HUMAN_WORKFLOW_STATES.EDITING, mainStep: 'filter', status: 'active', note: '可以继续选择方向，也可以查看符合条件的专业。', nextAction: '查看专业' };
  }
  return { taskState: HUMAN_WORKFLOW_STATES.INPUT, mainStep: 'input', status: 'active', note: '先输入孩子分数，确定查看位置。', nextAction: '输入分数' };
}
