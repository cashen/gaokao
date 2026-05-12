(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function row(item) {
    return [
      '<li class="plan-sample-item">',
      '<div><strong>', esc(item.school || '学校待显示'), '</strong><span>', esc(item.major || '专业待显示'), '</span></div>',
      '<em>', esc(item.score2025 || '-'), '分 / ', esc(item.rank2025 || '-'), '位</em>',
      item.matchReason ? '<p>' + esc(item.matchReason) + '</p>' : '',
      '</li>'
    ].join('');
  }
  function card(plan, klass) {
    plan = plan || { sample: [] };
    var samples = (plan.sample || []).map(row).join('') || '<li class="plan-sample-item empty">暂无样例，后续接正式候选后补齐。</li>';
    return [
      '<article class="plan-card ', klass || '', '">',
      '<div class="plan-card-head"><span>', esc(plan.id || ''), '</span><div><h3>', esc(plan.name || ''), '</h3><p>', esc(plan.tone || ''), '</p></div></div>',
      '<div class="plan-summary">', esc(plan.summary || ''), '</div>',
      '<ol class="plan-sample-list">', samples, '</ol>',
      '</article>'
    ].join('');
  }
  function buildPreview(state) {
    if (window.LN_V3_PLANS_ADAPTER && window.LN_V3_PLANS_ADAPTER.preview) return window.LN_V3_PLANS_ADAPTER.preview(state);
    return null;
  }
  function html(state) {
    var hint = window.LN_V3_BIGPOOL_HINT.shouldShow(state) ? window.LN_V3_BIGPOOL_HINT.html() : '';
    var scenario = state.scenario || {};
    var preview = (state.plans && state.plans.preview) || buildPreview(state) || {};
    var scenarioName = preview.scenarioName || (scenario.preview && scenario.preview.selectedName) || scenario.current || '尚未选择';
    var counts = preview.counts || { A: 0, B: 0, C: 0 };
    var plans = preview.plans || {};
    var notice = preview.ok ? [
      '当前按“', esc(scenarioName), '”生成 A/B/C 预览；',
      '有效池 ', esc(preview.effectiveRows || 0), ' 条；',
      preview.manualOnly ? '已按真实兴趣命中收窄。' : '默认不硬排除其它机会。'
    ].join('') : '先完成前面步骤，再生成 A/B/C 方案预览。';
    return [
      '<section class="step-card" data-step-view="plans">',
      '<div class="step-hero"><div class="v3-kicker">第 5 步</div><h2>A/B/C 方案展示</h2><p>先给家长看三类方案的方向和样例：A 少量冲击，B 稳妥主线，C 保护底线。正式候选排序后续再接 fix12 主计算。</p></div>',
      '<div class="step-body">', hint,
      '<div class="plans-overview">',
      '<div><span>当前场景</span><strong>', esc(scenarioName), '</strong></div>',
      '<div><span>底线池</span><strong>', esc(preview.familyFilteredRows || 0), '</strong></div>',
      '<div><span>有效池</span><strong>', esc(preview.effectiveRows || 0), '</strong></div>',
      '<div><span>A/B/C</span><strong>', esc(counts.A || 0), '/', esc(counts.B || 0), '/', esc(counts.C || 0), '</strong></div>',
      '</div>',
      '<div class="notice-box">', notice, '</div>',
      '<div class="plans-grid">',
      card(plans.A, 'plan-a'),
      card(plans.B, 'plan-b'),
      card(plans.C, 'plan-c'),
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-plans-generate>重新生成 A/B/C 预览</button><button type="button" class="v3-btn" data-plans-next>进入详细候选与自选池</button><button type="button" class="v3-btn secondary" data-plans-compute>测试 compute adapter</button></div>',
      '<p class="step-help">alpha6 仍是 v3 预览层：不改旧 compute，不替代正式 A/B/C 排序。这里先验证家长能看懂三类方案的结构。</p>',
      '</div></section>'
    ].join('');
  }
  function generate(source) {
    if (window.LN_V3_PLANS_ADAPTER) return window.LN_V3_PLANS_ADAPTER.apply(source || 'plans:generate');
    return null;
  }
  function saveAndGoNext(source) {
    generate(source || 'plans:save-before-next');
    window.LN_V3_STORE.markComplete('plans', 'plans:complete');
    var routed = window.LN_V3_ROUTER.go('candidates', source || 'plans:next');
    if (!routed) window.LN_V3_STORE.setActiveStep('candidates', source || 'plans:force-candidates');
    setTimeout(function () {
      var root = document.getElementById('v3StepRoot');
      if (root && root.scrollIntoView) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
    return !!routed;
  }
  function bind(root) {
    root.querySelector('[data-plans-generate]').addEventListener('click', function () {
      generate('plans:user-generate');
      window.LN_V3_WIZARD.render();
    });
    root.querySelector('[data-plans-next]').addEventListener('click', function () {
      saveAndGoNext('plans:next');
    });
    root.querySelector('[data-plans-compute]').addEventListener('click', function () {
      if (window.LN_V3_LEGACY_COMPUTE) window.LN_V3_LEGACY_COMPUTE.apply('plans:test-adapter');
      window.LN_V3_WIZARD.render();
    });
  }
  window.LN_V3_STEP_PLANS = {
    render: function (root, state) { root.innerHTML = html(state); bind(root); },
    _test: { generate: generate, saveAndGoNext: saveAndGoNext }
  };
})();
