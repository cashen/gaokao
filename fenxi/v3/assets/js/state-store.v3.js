(function () {
  'use strict';
  var version = window.LN_V3_VERSION || {};
  var saved = window.LN_V3_STORAGE ? window.LN_V3_STORAGE.get('state', null) : null;
  var initialState = {
    version: { name: version.name, stamp: version.stamp },
    ui: {
      activeStep: 'rank',
      activeTab: 'rank',
      completedSteps: [],
      dirty: false,
      loading: false,
      dataWaiting: false,
      bigPool: false,
      lastMessage: 'V3骨架已启动'
    },
    rank: { score: '', rank: '', rawScore: '', rawRank: '', effectiveScore: '', effectiveRank: '', mode: 'rank', inputConsistency: null, loadedRows: 0, chunkIds: [], chunkCount: 0, loadMs: 0, loadedAt: '', rankSource: '', sample: [] },
    family: { budget: 'normal', feeType: 'all', regionMode: 'none', provinces: [], cityMode: 'none', cities: '', qualificationMode: 'exclude', rejects: ['资格计划'], preview: null, summary: '家庭底线尚未设置。' },
    childPreference: { mode: 'unset', selectedGroups: [], selectedMajors: [], weights: {}, summary: '还没有选择专业方向。', manualOnly: false, preview: null },
    studentProfile: { gender: 'unspecified', source: 'unconfirmed', learning: 'unclear', load: 'unknown', path: 'unknown', understanding: 'unclear', tags: [], preferenceTags: [], reviewTags: [], summary: '学生画像未补充：只用于调整提醒顺序，不作为专业排除条件。', hardExclude: false },
    scenario: { current: '', recommended: '', reason: '', source: '', preview: null, locked: false },
    compute: { basePool: 0, filtered: 0, applyTotalMs: 0, preQuietMs: 0, waitDataMs: 0, lastReason: 'v3-alpha5-scenario-preview' },
    plans: { A: [], B: [], C: [], preview: null, meta: null },
    candidates: { list: [], page: 1, pageSize: 20 },
    counterfactual: { preview: null, cards: [], summary: '条件变化对照尚未生成。' },
    exportReport: { preview: null, markdown: '', generatedAt: '', summary: '家庭讨论报告尚未生成。' },
    reviewChecklist: { ok: false, count: 0, tasks: [], urgentCount: 0, summary: '复核清单尚未生成。' },
    shortlist: { items: [] }
  };
  var state = merge(initialState, saved || {});
  state.version = { name: version.name, stamp: version.stamp };
  state = normalizeState(state);
  if (window.LN_V3_STORAGE) window.LN_V3_STORAGE.set('state', state);
  var subscribers = [];
  var stepOrder = ['rank', 'family', 'child', 'scenario', 'plans', 'candidates', 'export'];

  function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function merge(base, patch) {
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(patch || {}).forEach(function (key) {
      if (isObject(base[key]) && isObject(patch[key])) out[key] = merge(base[key], patch[key]);
      else out[key] = patch[key];
    });
    return out;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalizeState(input) {
    var out = merge(initialState, input || {});
    out.version = { name: version.name, stamp: version.stamp };
    out.ui = merge(initialState.ui, out.ui || {});
    out.rank = merge(initialState.rank, out.rank || {});
    out.rank.chunkIds = Array.isArray(out.rank.chunkIds) ? out.rank.chunkIds : [];
    out.rank.sample = Array.isArray(out.rank.sample) ? out.rank.sample : [];
    out.rank.loadedRows = Number(out.rank.loadedRows || 0);
    out.rank.chunkCount = Number(out.rank.chunkCount || 0);
    out.rank.loadMs = Number(out.rank.loadMs || 0);
    out.rank.rawRank = out.rank.rawRank || out.rank.rank || '';
    out.rank.rawScore = out.rank.rawScore || out.rank.score || '';
    out.rank.inputConsistency = out.rank.inputConsistency || null;
    if (out.rank.inputConsistency && out.rank.inputConsistency.ok === false) {
      out.rank.effectiveRank = '';
      out.rank.effectiveScore = '';
      out.rank.mode = 'conflict';
    } else {
      out.rank.effectiveRank = out.rank.effectiveRank || out.rank.rank || '';
      out.rank.effectiveScore = out.rank.effectiveScore || out.rank.score || '';
    }
    out.compute = merge(initialState.compute, out.compute || {});
    out.scenario = merge(initialState.scenario, out.scenario || {});
    out.scenario.preview = out.scenario.preview || null;
    out.counterfactual = merge(initialState.counterfactual, out.counterfactual || {});
    out.counterfactual.cards = Array.isArray(out.counterfactual.cards) ? out.counterfactual.cards : [];
    out.exportReport = merge(initialState.exportReport, out.exportReport || {});
    out.exportReport.markdown = typeof out.exportReport.markdown === 'string' ? out.exportReport.markdown : '';
    out.reviewChecklist = merge(initialState.reviewChecklist, out.reviewChecklist || {});
    out.reviewChecklist.tasks = Array.isArray(out.reviewChecklist.tasks) ? out.reviewChecklist.tasks : [];
    out.family = merge(initialState.family, out.family || {});
    out.family.provinces = Array.isArray(out.family.provinces) ? out.family.provinces : [];
    out.family.rejects = Array.isArray(out.family.rejects) ? out.family.rejects : [];
    if (window.LN_V3_QUALIFICATION_FILTER && window.LN_V3_QUALIFICATION_FILTER.normalizeFamily) {
      out.family = window.LN_V3_QUALIFICATION_FILTER.normalizeFamily(out.family);
    } else {
      out.family.qualificationMode = out.family.qualificationMode === 'include' ? 'include' : 'exclude';
      if (out.family.qualificationMode !== 'include' && out.family.rejects.indexOf('资格计划') === -1) out.family.rejects.push('资格计划');
    }
    out.studentProfile = merge(initialState.studentProfile, out.studentProfile || {});
    if (window.LN_V3_STUDENT_PROFILE && window.LN_V3_STUDENT_PROFILE.normalized) out.studentProfile = window.LN_V3_STUDENT_PROFILE.normalized(out.studentProfile);
    out.childPreference = merge(initialState.childPreference, out.childPreference || {});
    out.childPreference.selectedGroups = Array.isArray(out.childPreference.selectedGroups) ? out.childPreference.selectedGroups : [];
    out.childPreference.selectedMajors = Array.isArray(out.childPreference.selectedMajors) ? out.childPreference.selectedMajors : [];
    out.childPreference.preview = out.childPreference.preview || null;
    var hasChildChoice = out.childPreference.selectedGroups.length > 0 || out.childPreference.selectedMajors.length > 0 || out.childPreference.mode === 'unknown';
    if (!hasChildChoice) {
      out.childPreference.mode = 'unset';
      out.childPreference.selectedGroups = [];
      out.childPreference.selectedMajors = [];
      out.childPreference.weights = {};
      out.childPreference.preview = null;
      out.childPreference.summary = initialState.childPreference.summary;
      if (!out.ui.lastMessage || out.ui.lastMessage.indexOf('孩子偏') !== -1 || out.ui.lastMessage.indexOf('真实命中') !== -1) {
        out.ui.lastMessage = initialState.ui.lastMessage;
      }
    }
    return out;
  }
  function notify(reason) {
    if (window.LN_V3_STORAGE) window.LN_V3_STORAGE.set('state', state);
    subscribers.slice().forEach(function (handler) {
      try { handler(clone(state), reason); } catch (err) { console.error('[LN_V3_STORE] subscriber failed', err); }
    });
    if (window.LN_V3_BUS) window.LN_V3_BUS.emit('state:changed', { state: clone(state), reason: reason });
  }
  function markComplete(stepId) {
    var list = state.ui.completedSteps || [];
    if (list.indexOf(stepId) === -1) state.ui.completedSteps = list.concat(stepId);
  }
  function markCompleteThrough(stepId) {
    var index = stepOrder.indexOf(stepId);
    if (index < 0) { markComplete(stepId); return; }
    var current = state.ui.completedSteps || [];
    var next = current.slice();
    stepOrder.slice(0, index + 1).forEach(function (id) {
      if (next.indexOf(id) === -1) next.push(id);
    });
    state.ui.completedSteps = next;
  }
  function isCompleteThrough(stepId) {
    var index = stepOrder.indexOf(stepId);
    if (index < 0) return false;
    var list = state.ui.completedSteps || [];
    return stepOrder.slice(0, index + 1).every(function (id) { return list.indexOf(id) !== -1; });
  }

  window.LN_V3_STORE = {
    getState: function () { return clone(state); },
    setState: function (patch, reason) {
      state = normalizeState(merge(state, patch || {}));
      state.ui.dirty = true;
      notify(reason || 'setState');
    },
    update: function (updater, reason) {
      var draft = clone(state);
      updater(draft);
      state = normalizeState(draft);
      state.ui.dirty = true;
      notify(reason || 'update');
    },
    setActiveStep: function (stepId, reason) {
      state.ui.activeStep = stepId;
      state.ui.activeTab = stepId === 'candidates' ? 'shortlist' : stepId;
      notify(reason || 'setActiveStep');
    },
    markComplete: function (stepId, reason) {
      markComplete(stepId);
      notify(reason || 'markComplete');
    },
    markCompleteThrough: function (stepId, reason) {
      markCompleteThrough(stepId);
      notify(reason || 'markCompleteThrough');
    },
    isCompleteThrough: function (stepId) {
      return isCompleteThrough(stepId);
    },
    stepOrder: stepOrder.slice(),
    subscribe: function (handler) {
      subscribers.push(handler);
      return function () { subscribers = subscribers.filter(function (fn) { return fn !== handler; }); };
    },
    resetDraft: function () {
      state = normalizeState(merge(initialState, {}));
      if (window.LN_V3_STORAGE) window.LN_V3_STORAGE.remove('state');
      notify('resetDraft');
    }
  };
})();
