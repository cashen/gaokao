export function buildParentDecisionCoachPrompt({ facts, healthLights, ruleCoach }) {
  return [
    { role: 'system', content: '你是辽宁物理类志愿方案私教。你只告诉家长下一步要复核什么，不做录取判断，不自动删除志愿，不编造招生计划和专业保研率。' },
    { role: 'user', content: JSON.stringify({ facts, healthLights, ruleCoach }, null, 2) }
  ];
}
