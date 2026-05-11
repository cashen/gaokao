(function () {
  'use strict';
  var steps = [
    { id: 'rank', tab: 'rank', label: '位次', fullLabel: '位次输入', icon: '①' },
    { id: 'family', tab: 'family', label: '底线', fullLabel: '家庭底线', icon: '②' },
    { id: 'child', tab: 'child', label: '专业', fullLabel: '孩子专业偏好', icon: '③' },
    { id: 'scenario', tab: 'scenario', label: '场景', fullLabel: '场景选择', icon: '④' },
    { id: 'plans', tab: 'plans', label: '方案', fullLabel: 'A/B/C方案', icon: '⑤' },
    { id: 'candidates', tab: 'shortlist', label: '自选', fullLabel: '详细候选与自选池', icon: '⑥' },
    { id: 'export', tab: 'export', label: '导出', fullLabel: '导出', icon: '↗' }
  ];
  var progressSteps = steps.filter(function (step) { return step.id !== 'export'; });

  function canMoveTo(stepId, state) {
    if (stepId === 'rank' || stepId === 'export') return true;
    if (!state.rank.rank && !state.rank.score) return false;
    return true;
  }
  function politeMessage(stepId) {
    if (stepId === 'rank') return '';
    return '先填一下位次或分数，系统才知道大概从哪些学校专业里帮你看。';
  }
  function renderTabs() {
    var root = document.getElementById('v3BottomTabs');
    if (!root || !window.LN_V3_STORE) return;
    var state = window.LN_V3_STORE.getState();
    root.innerHTML = steps.map(function (step) {
      var active = state.ui.activeStep === step.id;
      var complete = (state.ui.completedSteps || []).indexOf(step.id) !== -1;
      return [
        '<button type="button" class="v3-tab', active ? ' is-active' : '', complete ? ' is-complete' : '', '" data-step="', step.id, '" aria-current="', active ? 'page' : 'false', '">',
        '<span class="v3-tab-icon">', step.icon, '</span>',
        '<span class="v3-tab-label">', step.label, '</span>',
        '</button>'
      ].join('');
    }).join('');
    root.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.LN_V3_ROUTER.go(btn.getAttribute('data-step'), 'bottom-tab');
      });
    });
  }
  function renderProgress() {
    var root = document.getElementById('v3ProgressSteps');
    if (!root || !window.LN_V3_STORE) return;
    var state = window.LN_V3_STORE.getState();
    root.innerHTML = progressSteps.map(function (step) {
      var active = state.ui.activeStep === step.id;
      var complete = (state.ui.completedSteps || []).indexOf(step.id) !== -1;
      return '<div class="progress-step' + (active ? ' is-active' : '') + (complete ? ' is-complete' : '') + '">' + step.fullLabel + '</div>';
    }).join('');
  }
  function renderShellParts() {
    renderTabs();
    renderProgress();
  }

  window.LN_V3_ROUTER = {
    steps: steps,
    progressSteps: progressSteps,
    init: function () {
      renderShellParts();
      if (window.LN_V3_STORE) {
        window.LN_V3_STORE.subscribe(function () { renderShellParts(); });
      }
    },
    go: function (stepId, reason) {
      var state = window.LN_V3_STORE.getState();
      if (!canMoveTo(stepId, state)) {
        window.LN_V3_STORE.setState({ ui: { lastMessage: politeMessage(stepId) } }, 'guard:' + reason);
        if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.flashMessage(politeMessage(stepId));
        return false;
      }
      window.LN_V3_STORE.setActiveStep(stepId, reason || 'route');
      if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.render();
      return true;
    }
  };
})();
