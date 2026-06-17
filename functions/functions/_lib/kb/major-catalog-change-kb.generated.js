// Generated for ln-rank KB seed: major-catalog-change-kb.generated.js

export const MAJOR_CATALOG_CHANGE_KB = {
  version: '2026-change-kb-20260604',
  sourceLevel: 'A',
  verifiedAt: '2026-06-04',
  sources: [
    {
      name: '教育部关于公布《普通高等学校本科专业目录（2026年）》的通知',
      url: 'https://app.xinhuanet.com/news/article.html?articleId=202604285d9c0117b0c943adb68d74e4320835e6',
      level: 'A'
    },
    {
      name: '教育部2026本科专业目录附件PDF',
      url: 'https://education.news.cn/20260428/5d9c0117b0c943adb68d74e4320835e6/202604285d9c0117b0c943adb68d74e4320835e6_1224e991cd08564f5f9c594207f0d5ff38.pdf',
      level: 'A'
    },
    {
      name: '教育部发布2025年本科专业目录',
      url: 'https://www.edu.cn/rd/gao_xiao_cheng_guo/gao_xiao_zi_xun/202504/t20250423_2665121.shtml',
      level: 'A-'
    }
  ],
  catalog2025: {
    majorCategories: 93,
    majorCount: 845,
    newMajorCount: 29,
    adjustmentStats: {
      addedMajorSites: 1839,
      adjustedDegreeOrDurationSites: 157,
      stoppedMajorSites: 2220,
      revokedMajorSites: 1428
    },
    newMajorExamples: [
      '区域国别学', '碳中和科学与工程', '海洋科学与技术', '健康与医疗保障', '智能分子工程',
      '医疗器械与装备工程', '时空信息工程', '国际邮轮管理', '航空运动', '人工智能教育',
      '智能视听工程', '数字戏剧', '低空技术与工程'
    ],
    aiBoundary: [
      '2025目录用于解释2025历史数据，但不代表2026招生计划必然开设。',
      '近年新增、停招、撤销和调整比例较高，AI不得把旧专业口径直接套到2026招生计划。'
    ]
  },
  catalog2026: {
    disciplineCategories: 13,
    majorCategories: 92,
    majorCount: 883,
    newDiscipline: '交叉学科',
    newMajorCountKnownFromNotice: 38,
    crossDiscipline: {
      categoryCode: '1400',
      categoryName: '交叉学科类',
      transferredExistingMajors: [
        { code: '140001TK', oldCode: '083201TK', name: '未来机器人' },
        { code: '140002TK', oldCode: '083202TK', name: '交叉工程' },
        { code: '140003TK', oldCode: '083203TK', name: '低空技术与工程' },
        { code: '140004TK', oldCode: '083204TK', name: '集成电路科学与工程' },
        { code: '140005T', oldCode: '083205T', name: '碳中和科学与工程' },
        { code: '140006T', oldCode: '083206T', name: '智慧城市与空间规划' },
        { code: '140007T', oldCode: '101011T', name: '智能医学工程' },
        { code: '140008T', oldCode: '101012T', name: '生物医药数据科学' },
        { code: '140009T', oldCode: '101013T', name: '智能影像工程' },
        { code: '140010TK', oldCode: '101014TK', name: '医工学' },
        { code: '140011TK', oldCode: '101015TK', name: '医疗器械与装备工程' }
      ],
      newFrontierMajors: [
        { code: '140012TK', name: '具身智能' },
        { code: '140013TK', name: '脑机科学与技术' },
        { code: '140014T', name: '工程互联网' },
        { code: '140015T', name: '深地科学与工程' }
      ]
    },
    otherNewOrHighlightedDirections: [
      '能源科学与工程', '交通能源融合工程', '农业机器人', '生物制造', '数字文旅', '商业人工智能', '数字贸易', '数字金融', '半导体工艺与装备'
    ],
    aiBoundary: [
      '交叉学科及2026新增方向缺少辽宁长期录取历史，不得直接给出就业好坏结论。',
      'AI应提示核验：是否在辽宁招生、招生人数、学费、校区、依托学院、培养方案、课程结构、就业/升学路径。',
      '对于“具身智能、脑机科学与技术、工程互联网、深地科学与工程”等新专业，应默认提高人工复核优先级。'
    ]
  },
  triggerRules: {
    whenUserSearchesNewMajor: '展示“新专业/交叉学科需核验”提示，不改变排序。',
    whenReportContainsNewMajor: '在“需要人工复核”中加入培养方案、依托学院、招生计划、就业路径核验。',
    whenMajorCodeMissing: '不要硬写专业代码；可提示“需按2026招生计划核验专业代码”。'
  }
};

export function isNewOrChangedMajor2026(nameOrCode) {
  const text = String(nameOrCode || '');
  const majors = [
    ...MAJOR_CATALOG_CHANGE_KB.catalog2026.crossDiscipline.transferredExistingMajors,
    ...MAJOR_CATALOG_CHANGE_KB.catalog2026.crossDiscipline.newFrontierMajors,
    ...MAJOR_CATALOG_CHANGE_KB.catalog2026.otherNewOrHighlightedDirections.map(name => ({ name }))
  ];
  return majors.some(item => text.includes(item.name) || (item.code && text.includes(item.code)) || (item.oldCode && text.includes(item.oldCode)));
}
