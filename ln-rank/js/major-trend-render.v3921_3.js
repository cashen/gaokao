import { MAJOR_TREND_DATA, trendLabel, trendTone } from './feature/trend/index.js?v=3921_4';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function fmt(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'; }
function pct(value) { const n = Number(value); return Number.isFinite(n) ? `${n.toFixed(1).replace('.0','')}%` : '—'; }
function toneClass(direction) { return `trend-${trendTone(direction)}`; }
function segmentNav(segments, activeId) {
  return `<div class="major-trend-tabs">${segments.map(s => `<button type="button" class="trend-tab ${s.id === activeId ? 'is-active' : ''}" data-segment="${escapeHtml(s.id)}">${escapeHtml(s.label)}</button>`).join('')}</div>`;
}
function summaryCard(seg) {
  const harder = seg.summary.harder.slice(0,3).map(d => `<li><b>${escapeHtml(d.directionLabel)}</b><span>${pct(d.netChange)}</span></li>`).join('');
  const easier = seg.summary.easier.slice(0,3).map(d => `<li><b>${escapeHtml(d.directionLabel)}</b><span>${pct(Math.abs(d.netChange))}</span></li>`).join('');
  return `<div class="trend-summary-grid">
    <article class="trend-summary-card is-harder"><h3>2025 相比 2024 更拥挤</h3><ul>${harder || '<li>无明显方向</li>'}</ul></article>
    <article class="trend-summary-card is-easier"><h3>2025 相比 2024 没那么挤</h3><ul>${easier || '<li>无明显方向</li>'}</ul></article>
  </div>`;
}
function directionRows(seg) {
  return seg.directions.map(d => `<article class="trend-row ${toneClass(d)}">
    <div class="trend-row-main"><b>${escapeHtml(d.directionLabel)}</b><span>${escapeHtml(trendLabel(d))}</span></div>
    <div class="trend-row-meta"><span>可比较专业 ${fmt(d.comparableCount)} 个</span><span>更拥挤 ${pct(d.harderRate)}</span><span>没那么挤 ${pct(d.easierRate)}</span><span>变化不大 ${pct(d.neutralRate)}</span><span>净变化 ${pct(d.netChange)}</span></div>
    ${d.sampleLevel !== 'normal' ? `<p class="trend-row-note">${d.sampleLevel === 'low' ? '样本较少，只作辅助观察。' : '样本量中等，建议谨慎参考。'}</p>` : ''}
  </article>`).join('');
}
function sampleTable(seg) {
  const rows = seg.samples.slice(0,10).map(s => `<tr>
    <td>${escapeHtml(s.typeLabel)}</td><td>${escapeHtml(s.school)}</td><td>${escapeHtml(s.major)}</td><td>${escapeHtml(s.directionLabel)}</td>
    <td>${fmt(s.score2025)} / ${fmt(s.rank2025)}</td><td>${fmt(s.score2024)} / ${fmt(s.rank2024)}</td><td>${fmt(s.rankDelta)}</td>
  </tr>`).join('');
  const audit = seg.samples.flatMap(s => (s.auditFlags || []).map(flag => `${s.school}｜${s.major}：${flag}`)).slice(0,4);
  return `<details class="trend-samples"><summary>展开代表性学校专业样本</summary>
    ${audit.length ? `<div class="trend-audit-note"><b>分类审计提醒：</b>${audit.map(escapeHtml).join('；')}</div>` : ''}
    <div class="trend-table-wrap"><table><thead><tr><th>类型</th><th>学校</th><th>专业</th><th>方向</th><th>2025分/位次</th><th>2024分/位次</th><th>位次变化</th></tr></thead><tbody>${rows}</tbody></table></div>
  </details>`;
}
function renderSegment(seg) {
  return `<section class="panel major-trend-panel" id="segment-${escapeHtml(seg.id)}">
    <div class="major-trend-section-head"><div><h2>${escapeHtml(seg.label)} 分段</h2><p>${escapeHtml(seg.lead)}</p></div><span class="scope-pill">按 2025 投档分切分</span></div>
    ${summaryCard(seg)}
    <div class="trend-list">${directionRows(seg)}</div>
    ${sampleTable(seg)}
  </section>`;
}

export function mountMajorTrendPage() {
  const root = document.getElementById('majorTrendPage');
  if (!root) return;
  let active = MAJOR_TREND_DATA.segments[0]?.id || '';
  function render() {
    const seg = MAJOR_TREND_DATA.segments.find(s => s.id === active) || MAJOR_TREND_DATA.segments[0];
    root.innerHTML = `
      <section class="panel major-trend-overview">
        <div class="major-trend-overview-head"><div><h2>先看口径</h2><p>${escapeHtml(MAJOR_TREND_DATA.compareScope)}。它只观察专业方向是否更拥挤，不改变 ln-rank 主搜索排序。</p></div><a class="scope-pill" href="./index.html">返回查询页</a></div>
        <div class="trend-caliber-grid"><div><b>数据范围</b><span>${escapeHtml(MAJOR_TREND_DATA.sourceNote)}</span></div><div><b>排除项目</b><span>${MAJOR_TREND_DATA.excludedProjects.map(escapeHtml).join('、')}</span></div><div><b>分类规则</b><span>完整专业名和专业代码优先，关键词只做兜底；园艺不等于园林，动物医学不归医学核心。</span></div></div>
      </section>
      ${segmentNav(MAJOR_TREND_DATA.segments, active)}
      ${renderSegment(seg)}
      <section class="data-note">${escapeHtml(MAJOR_TREND_DATA.disclaimer)}<br>版本：v3.9.21.3｜数据口径：辽宁 2025 物理类｜热度口径：2024/2025 同校同专业普通项目</section>`;
    root.querySelectorAll('[data-segment]').forEach(btn => btn.addEventListener('click', () => { active = btn.dataset.segment; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  }
  render();
}

mountMajorTrendPage();
