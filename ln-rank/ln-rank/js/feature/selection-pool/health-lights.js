function top(map = {}) { return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || ['', 0]; }
function light(level, label, message) { return { level, label, message }; }
export function buildClientHealthLights(state = {}) {
  const stats = state.stats || {};
  const total = stats.total || 0;
  const [city, cityCount] = top(stats.byCity || {});
  const [family, familyCount] = top(stats.byMajorFamily || {});
  return {
    contextFresh: light(state.candidateContext?.score ? 'ok' : 'risk', state.candidateContext?.score ? '成绩口径已确认' : '成绩待填写', state.candidateContext?.score ? `已按 ${state.candidateContext.score} 分重算 ${total} 个专业。` : '请先填写考生分数。'),
    structure: light(total && stats.stableCount >= Math.ceil(total * 0.25) && stats.safeCount >= Math.max(3, Math.ceil(total * 0.18)) ? 'ok' : 'warn', total ? '前中后段结构' : '还没有选择专业', total ? `稍高目标 ${stats.rushCount || 0}｜稳妥 ${stats.stableCount || 0}｜低分侧补充 ${stats.safeCount || 0}` : '先加入候选专业。'),
    bottomDepth: light((stats.safeCount || 0) >= Math.max(3, Math.ceil(total * 0.18)) ? 'info' : 'warn', '后段是否够稳', (stats.safeCount || 0) >= Math.max(3, Math.ceil(total * 0.18)) ? '低分侧补充数量不算少，仍需核验接受度。' : '低分侧补充数量或深度需复核。'),
    majorDiversity: light(total >= 8 && familyCount / total >= 0.55 ? 'warn' : 'ok', '专业方向是否过于集中', family ? `${family} 占比较高：${Math.round(familyCount / Math.max(1,total)*100)}%` : '专业方向待核验。'),
    locationDiversity: light(total >= 8 && cityCount / total >= 0.45 ? 'warn' : 'ok', '城市过于集中', city ? `${city} 占比约 ${Math.round(cityCount / Math.max(1,total)*100)}%` : '地域待核验。'),
    pushRateReference: light('info', '升学参考', '校级推免参考仅作升学路径辅助，专业级仍需核验。')
  };
}
export function renderHealthLights(state = {}) {
  const lights = buildClientHealthLights(state);
  return `<div class="health-lights">${Object.values(lights).map(x => `<div class="health-light is-${x.level}"><b>${x.label}</b><span>${x.message}</span></div>`).join('')}</div>`;
}
