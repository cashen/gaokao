export function getQueryButtonLabel({ hasQueried=false, dirty=false, topRange=false }={}) {
  if (dirty) return '更新下方结果';
  return topRange ? '查看高分段专业' : '查看符合条件的专业';
}
export function getQueryButtonClass({ ready=true, level='normal', primary=true, loading=false, error=false }={}) {
  if (loading) return 'query-button action-primary is-loading';
  if (error) return 'query-button action-primary is-error';
  return `query-button ${primary ? 'action-primary' : 'action-secondary'} ${ready ? 'is-ready' : ''} is-${level}`.trim();
}
