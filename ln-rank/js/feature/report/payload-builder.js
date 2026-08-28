import { FEISHU_UI_CONFIG } from '../../config/feishu-ui-config.js?v=3949_0';
import { buildKeywordQuery } from '../major-pool/keyword-parser.js?v=3949_0';
import { getRangePresetLabel } from '../../domain/range-policy.js?v=3949_0';
import { getBandFocusLabel } from '../../domain/band-policy.js?v=3949_0';

export function currentBandRecords(state) {
  const band = state?.bands?.data?.bands?.[state.activeBand];
  return Array.isArray(band?.records) ? band.records : [];
}

export function canGenerateFeishuReport(state) {
  if (!state?.bands?.data) return { ok: false, reason: '请先查看符合条件的专业，再生成飞书报告。' };
  const records = currentBandRecords(state);
  if (!records.length) return { ok: false, reason: '当前区间没有可生成的专业结果。' };
  return { ok: true, reason: '' };
}

export function createReportContext(state) {
  return {
    candidateScore: Number(state?.candidateScore),
    rangePreset: state?.rangePreset || 'standard',
    rangePresetLabel: getRangePresetLabel(state?.rangePreset),
    bandFocus: state?.bandFocus || state?.activeBand || 'near',
    bandFocusLabel: getBandFocusLabel(state?.bandFocus || state?.activeBand),
    region: state?.filters?.region || 'all',
    schoolKeyword: state?.filters?.schoolKeyword || '',
    majorKeyword: state?.filters?.majorKeyword || '',
    ownershipFloor: state?.filters?.bottomLineMode || 'all'
  };
}

export function buildFeishuReportPayload(state) {
  const candidateScore = Number(state.candidateScore);
  const majorKeyword = state.filters?.majorKeyword || '';
  const bottomLineMode = state.bands?.data?.meta?.bottomLineMode || state.filters?.bottomLineMode || 'all';
  return {
    candidateScore,
    rangePreset: state.rangePreset || 'standard',
    activeBand: state.bandFocus || state.activeBand || 'near',
    bandFocus: state.bandFocus || state.activeBand || 'near',
    filters: {
      region: state.filters?.region || 'all',
      schoolKeyword: state.filters?.schoolKeyword || '',
      majorKeyword,
      bottomLineMode,
      keywordQuery: buildKeywordQuery(majorKeyword)
    },
    reportType: 'currentBand',
    maxRecords: FEISHU_UI_CONFIG.maxRecords,
    reportContext: createReportContext(state)
  };
}
