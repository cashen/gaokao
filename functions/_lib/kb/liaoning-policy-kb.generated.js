// Generated for ln-rank KB seed: liaoning-policy-kb.generated.js

export const LIAONING_POLICY_KB = {
  version: 'ln-policy-2025-20260604',
  province: '辽宁',
  sourceLevel: 'A',
  sourceName: '辽宁省教育厅：2025年辽宁省普通高校招生志愿填报及招生录取问答',
  sourceUrl: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2025062010472685884/index.shtml',
  verifiedAt: '2026-06-04',
  year: 2025,
  subjectRules: {
    ordinaryPhysics: '物理学科类考生只能填报物理学科类院校（专业）。',
    ordinaryHistory: '历史学科类考生只能填报历史学科类院校（专业）。',
    lnRankScope: 'ln-rank当前只服务辽宁物理类。'
  },
  batches: {
    ordinary本科批: {
      mode: '专业+学校',
      admissionMode: '平行志愿',
      maxChoices: 112,
      unit: '1个“专业+学校”为1个志愿',
      canFillPartial: true,
      aiImplications: [
        '自选专业诊断应按“专业+学校”条目理解，不按院校组理解。',
        '报告中不得写“院校组”。',
        '诊断重点看专业条目数量、分数带分布、方向集中度、城市集中度和后段是否够稳。'
      ]
    },
    ordinary专科批: {
      mode: '专业+学校',
      admissionMode: '平行志愿',
      maxChoices: 60,
      unit: '1个“专业+学校”为1个志愿'
    },
    ordinary本科提前批: {
      mode: '院校志愿+专业志愿+专业服从',
      admissionMode: '有序志愿投档',
      collegeChoices: 2,
      majorChoicesPerCollege: 4,
      aiBoundary: '提前批与本科批规则不同，ln-rank普通本科批分析不得套用提前批逻辑。'
    }
  },
  specialArrangements: [
    '高校强基计划在艺术类本科提前批投档前完成，被录取考生不再参加后续录取。',
    '教育部高校专项计划、高水平运动队等安排在普通类本科批投档前。',
    '教育部直属高校本研衔接师范生公费教育安排在本科提前批。',
    '农村订单定向医学生免费培养计划和乡村医生委托定向培养计划安排在普通类专科提前批。',
    '辽宁省重点高校招收农村学生专项计划、边防军人子女预科班、民族班、少数民族预科班安排在本科批录取。'
  ],
  planningNotes: [
    '招生计划以网报志愿系统和《辽宁招生考试》杂志公布为准。',
    '个别高校计划或说明更正，以志愿网报系统“考生须知”和辽宁招生考试之窗网站公布为准。',
    '考生应认真阅读高校招生章程。'
  ],
  copyPolicy: {
    prefer: ['专业+学校', '自选专业', '专业条目', '以当年招生计划和志愿系统为准'],
    forbid: ['院校组', '专业组', '平行院校志愿', '保证录取']
  },
  updateNeed: {
    for2026: '待辽宁省教育厅/辽宁招生考试之窗发布2026官方问答或招生简章后更新；不得用媒体转载提前覆盖。'
  }
};
