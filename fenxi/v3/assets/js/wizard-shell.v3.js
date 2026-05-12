(function () {
  'use strict';
  var stepRenderers = {
    rank: function (root, state) { window.LN_V3_STEP_RANK.render(root, state); },
    family: function (root, state) { window.LN_V3_STEP_FAMILY.render(root, state); },
    child: function (root, state) { window.LN_V3_STEP_CHILD.render(root, state); },
    scenario: function (root, state) { window.LN_V3_STEP_SCENARIO.render(root, state); },
    plans: function (root, state) { window.LN_V3_STEP_PLANS.render(root, state); },
    candidates: function (root, state) { window.LN_V3_STEP_CANDIDATES.render(root, state); },
    export: function (root, state) { window.LN_V3_STEP_EXPORT.render(root, state); }
  };
  function setStatus(text) {
    var el = document.getElementById('v3StatusText');
    if (el) el.textContent = text;
  }
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch];
    });
  }
  function compact(value, fallback) {
    var text = String(value || '').trim();
    return text || fallback || '未确定';
  }
  function currentStepMeta(state) {
    var routerSteps = (window.LN_V3_ROUTER && window.LN_V3_ROUTER.steps) || [];
    var step = routerSteps.find(function (item) { return item.id === state.ui.activeStep; }) || routerSteps[0] || {};
    var idx = Math.max(0, routerSteps.findIndex(function (item) { return item.id === state.ui.activeStep; }));
    return { index: idx + 1, total: routerSteps.length || 7, label: step.fullLabel || step.label || '当前步骤' };
  }
  function nextAction(state) {
    var step = state.ui.activeStep;
    if (step === 'rank') return state.rank.loadedRows ? '下一步确认家庭底线。' : '先输入位次或分数，加载位次附近数据。';
    if (step === 'family') return '把不能接受的地域、费用和学校性质先说清楚。';
    if (step === 'child') return '让孩子参与专业方向，再看真实命中是否过窄。';
    if (step === 'scenario') return '选择一条家庭路径，不让兴趣压过底线。';
    if (step === 'plans') return '先看 A/B/C 三套方案包，再进详细卡片复核。';
    if (step === 'candidates') return '用详细卡片复核风险，把值得讨论的加入自选池。';
    if (step === 'export') return '复制家庭讨论报告，带着复核清单继续查官方资料。';
    return '继续下一步。';
  }
  function renderDecisionRibbon(state) {
    var root = document.getElementById('v3DecisionRibbon');
    if (!root) return;
    var meta = currentStepMeta(state);
    var region = (state.family && state.family.regionMode === 'hard' && state.family.provinces && state.family.provinces.length) ? ('只看 ' + state.family.provinces.join('、'))
      : (state.family && state.family.regionMode === 'soft' && state.family.provinces && state.family.provinces.length) ? ('优先 ' + state.family.provinces.join('、'))
      : '地域未设限';
    var rank = state.rank && (state.rank.rank || state.rank.score) ? ((state.rank.rank ? state.rank.rank + '位' : '') + (state.rank.score ? ' / ' + state.rank.score + '分' : '')) : '未输入位次';
    var child = state.childPreference && state.childPreference.selectedGroups && state.childPreference.selectedGroups.length ? state.childPreference.selectedGroups.map(function (g) { return g.name; }).slice(0, 2).join('、') : '专业未确定';
    var scenario = state.scenario && (state.scenario.current || state.scenario.recommended) ? compact((state.scenario.preview && (state.scenario.preview.selectedName || state.scenario.preview.recommendedName)) || state.scenario.current || state.scenario.recommended) : '路径未选择';
    var effective = state.childPreference && state.childPreference.preview ? Number(state.childPreference.preview.effectiveFilteredRows || 0) : 0;
    var pool = effective || Number((state.family.preview && state.family.preview.filteredPreview) || state.rank.loadedRows || 0);
    var done = (state.ui.completedSteps || []).length;
    root.innerHTML = [
      '<div class="decision-ribbon-head"><span>当前进度</span><strong>第 ', meta.index, ' / ', meta.total, ' 步 · ', esc(meta.label), '</strong><em>', esc(nextAction(state)), '</em></div>',
      '<div class="decision-ribbon-grid">',
      '<div><span>位次/分数</span><strong>', esc(rank), '</strong></div>',
      '<div><span>地域选择</span><strong>', esc(region), '</strong></div>',
      '<div><span>孩子兴趣</span><strong>', esc(child), '</strong></div>',
      '<div><span>家庭路径</span><strong>', esc(scenario), '</strong></div>',
      '<div><span>当前候选</span><strong>', pool ? esc(pool + ' 条') : '待生成', '</strong></div>',
      '<div><span>已完成</span><strong>', esc(done + ' 项'), '</strong></div>',
      '</div>'
    ].join('');
  }

  function renderReviewChecklist(state) {
    var root = document.getElementById('v3ReviewChecklist');
    if (!root) return;
    var preview = null;
    if (window.LN_V3_REVIEW_CHECKLIST && window.LN_V3_REVIEW_CHECKLIST.generate) {
      preview = window.LN_V3_REVIEW_CHECKLIST.generate(state);
    } else {
      preview = (state || {}).reviewChecklist || { tasks: [], summary: '复核清单尚未生成。' };
    }
    var tasks = (preview.tasks || []).slice(0, 4);
    if (!tasks.length && (!state.rank || !state.rank.loadedRows)) {
      root.innerHTML = '';
      return;
    }
    var body = tasks.length ? tasks.map(function (item) {
      return '<li><strong>' + esc(item.title || '复核项') + '</strong><span>' + esc(item.detail || item.source || '') + '</span><em>' + esc(item.level || '待复核') + '</em></li>';
    }).join('') : '<li><strong>暂无明显复核任务</strong><span>完成详细卡片后，系统会把学费、校区、培养方案等人工复核项集中到这里。</span><em>提示</em></li>';
    root.innerHTML = [
      '<div class="review-checklist-head"><span>复核清单</span><strong>', esc((preview.count || tasks.length || 0) + ' 项待确认'), '</strong><em>', esc(preview.summary || '把需要人工确认的事集中看。'), '</em></div>',
      '<ul class="review-checklist-list">', body, '</ul>'
    ].join('');
  }

  function scrollToStepTop(reason) {
    var root = document.getElementById('v3StepRoot');
    if (!root) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var top = Math.max(0, root.getBoundingClientRect().top + window.pageYOffset - 72);
    try { window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' }); }
    catch (err) { window.scrollTo(0, top); }
    root.focus({ preventScroll: true });
    if (window.LN_V3_BUS) window.LN_V3_BUS.emit('route:scrolled', { reason: reason || 'route', top: top });
  }
  window.LN_V3_WIZARD = {
    init: function () {
      if (!window.LN_V3_STORE || !window.LN_V3_ROUTER) return;
      window.LN_V3_ROUTER.init();
      this.render();
      window.LN_V3_STORE.subscribe(function (state, reason) {
        if (reason && reason.indexOf('route') === -1 && reason.indexOf('bottom-tab') === -1) {
          setStatus(state.ui.lastMessage || '状态已更新');
        }
      });
    },
    render: function () {
      var root = document.getElementById('v3StepRoot');
      if (!root || !window.LN_V3_STORE) return;
      var state = window.LN_V3_STORE.getState();
      var renderer = stepRenderers[state.ui.activeStep] || stepRenderers.rank;
      renderer(root, state);
      renderDecisionRibbon(state);
      renderReviewChecklist(state);
      root.focus({ preventScroll: true });
      setStatus(state.ui.lastMessage || '已进入测试版');
    },
    scrollToStepTop: function (reason) {
      scrollToStepTop(reason);
    },
    renderDecisionRibbon: function () {
      if (window.LN_V3_STORE) renderDecisionRibbon(window.LN_V3_STORE.getState());
    },
    renderReviewChecklist: function () {
      if (window.LN_V3_STORE) renderReviewChecklist(window.LN_V3_STORE.getState());
    },
    flashMessage: function (message) {
      setStatus(message);
    }
  };
})();
