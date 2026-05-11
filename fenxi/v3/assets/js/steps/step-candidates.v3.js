(function () {
  'use strict';
  function html(state) {
    var hint = window.LN_V3_BIGPOOL_HINT.shouldShow(state) ? window.LN_V3_BIGPOOL_HINT.html() : '';
    return [
      '<section class="step-card" data-step-view="candidates">',
      '<div class="step-hero"><div class="v3-kicker">第 6 步</div><h2>详细候选 & 自选池</h2><p>这一页用于深入比较，不作为第一屏主体验。后续候选列表默认分页、详情展开时再补解释。</p></div>',
      '<div class="step-body">', hint,
      '<div class="step-section"><h3>自选池</h3><p>alpha1 先保留结构，后续接候选卡片、加入自选和横向比较。</p><div class="notice-box">当前自选数量：', (state.shortlist.items || []).length, '</div></div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-candidates-next>去导出</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelector('[data-candidates-next]').addEventListener('click', function () {
      window.LN_V3_STORE.markComplete('candidates', 'candidates:complete');
      window.LN_V3_ROUTER.go('export', 'candidates:next');
    });
  }
  window.LN_V3_STEP_CANDIDATES = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
