export const MAJOR_TREND_DATA = {
  version: 'major-trend-2026-centered-v1.0.0',
  productVersion: 'v3.9.51.0',
  province: '辽宁',
  subject: '物理类',
  batch: '普通类本科批',
  baseYears: [2024, 2025, 2026],
  dataUrl: '/ln-rank/data/major-trend-2026.json',
  compareScope: '2024—2026 三年均有的同校、同专业、同项目属性严格可比记录',
  segmentBy: '2026 投档最低分',
  excludedProjects: ['中外合作', '高收费', '预科', '专项', '定向', '培养模式不同项目'],
  sourceNote: '2026 辽宁物理类普通本科批专业投档记录 11,628 条；三年严格完整样本 6,553 条。',
  disclaimer: '趋势先扣除每个年度全体严格可比项目的共同位移，再观察专业方向相对全体的位置变化；不代表报名人数、专业质量、就业或 2027 年录取结果。',
  segments: [
    { id: '625-plus', label: '625 分及以上', minScore: 625, maxScore: 750 },
    { id: '590-624', label: '590—624 分', minScore: 590, maxScore: 624 },
    { id: '550-589', label: '550—589 分', minScore: 550, maxScore: 589 },
    { id: '500-549', label: '500—549 分', minScore: 500, maxScore: 549 },
    { id: '450-499', label: '450—499 分', minScore: 450, maxScore: 499 },
    { id: '344-449', label: '344—449 分', minScore: 344, maxScore: 449 }
  ]
};
