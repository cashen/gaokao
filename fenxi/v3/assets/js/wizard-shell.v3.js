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
      root.focus({ preventScroll: true });
      setStatus(state.ui.lastMessage || '已进入测试版');
    },
    scrollToStepTop: function (reason) {
      scrollToStepTop(reason);
    },
    flashMessage: function (message) {
      setStatus(message);
    }
  };
})();
