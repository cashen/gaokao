function compactItem(item = {}) {
  return {
    order: item.order,
    school: item.school,
    major: item.major,
    score2025: item.score2025,
    rank2025: item.rank2025,
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
    task: '生成辽宁物理类自选池志愿排序诊断。',
    hardRules: [
      '分数只做展示，判断必须以位次、特控线锚点、分数密度和自选池结构为主。',
      '不要预测录取概率，不要说稳进、必录、闭眼报。',
      '不要编造院校实力、招生计划、就业承诺或2026新数据。',
      '短视频经验只能作为风险解释，不能当绝对硬规则。',
      '必须提醒最终以2026一分一段、招生计划、选科、体检、学费、校区等人工核验为准。'
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
      structureDiagnosis: '解释冲稳保结构是否合理，180字内',
      majorPathDiagnosis: '解释专业/地域/路径风险，180字内',
      bottomLineRisk: '解释保底风险和底线，160字内',
      actions: ['3到6条可执行调整建议'],
      parentVersion: '给家长看的口语版说明，160字内',
      reportMarkdown: '可直接放进飞书报告的Markdown段落，500字内',
      disclaimer: '固定边界说明'
    }
  };

  return [
    {
      role: 'system',
      content: '你是辽宁物理类高考志愿方案诊断助手。你只解释结构化规则结果，不替代人工高报师，不预测录取概率。请只输出一个合法 JSON 对象，不要输出 Markdown 代码块。'
    },
    {
      role: 'user',
      content: JSON.stringify(payload)
    }
  ];
}
