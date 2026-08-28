export const UI_STATE_CONTRACT_VERSION = 'ui-state-v3970_0';
export const UI_STATE_TYPES = Object.freeze(['loading', 'empty', 'pending', 'success', 'error']);

export const UI_STATE_COPY = Object.freeze({
  loadingMajors: Object.freeze({ type: 'loading', title: '正在按当前条件整理专业', message: '会保留已经填写的参考分数和筛选条件。' }),
  openingSchool: Object.freeze({ type: 'loading', title: '正在打开这所学校的公开评论', message: '学校已经识别，正在读取公开来源内容。' }),
  checkingPlan: Object.freeze({ type: 'loading', title: '正在检查当前家庭方案', message: '会检查专业方向、地区、费用、校区和特殊项目是否过于集中。' }),
  creatingCurrentResultsReport: Object.freeze({ type: 'loading', title: '正在生成当前结果报告', message: '报告包含当前分组前 20 条结果，方便临时分享和讨论。' }),
  creatingFamilyPlanReport: Object.freeze({ type: 'loading', title: '正在生成家庭方案报告', message: '报告包含当前家庭方案和需要继续确认的事项。' }),
  noMajorResult: Object.freeze({ type: 'empty', title: '当前条件下没有找到合适的专业记录', message: '可以先放宽地区、学校性质或专业关键词；已经加入家庭方案的专业不会丢失。' }),
  noFamilyPlan: Object.freeze({ type: 'empty', title: '家庭方案还没有专业', message: '先回到专业结果，把愿意继续讨论的专业加入家庭方案。' }),
  needsSchoolConfirmation: Object.freeze({ type: 'pending', title: '找到几所相近学校，请确认', message: '确认具体学校或校区后，再打开对应的公开评论。' }),
  sourceUnavailable: Object.freeze({ type: 'error', title: '公开来源内容暂时没有读取成功', message: '学校识别和专业投档数据不受影响，可以稍后重试。' }),
  reportFallback: Object.freeze({ type: 'pending', title: '飞书报告暂时没有生成成功', message: '当前家庭方案仍然保留，可以重新生成或先复制文字版。' }),
  familyPlanAdded: Object.freeze({ type: 'success', title: '已加入家庭方案', message: '可以继续查看其他专业，稍后再统一整理。' }),
  familyPlanRemoved: Object.freeze({ type: 'success', title: '已移出家庭方案', message: '其他专业和筛选条件不会受到影响。' }),
  reportReady: Object.freeze({ type: 'success', title: '报告已生成', message: '可以直接发给孩子或家人。知道链接的人可以查看。' })
});

export function getUiState(key) {
  return UI_STATE_COPY[key] || null;
}

export function validateUiState(state = {}) {
  return Boolean(
    state
    && UI_STATE_TYPES.includes(state.type)
    && String(state.title || '').trim()
    && String(state.message || '').trim()
  );
}
