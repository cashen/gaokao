export function getQueryButtonLabel({ hasQueried=false, dirty=false, topRange=false }={}) {
  if (dirty) return '按新条件重新查看';
  return topRange ? '查看高分段专业' : '按这些条件查看专业';
}
export function getQueryButtonClass({ ready=true, level='normal', primary=true, loading=false, error=false }={}) {
  if (loading) return 'query-button action-primary is-loading';
  if (error) return 'query-button action-primary is-error';
  return `query-button ${primary ? 'action-primary' : 'action-secondary'} ${ready ? 'is-ready' : ''} is-${level}`.trim();
}
