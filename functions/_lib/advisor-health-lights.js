function pct(part, total) { return total ? Math.round(part / total * 100) : 0; }
function light(level, label, message) { return { level, label, message }; }
export function buildAdvisorHealthLights(facts = {}, rule = {}) {
  const stats = facts.poolStructure || {};
  const total = stats.total || 0;
  return {
    contextFresh: light(facts.candidate?.score ? 'ok' : 'risk', facts.candidate?.score ? '成绩口径已确认' : '成绩待填写', facts.candidate?.score ? `已按 ${facts.candidate.score} 分口径重算。` : '缺少考生成绩，无法生成可靠诊断。'),
    structure: light(total && stats.stableCount >= Math.ceil(total * 0.25) && stats.safeCount >= Math.max(3, Math.ceil(total * 0.18)) ? 'ok' : 'warn', '前中后段结构', total ? `稍高目标${stats.rushCount || 0}个、主要参考${stats.stableCount || 0}个、低分侧补充${stats.safeCount || 0}个。` : '自选专业为空。'),
    bottomDepth: light(stats.safeCount >= Math.max(3, Math.ceil(total * 0.18)) ? 'info' : 'warn', '低分侧补充深度', stats.safeCount >= Math.max(3, Math.ceil(total * 0.18)) ? '低分侧补充数量不算少，但仍需核验接受度和位次深度。' : '低分侧补充数量或深度不足，需要补充可接受低分侧补充项。'),
    majorDiversity: light(total >= 8 && stats.topMajorFamilyPct >= 55 ? 'warn' : 'ok', '专业方向是否过于集中', stats.topMajorFamily ? `${stats.topMajorFamily}占比约${stats.topMajorFamilyPct || 0}%。` : '专业方向待核验。'),
    locationDiversity: light(total >= 8 && stats.topCityPct >= 45 ? 'warn' : 'ok', '城市过于集中', stats.topCity ? `${stats.topCity}占比约${stats.topCityPct || 0}%。` : '地域待核验。'),
    pushRateReference: light(facts.pushRateSummary?.matchedCount ? 'info' : 'info', '升学参考', facts.pushRateSummary?.matchedCount ? `已匹配${facts.pushRateSummary.matchedCount}个学校级推免参考，专业级仍需核验。` : '暂未匹配到学校级推免参考，不能据此排序。'),
    overall: light(rule.level === 'high' ? 'risk' : rule.level === 'medium' ? 'warn' : 'ok', '整体体检', rule.level === 'high' ? '结构性风险较多，建议先补齐后再导出。' : rule.level === 'medium' ? '已有基础，但仍需人工复核关键风险。' : '结构相对均衡，可进入人工复核。')
  };
}
