export const PARENT_COPY_POLICY = {
  bandLabels: { upper: '稍高目标', near: '主要参考', steady: '低分侧补充' },
  rangeLabels: { standard: '正常查看', wide: '多看一些', safe: '多看低分侧' },
  poolLabel: '已选专业',
  reportLabel: '家庭讨论报告',
  forbiddenClaims: ['相对稳妥', '需要确认', '需要结合当年招生计划核验', '重点核验', '需要结合当年位次核验'],
  replacements: {
    已选专业: '已选专业',
    主体参考: '主要参考',
    重点匹配: '主要参考',
    后段是否够稳: '低分侧补充是否够厚',
    城市过于集中: '城市过于集中',
    专业方向是否过于集中: '专业方向是否过于集中'
  }
};
