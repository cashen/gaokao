export const CAREER_PATH_MEDICAL_KB = {
  version: 'v3985-medical-path',
  medicalCore: {
    directionId: 'medical_core',
    appliesTo: ['临床医学','口腔医学','中医学','中西医结合'],
    pathSummary: '医学核心方向通常要考虑本科后住院医师规范化培训等长期路径。',
    training: { name: '住院医师规范化培训', nature: '毕业后医学教育的重要组成部分', commonPath: '5年医学本科 + 3年规培' },
    aiCopy: '医学核心方向培养周期长，不能只看本科录取分；需要家庭接受长期学习、规培和执业路径。',
    notApplyTo: ['护理学','药学','医学检验技术','医学影像技术','康复治疗学'],
    aiBoundary: ['护理、药学、医学技术类不能直接套用临床医学5+3路径。','医学类要结合体检限制、学制、规培、执业资格和家庭承受能力判断。'],
    source: { level: 'A', name: '国家卫生健康委住院医师规范化培训相关文件' }
  }
};
