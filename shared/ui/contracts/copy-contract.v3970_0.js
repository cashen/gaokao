export const UI_COPY_VERSION = 'ui-copy-v3970_0';

export const UI_LANGUAGE = Object.freeze({
  workspace: '辽宁高考家庭决策工作台',
  referenceScore: '参考分数',
  familyPlan: '家庭方案',
  pendingReview: '待确认',
  nextStep: '下一步',
  minimumFilingScore: '最低投档分',
  cumulativeRank: '对应累计位次',
  minimumFilingPosition: '最低投档位置',
  publicReviews: '大学生怎么说',
  currentResultsReport: '当前结果报告',
  familyPlanReport: '家庭方案报告',
  officialUnknown2027: '2027招生计划、选科要求、学费、校区和培养方式仍需以正式资料为准。',
  historicalBoundary: '历史投档记录只帮助家庭缩小范围，不代表2027录取结果。',
  probabilityBoundary: '历史分组不代表录取概率，也不提供看似精确的录取百分比。'
});

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export const FAMILY_PLAN_COPY = Object.freeze({
  add: '加入家庭方案',
  added: '已加入家庭方案',
  remove: '移出家庭方案',
  empty: '家庭方案还没有专业',
  header: value => `家庭方案 ${count(value)}`,
  footerTitle: value => `已经加入 ${count(value)} 个专业`,
  view: value => `查看家庭方案（${count(value)}）`,
  footerHint: '把这些专业放在一起比较，再逐项确认孩子意愿、地区、费用、校区和培养方式。',
  liveAdded: value => `已加入家庭方案，共 ${count(value)} 个专业。`,
  liveRemoved: value => `已移出家庭方案，当前共 ${count(value)} 个专业。`,
  currentResultsReportHint: '包含当前分组前 20 条结果，方便临时分享和讨论，不代表已经加入家庭方案。',
  familyPlanReportHint: '包含当前家庭方案中的专业和需要继续确认的事项。',
  publicShareNotice: '生成后会得到一个可直接打开和转发的飞书链接。知道链接的人可以查看，请只转发给需要一起讨论的人。',
  reportSuccess: '报告已生成，可以直接发给孩子或家人。',
  reportFailure: '这次没有生成成功，当前家庭方案不会丢失。'
});

export const FORBIDDEN_PUBLIC_COPY = Object.freeze([
  '近期真实评论',
  '录取概率：',
  '录取概率:',
  '近两年录取位置基本稳定',
  '2026年录取所需位次',
  '已选 0 个 · 去整理',
  '还没选专业 · 回到结果继续看'
]);
