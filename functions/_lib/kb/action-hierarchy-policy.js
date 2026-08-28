export const ACTION_HIERARCHY_POLICY = {
  version: 'v3912-action-hierarchy',
  primary: ['查看符合条件的专业', '按新条件重新查看', '更新结果'],
  secondary: ['查看热度参考', '更多方向', '单条解读', '重置条件'],
  mutedDanger: ['清空已选专业'],
  rule: '同一任务区只保留一个主操作。深绿色实心表示下一步；浅底描边表示辅助；清空类弱化显示。'
};
export function getQueryActionLabel({ hasQueried = false, dirty = false, topRange = false } = {}) {
  if (dirty) return '按新条件重新查看';
  return topRange ? '查看高分段专业' : '查看符合条件的专业';
}
export function getActionDiagnostics() { return { ok: true, version: ACTION_HIERARCHY_POLICY.version, rule: ACTION_HIERARCHY_POLICY.rule }; }
