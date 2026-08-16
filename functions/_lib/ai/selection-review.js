export const AI_SELECTION_REVIEW_VERSION = 'ai-selection-review-v3990_2';

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

function duplicateFindings(items = []) {
  const seen = new Map();
  for (const item of items) {
    const school = clean(item?.school, 120), major = clean(item?.major, 160);
    if (!school || !major) continue;
    const key = `${school}|${major}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  if (!duplicates.length) return [];
  return [{
    level: 'warn',
    key: 'duplicate-school-major',
    text: `当前方案有${duplicates.length}组重复的学校×专业条目；重复记录不会增加方案覆盖面，建议先核对是否为不同项目/校区。`
  }];
}

function constraintValues(workspace = {}, key = '') {
  const row = (Array.isArray(workspace?.hardConstraints) ? workspace.hardConstraints : []).find(item => clean(item?.key, 80) === key);
  return [...new Set((Array.isArray(row?.values) ? row.values : []).map(value => clean(value, 120)).filter(Boolean))];
}

function regionLabel(value = '') {
  const key = clean(value, 120);
  if (key === 'ln' || key === 'province:辽宁') return '辽宁';
  if (key === 'shenyang' || key === 'city:沈阳') return '沈阳';
  if (key === 'dalian' || key === 'city:大连') return '大连';
  if (key.startsWith('province:')) return key.slice(9);
  if (key.startsWith('city:')) return key.slice(5);
  return '';
}

function schoolMajorDecisionSubject(item = {}) {
  const subject = item?.subject && typeof item.subject === 'object' ? item.subject : {};
  return { school: clean(subject.school, 120), major: clean(subject.major, 160) };
}

function familyConstraintFindings(items = [], workspace = {}) {
  const findings = [];
  const majorExclude = constraintValues(workspace, 'majorExclude');
  if (majorExclude.length) {
    const conflicts = items.filter(item => majorExclude.some(word => {
      const major = clean(item?.major, 160);
      return major && word && (major.includes(word) || word.includes(major));
    }));
    if (conflicts.length) findings.push({
      level: 'block', key: 'family-major-exclude-conflict', blocking: true,
      text: `当前方案有${conflicts.length}项命中家庭已经明确排除的专业方向，请先处理这些冲突。`
    });
  }

  const excludedLabels = constraintValues(workspace, 'regionExclude').map(regionLabel).filter(Boolean);
  if (excludedLabels.length) {
    const conflicts = items.filter(item => {
      const location = clean(item?.displayLocation, 120);
      return location && excludedLabels.some(label => location.includes(label));
    });
    if (conflicts.length) findings.push({
      level: 'block', key: 'family-region-exclude-conflict', blocking: true,
      text: `当前方案有${conflicts.length}项落在家庭已经明确排除的地区，请先确认是否真的要保留。`
    });
  }

  const rejectedPairs = (Array.isArray(workspace?.decisions) ? workspace.decisions : [])
    .filter(item => item?.kind === 'school_major' && item?.status === 'reject')
    .map(schoolMajorDecisionSubject)
    .filter(item => item.school && item.major);
  if (rejectedPairs.length) {
    const conflicts = items.filter(item => rejectedPairs.some(pair => clean(item?.school, 120) === pair.school && clean(item?.major, 160) === pair.major));
    if (conflicts.length) findings.push({
      level: 'block', key: 'rejected-school-major-conflict', blocking: true,
      text: `当前方案仍包含${conflicts.length}项你已经明确“暂时排除”的学校×专业，需要重新确认。`
    });
  }

  const explicit = workspace?.decisionProfile?.explicit || {};
  if (explicit.familyResourceSensitivity === 'resource_sensitive') {
    const missingTuition = items.filter(item => !clean(item?.tuition, 80)).length;
    if (missingTuition) findings.push({
      level: 'review', key: 'resource-sensitive-missing-tuition',
      text: `你已经明确家庭预算/资源敏感，但当前有${missingTuition}项缺少可核验学费信息；正式定方案前应优先补齐这些项目。`
    });
  }

  return findings;
}

function reviewFindings(items, counts, workspace = {}) {
  const findings = [];
  const total = counts.total;
  if (!total) return findings;

  findings.push(...duplicateFindings(items));
  findings.push(...familyConstraintFindings(items, workspace));

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

  return findings.slice(0, 14);
}

export function runSelectionReview(snapshot = null, workspace = {}) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items.slice(0, 112) : [];
  if (!snapshot || !items.length) {
    return {
      ok: false,
      importRequired: true,
      version: AI_SELECTION_REVIEW_VERSION,
      message: '当前家庭决策还没有导入家庭方案。请先点击“导入当前家庭方案”；导入只复制只读快照，不会修改 ln-rank 原方案。',
      counts: { upper: 0, near: 0, steady: 0, unknown: 0, total: 0 },
      findings: []
    };
  }

  const counts = bandCounts(items);
  const schools = frequency(items, item => item?.school);
  const locations = frequency(items, item => item?.displayLocation);
  const majors = frequency(items, item => item?.major);
  const findings = reviewFindings(items, counts, workspace);
  const blockingCount = findings.filter(item => item?.blocking === true || ['block', 'error', 'critical'].includes(clean(item?.level, 20))).length;

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
    blockingCount,
    deterministic: true,
    boundary: '只审查导入快照的结构、家庭明确约束与缺失字段；不预测录取，不把未知学费/校区/性质推断成已知事实。'
  };
}
