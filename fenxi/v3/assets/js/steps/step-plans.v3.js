(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function fmt(value) { return value === null || value === undefined || value === '' ? '待复核' : esc(value); }
  function sampleHtml(item) {
    var tags = (item.reviewTags || []).slice(0, 3).map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('');
    var match = item.matchReason ? '<em>' + esc(item.matchReason) + '</em>' : '';
    return [
      '<div class="plan-sample-card">',
      '<div class="plan-sample-main"><strong>', esc(item.school || '学校待复核'), '</strong><span>', esc(item.major || '专业待复核'), '</span></div>',
      '<div class="plan-sample-meta"><span>', fmt(item.score2025), '分</span><span>位次 ', fmt(item.rank2025), '</span><span>', esc(item.safety || '待复核'), '</span></div>',
      '<p>', esc(item.oneLine || ''), '</p>',
      match,
      '<div class="plan-sample-tags"><span>', esc(item.evidenceLevel || '模型判断'), '</span>', tags, '</div>',
      '</div>'
    ].join('');
  }
  function planHtml(plan) {
    plan = plan || { samples: [] };
    var samples = (plan.samples || []).slice(0, 4).map(sampleHtml).join('') || '<div class="plan-empty">当前预览样例不足，后续详细候选会继续补证据。</div>';
    var focus = (plan.focus || []).map(function (item) { return '<span>' + esc(item) + '</span>'; }).join('');
    return [
      '<article class="plan-package-card plan-', esc(plan.id || ''), '">',
      '<div class="plan-package-head"><div><b>', esc(plan.title || ''), '</b><p>', esc(plan.role || ''), '</p></div><strong>', esc(String(plan.sourcePool || plan.count || 0)), '</strong></div>',
      '<div class="plan-tone">', esc(plan.tone || ''), '</div>',
      '<div class="plan-focus">', focus, '</div>',
      '<div class="plan-sample-list">', samples, '</div>',
      '</article>'
    ].join('');
  }
  function getPreview(state) {
    if (window.LN_V3_PLANS_ADAPTER && window.LN_V3_PLANS_ADAPTER.generate) return window.LN_V3_PLANS_ADAPTER.generate(state);
    return { ok: false, plans: {}, summary: '方案适配器未加载。' };
  }
  function html(state) {
    var hint = window.LN_V3_BIGPOOL_HINT.shouldShow(state) ? window.LN_V3_BIGPOOL_HINT.html() : '';
    var preview = getPreview(state);
    var scenario = preview.familyPath || {};
    var band = preview.scoreBand || {};
    var region = preview.regionPreference || {};
    var plans = preview.plans || {};
    return [
      '<section class="step-card" data-step-view="plans">',
      '<div class="step-hero"><div class="v3-kicker">第 5 步</div><h2>A/B/C 方案包</h2><p>这一步不是简单冲稳保，而是把家庭底线、孩子路径和上限探索分开，方便家长讨论。正式录取判断仍要在第 6 步详细卡片里复核。</p></div>',
      '<div class="step-body">', hint,
      '<div class="plans-overview">',
      '<div><span>分数段语境</span><strong>', esc(band.label || '待判断'), '</strong><p>', esc(band.firstQuestion || band.priority || '先完成前几步，再生成方案语境。'), '</p></div>',
      '<div><span>家庭路径</span><strong>', esc(scenario.name || '尚未选择'), '</strong><p>', esc(scenario.summary || '先在第 4 步选择家庭路径。'), '</p></div>',
      '<div><span>地域选择</span><strong>', esc(region.label || '地域未设置'), '</strong><p>', esc(region.choiceMeaning || '地域会按底线/偏好/开放比较三种强度解释。'), '</p></div>',
      '<div><span>有效候选池</span><strong>', esc(String(preview.effectiveRows || 0)), '</strong><p>底线池 ', esc(String(preview.familyFilteredRows || 0)), ' 条；兴趣命中 ', esc(String(preview.matchedRows || 0)), ' 条。</p></div>',
      '</div>',
      '<div class="notice-box">', esc(preview.summary || '已生成方案包预览。'), '<br>', esc(preview.nextStep || '下一步进入详细候选卡片继续复核。'), '</div>',
      '<div class="plan-package-grid">', planHtml(plans.A), planHtml(plans.B), planHtml(plans.C), '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-plans-next>进入详细候选与自选池</button><button type="button" class="v3-btn secondary" data-plans-refresh>刷新方案包</button><button type="button" class="v3-btn ghost" data-plans-compute>测试 compute adapter</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelector('[data-plans-next]').addEventListener('click', function () {
      if (window.LN_V3_PLANS_ADAPTER) window.LN_V3_PLANS_ADAPTER.apply('plans:next-apply');
      window.LN_V3_STORE.markComplete('plans', 'plans:complete');
      window.LN_V3_ROUTER.go('candidates', 'plans:next');
    });
    root.querySelector('[data-plans-refresh]').addEventListener('click', function () {
      if (window.LN_V3_PLANS_ADAPTER) window.LN_V3_PLANS_ADAPTER.apply('plans:refresh');
      window.LN_V3_WIZARD.render();
    });
    root.querySelector('[data-plans-compute]').addEventListener('click', function () {
      if (window.LN_V3_LEGACY_COMPUTE) window.LN_V3_LEGACY_COMPUTE.apply('plans:test-adapter');
      window.LN_V3_WIZARD.render();
    });
  }
  window.LN_V3_STEP_PLANS = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
