export const COPY_POLICY_KB = {
  version: 'v3985-copy-policy',
  forbiddenWords: ['稳进','必录','保证','一定能上','闭眼报','稳赚','捡漏','冲爆'],
  forbiddenTechWordsOnFormalPage: ['workers-ai','fallback','model','source','JSON','AI_PATH_MODEL','debug','payload','raw'],
  preferredExpressions: ['可以作为重点核验','需要人工确认','建议补充','建议减少','需要确认孩子是否接受','以当年位次和招生计划为准'],
  termReplacements: {
    '保底深度': '后段是否够稳',
    '地域单点需要关注': '城市过于集中',
    '专业集中度': '专业方向是否过于集中',
    '主体承接区': '主要承接区',
    '已选专业': '已选专业'
  },
  feishuFailureMessage: '报告暂时生成失败。可以先复制文字版报告，稍后再试。',
  formalDiagnosisSections: ['一句话结论','当前分数和位次定位','已选专业结构','主要需要关注','下一步调整建议']
};

export function sanitizeParentCopy(text = '') {
  let out = String(text || '');
  for (const [from, to] of Object.entries(COPY_POLICY_KB.termReplacements)) out = out.split(from).join(to);
  for (const word of COPY_POLICY_KB.forbiddenTechWordsOnFormalPage) out = out.split(word).join('');
  return out.replace(/\s{2,}/g, ' ').trim();
}
