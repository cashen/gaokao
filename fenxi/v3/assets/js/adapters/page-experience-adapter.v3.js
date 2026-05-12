(function () {
  'use strict';
  var STEP_GOALS = {
    rank: '这一步只解决一件事：先确定孩子大概位次，再加载附近数据。',
    family: '这一步先说清家庭不能接受什么，后面才不会越看越乱。',
    child: '这一步让孩子参与进来，但兴趣只做软加权，不盖过家庭底线。',
    scenario: '这一步选家庭路径：先看当前分数段和家庭底线，再看兴趣怎么进入 B 方案。',
    plans: '这一步先看 A/B/C 三套方案包，不急着陷入单个学校专业。',
    candidates: '这一步用详细卡片复核风险，把值得讨论的加入自选池。',
    export: '这一步把全流程整理成家庭讨论报告，带着复核清单继续查官方资料。'
  };
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function isCompactViewport() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 680px)').matches);
  }
  function getActiveStep(state) {
    return (state && state.ui && state.ui.activeStep) || 'rank';
  }
  function enhanceStepRoot(root, state) {
    if (!root) return;
    var step = getActiveStep(state);
    var card = root.querySelector('.step-card');
    if (card && !card.querySelector('.step-focus-note')) {
      var note = document.createElement('div');
      note.className = 'step-focus-note';
      note.setAttribute('role', 'note');
      note.innerHTML = '<strong>本步重点</strong><span>' + esc(STEP_GOALS[step] || '按步骤继续，当前页只处理一个主要问题。') + '</span>';
      var body = card.querySelector('.step-body');
      if (body) body.insertBefore(note, body.firstChild);
    }
    root.querySelectorAll('.v3-actions').forEach(function (actions) {
      actions.classList.add('v3-actions-enhanced');
      var primary = actions.querySelector('.v3-btn:not(.secondary):not(.ghost)') || actions.querySelector('.v3-btn');
      if (primary) {
        primary.classList.add('is-primary-action');
        if (!primary.getAttribute('aria-label')) primary.setAttribute('aria-label', primary.textContent.trim() || '继续');
      }
    });
    root.querySelectorAll('[data-export-copy], [data-debug-copy]').forEach(function (btn) {
      btn.setAttribute('data-copy-feedback-ready', 'true');
    });
  }
  function snapshot() {
    var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : { ui: {} };
    var root = document.getElementById('v3StepRoot');
    var ribbon = document.getElementById('v3DecisionRibbon');
    var review = document.getElementById('v3ReviewChecklist');
    var tabs = document.getElementById('v3BottomTabs');
    var activeTab = tabs ? tabs.querySelector('.v3-tab.is-active') : null;
    var primary = root ? root.querySelector('.v3-actions .is-primary-action') : null;
    return {
      activeStep: getActiveStep(state),
      compactViewport: isCompactViewport(),
      hasDecisionRibbon: !!(ribbon && ribbon.textContent.trim()),
      hasReviewChecklist: !!review,
      reviewCollapsible: !!(review && review.querySelector('details.review-checklist-details')),
      hasBottomTabs: !!tabs,
      activeTabVisible: !!activeTab,
      primaryActionReady: !!primary,
      stepFocusNoteReady: !!(root && root.querySelector('.step-focus-note')),
      exportCopyFeedbackReady: !!document.querySelector('[data-export-copy][data-copy-feedback-ready]'),
      bottomTabSafeArea: !!tabs && getComputedStyle(tabs).paddingBottom !== '',
      completedSteps: (state.ui && state.ui.completedSteps || []).slice()
    };
  }
  function validateStructure() {
    var snap = snapshot();
    var ok = !!(snap.hasBottomTabs && snap.activeTabVisible && snap.hasDecisionRibbon);
    var mobileOk = !!(snap.reviewCollapsible && snap.bottomTabSafeArea);
    return Object.assign({ ok: ok, mobileOk: mobileOk, reason: ok && mobileOk ? 'page-experience-ready' : 'page-experience-incomplete' }, snap);
  }
  function copyFeedback(button, okText, failText) {
    if (!button) return;
    var old = button.textContent;
    button.textContent = okText || '已复制';
    button.classList.add('is-copied');
    window.setTimeout(function () {
      button.textContent = old;
      button.classList.remove('is-copied');
    }, 1600);
  }
  function staticPlan() {
    return {
      autoScrollAfterRoute: true,
      stepFocusNote: true,
      mobileReviewCollapsed: true,
      mobileStickyAction: true,
      copyButtonFeedback: true,
      bottomTabSafeArea: true,
      noBusinessWeightChange: true
    };
  }
  window.LN_V3_PAGE_EXPERIENCE = {
    stepGoals: STEP_GOALS,
    isCompactViewport: isCompactViewport,
    enhance: enhanceStepRoot,
    snapshot: snapshot,
    staticPlan: staticPlan,
    validateStructure: validateStructure,
    copyFeedback: copyFeedback
  };
})();
