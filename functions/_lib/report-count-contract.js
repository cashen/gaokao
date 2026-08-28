function normStatus(value = '') {
  const s = String(value || '');
  if (s.includes('稍高') || s.includes('上探')) return 'higher';
  if (s.includes('稳妥') || s.includes('补充') || s.includes('更稳')) return 'safe';
  return 'main';
}

export function buildReportCountContract(items = []) {
  const rows = Array.isArray(items) ? items : [];
  const groups = { higher: [], main: [], safe: [] };
  rows.forEach((item, index) => {
    const key = normStatus(item?.statusLabel || item?.position || item?.band || '');
    groups[key].push({ item, order: index + 1 });
  });
  const total = rows.length;
  const pct = n => total ? Math.round(n / total * 100) : 0;
  return {
    totalCount: total,
    highTargetCount: groups.higher.length,
    mainReferenceCount: groups.main.length,
    saferBackupCount: groups.safe.length,
    highTargetOrders: groups.higher.map(x => x.order),
    mainReferenceOrders: groups.main.map(x => x.order),
    saferBackupOrders: groups.safe.map(x => x.order),
    highTargetPercent: pct(groups.higher.length),
    mainReferencePercent: pct(groups.main.length),
    saferBackupPercent: pct(groups.safe.length),
    labels: { higher: '稍高目标', main: '主要参考', safe: '低分侧补充' }
  };
}
