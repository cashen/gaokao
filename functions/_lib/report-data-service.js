import { loadAllRecords } from "./fenxi-manifest.js";
import { normalizeRecord } from "./fenxi-normalizer.js";
import { buildBandResult, makeBands } from "./band-engine.js";

function clean(value, max = 50) {
  return String(value || "").trim().slice(0, max);
}

export function normalizeReportParams(input = {}) {
  const candidateScore = Math.round(Number(input.candidateScore));
  const activeBand = clean(input.activeBand || "near", 20);
  const rangePreset = clean(input.rangePreset || "standard", 20);
  const maxRecordsRaw = Math.round(Number(input.maxRecords || 20));
  const maxRecords = Math.max(1, Math.min(30, Number.isFinite(maxRecordsRaw) ? maxRecordsRaw : 20));

  if (!Number.isFinite(candidateScore) || candidateScore < 400 || candidateScore > 750) {
    throw new Error("请先输入 400～750 之间的有效分数后再生成飞书报告。");
  }

  if (!["upper", "near", "steady"].includes(activeBand)) {
    throw new Error("飞书报告区间参数不正确。");
  }

  return {
    candidateScore,
    activeBand,
    rangePreset,
    maxRecords,
    filters: {
      region: clean(input.filters?.region || "all", 30),
      schoolKeyword: clean(input.filters?.schoolKeyword || "", 40),
      majorKeyword: clean(input.filters?.majorKeyword || "", 40)
    }
  };
}

export async function buildReportData(request, env, rawParams) {
  const params = normalizeReportParams(rawParams);
  const { manifest, records: rawRecords } = await loadAllRecords(request, env || {});
  const records = rawRecords.map(normalizeRecord).filter((r) => r.school && r.major && Number.isFinite(r.score));
  const bands = buildBandResult(records, {
    candidateScore: params.candidateScore,
    presetKey: params.rangePreset,
    filters: params.filters
  });
  const counts = {
    upper: bands.upper.count,
    near: bands.near.count,
    steady: bands.steady.count
  };
  counts.total = counts.upper + counts.near + counts.steady;

  const selectedBand = bands[params.activeBand];
  if (!selectedBand || !selectedBand.records.length) {
    throw new Error("当前筛选条件下没有可生成的专业结果。");
  }

  return {
    ...params,
    dataScope: "辽宁2025物理类",
    manifest,
    bands,
    counts,
    selectedBand,
    selectedRecords: selectedBand.records.slice(0, params.maxRecords),
    bandRanges: makeBands(params.candidateScore, params.rangePreset)
  };
}
