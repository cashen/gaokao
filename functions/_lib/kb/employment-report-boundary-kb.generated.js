export const EMPLOYMENT_REPORT_BOUNDARY_KB = {
  version: 'v3985-employment-report-boundary',
  sourceLevel: 'B+',
  usableFields: ['毕业生基本情况','就业特点','相关分析','发展趋势','分层次就业情况','分学科就业情况','分院系就业情况','分专业就业情况','分地域就业情况'],
  aiBoundary: ['学校就业质量报告只能作为学校或学院层面就业流向参考。','不能把学校总体就业率说成某专业就业率。','不能把就业率说成就业质量保证。','不能把薪资样本泛化到辽宁普通家庭。','若就业报告没有专业级数据，只能提示人工查阅，不得下结论。']
};
