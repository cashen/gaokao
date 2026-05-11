(function () {
  'use strict';
  function html(state) {
    var hint = window.LN_V3_BIGPOOL_HINT.shouldShow(state) ? window.LN_V3_BIGPOOL_HINT.html() : '';
    var childSummary = state.childPreference.summary || '孩子兴趣未设置。';
    return [
      '<section class="step-card" data-step-view="plans">',
      '<div class="step-hero"><div class="v3-kicker">第 5 步</div><h2>A/B/C 方案展示</h2><p>alpha1 先搭展示骨架，后续再接 fix12 的候选计算结果。</p></div>',
      '<div class="step-body">', hint,
      '<div class="placeholder-list">',
      '<div class="placeholder-item"><strong>A 冲一冲</strong><p>后续接入学校层级、冲击空间和专业可接受度。当前孩子偏好：' + childSummary + '</p></div>',
      '<div class="placeholder-item"><strong>B 稳妥主方案</strong><p>v3 会重点让孩子兴趣影响 B 方案排序，兼顾稳妥和参与感。</p></div>',
      '<div class="placeholder-item"><strong>C 保底安全</strong><p>保底方案不为了兴趣牺牲安全垫，兴趣只做适度排序和提醒。</p></div>',
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-plans-next>进入详细候选与自选池</button><button type="button" class="v3-btn secondary" data-plans-compute>测试 compute adapter</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelector('[data-plans-next]').addEventListener('click', function () {
      window.LN_V3_STORE.markComplete('plans', 'plans:complete');
      window.LN_V3_ROUTER.go('candidates', 'plans:next');
    });
    root.querySelector('[data-plans-compute]').addEventListener('click', function () {
      if (window.LN_V3_LEGACY_COMPUTE) window.LN_V3_LEGACY_COMPUTE.apply('plans:test-adapter');
      window.LN_V3_WIZARD.render();
    });
  }
  window.LN_V3_STEP_PLANS = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
