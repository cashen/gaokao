function cleanNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/[,，\s]/g, '').replace(/名|位|分/g, '');
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function toNumber(value, fallback = null) {
  const n = cleanNumber(value);
  return n == null ? fallback : n;
}

export function formatNumber(value) {
  const n = toNumber(value, null);
  return n == null ? '—' : Math.round(n).toLocaleString('zh-CN');
}

function pickNumber(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = obj;
      for (const part of parts) cur = cur && typeof cur === 'object' ? cur[part] : undefined;
      const n = toNumber(cur, null);
      if (n != null) return n;
      continue;
    }
    const n = toNumber(obj[key], null);
    if (n != null) return n;
  }
  return null;
}

export function getItemReferenceRank(item = {}) {
  return pickNumber(item, [
    'rank2025',
    'rank',
    'minRank',
    'lowestRank',
    'lowest_rank',
    'referenceRank',
    'reference_rank',
    'lastYearRank',
    'admissionRank',
    'historyCompare.rank2025',
    'historyCompare.rank'
  ]);
}

export function getItemReferenceScore(item = {}) {
  return pickNumber(item, [
    'score2025',
    'score',
    'minScore',
    'lowestScore',
    'lowest_score',
    'referenceScore',
    'historyCompare.score2025',
    'historyCompare.score'
  ]);
}

export function getCandidateRankInfo(input = {}, items = []) {
  const manualRank = pickNumber(input, ['candidateRank', 'rank', 'candidate_rank', 'candidateRank2025']);
  if (manualRank != null) {
    return {
      rank: Math.round(manualRank),
      source: 'manual',
      label: `约 ${formatNumber(manualRank)} 位`,
      note: '考生位次来自整理页手动填写。'
    };
  }

  const candidateScore = toNumber(input.candidateScore, null);
  const candidates = (Array.isArray(items) ? items : [])
    .map(item => {
      const rank = getItemReferenceRank(item);
      const delta = toNumber(item.scoreDelta, null);
      const score = getItemReferenceScore(item);
      const distance = delta != null
        ? Math.abs(delta)
        : (candidateScore != null && score != null ? Math.abs(score - candidateScore) : 9999);
      return { item, rank, distance };
    })
    .filter(x => x.rank != null)
    .sort((a, b) => a.distance - b.distance || a.rank - b.rank);

  if (candidates.length && candidates[0].distance <= 3) {
    return {
      rank: Math.round(candidates[0].rank),
      source: 'estimatedFromPool',
      label: `参考约 ${formatNumber(candidates[0].rank)} 位`,
      note: `未填写考生真实位次，已用自选池中与考生分数最接近的专业参考位次估算，距离约 ${formatNumber(candidates[0].distance)} 分；正式填报应以 2026 一分一段为准。`
    };
  }

  return {
    rank: null,
    source: 'missing',
    label: '位次待填写',
    note: '未填写考生真实位次，且自选池中没有足够接近的可估算位次；概要中不输出虚假的位次跨度。'
  };
}

export function getRankGap(candidateRank, itemRank) {
  const c = toNumber(candidateRank, null);
  const r = toNumber(itemRank, null);
  if (c == null || r == null) return null;
  return Math.round(c - r);
}

export function rankGapText(gap) {
  const g = toNumber(gap, null);
  if (g == null) return '位次待核验';
  if (g > 0) return `向前跨越约 ${formatNumber(g)} 名`;
  if (g < 0) return `向后回落约 ${formatNumber(Math.abs(g))} 名`;
  return '基本同位次';
}

export function itemShortName(item = {}) {
  const school = String(item.school || '学校待核验').trim();
  const major = String(item.major || '专业待核验').trim();
  return `${school}｜${major}`;
}
