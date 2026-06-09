import { normalizeRecord } from './fenxi-normalizer.js';
import { getStatus } from './status-engine.js';
import { matchRegion, matchKeyword } from './major-filter.js';

function rankSortValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

const DEFAULT_UP = 10;
const DEFAULT_DOWN = 25;

function classifyByView(score, viewScore) {
  const delta = score - viewScore;
  if (delta >= 1 && delta <= DEFAULT_UP) return 'upper';
  if (delta <= 0 && delta >= -10) return 'near';
  if (delta <= -11 && delta >= -DEFAULT_DOWN) return 'lower';
  return null;
}

function groupTitle(key) {
  if (key === 'upper') return '稍高目标';
  if (key === 'near') return '主要参考';
  return '主要参考补充';
}

function groupRange(key, viewScore) {
  if (key === 'upper') return `${viewScore + 1}-${viewScore + 10}`;
  if (key === 'near') return `${viewScore - 10}-${viewScore}`;
  return `${viewScore - 25}-${viewScore - 11}`;
}

// 兼容旧版 /api/major-window。新主线使用 /api/major-bands。
export function buildMajorWindow(rawRecords, { candidateScore, viewScore, filters }) {
  const groups = {
    upper: { title: groupTitle('upper'), rangeText: groupRange('upper', viewScore), records: [] },
    near: { title: groupTitle('near'), rangeText: groupRange('near', viewScore), records: [] },
    lower: { title: groupTitle('lower'), rangeText: groupRange('lower', viewScore), records: [] }
  };

  for (const raw of rawRecords) {
    const record = normalizeRecord(raw);
    if (!Number.isFinite(record.score)) continue;
    if (!matchRegion(record, filters.region)) continue;
    if (!matchKeyword(record, filters.schoolKeyword, filters.majorKeyword)) continue;

    const group = classifyByView(record.score, viewScore);
    if (!group) continue;

    const delta = record.score - candidateScore;
    const status = getStatus(delta);

    groups[group].records.push({
      ...record,
      group,
      scoreDelta: delta,
      scoreDeltaFromCandidate: delta,
      scoreDeltaFromView: record.score - viewScore,
      statusKey: status.key,
      statusLabel: status.label,
      position: status.position
    });
  }

  for (const key of Object.keys(groups)) {
    groups[key].records.sort((a, b) => Math.abs(a.score - viewScore) - Math.abs(b.score - viewScore) || rankSortValue(a.rank) - rankSortValue(b.rank));
    groups[key].count = groups[key].records.length;
  }

  return groups;
}
