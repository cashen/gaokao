// Generated for ln-rank KB seed: career-path-medical-kb.generated.js

export const CAREER_PATH_MEDICAL_KB = {
  version: 'medical-path-20260604',
  sourceLevel: 'A',
  sourceName: '国家卫生健康委/人民日报：住院医师规范化培训制度',
  sourceUrl: 'https://www.nhc.gov.cn/qjjys/c100015/201502/7466984c6d29417e8fb46f4f336a8947.shtml',
  verifiedAt: '2026-06-04',
  medicalCore: {
    directionId: 'medical_core',
    appliesTo: ['临床医学', '口腔医学', '中医学', '中西医临床医学', '麻醉学', '医学影像学', '眼视光医学', '精神医学', '放射医学'],
    notApplyTo: ['护理学', '药学', '临床药学', '医学检验技术', '医学影像技术', '康复治疗学', '卫生检验与检疫', '生物医学工程', '智能医学工程'],
    trainingPath: {
      commonMode: '5+3',
      five: '5年医学类专业本科教育',
      three: '以住院医师身份在认定培训基地接受3年医疗实践训练',
      certificate: '住院医师规范化培训合格证书',
      note: '取得培训合格证与执业注册、职称晋升、岗位聘任等相关。'
    },
    parentCopy: '医学核心方向培养周期长，不能只看本科录取分；需要家庭接受长期学习、规培、执业资格和岗位压力。',
    reportReviewPoints: ['学制', '规培路径', '执业资格', '体检限制', '家庭承受能力', '是否接受长期学习']
  },
  publicHealthAndApplied: {
    appliesTo: ['预防医学', '药学', '临床药学', '医学检验技术', '医学影像技术', '康复治疗学', '护理学', '助产学'],
    parentCopy: '医学应用类和医学技术类不等同于临床医学，需要分别核验岗位、证书、体检限制和就业环境。',
    reportReviewPoints: ['专业类别', '证书/资格', '医院岗位', '体检限制', '是否需要读研']
  },
  aiBoundary: [
    '不要把护理、药学、医学检验、医学影像技术、康复治疗等直接套用临床医学5+3路径。',
    '医学核心方向可提示规培和长期培养，但不得承诺就业或收入。',
    '医学类必须同时提示体检和招生章程核验。'
  ]
};

export function getMedicalPathHint(majorName = '') {
  const name = String(majorName || '');
  if (CAREER_PATH_MEDICAL_KB.medicalCore.appliesTo.some(k => name.includes(k))) return CAREER_PATH_MEDICAL_KB.medicalCore.parentCopy;
  if (CAREER_PATH_MEDICAL_KB.publicHealthAndApplied.appliesTo.some(k => name.includes(k))) return CAREER_PATH_MEDICAL_KB.publicHealthAndApplied.parentCopy;
  return '';
}
