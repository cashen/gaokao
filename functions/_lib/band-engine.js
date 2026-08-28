import { RANGE_PRESETS } from './band-config.js';
import { getStatus } from './status-engine.js';
import { matchRegion, matchKeyword } from './major-filter.js';
import { buildDisplayTags } from './school-display-tags.js';
function rankSortValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

export function getPreset(key) { return RANGE_PRESETS[key] || RANGE_PRESETS.standard; }
export function makeBands(candidateScore, presetKey) {
  const preset = getPreset(presetKey);
  const out = {};
  for (const key of ['upper','near','steady']) {
    const b = preset.bands[key];
    const a = candidateScore + b.minDelta;
    const c = candidateScore + b.maxDelta;
    out[key] = { key, title: b.title, desc: b.desc, minScore: Math.min(a,c), maxScore: Math.max(a,c), rangeText: `${Math.min(a,c)}-${Math.max(a,c)} 分` };
  }
  return out;
}
export function classifyBand(score, bands) {
  for (const key of ['upper','near','steady']) {
    const b = bands[key];
    if (score >= b.minScore && score <= b.maxScore) return key;
  }
  return null;
}
export function buildBandResult(records, { candidateScore, presetKey, filters }) {
  const bands = makeBands(candidateScore, presetKey);
  const grouped = { upper: { ...bands.upper, records: [] }, near: { ...bands.near, records: [] }, steady: { ...bands.steady, records: [] } };
  for (const record of records) {
    if (!Number.isFinite(record.score)) continue;
    if (!matchRegion(record, filters.region)) continue;
    if (!matchKeyword(record, filters.schoolKeyword, filters.majorKeyword)) continue;
    const band = classifyBand(record.score, bands);
    if (!band) continue;
    const delta = record.score - candidateScore;
    const status = getStatus(delta);
    const display = buildDisplayTags(record);
    grouped[band].records.push({
      ...record,
      ...display,
      band,
      scoreDelta: delta,
      statusKey: status.key,
      statusLabel: status.label,
      position: status.position
    });
  }
  for (const key of ['upper','near','steady']) {
    grouped[key].records.sort((a,b) => Math.abs(a.score - candidateScore) - Math.abs(b.score - candidateScore) || rankSortValue(a.rank) - rankSortValue(b.rank));
    grouped[key].count = grouped[key].records.length;
  }
  return grouped;
}
