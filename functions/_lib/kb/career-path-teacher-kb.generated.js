// Generated for ln-rank KB seed: career-path-teacher-kb.generated.js

export const CAREER_PATH_TEACHER_KB = {
  version: 'teacher-path-20260604',
  sourceLevel: 'A',
  sourceName: '中国教育考试网：教师资格条例 / 中小学教师资格考试',
  sourceUrl: 'https://ntce.neea.edu.cn/xhtml1/report/1508/309-1.htm',
  examHomeUrl: 'https://ntce.neea.edu.cn/',
  verifiedAt: '2026-06-04',
  teacherQualification: {
    keyRules: [
      '取得教师资格应当具备相应学历。',
      '不具备教师法规定的教师资格学历的公民，申请获得教师资格，应当通过国家举办或者认可的教师资格考试。',
      '中小学教师资格考试包括笔试和面试。'
    ],
    parentCopy: '师范方向需要结合教师资格、当地编制机会、学科需求和是否接受跨地区就业判断。',
    reportReviewPoints: ['教师资格', '编制机会', '地区需求', '学科岗位', '是否接受异地/基层就业']
  },
  appliesTo: ['汉语言文学', '数学与应用数学', '英语', '物理学', '化学', '生物科学', '思想政治教育', '小学教育', '学前教育', '特殊教育', '体育教育', '历史学', '地理科学'],
  projectTypes: {
    publicTeacher: {
      label: '公费师范/优师专项',
      mustCheck: ['履约地区', '服务年限', '违约责任', '就业安排', '教师资格要求']
    }
  },
  aiBoundary: [
    '不要把“师范”简单写成稳定。',
    '教师路径需要核验教师资格、当地招聘和编制机会。',
    '公费师范、优师专项、本研衔接师范生等项目必须查招生章程和履约规则。'
  ]
};

export function getTeacherPathHint(majorName = '', tags = []) {
  const text = `${majorName} ${tags.join(' ')}`;
  if (CAREER_PATH_TEACHER_KB.appliesTo.some(k => text.includes(k)) || text.includes('师范')) return CAREER_PATH_TEACHER_KB.teacherQualification.parentCopy;
  return '';
}
