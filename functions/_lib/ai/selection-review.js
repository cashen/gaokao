export const AI_SELECTION_REVIEW_VERSION = 'ai-selection-review-v3990_1';

function clean(value, max = 180) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function frequency(items = [], getter) {
  const counts = new Map();
  for (const item of items) {
    const key = clean(getter(item), 120);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
}

function bandCounts(items = []) {
  const counts = { upper: 0, near: 0, steady: 0, unknown: 0, total: items.length };
  for (const item of items) {
    const key = clean(item?.bandKey, 30);
    if (['upper', 'near', 'steady'].includes(key)) counts[key] += 1;
    else counts.unknown += 1;
  }
  return counts;
}

function reviewFindings(items, counts) {
  const findings = [];
  const total = counts.total;
  if (!total) return findings;

  if (total < 12) findings.push({ level: 'warn', key: 'pool-thin', text: '当前条目偏少，更像候选清单，还不适合作为完整填报方案。' });
  if (counts.near < Math.ceil(total * 0.3)) findings.push({ level: 'warn', key: 'near-thin', text: '主要参考区偏薄，建议继续补充与当前位次更接近、孩子也愿意读的项目。' });
  if (counts.steady < Math.max(3, Math.ceil(total * 0.22))) findings.push({ level: 'warn', key: 'steady-thin', text: '低分侧承接偏少，最终方案需要避免后段只剩很少选择。' });
  if (counts.upper > Math.ceil(total * 0.4)) findings.push({ level: 'warn', key: 'upper-heavy', text: '稍高目标占比较高，前段可能好看但中后段承接不足。' });
  if (counts.unknown) findings.push({ level: 'review', key: 'unknown-band', text: `${counts.unknown}项缺少可识别的位置分组，需要回到完整专业初选确认历史位次口径。` });

  const missingRank = items.filter(item => !safeNumber(item?.rank2026)).length;
  if (missingRank) findings.push({ level: 'review', key: 'missing-rank', text: `${missingRank}项没有2026可识别参考位次，不能用于判断方案前中后段厚度。` });

  const missingTuition = items.filter(item => !clean(item?.tuition, 80)).length;
  if (missingTuition) findings.push({ level: 'review', key: 'missing-tuition', text: `${missingTuition}项在当前快照中没有明确学费信息；这不代表免费或普通收费，正式填报前需查当年招生计划/章程。` });

  const locations = frequency(items, item => item?.displayLocation);
  const topLocation = locations[0];
  if (topLocation && total >= 8 && topLocation[1] / total >= 0.45) {
    findings.push({ level: 'info', key: 'location-concentration', text: `地域较集中：${topLocation[0]}相关条目占${Math.round(topLocation[1] / total * 100)}%。如果这是家庭明确目标可以保留，否则建议检查是否因筛选习惯遗漏了其他可接受地区。` });
  }

  const majors = frequency(items, item => item?.major);
  const topMajor = majors[0];
  if (topMajor && total >= 8 && topMajor[1] / total >= 0.35) {
    findings.push({ level: 'info', key: 'major-concentration', text: `当前同名专业“${topMajor[0]}”占${Math.round(topMajor[1] / total * 100)}%。只有在孩子明确接受时才适合保持这种集中度。` });
  }

  return findings.slice(0, 10);
}

export function runSelectionReview(snapshot = null) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items.slice(0, 112) : [];
  if (!snapshot || !items.length) {
    return {
      ok: false,
      importRequired: true,
      version: AI_SELECTION_REVIEW_VERSION,
      message: '当前AI工作区还没有导入家庭方案。请先点击“导入当前选择池”；导入只复制只读快照，不会修改 ln-rank 原方案。',
      counts: { upper: 0, near: 0, steady: 0, unknown: 0, total: 0 },
      findings: []
    };
  }

  const counts = bandCounts(items);
  const schools = frequency(items, item => item?.school);
  const locations = frequency(items, item => item?.displayLocation);
  const majors = frequency(items, item => item?.major);
  const findings = reviewFindings(items, counts);

  return {
    ok: true,
    importRequired: false,
    version: AI_SELECTION_REVIEW_VERSION,
    snapshotVersion: clean(snapshot?.version, 80),
    total: items.length,
    counts,
    uniqueSchoolCount: schools.length,
    uniqueMajorCount: majors.length,
    topSchools: schools.slice(0, 5).map(([name, count]) => ({ name, count })),
    topLocations: locations.slice(0, 5).map(([name, count]) => ({ name, count })),
    findings,
    deterministic: true,
    boundary: '只审查导入快照的结构与缺失字段；不预测录取，不把未知学费/校区/性质推断成已知事实。'
  };
}