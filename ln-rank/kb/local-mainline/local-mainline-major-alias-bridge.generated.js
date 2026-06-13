/* v3.9.33.12 显式专业别名桥接
 * 只放人工确认的学校+招生专业名映射，不做宽松 contains。
 * 用途：新专业名、试验班/大类名、招生专业名与本校背景方向之间的“可复核提示”。
 */
export const LOCAL_MAINLINE_MAJOR_ALIAS_BRIDGE = [
  {
    school: '沈阳航空航天大学',
    majors: ['航空智能制造技术'],
    displayLabel: '本校相关',
    level: 'secondary',
    direction: '航空制造',
    reviewPoints: ['培养学院', '课程方向', '分流规则', '招生章程'],
    humanNote: '这个专业名称与学校航空制造、智能制造办学背景有关，但仍需重点看培养学院、课程方向、分流规则和招生章程。',
    confidence: 'explicit-alias-bridge',
    canTriggerFrontend: true,
    boundary: '该提示只用于家庭复核，不代表录取判断，也不代表就业保证。'
  }
];
