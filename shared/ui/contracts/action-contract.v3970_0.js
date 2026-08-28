export const UI_ACTION_CONTRACT_VERSION = 'ui-action-v3970_0';
export const UI_ACTION_LEVELS = Object.freeze(['primary', 'secondary', 'tertiary', 'link']);
export const UI_ACTION_INTENTS = Object.freeze(['continue', 'inspect', 'verify', 'save', 'leave']);

export const UI_ACTION_COPY = Object.freeze({
  startSelection: Object.freeze({ level: 'primary', intent: 'continue', label: '开始专业初选', pendingLabel: '正在准备专业初选…' }),
  viewResults: Object.freeze({ level: 'primary', intent: 'continue', label: '查看符合条件的专业', pendingLabel: '正在按当前条件整理专业…' }),
  updateResults: Object.freeze({ level: 'primary', intent: 'continue', label: '更新结果', pendingLabel: '正在更新结果…' }),
  viewScoreNearby: Object.freeze({ level: 'secondary', intent: 'inspect', label: '按我的分数附近看', compactLabel: '分数附近' }),
  viewSchoolAllMajors: Object.freeze({ level: 'secondary', intent: 'inspect', label: '看该校全部招生专业', compactLabel: '全部招生专业' }),
  addFamilyPlan: Object.freeze({ level: 'secondary', intent: 'save', label: '加入家庭方案', pendingLabel: '正在加入…', successLabel: '已加入家庭方案' }),
  removeFamilyPlan: Object.freeze({ level: 'tertiary', intent: 'leave', label: '移出家庭方案' }),
  viewFamilyPlan: Object.freeze({ level: 'secondary', intent: 'inspect', label: '查看家庭方案' }),
  inspectDetails: Object.freeze({ level: 'tertiary', intent: 'inspect', label: '查看详情', expandedLabel: '收起详情' }),
  inspectFit: Object.freeze({ level: 'secondary', intent: 'inspect', label: '看看是否适合' }),
  createCurrentResultsReport: Object.freeze({ level: 'primary', intent: 'save', label: '生成当前结果报告', pendingLabel: '正在生成当前结果报告…' }),
  createFamilyPlanReport: Object.freeze({ level: 'primary', intent: 'save', label: '生成家庭方案报告', pendingLabel: '正在生成家庭方案报告…' }),
  publicReviews: Object.freeze({ level: 'secondary', intent: 'inspect', label: '看看这所学校的大学生怎么说', compactLabel: '大学生怎么说', pendingLabel: '正在打开学生评价…' }),
  changeSchool: Object.freeze({ level: 'tertiary', intent: 'leave', label: '换一所学校' }),
  retry: Object.freeze({ level: 'secondary', intent: 'continue', label: '重新尝试' }),
  openReport: Object.freeze({ level: 'secondary', intent: 'inspect', label: '打开报告' }),
  copyLink: Object.freeze({ level: 'secondary', intent: 'save', label: '复制链接' }),
  copyText: Object.freeze({ level: 'tertiary', intent: 'save', label: '复制文字版' })
});

export function getUiAction(key) {
  return UI_ACTION_COPY[key] || null;
}

export function validateUiAction(action = {}) {
  return Boolean(
    action
    && UI_ACTION_LEVELS.includes(action.level)
    && UI_ACTION_INTENTS.includes(action.intent)
    && String(action.label || '').trim()
  );
}
