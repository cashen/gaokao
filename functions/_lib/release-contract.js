export const LN_RANK_RELEASE_CONTRACT = {
  display: 'v3.9.47.4',
  asset: '3947_4',
  assetVersion: 'v3947_4',
  release: 'v3.9.47.4-ln-rank-low-score-api-bottomline-query-contract-fix-regression-12-role-no-fenxi',
  label: 'low-score-api-bottomline-query-contract-fix-regression-12-role-no-fenxi',
  noFenxiIncluded: true,
  cleanPackageContract: true,
  visibleVersionClean: true,
  cloudflarePagesExportContract: true,
  majorUnderstandingKb: true,
  knowledgeDisplayContract: true,
  uiHumanErgonomicsRegression: true,
  lowScoreApiBottomlineFix: true,
  majorBandsHealthProbe: true,
  queryImportVersionContract: true,
  bottomlineMobileSheetFallback: true,
  apiErrorFoldedDiagnostic: true,
  reportSections: [
    '一、概要判断',
    '二、当前方案怎么看',
    '三、前中后段快速确认',
    '四、最终排序清单',
    '五、本方案确认清单',
    '六、专业理解与家庭确认问题',
    '七、数据和使用边界'
  ]
};

// Backward-compatible alias: older helpers may import RELEASE_CONTRACT,
// while current Pages Functions import LN_RANK_RELEASE_CONTRACT.
export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT;
