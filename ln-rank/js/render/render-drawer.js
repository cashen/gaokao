(function () {
  'use strict';

  function createNearbyContent(result) {
    const fmt = window.ScoreCalc.formatNumber;
    const nearby = result.targetNearby;
    const rows = [
      ['低一档分段', nearby.low],
      ['目标所在分段', nearby.current],
      ['高一档分段', nearby.high]
    ].map(([name, band]) => `<tr>
      <td>${name}</td>
      <td>${band.label}</td>
      <td>约 ${fmt(band.people)} 人</td>
    </tr>`).join('');

    const interval = result.direction === 'same'
      ? '当前目标与考生位置接近，本次区间人数变化较小。'
      : `从考生分数到目标分数，本次${result.direction === 'up' ? '位次跨度' : '位次余量'}约 ${fmt(result.peopleChange)} 名，平均约 ${fmt(result.intervalDensityPer5)} 人 / 5 分。`;

    return `<p class="soft-box">目标附近人数看的是目标分所在固定 5 分段，以及相邻的低一档、高一档。它用于理解目标分附近是否集中，不替代冲稳保判断。</p>
      <div class="table-wrap">
        <table class="gradient-table nearby-table">
          <thead><tr><th>位置</th><th>分段</th><th>人数</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="soft-box">${interval}</p>`;
  }

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
      <li><strong>3. 为什么这么看？</strong><span>主要看考生分数到目标分数之间的位次跨度或位次余量；目标附近人数只是帮助理解目标附近是否集中。</span></li>
      <li><strong>4. 后面怎么办？</strong><span>冲、稳、保要搭配安排。冲不是不能放，保也不是越低越好。</span></li>
    </ul>
    <div class="drawer-actions-row"><button type="button" class="copy-btn" id="copyNarrativeBtn">复制说明</button></div>
    <div class="soft-box narrative" id="narrativeText">${window.ScoreRender.escapeHtml(narrative)}</div>`;
  }

  function createDataContent(data) {
    const year = data.meta.baseYearDefault || '2025';
    return `<div class="soft-box">
      <p><strong>当前数据口径：</strong>本页统计基于${data.meta.province} ${year} 一分一段数据，包括位次跨度、位次余量、目标附近人数和分段人数。</p>
      <p><strong>为什么页面仍用分数：</strong>分数方便家庭讨论和理解；正式报告不直接用今年分数对比往年分数，而是先按当年一分一段换算位次，再映射到对照年份的等位分/同位分后判断冲稳保。</p>
      <p><strong>同分说明：</strong>同一分数可能有多名考生。本工具按一分一段累计人数计算，采用同分末位累计口径，未展开语数外等同分内部排序。</p>
      <p><strong>使用边界：</strong>本工具用于理解位次关系和志愿梯度，不等同于录取预测。正式填报还要结合院校专业录取位次、招生计划、选科要求、体检限制和专业热度变化。</p>
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

    if (config.type === 'nearby') body.innerHTML = createNearbyContent(context.result);
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
