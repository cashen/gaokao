// Generated for ln-rank KB seed: career-path-law-kb.generated.js

export const CAREER_PATH_LAW_KB = {
  version: 'law-path-20260604',
  sourceLevel: 'A',
  sourceName: '司法部：2025年国家统一法律职业资格考试公告',
  sourceUrl: 'https://www.moj.gov.cn/pub/sfbgw/zwxxgk/fdzdgknr/fdzdgknrtzwj/202506/t20250605_520493.html',
  verifiedAt: '2026-06-04',
  law: {
    directionId: 'teacher_law_public',
    appliesTo: ['法学', '知识产权', '国际经贸规则', '国际法', '司法鉴定学'],
    keyExam: '国家统一法律职业资格考试',
    eligibilitySummary: '法学类本科并取得学士及以上学位，或非法学本科后取得法律硕士、法学硕士等符合条件者，可按规定报名。具体以当年司法部公告为准。',
    parentCopy: '法学不是只看专业热度，还要看法考、院校法学平台、城市实习资源、考公竞争和是否接受读研。',
    reportReviewPoints: ['法考路径', '学校法学平台', '城市实习资源', '考公竞争', '读研接受度']
  },
  relatedPublicPath: {
    appliesTo: ['政治学与行政学', '行政管理', '思想政治教育', '社会工作', '纪检监察'],
    parentCopy: '公职倾向专业需要结合地区岗位、考公竞争、学校平台和孩子是否接受长期备考判断。'
  },
  aiBoundary: [
    '不能简单把法学写成“考公稳定”。',
    '不能承诺通过法考或进入公检法。',
    '不同入学年份、学历路径和政策口径可能影响法考报名条件，应以司法部当年公告为准。'
  ]
};

export function getLawPathHint(majorName = '') {
  const name = String(majorName || '');
  if (CAREER_PATH_LAW_KB.law.appliesTo.some(k => name.includes(k))) return CAREER_PATH_LAW_KB.law.parentCopy;
  if (CAREER_PATH_LAW_KB.relatedPublicPath.appliesTo.some(k => name.includes(k))) return CAREER_PATH_LAW_KB.relatedPublicPath.parentCopy;
  return '';
}
