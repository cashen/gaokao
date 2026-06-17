export const LN_RANK_RELEASE_CONTRACT = {
  display: 'v3.9.46.2',
  asset: '3946_2',
  assetVersion: 'v3946_2',
  release: 'v3.9.46.2-ln-rank-release-contract-export-fix-clean-package-12-role-no-fenxi',
  label: 'release-contract-export-fix-clean-package-12-role-no-fenxi',
  noFenxiIncluded: true,
  cleanPackageContract: true,
  visibleVersionClean: true,
  cloudflarePagesExportContract: true,
  reportSections: [
    '一、概要判断',
    '二、当前方案怎么看',
    '三、前中后段快速确认',
    '四、最终排序清单',
    '五、本方案确认清单',
    '六、数据和使用边界'
  ]
};

// Backward-compatible alias: older helpers may import RELEASE_CONTRACT,
// while current Pages Functions import LN_RANK_RELEASE_CONTRACT.
export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT;
