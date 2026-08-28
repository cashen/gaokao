const DATA_URL = '/ln-rank/data/major-trend-2026.json';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(value, digits = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—';
}

function movementText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '相对变化待核验';
  if (Math.abs(n) < 0.05) return '接近全体共同变化';
  return `相对全体${n < 0 ? '前移' : '后移'} ${fmt(Math.abs(n), 2)} 个百分点`;
}

function movementClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.05) return 'is-neutral';
  return n < 0 ? 'is-forward' : 'is-backward';
}

function scoreFromUrl() {
  const params = new URLSearchParams(window.location.search || '');
  const score = Number(params.get('score') || params.get('s'));
  return Number.isFinite(score) ? score : null;
}

function segmentBounds(label = '') {
  const nums = String(label).match(/\d+/g)?.map(Number) || [];
  if (/以上/.test(label) && nums.length) return { min: nums[0], max: 750 };
  return nums.length >= 2 ? { min: nums[0], max: nums[1] } : null;
}

function segmentForScore(segments, score) {
  if (!Number.isFinite(score)) return segments[0] || null;
  return segments.find(segment => {
    const bounds = segmentBounds(segment.label);
    return bounds && score >= bounds.min && score <= bounds.max;
  }) || segments[0] || null;
}

function usagePanel(data) {
  const policy = data.policy || {};
  const common = policy.annualCommonShift || {};
  return `<section class="panel trend-usage-panel">
    <div class="trend-usage-head">
      <div>
        <h2>先看这页怎么用</h2>
        <p>先看孩子参考分数所在分段，再看专业方向相对全体项目的位置变化。它不是热门榜，也不代替对具体学校专业的逐条核验。</p>
      </div>
      <span class="trend-soft-badge">三年相对观察</span>
    </div>
    <div class="trend-usage-steps" aria-label="使用说明">
      <div><b>1. 看分段</b><span>分段按 2026 专业投档最低分归组。</span></div>
      <div><b>2. 看相对变化</b><span>先扣除全体项目的年度共同位移，再看方向相对前移或后移。</span></div>
      <div><b>3. 回到具体专业</b><span>趋势只解释历史结构，不自动增加或排除专业。</span></div>
    </div>
    <details class="trend-caliber-details">
      <summary>展开方法与边界</summary>
      <div class="trend-caliber-grid">
        <div><b>严格样本</b><span>${fmt(data.summary?.strictCompleteCount)} 条三年同校、同专业、同项目属性记录。</span></div>
        <div><b>年度共同位移</b><span>2025→2026 中位 ${fmt(common.pctPoint26vs25Median, 2)} 个百分点；2024→2025 中位 ${fmt(common.pctPoint25vs24Median, 2)} 个百分点。</span></div>
        <div><b>中性门槛</b><span>相对变化在 ±${fmt(policy.neutralThresholdPctPoint, 2)} 个百分点内，归为变化较小。</span></div>
        <div><b>不能推出</b><span>不能推出报名人数、就业质量、专业价值或 2027 年录取结果。</span></div>
      </div>
    </details>
  </section>`;
}

function segmentTabs(segments, activeLabel, score) {
  const scoreNote = Number.isFinite(score)
    ? `<p class="trend-score-note">参考分数 ${fmt(score)} 分，已先定位到对应 2026 投档分段；也可切换其他分段。</p>`
    : '';
  return `<section class="trend-segment-nav" aria-label="分段选择">${scoreNote}<div class="major-trend-tabs">${segments.map(segment => `<button type="button" class="trend-tab ${segment.label === activeLabel ? 'is-active' : ''}" data-segment-label="${escapeHtml(segment.label)}"><span>${escapeHtml(segment.label)}</span><small>${fmt(segment.sampleCount)} 条</small></button>`).join('')}</div></section>`;
}

function directionCard(direction = {}) {
  const movement = Number(direction.medianRelativePctPoint26vs25);
  const className = movementClass(movement);
  return `<article class="trend-direction-card ${className}">
    <div class="trend-direction-head">
      <div>
        <h3>${escapeHtml(direction.label || '其他')}</h3>
        <p>${escapeHtml(movementText(movement))}。这一方向内部仍可能存在学校、校区和项目属性差异。</p>
      </div>
      <span class="trend-tone-pill ${className}">${escapeHtml(movementText(movement))}</span>
    </div>
    <div class="trend-direction-foot">
      <span>严格样本 ${fmt(direction.sampleCount)} 条</span>
      <span>相对前移 ${fmt(direction.relativeForwardRate2026, 1)}%</span>
      <span>相对后移 ${fmt(direction.relativeBackwardRate2026, 1)}%</span>
      <span>稳定 ${fmt(direction.stableRate2026, 1)}%</span>
    </div>
    <details class="trend-data-details">
      <summary>展开三年结构</summary>
      <div class="trend-data-metrics">
        <span>连续两年前移 ${fmt(direction.continuousForward)}</span>
        <span>连续两年后移 ${fmt(direction.continuousBackward)}</span>
        <span>2026 反向前移 ${fmt(direction.rebound2026)}</span>
        <span>2026 反向后移 ${fmt(direction.pullback2026)}</span>
        <span>2026 最新前移 ${fmt(direction.latestForward)}</span>
        <span>2026 最新后移 ${fmt(direction.latestBackward)}</span>
      </div>
    </details>
  </article>`;
}

function segmentPanel(segment = {}) {
  const directions = [...(segment.directions || [])].sort((a, b) => {
    const aa = Math.abs(Number(a.medianRelativePctPoint26vs25) || 0);
    const bb = Math.abs(Number(b.medianRelativePctPoint26vs25) || 0);
    return bb - aa || Number(b.sampleCount || 0) - Number(a.sampleCount || 0);
  });
  return `<section class="panel major-trend-panel">
    <div class="major-trend-section-head">
      <div>
        <h2>${escapeHtml(segment.label)}：相对全体项目的位置变化</h2>
        <p>严格三年样本 ${fmt(segment.sampleCount)} 条；中位变化为 ${escapeHtml(movementText(segment.medianRelativePctPoint26vs25))}。</p>
      </div>
      <span class="trend-soft-badge">按 2026 投档分归组</span>
    </div>
    <div class="trend-segment-summary">
      <div class="trend-summary-grid">
        <article class="trend-summary-card"><h3>相对前移</h3><p>${fmt(segment.relativeForwardRate2026, 1)}% 的样本在 2026 相对全体前移。</p></article>
        <article class="trend-summary-card"><h3>相对后移</h3><p>${fmt(segment.relativeBackwardRate2026, 1)}% 的样本在 2026 相对全体后移。</p></article>
        <article class="trend-summary-card"><h3>变化较小</h3><p>${fmt(segment.stableRate2026, 1)}% 的样本处于中性门槛内。</p></article>
      </div>
    </div>
    <div class="trend-direction-list">${directions.map(directionCard).join('')}</div>
  </section>`;
}

async function loadData() {
  const response = await fetch(DATA_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`趋势数据读取失败：${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.segments) || !data.segments.length) throw new Error('趋势数据结构不完整');
  return data;
}

export async function mountMajorTrendPage() {
  const root = document.getElementById('majorTrendPage');
  if (!root) return;
  root.innerHTML = '<section class="panel">正在读取三年趋势数据…</section>';
  try {
    const data = await loadData();
    const score = scoreFromUrl();
    let active = segmentForScore(data.segments, score)?.label || data.segments[0].label;
    const render = () => {
      const segment = data.segments.find(item => item.label === active) || data.segments[0];
      root.innerHTML = `${usagePanel(data)}${segmentTabs(data.segments, active, score)}${segmentPanel(segment)}<section class="trend-return-panel"><div><h2>看完趋势，再回到具体专业</h2><p>真正决定时仍要看孩子接受度、2026 投档位置、校区、费用、招生计划和章程。</p></div><div class="trend-return-actions"><a class="scope-pill" href="/ln-rank/">返回查专业</a><a class="scope-pill" href="/ln-rank/selection-pool.html">检查已选方案</a></div></section>`;
      root.querySelectorAll('[data-segment-label]').forEach(button => {
        button.addEventListener('click', () => {
          active = button.dataset.segmentLabel || active;
          render();
          document.getElementById('majorTrendPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    };
    render();
  } catch (error) {
    root.innerHTML = `<section class="panel"><h2>三年趋势数据暂时没有读取成功</h2><p>${escapeHtml(error?.message || String(error))}</p><p>这不影响主页面按 2026 投档数据查专业，可以稍后再试。</p><a class="scope-pill" href="/ln-rank/">返回查专业</a></section>`;
  }
}

mountMajorTrendPage();
