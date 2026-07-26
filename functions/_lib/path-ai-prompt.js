import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';
function compactItem(item = {}) {
  return {
    order: item.order,
    school: item.school,
    major: item.major,
    historyEvidence: getHistoryScoreRankEvidence(item),
    scoreDelta: item.scoreDelta,
    rankGap: item.rankGap ?? null,
    statusLabel: item.statusLabel || item.poolBand?.detail || '',
    band: item.poolBand?.detail || '',
    majorFamily: item.majorFamily || '',
    location: item.displayLocation || ''
  };
}

export function buildPathAiMessages({ candidateContext, zonePolicy, stats, risks, actions, sections, orderedItems }) {
  const payload = {
    task: '生成辽宁物理类已选专业志愿生成前提醒。',
    hardRules: [
      '分数只做展示，判断必须以位次、特控线锚点、分数密度和已选专业结构为主。',
      '不要预测录取判断，不要说稳进、必录、闭眼报。',
      '不要编造院校实力、招生计划、就业承诺或2027正式数据。',
      '短视频经验只能作为需要关注解释，不能当绝对硬规则。',
      '必须提醒最终以2027一分一段、招生计划、选科、体检、学费、校区等正式资料人工核验为准。'
    ],
    candidateContext,
    zonePolicy,
    stats,
    ruleRisks: risks,
    ruleActions: actions,
    ruleSections: sections,
    orderedItemsLite: (orderedItems || []).slice(0, 40).map(compactItem),
    outputSchema: {
      overall: '一句话整体判断，120字内',
      rankZoneExplain: '解释考生所属特控线/位次功能区，180字内',
      structureDiagnosis: '解释稍高目标/主要参考/低分侧补充结构是否合理，180字内',
      majorPathDiagnosis: '解释专业/地域/路径需要关注，180字内',
      bottomLineRisk: '解释后段是否够稳需要关注和底线，160字内',
      actions: ['3到6条可执行调整建议'],
      parentVersion: '给家长看的口语版说明，160字内',
      reportMarkdown: '可直接放进家庭讨论报告的文字段落，500字内',
      disclaimer: '固定边界说明'
    }
  };

  return [
    {
      role: 'system',
      content: '你是辽宁物理类高考志愿生成前提醒助手。你只解释结构化规则结果，不替代人工高报师，不预测录取判断。请只输出一个合法 JSON 对象，不要输出代码块。'
    },
    {
      role: 'user',
      content: JSON.stringify(payload)
    }
  ];
}
