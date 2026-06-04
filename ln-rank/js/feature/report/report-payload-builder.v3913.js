import { FEISHU_UI_CONFIG } from "../../config/feishu-ui-config.v3913.js";

export function currentBandRecords(state) {
  const band = state?.bands?.data?.bands?.[state.activeBand];
  return Array.isArray(band?.records) ? band.records : [];
}

export function canGenerateFeishuReport(state) {
  if (!state?.bands?.data) return { ok: false, reason: "请先查看符合条件的专业，再生成飞书报告。" };
  const records = currentBandRecords(state);
  if (!records.length) return { ok: false, reason: "当前区间没有可生成的专业结果。" };
  return { ok: true, reason: "" };
}

export function buildFeishuReportPayload(state) {
  const candidateScore = Number(state.candidateScore);
  return {
    candidateScore,
    rangePreset: state.rangePreset || "standard",
    activeBand: state.activeBand || "near",
    filters: {
      region: state.filters?.region || "all",
      schoolKeyword: state.filters?.schoolKeyword || "",
      majorKeyword: state.filters?.majorKeyword || ""
    },
    reportType: "currentBand",
    maxRecords: FEISHU_UI_CONFIG.maxRecords
  };
}
