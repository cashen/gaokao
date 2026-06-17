import { PUSH_RATE_REFERENCE, PUSH_RATE_REFERENCE_VERSION } from './push-rate-reference-data.js';

function normalizeName(value = '') {
  return String(value || '')
    .replace(/[\s·・]/g, '')
    .replace(/[()]/g, m => (m === '(' ? '（' : '）'))
    .replace(/（.*?校区）/g, '')
    .replace(/（.*?学院）/g, '')
    .replace(/秦皇岛分校/g, '')
    .replace(/盘锦校区/g, '')
    .trim();
}

const INDEX = new Map();
for (const row of PUSH_RATE_REFERENCE) {
  const names = [row.schoolName, ...(row.aliases || [])];
  for (const name of names) {
    const key = normalizeName(name);
    if (key) INDEX.set(key, row);
  }
}

function levelWeight(level = '') {
  const s = String(level);
  if (s === 'high') return 4;
  if (s === 'medium-high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low-medium') return 1;
  return 0;
}

function sourceWeight(level = '') {
  const s = String(level || '').toUpperCase();
  if (s.startsWith('A')) return 4;
  if (s.startsWith('B')) return 3;
  if (s.startsWith('C')) return 2;
  return 1;
}

export function getPushRateReference(schoolName = '') {
  const key = normalizeName(schoolName);
  if (!key) return null;
  let found = INDEX.get(key);
  if (!found) {
    for (const [name, row] of INDEX.entries()) {
      if (key.includes(name) || name.includes(key)) { found = row; break; }
    }
  }
  if (!found) return null;
  return {
    version: PUSH_RATE_REFERENCE_VERSION,
    schoolName: found.schoolName,
    sourceLevel: found.sourceLevel || 'D',
    pushOpportunityLevel: found.pushOpportunityLevel || 'unknown',
    schoolPushRateText: found.schoolPushRateText || '推免参考待核验',
    recommendQuotaText: found.recommendQuotaText || (found.recommendQuota ? `${found.recommendQuota}名` : ''),
    confidence: found.confidence || 'low',
    majorLevelStatus: found.majorLevelStatus || 'need_manual_check',
    notes: (found.notes || []).slice(0, 3),
    sourceUrls: (found.sourceUrls || []).slice(0, 3),
    collegeSignals: (found.collegeSignals || []).slice(0, 4),
    tags: (found.tags || []).slice(0, 6)
  };
}

export function buildPushRateSummary(items = []) {
  const refs = [];
  const byLevel = {};
  const bySourceLevel = {};
  const matchedSchools = new Map();
  let officialLikeCount = 0;
  let highOpportunityCount = 0;
  let mediumHighOpportunityCount = 0;
  let unknownCount = 0;
  let needMajorCheckCount = 0;

  for (const item of Array.isArray(items) ? items : []) {
    const ref = getPushRateReference(item.school || item.schoolName || '');
    if (!ref) { unknownCount += 1; continue; }
    refs.push({ order: item.order, school: item.school || item.schoolName, major: item.major || '', ref });
    byLevel[ref.pushOpportunityLevel] = (byLevel[ref.pushOpportunityLevel] || 0) + 1;
    bySourceLevel[ref.sourceLevel] = (bySourceLevel[ref.sourceLevel] || 0) + 1;
    matchedSchools.set(ref.schoolName, ref);
    if (sourceWeight(ref.sourceLevel) >= 3) officialLikeCount += 1;
    if (levelWeight(ref.pushOpportunityLevel) >= 4) highOpportunityCount += 1;
    if (levelWeight(ref.pushOpportunityLevel) >= 3) mediumHighOpportunityCount += 1;
    if (ref.majorLevelStatus === 'need_manual_check') needMajorCheckCount += 1;
  }

  const total = Array.isArray(items) ? items.length : 0;
  const matchedCount = refs.length;
  const topRefs = Array.from(matchedSchools.values())
    .sort((a, b) => levelWeight(b.pushOpportunityLevel) - levelWeight(a.pushOpportunityLevel) || sourceWeight(b.sourceLevel) - sourceWeight(a.sourceLevel))
    .slice(0, 8);
  const highSchools = topRefs.filter(r => levelWeight(r.pushOpportunityLevel) >= 3).map(r => `${r.schoolName}（${r.schoolPushRateText}）`).slice(0, 5);
  const collegeSignals = [];
  for (const ref of topRefs) {
    for (const sig of ref.collegeSignals || []) collegeSignals.push(`${ref.schoolName}${sig.name ? '·' + sig.name : ''}：${sig.quotaText || '名额线索待核验'}`);
  }

  const pathHint = !total ? 'empty'
    : mediumHighOpportunityCount >= Math.ceil(total * 0.25) ? 'study-platform-visible'
    : matchedCount >= Math.ceil(total * 0.35) ? 'has-reference-data'
    : 'weak-reference-data';

  return {
    version: PUSH_RATE_REFERENCE_VERSION,
    total,
    matchedCount,
    unknownCount: Math.max(0, total - matchedCount),
    matchedPct: total ? Math.round(matchedCount / total * 100) : 0,
    byLevel,
    bySourceLevel,
    officialLikeCount,
    highOpportunityCount,
    mediumHighOpportunityCount,
    needMajorCheckCount,
    highSchools,
    topRefs,
    collegeSignals: collegeSignals.slice(0, 8),
    pathHint,
    advisorText: buildPushAdvisorText({ total, matchedCount, mediumHighOpportunityCount, highSchools, collegeSignals, needMajorCheckCount })
  };
}

function buildPushAdvisorText({ total, matchedCount, mediumHighOpportunityCount, highSchools, collegeSignals, needMajorCheckCount }) {
  if (!total) return '已选专业为空，暂无法判断升学与推免参考。';
  if (!matchedCount) return '当前已选专业暂未匹配到可用推免参考数据，不能据此判断升学跳板价值。';
  const parts = [];
  parts.push(`当前已选专业中有${matchedCount}个志愿匹配到学校级推免参考数据。`);
  if (mediumHighOpportunityCount) parts.push(`其中${mediumHighOpportunityCount}个来自整体推免机会较强或中高的院校，可作为升学跳板参考。`);
  if (highSchools?.length) parts.push(`代表院校：${highSchools.join('、')}。`);
  if (collegeSignals?.length) parts.push('部分学院/方向存在名额线索，但仍需补毕业生分母，不能直接当专业保研率。');
  if (needMajorCheckCount) parts.push('校级推免率不等于所报专业实际保研机会，专业/学院名额需人工核验。');
  return parts.join('');
}
