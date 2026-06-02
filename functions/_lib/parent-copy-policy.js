export const PARENT_COPY_POLICY = {
  bandLabels: { upper: '稍高目标', near: '主要参考', steady: '稳妥补充' },
  rangeLabels: { standard: '正常查看', wide: '多看一些', safe: '稳妥一点' },
  poolLabel: '自选专业',
  reportLabel: '家庭讨论报告',
  forbiddenClaims: ['稳进', '必录', '保证', '闭眼报', '一定能上'],
  replacements: {
    自选池: '自选专业',
    主体参考: '主要参考',
    重点匹配: '主要参考',
    保底深度: '后段是否够稳',
    地域单点风险: '城市过于集中',
    专业集中度: '专业方向是否过于集中'
  }
};
