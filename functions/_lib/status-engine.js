export const STATUS_RULES = [
  { max: -41, key: 'tooLow', label: '超低参考', position: '少量低分侧补充或特殊偏好' },
  { min: -40, max: -26, key: 'low', label: '偏低参考', position: '少量低分侧补充' },
  { min: -25, max: -16, key: 'guard', label: '低分侧补充参考', position: '低分侧补充' },
  { min: -15, max: -6, key: 'steady', label: '主要参考补充', position: '主体偏稳' },
  { min: -5, max: 3, key: 'match', label: '主要参考', position: '主体讨论' },
  { min: 4, max: 8, key: 'smallRush', label: '稍高目标参考', position: '前部可放' },
  { min: 9, max: 15, key: 'midRush', label: '稍高目标参考', position: '前部搭配' },
  { min: 16, max: 30, key: 'bigRush', label: '稍高目标参考', position: '前部少量' },
  { min: 31, key: 'superRush', label: '稍高目标参考', position: '最前面少量' }
];
export function getStatus(delta) {
  for (const rule of STATUS_RULES) {
    const okMin = rule.min == null || delta >= rule.min;
    const okMax = rule.max == null || delta <= rule.max;
    if (okMin && okMax) return rule;
  }
  return STATUS_RULES[4];
}
