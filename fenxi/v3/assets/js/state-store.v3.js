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
    rank: { score: '', rank: '', mode: 'rank', loadedRows: 0 },
    family: { budget: 'normal', feeType: 'all', regionMode: 'none', provinces: [], cityMode: 'none', cities: '', rejects: [] },
    childPreference: { mode: 'unset', selectedGroups: [], selectedMajors: [], weights: {}, summary: '还没有选择专业方向。', manualOnly: false },
    scenario: { current: '', recommended: '', reason: '' },
    compute: { basePool: 0, filtered: 0, applyTotalMs: 0, preQuietMs: 0, waitDataMs: 0, lastReason: 'v3-alpha1-skeleton' },
    plans: { A: [], B: [], C: [] },
    candidates: { list: [], page: 1, pageSize: 20 },
    shortlist: { items: [] }
  };
  var state = merge(initialState, saved || {});
  state.version = { name: version.name, stamp: version.stamp };
  state = normalizeState(state);
  if (window.LN_V3_STORAGE) window.LN_V3_STORAGE.set('state', state);
  var subscribers = [];

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
    out.childPreference = merge(initialState.childPreference, out.childPreference || {});
    out.childPreference.selectedGroups = Array.isArray(out.childPreference.selectedGroups) ? out.childPreference.selectedGroups : [];
    out.childPreference.selectedMajors = Array.isArray(out.childPreference.selectedMajors) ? out.childPreference.selectedMajors : [];
    var hasChildChoice = out.childPreference.selectedGroups.length > 0 || out.childPreference.selectedMajors.length > 0 || out.childPreference.mode === 'unknown';
    if (!hasChildChoice) {
      out.childPreference.mode = 'unset';
      out.childPreference.selectedGroups = [];
      out.childPreference.selectedMajors = [];
      out.childPreference.weights = {};
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
