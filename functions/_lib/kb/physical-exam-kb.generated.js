// Generated for ln-rank KB seed: physical-exam-kb.generated.js

export const PHYSICAL_EXAM_KB = {
  version: 'physical-exam-guidance-20260604',
  sourceLevel: 'A',
  sourceName: '普通高等学校招生体检工作指导意见（阳光高考/学信网）',
  sourceUrl: 'https://gaokao.chsi.com.cn/gkxx/zcdh/200702/20070228/754576.html',
  verifiedAt: '2026-06-04',
  privacyBoundary: [
    'ln-rank不主动采集健康信息。',
    '只有用户主动提供色弱、色盲、视力、听力等限制时，AI才可提示相关核验。',
    '未获知考生体检情况时，不得假设考生存在体检限制。'
  ],
  generalAdvice: '体检限制最终以《普通高等学校招生体检工作指导意见》和高校招生章程为准。高校可在招生章程中提出合法合理的补充规定。',
  restrictions: {
    colorWeakness: {
      label: '轻度色觉异常/色弱',
      restrictedMajorKeywords: [
        '化学', '化工', '制药', '药学', '生物科学', '公安技术', '地质学', '医学', '生物工程', '生物医学工程',
        '动物医学', '动物科学', '食品科学与工程', '食品质量与安全', '乳品工程', '酿酒工程', '农学', '园艺', '植物保护',
        '种子科学与工程', '设施农业科学与工程', '茶学', '林学', '园林', '森林保护', '水产养殖学', '海洋渔业科学与技术',
        '材料化学', '环境工程', '高分子材料与工程', '过程装备与控制工程', '学前教育', '特殊教育', '体育教育', '运动训练'
      ],
      reportCopy: '如孩子存在色弱情况，医学、药学、生物、食品、农学、园艺、动物医学、园林、水产、化学、环境等方向需要重点核验体检指导意见和招生章程。'
    },
    colorBlindness: {
      label: '色觉异常II度/色盲',
      includesColorWeaknessRestrictions: true,
      additionalRestrictedMajorKeywords: [
        '美术学', '绘画', '艺术设计', '摄影', '动画', '博物馆学', '应用物理学', '天文学', '地理科学', '应用气象学',
        '材料物理', '矿物加工工程', '资源勘查工程', '冶金工程', '无机非金属材料工程', '交通运输', '油气储运工程'
      ],
      reportCopy: '如孩子存在色盲情况，除色弱相关方向外，还需重点核验交通运输、油气储运、材料物理、艺术设计等方向。'
    },
    visionLow: {
      label: '裸眼视力限制',
      examples: ['轮机工程', '运动训练', '民族传统体育', '烹饪与营养', '烹饪工艺'],
      reportCopy: '如孩子存在明显视力限制，航海、轮机、体育训练等方向需要查体检指导意见和招生章程。'
    },
    severeHearingOrSpeech: {
      label: '听力/口吃等限制',
      reportCopy: '如孩子存在听力、语言表达等体检限制，应结合招生章程核验师范、语言、医学、公安等方向要求。'
    }
  },
  directionRiskMap: {
    medical_core: ['colorWeakness'],
    medical_applied: ['colorWeakness'],
    agri_food_env: ['colorWeakness'],
    petro_material_safety: ['colorWeakness', 'colorBlindness'],
    civil_arch_transport: ['colorBlindness'],
    humanities_media_tourism: [],
    teacher_law_public: ['colorWeakness']
  },
  aiBoundary: [
    '体检限制只作为复核提醒，不作为系统直接否定专业的依据。',
    'AI不得在没有用户体检信息时主动说“不能报”。',
    '报告可写“如存在相关体检限制，需要核验”，避免制造焦虑。'
  ]
};

export function getPhysicalExamReviewHints({ majorName = '', directionId = '', knownConditions = [] } = {}) {
  const name = String(majorName || '');
  const conditions = new Set(knownConditions);
  const hints = [];
  for (const condition of Object.values(PHYSICAL_EXAM_KB.restrictions)) {
    const keys = [...(condition.restrictedMajorKeywords || []), ...(condition.additionalRestrictedMajorKeywords || []), ...(condition.examples || [])];
    if (keys.some(k => name.includes(k))) hints.push(condition.reportCopy);
  }
  if (directionId && PHYSICAL_EXAM_KB.directionRiskMap[directionId]?.length && conditions.size) {
    hints.push('该方向与考生已说明的体检限制可能有关，请以招生章程和体检指导意见为准。');
  }
  return [...new Set(hints)];
}
