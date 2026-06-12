export const HUMAN_BAND_LABELS={upper:'稍高目标',near:'主要参考',steady:'稳妥补充'};
export const HUMAN_REPLACEMENTS=[[/冲一冲/g,'稍高目标'],[/高冲/g,'稍高目标'],[/小冲/g,'稍高目标'],[/前段尝试/g,'稍高目标'],[/前段冲刺区/g,'稍高目标区'],[/主体承接区/g,'主要参考区'],[/主要承接/g,'主要参考'],[/后段补充/g,'稳妥补充'],[/最后兜底/g,'稳妥补充'],[/兜底/g,'稳妥补充'],[/保底深度/g,'稳妥补充是否够厚'],[/浅后段是否够稳/g,'稳妥补充偏浅'],[/后段是否够稳/g,'稳妥补充是否够厚'],[/保底/g,'稳妥补充'],[/冲稳保结构/g,'稍高目标/主要参考/稳妥补充结构'],[/冲稳保/g,'分段结构'],[/自选池/g,'已选专业'],[/加入自选专业/g,'放进报告'],[/已加入自选专业/g,'已放进报告'],[/自选专业/g,'已选专业'],[/报告清单/g,'已选专业'],[/专业集中度/g,'专业方向是否过于集中'],[/地域单点风险/g,'城市过于集中'],[/主体承接/g,'主要参考']];
export const HUMAN_FORBIDDEN_VISIBLE_WORDS=['payload','raw','source','debug','model','JSON','workers-ai','fallback','AI_PATH_MODEL','稳进','必录','保证','一定能上','闭眼报','稳赚','捡漏','NaN','undefined','null','[object Object]','自选池','本机自选','收藏夹','我的方案','我的备忘','草稿箱','报告清单','录取概率','稳进','必录','保底','兜底','匹配度 92%'];
export function toHumanCopy(value){let text=String(value==null?'':value);for(const [p,r] of HUMAN_REPLACEMENTS) text=text.replace(p,r);return text;}
export function hasForbiddenVisibleText(value){const text=String(value==null?'':value);return HUMAN_FORBIDDEN_VISIBLE_WORDS.filter(w=>text.includes(w));}


export const REPORT_COPY = {
  add: '放进报告',
  added: '已放进报告',
  duplicate: '这个专业已经在报告里了',
  remove: '从报告中移除',
  selectedCount: (count) => `已选 ${count} 个专业`,
  floatingEntry: (count) => `已选 ${count} 个专业｜生成报告`,
  confirmTitle: '生成报告前确认',
  confirmSubtitle: '下面这些专业会放进报告里。不合适的可以先移除，确认后再生成飞书报告。',
  distributionTitle: '已选专业分布',
  beforeCheckTitle: '生成前看一眼',
  selectedMajorsTitle: '已选专业',
  generate: '生成报告',
  generateFeishu: '生成飞书报告',
  copyText: '复制文字版',
  listReport: '生成清单版',
  explainReport: '生成解读版',
  successTitle: '报告生成好了',
  failText: '飞书报告暂时没生成成功，可以先复制文字版保存。'
};
