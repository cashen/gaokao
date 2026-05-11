(function () {
  'use strict';
  var scenarios = [
    { id: 'employment', name: '就业优先', desc: '优先看路径相对清晰、就业解释更容易讲明白的方向。' },
    { id: 'grid', name: '电网 / 体制内倾向', desc: '适合偏电气、能源、自动化等方向的家庭重点观察。' },
    { id: 'exam', name: '考研深造', desc: '更重视学科基础、读研路径和长期空间。' },
    { id: 'broad', name: '宽口径稳妥', desc: '避免过早锁死，优先保留后续转向余地。' }
  ];
  function html(state) {
    var child = state.childPreference || {};
    var recommended = child.selectedGroups && child.selectedGroups.length ? '建议优先看 B 方案：兴趣与稳妥兼顾。' : '孩子兴趣暂不明确，建议先看宽口径稳妥路径。';
    return [
      '<section class="step-card" data-step-view="scenario">',
      '<div class="step-hero"><div class="v3-kicker">第 4 步</div><h2>选择这次主要看哪种路径</h2><p>场景不是重新筛全量，而是影响后续 A/B/C 的展示顺序和解释重点。</p></div>',
      '<div class="step-body">',
      '<div class="notice-box">', recommended, '</div>',
      '<div class="placeholder-list">',
      scenarios.map(function (item) {
        var active = state.scenario.current === item.id;
        return '<div class="placeholder-item"><strong>' + item.name + (active ? ' · 当前选择' : '') + '</strong><p>' + item.desc + '</p><button type="button" class="v3-btn secondary" data-scenario="' + item.id + '">选择</button></div>';
      }).join(''),
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-scenario-next>继续看 A/B/C 方案</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelectorAll('[data-scenario]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-scenario');
        window.LN_V3_STORE.setState({ scenario: { current: id, recommended: id, reason: '用户在 v3 场景页选择' }, ui: { lastMessage: '场景已选择。' } }, 'scenario:pick');
        window.LN_V3_STORE.markComplete('scenario', 'scenario:complete');
        window.LN_V3_WIZARD.render();
      });
    });
    root.querySelector('[data-scenario-next]').addEventListener('click', function () {
      var state = window.LN_V3_STORE.getState();
      if (!state.scenario.current) window.LN_V3_STORE.setState({ scenario: { current: 'broad', recommended: 'broad', reason: '未选择时默认宽口径稳妥' } }, 'scenario:default');
      window.LN_V3_STORE.markComplete('scenario', 'scenario:complete');
      window.LN_V3_ROUTER.go('plans', 'scenario:next');
    });
  }
  window.LN_V3_STEP_SCENARIO = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
