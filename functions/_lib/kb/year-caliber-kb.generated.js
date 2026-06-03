export const YEAR_CALIBER_KB = {
  version: 'v3985-year-caliber-ln-physics-2025',
  province: '辽宁',
  subject: '物理类',
  activeDataYear: 2025,
  rankTableYear: 2025,
  planYear: null,
  catalogYear: 2026,
  lines: {
    specialControlLine: 515,
    undergraduateLine: 367,
    vocationalLine: 150
  },
  publicBottomLinePolicy: {
    visibleWhen: 'undergraduateLine <= candidateScore <= specialControlLine',
    visibleMin: 367,
    visibleMax: 515,
    forbidBufferAboveSpecialControlLine: true,
    note: '600分附近中外合作上探只在方案解读/报告中解释，不作为前端底线按钮显示。'
  },
  pageCopy: '当前基于辽宁2025年物理类历史数据进行初选参考。',
  reportCopy: '基于2025年数据生成，用于家庭讨论和人工复核；正式填报以当年一分一段、招生计划和志愿系统为准。',
  aiCopy: '正式填报应以2026年一分一段、招生计划、院校招生章程和辽宁志愿填报系统为准。',
  updateTriggers: ['2026一分一段公布', '2026本科线公布', '2026特控线公布', '2026招生计划公布'],
  source: {
    level: 'A',
    name: '辽宁省教育厅 / 辽宁招生考试之窗',
    year: 2025,
    url: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2025062417065875023/index.shtml'
  }
};

export function getActiveLines() {
  return YEAR_CALIBER_KB.lines;
}

export function isPublicBottomLineVisible(score) {
  const n = Number(score);
  const { undergraduateLine, specialControlLine } = YEAR_CALIBER_KB.lines;
  return Number.isFinite(n) && n >= undergraduateLine && n <= specialControlLine;
}
