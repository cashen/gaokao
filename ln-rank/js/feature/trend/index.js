// v3.9.21.6：趋势模块统一出口。
// 不再使用 export *，避免 data.js 与 rules.js 同时导出 MAJOR_TREND_DATA 时触发浏览器星号导出冲突，导致 major-trend-2025 空白。
export { MAJOR_TREND_DATA } from './data.js?v=3933_14';
export {
  segmentForScore,
  directionLabel,
  classifyDirectionFromText,
  classifyDirectionFromKeyword,
  trendRecordFor,
  trendTone,
  trendLabel,
  trendHintText,
  buildTrendSummaryForSelection
} from './rules.js?v=3933_14';
export {
  renderSearchTrendHint,
  renderSelectionTrendBox
} from './integration.js?v=3933_14';
