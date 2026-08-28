import { MAJOR_TREND_DATA, trendTone } from './feature/trend/index.js?v=3949_0';

const TREND_COPY = {
  pageTitle: '专业方向变化参考',
  useTitle: '先看这页怎么用',
  caliberTitle: '口径说明',
  segmentPrefix: '分段',
  harder: '更挤一些',
  watch: '略偏拥挤',
  easier: '相对缓和',
  relaxed: '略有回落',
  neutral: '变化不大'
};

const SEGMENT_LEVEL = {
  '590-624': '中高分',
  '550-589': '衔接段',
  '500-549': '普通本科集中段',
  '450-499': '中低分段',
  '367-449': '本科底部段'
};

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
function signedRank(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n < 0) return `靠前 ${fmt(Math.abs(n))}`;
  if (n > 0) return `后移 ${fmt(n)}`;
  return '基本不变';
}
function trendText(direction = {}) {
  const tone = trendTone(direction);
  return TREND_COPY[tone] || TREND_COPY.neutral;
}
function trendHumanHint(direction = {}) {
  const tone = trendTone(direction);
  const label = escapeHtml(direction.directionLabel || '这个方向');
  const sample = Number(direction.comparableCount || 0);
  const sampleTail = sample && sample < 30 ? '样本不算多，适合辅助看，不适合下强结论。' : '';
  if (tone === 'harder') return `${label}在这个分段里 2025 位次整体更靠前，看这个方向时建议多留一点余量。${sampleTail}`;
  if (tone === 'watch') return `${label}在这个分段里略偏拥挤，建议和学校层次、招生计划一起看。${sampleTail}`;
  if (tone === 'easier') return `${label}近两年相对缓和一些，但不能直接当作 2026 会继续变松。${sampleTail}`;
  if (tone === 'relaxed') return `${label}有一点回落迹象，可以作为空间参考，仍要逐条看专业备注。${sampleTail}`;
  return `${label}近两年整体变化不大，继续按位次、招生计划和孩子接受度逐条核验。${sampleTail}`;
}
function toneClass(direction = {}) { return `trend-${trendTone(direction)}`; }
function segmentFullLabel(seg = {}) {
  return `${String(seg.label || '').replace('—','-')}｜${SEGMENT_LEVEL[seg.id] || '参考分段'}`;
}
function segmentTitle(seg = {}) {
  return `${String(seg.label || '').replace('—','-')} 分段：先看哪些方向更挤`;
}
function firstByTone(seg = {}, tones = []) {
  const list = Array.isArray(seg.directions) ? seg.directions : [];
  return list.filter(d => tones.includes(trendTone(d))).sort((a,b)=>Math.abs(Number(b.netChange||0))-Math.abs(Number(a.netChange||0))).slice(0,3);
}
function scoreFromUrl() {
  const params = new URLSearchParams(window.location.search || '');
  const score = Number(params.get('score') || params.get('s'));
  return Number.isFinite(score) ? score : null;
}
function segmentForScoreLocal(score) {
  if (!Number.isFinite(score)) return null;
  return MAJOR_TREND_DATA.segments.find(s => {
    const [lo, hi] = String(s.id).split('-').map(Number);
    return score >= lo && score <= hi;
  }) || null;
}

function renderUsageGuide() {
  return `<section class="panel trend-usage-panel">
    <div class="trend-usage-head">
      <div>
        <h2>${TREND_COPY.useTitle}</h2>
        <p>它不是热门榜，也不是录取预测。它只是帮家长看一眼：某个分数段里，哪些方向近两年更挤、哪些方向相对缓和。</p>
      </div>
      <span class="trend-soft-badge">辅助判断</span>
    </div>
    <div class="trend-usage-steps" aria-label="使用说明">
      <div><b>1. 看分段</b><span>先选孩子分数所在的大致分段。</span></div>
      <div><b>2. 看方向</b><span>观察哪些方向 2025 更挤，哪些方向相对缓和。</span></div>
      <div><b>3. 看提醒</b><span>趋势只作辅助，最终还要看当年位次、招生计划和章程。</span></div>
    </div>
    <details class="trend-caliber-details">
      <summary>展开口径说明</summary>
      <div class="trend-caliber-grid">
        <div><b>数据范围</b><span>${escapeHtml(MAJOR_TREND_DATA.sourceNote)}</span></div>
        <div><b>排除项目</b><span>${MAJOR_TREND_DATA.excludedProjects.map(escapeHtml).join('、')}</span></div>
        <div><b>分类规则</b><span>完整专业名和专业代码优先，关键词只作辅助；园艺不等于园林，动物医学不归医学核心。</span></div>
      </div>
    </details>
  </section>`;
}

function renderSegmentTabs(segments, activeId, urlScore) {
  const scoreNote = Number.isFinite(urlScore) ? `<div class="trend-score-note">约 ${fmt(urlScore)} 分，建议先看对应分段；也可以手动切换其它分段。</div>` : '';
  return `<section class="trend-segment-nav" aria-label="分段选择">
    ${scoreNote}
    <div class="major-trend-tabs">${segments.map(s => `<button type="button" class="trend-tab ${s.id === activeId ? 'is-active' : ''}" data-segment="${escapeHtml(s.id)}"><span>${escapeHtml(segmentFullLabel(s).split('｜')[0])}</span><small>${escapeHtml(segmentFullLabel(s).split('｜')[1])}</small></button>`).join('')}</div>
  </section>`;
}

function renderSegmentSummary(seg) {
  const watch = firstByTone(seg, ['harder','watch']);
  const easier = firstByTone(seg, ['easier','relaxed']);
  const block = (title, subtitle, items, cls) => `<article class="trend-summary-card ${cls}">
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(subtitle)}</p>
    <ul>${items.length ? items.map(d => `<li><b>${escapeHtml(d.directionLabel)}</b><span>${escapeHtml(trendText(d))}</span></li>`).join('') : '<li><b>暂无明显方向</b><span>继续看具体专业</span></li>'}</ul>
  </article>`;
  return `<section class="trend-segment-summary">
    <div class="trend-summary-head"><h3>这个分段先看两类方向</h3><p>只看近两年变化，不代表 2026 一定延续。</p></div>
    <div class="trend-summary-grid">
      ${block('需要多留意', '位次整体更靠前，查看时建议多留余量。', watch, 'is-watch')}
      ${block('相对缓和', '近两年没有那么挤，但仍要看学校层次和计划。', easier, 'is-easier')}
    </div>
  </section>`;
}

function renderTrendDirectionCard(direction = {}) {
  const tone = trendTone(direction);
  const sampleNote = direction.sampleLevel === 'low' ? '样本较少，只作辅助观察。' : direction.sampleLevel === 'caution' ? '样本量中等，建议谨慎参考。' : '';
  return `<article class="trend-direction-card ${toneClass(direction)}">
    <div class="trend-direction-head">
      <div>
        <h3>${escapeHtml(direction.directionLabel)}</h3>
        <p>${trendHumanHint(direction)}</p>
      </div>
      <span class="trend-tone-pill ${toneClass(direction)}">${escapeHtml(trendText(direction))}</span>
    </div>
    <div class="trend-direction-foot">
      <span>样本：${fmt(direction.comparableCount)} 个可比较专业</span>
      ${sampleNote ? `<span class="trend-sample-note">${escapeHtml(sampleNote)}</span>` : ''}
    </div>
    <details class="trend-data-details">
      <summary>展开数据</summary>
      <div class="trend-data-metrics">
        <span>更挤 ${pct(direction.harderRate)}</span>
        <span>相对缓和 ${pct(direction.easierRate)}</span>
        <span>变化不大 ${pct(direction.neutralRate)}</span>
        <span>净变化 ${pct(direction.netChange)}</span>
      </div>
    </details>
  </article>`;
}

function renderSampleCards(seg) {
  const rows = (seg.samples || []).slice(0, 10);
  const audit = rows.flatMap(s => (s.auditFlags || []).map(flag => `${s.school}｜${s.major}：${flag}`)).slice(0,4);
  const table = `<div class="trend-table-wrap"><table><thead><tr><th>变化</th><th>学校</th><th>专业</th><th>方向</th><th>2025分/位次</th><th>2024分/位次</th><th>位次变化</th></tr></thead><tbody>${rows.map(s => `<tr><td>${escapeHtml(s.typeLabel)}</td><td>${escapeHtml(s.school)}</td><td>${escapeHtml(s.major)}</td><td>${escapeHtml(s.directionLabel)}</td><td>${fmt(s.score2025)} / ${fmt(s.rank2025)}</td><td>${fmt(s.score2024)} / ${fmt(s.rank2024)}</td><td>${signedRank(s.rankDelta)}</td></tr>`).join('')}</tbody></table></div>`;
  const cards = `<div class="trend-mobile-sample-list">${rows.map(s => `<article class="trend-mobile-sample-card">
    <div class="trend-mobile-sample-head"><b>${escapeHtml(s.school)}</b><span>${escapeHtml(s.typeLabel)}</span></div>
    <p>${escapeHtml(s.major)}</p>
    <div class="trend-mobile-sample-meta"><span>${escapeHtml(s.directionLabel)}</span><span>2025：${fmt(s.score2025)} / ${fmt(s.rank2025)}</span><span>2024：${fmt(s.score2024)} / ${fmt(s.rank2024)}</span><span>位次变化：${signedRank(s.rankDelta)}</span></div>
  </article>`).join('')}</div>`;
  return `<details class="trend-samples">
    <summary>展开代表性学校专业样本</summary>
    ${audit.length ? `<div class="trend-audit-note"><b>分类审计提醒：</b>${audit.map(escapeHtml).join('；')}</div>` : ''}
    ${table}
    ${cards}
  </details>`;
}

function renderSegment(seg) {
  return `<section class="panel major-trend-panel" id="segment-${escapeHtml(seg.id)}">
    <div class="major-trend-section-head">
      <div><h2>${escapeHtml(segmentTitle(seg))}</h2><p>这个分段适合观察同校同专业近两年的位次变化。方向变挤，不代表不能选；只是生成报告前需要多留一点余量。</p></div>
      <span class="trend-soft-badge">按 2025 投档分切分</span>
    </div>
    ${renderSegmentSummary(seg)}
    <div class="trend-direction-list">${seg.directions.map(renderTrendDirectionCard).join('')}</div>
    ${renderSampleCards(seg)}
  </section>`;
}

export function mountMajorTrendPage() {
  const root = document.getElementById('majorTrendPage');
  if (!root) return;
  const urlScore = scoreFromUrl();
  const scoreSegment = segmentForScoreLocal(urlScore);
  let active = scoreSegment?.id || MAJOR_TREND_DATA.segments[0]?.id || '';
  function render() {
    const seg = MAJOR_TREND_DATA.segments.find(s => s.id === active) || MAJOR_TREND_DATA.segments[0];
    root.innerHTML = `
      ${renderUsageGuide()}
      ${renderSegmentTabs(MAJOR_TREND_DATA.segments, active, urlScore)}
      ${renderSegment(seg)}
      <section class="trend-return-panel">
        <div><h2>看完变化，再回到报告流程</h2><p>趋势只是一盏辅助灯。真正决定时，还要回到专业卡片、孩子接受度、招生计划和章程。</p></div>
        <div class="trend-return-actions"><a class="scope-pill trend-action-main" href="./index.html">返回查专业</a><a class="scope-pill trend-action-soft" href="./selection-pool.html">生成报告前确认</a></div>
      </section>
      <section class="data-note">${escapeHtml(MAJOR_TREND_DATA.disclaimer)}<br>版本：v3.9.49.0｜数据口径：辽宁 2025 物理类｜变化口径：2024/2025 同校同专业普通项目</section>`;
    root.querySelectorAll('[data-segment]').forEach(btn => btn.addEventListener('click', () => { active = btn.dataset.segment; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  }
  render();
}

mountMajorTrendPage();
