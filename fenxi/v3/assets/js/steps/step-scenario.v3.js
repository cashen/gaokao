(function () {
  'use strict';
  function scenarioCard(item, state, preview) {
    var current = (state.scenario || {}).current;
    var recommended = preview && preview.recommended;
    var score = preview && preview.scores ? Math.round(preview.scores[item.id] || 0) : 0;
    var active = current === item.id;
    var isRecommended = recommended === item.id;
    return [
      '<article class="scenario-card', active ? ' is-selected' : '', isRecommended ? ' is-recommended' : '', '" data-scenario-card="', item.id, '">',
      '<div class="scenario-card-head"><strong>', item.name, '</strong>', isRecommended ? '<span>系统建议</span>' : '', '</div>',
      '<p>', item.desc, '</p>',
      '<div class="scenario-score"><span>场景匹配度</span><strong>', score, '</strong></div>',
      '<button type="button" class="v3-btn ', active ? '' : 'secondary', '" data-scenario="', item.id, '">', active ? '当前选择' : '选择这条路径', '</button>',
      '</article>'
    ].join('');
  }
  function metrics(preview) {
    return [
      '<div class="scenario-metrics">',
      '<div><span>底线池</span><strong>', preview.familyFilteredRows || 0, '</strong></div>',
      '<div><span>兴趣命中</span><strong>', preview.matchedRows || 0, '</strong></div>',
      '<div><span>后续有效池</span><strong>', preview.effectiveRows || 0, '</strong></div>',
      '<div><span>B方案权重</span><strong>', preview.bPlanBoost || 1, '</strong></div>',
      '</div>'
    ].join('');
  }
  function html(state) {
    var adapter = window.LN_V3_SCENARIO_ADAPTER;
    var preview = adapter ? adapter.recommend(state) : { recommended: 'broad', recommendedName: '宽口径稳妥', explanation: '场景推荐模块未加载。', reasons: [], scores: {}, familyFilteredRows: 0, matchedRows: 0, effectiveRows: 0, planTone: {} };
    var current = (state.scenario || {}).current;
    var currentName = current && adapter && adapter.names ? adapter.names[current] : '';
    var scenarios = adapter ? adapter.scenarios : [];
    var planTone = current && state.scenario && state.scenario.preview ? state.scenario.preview.planTone : preview.planTone;
    return [
      '<section class="step-card" data-step-view="scenario">',
      '<div class="step-hero"><div class="v3-kicker">第 4 步</div><h2>选择这次主要看哪种路径</h2><p>场景不是重新筛全量，而是决定后面 A/B/C 的解释重点。先让家长知道：这次主要按什么逻辑看。</p></div>',
      '<div class="step-body">',
      '<div class="scenario-recommend-panel">',
      '<div><span class="scenario-label">系统建议</span><h3>', preview.recommendedName || '宽口径稳妥', '</h3><p>', preview.explanation || '', '</p></div>',
      metrics(preview),
      '<div class="scenario-reasons">', (preview.reasons || []).map(function (r) { return '<span>' + r + '</span>'; }).join(''), '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-scenario-use-recommended>采用系统建议</button>', current ? '<button type="button" class="v3-btn secondary" data-scenario-clear>重新选择</button>' : '', '</div>',
      '</div>',
      current ? '<div class="notice-box">当前选择：' + currentName + '。下一步 B 方案会优先按这条路径解释。</div>' : '<div class="notice-box">还没有手动选择。可以直接采用系统建议，也可以点下面的场景卡片。</div>',
      '<div class="scenario-grid">', scenarios.map(function (item) { return scenarioCard(item, state, preview); }).join(''), '</div>',
      '<div class="scenario-plan-tone">',
      '<h3>下一步 A/B/C 会怎样解释？</h3>',
      '<div><strong>A 冲一冲：</strong><span>', (planTone && planTone.A) || '少量保留冲击机会', '</span></div>',
      '<div><strong>B 稳妥主方案：</strong><span>', (planTone && planTone.B) || '稳妥主线先不锁死', '</span></div>',
      '<div><strong>C 保底安全：</strong><span>', (planTone && planTone.C) || '先保证录取安全', '</span></div>',
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-scenario-next>保存场景并继续看 A/B/C</button><button type="button" class="v3-btn secondary" data-scenario-back-child>回到专业偏好</button></div>',
      '</div></section>'
    ].join('');
  }
  function saveAndGoNext(source) {
    var state = window.LN_V3_STORE.getState();
    var current = (state.scenario || {}).current;
    var preview = current && state.scenario.preview ? state.scenario.preview : null;
    if (!current) preview = window.LN_V3_SCENARIO_ADAPTER.applyRecommended(source || 'next-default');
    else preview = window.LN_V3_SCENARIO_ADAPTER.applyScenario(current, source || 'next-current');
    window.LN_V3_STORE.markComplete('scenario', 'scenario:complete');
    window.LN_V3_STORE.setState({ ui: { lastMessage: '场景已保存：' + (preview && preview.selectedName ? preview.selectedName : '已选择') + '，进入 A/B/C 方案。' } }, 'scenario:next-message');
    if (window.LN_V3_ROUTER) return window.LN_V3_ROUTER.go('plans', 'scenario:next');
    return false;
  }
  function bind(root) {
    root.querySelectorAll('[data-scenario]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-scenario');
        window.LN_V3_SCENARIO_ADAPTER.applyScenario(id, 'user');
        window.LN_V3_WIZARD.render();
      });
    });
    var rec = root.querySelector('[data-scenario-use-recommended]');
    if (rec) rec.addEventListener('click', function () { window.LN_V3_SCENARIO_ADAPTER.applyRecommended('user-recommended'); window.LN_V3_WIZARD.render(); });
    var clear = root.querySelector('[data-scenario-clear]');
    if (clear) clear.addEventListener('click', function () { window.LN_V3_STORE.setState({ scenario: { current: '', recommended: '', reason: '', source: '', preview: null, locked: false }, ui: { lastMessage: '已清除场景选择，可重新选择。' } }, 'scenario:clear'); window.LN_V3_WIZARD.render(); });
    var next = root.querySelector('[data-scenario-next]');
    if (next) next.addEventListener('click', function () { saveAndGoNext('user-next'); });
    var back = root.querySelector('[data-scenario-back-child]');
    if (back) back.addEventListener('click', function () { window.LN_V3_ROUTER.go('child', 'scenario:back-child'); });
  }
  window.LN_V3_STEP_SCENARIO = {
    render: function (root, state) { root.innerHTML = html(state); bind(root); },
    _test: {
      applyRecommended: function () { return window.LN_V3_SCENARIO_ADAPTER.applyRecommended('debug'); },
      selectScenario: function (id) { return window.LN_V3_SCENARIO_ADAPTER.applyScenario(id, 'debug'); },
      saveAndGoNext: saveAndGoNext
    }
  };
})();
