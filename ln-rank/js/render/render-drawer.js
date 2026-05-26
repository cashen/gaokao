(function () {
  'use strict';

  function createGradientTable(compareRows) {
    const fmt = window.ScoreCalc.formatNumber;
    const signed = window.ScoreCalc.signed;
    const ui = window.LNRankUIText;

    const rows = compareRows.map((row) => {
      const level = ui.levels[row.level.key];
      const changeWord = row.direction === 'up' ? '跨度' : row.direction === 'down' ? '余量' : '接近';
      const changeText = row.direction === 'same' ? '位次接近' : `${changeWord}约 ${fmt(row.peopleChange)} 名`;
      return `<tr>
        <td>${row.targetScore}</td>
        <td>${signed(row.sameYearDiff)} 分</td>
        <td><span class="change-pill">${changeText}</span></td>
        <td><span class="level-chip level-${row.level.key}">${level.name}</span></td>
        <td>${level.position}</td>
      </tr>`;
    }).join('');

    return `<p class="soft-box">这张表不是让家长机械照抄，而是帮助快速理解：上面哪些适合尝试，下面哪些适合稳妥或保底。</p>
      <div class="table-wrap">
        <table class="gradient-table">
          <thead><tr><th>想看的分数</th><th>分差参考</th><th>位次变化</th><th>判断</th><th>适合位置</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function createMajorContent(data, state) {
    const items = Object.entries(data.heatAdjust).map(([key, item]) => {
      const active = key === state.heatKey ? ' is-active' : '';
      return `<button type="button" class="heat-btn${active}" data-heat="${key}" aria-pressed="${key === state.heatKey}"><strong>${item.label}</strong><span>${item.note}</span></button>`;
    }).join('');

    return `<p class="soft-box">专业方向会影响匹配稳定性。第一步先看位次梯度，第二步再结合专业冷热做调整。</p>
      <div class="heat-grid">${items}</div>`;
  }

  function createExplainContent(result, narrative) {
    const ui = window.LNRankUIText;
    const level = ui.levels[result.level.key];
    return `<ul class="explain-list">
      <li><strong>1. 这个目标算什么？</strong><span>当前判断为“${level.name}”。</span></li>
      <li><strong>2. 应该放在哪里？</strong><span>${level.position}。</span></li>
      <li><strong>3. 为什么这么看？</strong><span>因为考生分数和目标分之间，对应了位次跨度或位次余量。</span></li>
      <li><strong>4. 后面怎么办？</strong><span>冲、稳、保要搭配安排。冲不是不能放，保也不是越低越好。</span></li>
    </ul>
    <div class="drawer-actions-row"><button type="button" class="copy-btn" id="copyNarrativeBtn">复制说明</button></div>
    <div class="soft-box narrative" id="narrativeText">${window.ScoreRender.escapeHtml(narrative)}</div>`;
  }

  function createDataContent(data) {
    return `<div class="soft-box">
      <p><strong>当前数据口径：</strong>${data.meta.province}一分一段数据。</p>
      <p>正式填报时，仍需要结合当年一分一段、院校专业录取位次、招生计划、选科要求、体检限制和专业热度变化综合判断。</p>
      <p>程序内部保留多年份架构。未来导入 2026 数据后，可按当年位次自动做同位分口径处理，但普通用户界面不需要手动选择年份。</p>
    </div>`;
  }

  function openDrawer(type, context) {
    const config = window.LNRankDrawerConfig[type];
    const drawer = window.ScoreRender.qs('#drawer');
    const backdrop = window.ScoreRender.qs('#drawerBackdrop');
    const title = window.ScoreRender.qs('#drawerTitle');
    const kicker = window.ScoreRender.qs('#drawerKicker');
    const body = window.ScoreRender.qs('#drawerBody');
    if (!config || !drawer || !backdrop || !title || !body) return;

    title.textContent = config.title;
    kicker.textContent = config.kicker;

    if (config.type === 'gradient') body.innerHTML = createGradientTable(context.compareRows);
    if (config.type === 'major') body.innerHTML = createMajorContent(context.data, context.state);
    if (config.type === 'explain') body.innerHTML = createExplainContent(context.result, context.narrative);
    if (config.type === 'data') body.innerHTML = createDataContent(context.data);

    backdrop.hidden = false;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => window.ScoreRender.qs('#drawerClose')?.focus(), 0);
  }

  function closeDrawer() {
    const drawer = window.ScoreRender.qs('#drawer');
    const backdrop = window.ScoreRender.qs('#drawerBackdrop');
    if (drawer) drawer.hidden = true;
    if (backdrop) backdrop.hidden = true;
    document.body.style.overflow = '';
  }

  window.ScoreDrawer = {
    openDrawer,
    closeDrawer
  };
})();
