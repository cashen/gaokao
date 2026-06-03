export const LIAONING_POLICY_KB = {
  version: 'v3985-liaoning-policy-2025',
  province: '辽宁',
  year: 2025,
  ordinary本科批: {
    mode: '专业+学校',
    admissionMode: '平行志愿',
    maxChoices: 112,
    unit: '1个“专业+学校”为1个志愿'
  },
  ordinary专科批: {
    mode: '专业+学校',
    admissionMode: '平行志愿',
    maxChoices: 60
  },
  aiImplications: [
    '辽宁普通类本科批诊断应按“专业+学校”条目检查，不按院校组检查。',
    '报告中不要写“院校组”。',
    '自选专业数量不足时，可以提示继续补足后段和复核项。',
    '自选专业方向过于集中时，应提示分散风险，而不是只看学校名。'
  ],
  pendingVerification: [
    '2026志愿数量与批次规则需等辽宁省教育厅或辽宁招生考试之窗正式发布后再更新。'
  ],
  source: {
    level: 'A',
    name: '辽宁省教育厅 2025年志愿填报办法/志愿问答',
    year: 2025,
    url: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2025062010472685884/index.shtml'
  }
};
