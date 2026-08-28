export const UI_STATE_TYPES=Object.freeze(['loading','empty','pending','success','error']);

export const UI_STATE_COPY=Object.freeze({
  loadingMajors:Object.freeze({type:'loading',title:'正在按当前条件整理专业',message:'会保留你已经填写的参考分数和筛选条件。'}),
  openingSchool:Object.freeze({type:'loading',title:'正在打开这所学校的公开评论',message:'学校已经识别，正在读取公开来源内容。'}),
  checkingPlan:Object.freeze({type:'loading',title:'正在检查当前家庭方案',message:'会检查专业方向、地区、费用、校区和特殊项目是否过于集中。'}),
  creatingReport:Object.freeze({type:'loading',title:'正在生成家庭复核报告',message:'报告以2026最低投档记录为主，2025和2024只作历史对照。'}),
  noMajorResult:Object.freeze({type:'empty',title:'当前条件下没有找到合适的专业记录',message:'可以先放宽地区、学校性质或专业关键词；已经加入的专业不会丢失。'}),
  needsSchoolConfirmation:Object.freeze({type:'pending',title:'找到几所相近学校，请确认',message:'确认具体学校或校区后，再打开对应的公开评论。'}),
  sourceUnavailable:Object.freeze({type:'error',title:'公开来源内容暂时没有读取成功',message:'学校识别和专业投档数据不受影响，可以稍后重试。'}),
  reportFallback:Object.freeze({type:'pending',title:'飞书报告暂时没有生成成功',message:'当前已选专业仍然保留，可以先复制文字版保存。'}),
  saved:Object.freeze({type:'success',title:'当前内容已保存',message:'可以继续筛选，也可以进入已选专业逐项复核。'})
});

export function getUiState(key){return UI_STATE_COPY[key]||null}
export function validateUiState(state={}){
  return Boolean(state&&UI_STATE_TYPES.includes(state.type)&&String(state.title||'').trim()&&String(state.message||'').trim());
}
