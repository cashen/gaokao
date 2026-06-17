export const DISCIPLINE_STRENGTH_BOUNDARY_KB = {
  version: 'v3985-discipline-strength-boundary',
  doubleFirstClass: {
    sourceLevel: 'A',
    sourceName: '第二轮双一流建设高校及建设学科名单',
    aiBoundary: ['双一流学科只能作为学科实力线索。','不能等同于本科专业就业结果承诺。','不能等同于某专业一定值得报。','不能替代当年招生计划和位次判断。']
  },
  disciplineEvaluation: {
    sourceLevel: 'A-',
    sourceName: '第四轮学科评估',
    aiBoundary: ['只使用分档结果。','不说全国第几。','不说具体得分。','不把研究生学科评估直接等同于本科专业价值。','只能作为学校相关学科实力线索。']
  }
};
