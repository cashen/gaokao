export const HISTORICAL_RANK_SELECTION_VERSION = 'historical-rank-selection-v3967_0';

export const HISTORICAL_RANK_SELECTION_POLICY = Object.freeze({
  referenceYear: 2025,
  reach: Object.freeze({ minRatio: 0.88, maxRatio: 0.95, minInclusive: true, maxInclusive: false }),
  match: Object.freeze({ minRatio: 0.95, maxRatio: 1.05, minInclusive: true, maxInclusive: true }),
  safe: Object.freeze({ minRatio: 1.05, maxRatio: 1.15, minInclusive: false, maxInclusive: true }),
  backup: Object.freeze({ minRatio: 1.15, maxRatio: 1.30, minInclusive: false, maxInclusive: true }),
  boundary: '历史位次分层只用于候选整理，不代表录取概率。'
});

function rank(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function within(value, rule) {
  const lower = rule.minInclusive ? value >= rule.minRatio : value > rule.minRatio;
  const upper = rule.maxInclusive ? value <= rule.maxRatio : value < rule.maxRatio;
  return lower && upper;
}
function result(key, label, className, phrase, values = {}) {
  return Object.freeze({ version: HISTORICAL_RANK_SELECTION_VERSION, key, label, className, phrase, ...values });
}

export function classifyHistoricalRankSelection(input = {}, policy = HISTORICAL_RANK_SELECTION_POLICY) {
  const candidateRank = rank(input.candidateRank);
  const targetRank = rank(input.targetRank);
  if (!candidateRank) return result('none', '未输入位次', 'gray', '输入本人位次后，可显示该记录对应的历史初选层级。', { candidateRank, targetRank, ratio: null });
  if (!targetRank) return result('unknown', '无法测算', 'unknown', `该记录缺少 ${policy.referenceYear} 对应位次，无法按本人位次测算层级。`, { candidateRank, targetRank, ratio: null });
  const ratio = targetRank / candidateRank;
  const rankText = targetRank.toLocaleString('zh-CN');
  const candidateText = candidateRank.toLocaleString('zh-CN');
  if (within(ratio, policy.reach)) return result('reach', '可冲', 'reach', `以 ${candidateText} 位为参照，该记录 ${policy.referenceYear} 对应位次 ${rankText}，属于可冲区间。`, { candidateRank, targetRank, ratio });
  if (within(ratio, policy.match)) return result('match', '匹配', 'match', `以 ${candidateText} 位为参照，该记录 ${policy.referenceYear} 对应位次 ${rankText}，属于匹配区间。`, { candidateRank, targetRank, ratio });
  if (within(ratio, policy.safe)) return result('safe', '稳妥', 'safe', `以 ${candidateText} 位为参照，该记录 ${policy.referenceYear} 对应位次 ${rankText}，属于稳妥区间。`, { candidateRank, targetRank, ratio });
  if (within(ratio, policy.backup)) return result('backup', '保底', 'backup', `以 ${candidateText} 位为参照，该记录 ${policy.referenceYear} 对应位次 ${rankText}，属于保底区间。`, { candidateRank, targetRank, ratio });
  if (ratio < policy.reach.minRatio) return result('out', '偏高', 'out', `以 ${candidateText} 位为参照，该记录 ${policy.referenceYear} 对应位次 ${rankText}，高于本页设定的可冲区间。`, { candidateRank, targetRank, ratio });
  return result('out', '低于初筛区', 'gray', `以 ${candidateText} 位为参照，该记录 ${policy.referenceYear} 对应位次 ${rankText}，低于本页设定的保底区间。`, { candidateRank, targetRank, ratio });
}

export function resolveHistoricalRankChange(input = {}) {
  const currentRank = rank(input.currentRank);
  const previousRank = rank(input.previousRank);
  const suppliedDelta = Number(input.delta);
  const delta = Number.isFinite(suppliedDelta) ? Math.round(suppliedDelta) : (currentRank && previousRank ? currentRank - previousRank : null);
  if (delta == null) return Object.freeze({ version:HISTORICAL_RANK_SELECTION_VERSION, key:'unknown', label:'位次无法比较', className:'gray', delta:null });
  if (delta < 0) return Object.freeze({ version:HISTORICAL_RANK_SELECTION_VERSION, key:'forward', label:`位次提高 ${Math.abs(delta).toLocaleString('zh-CN')}`, className:'bad', delta });
  if (delta > 0) return Object.freeze({ version:HISTORICAL_RANK_SELECTION_VERSION, key:'backward', label:`位次放宽 ${delta.toLocaleString('zh-CN')}`, className:'good', delta });
  return Object.freeze({ version:HISTORICAL_RANK_SELECTION_VERSION, key:'stable', label:'位次持平', className:'gray', delta:0 });
}
