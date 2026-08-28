// V2.9RC.fix-interact2: de-duplicate repeated applyFilters calls from the same filter-control change.
// Boundary: do not change formulas, filter rules, A/B/C, ranking, click semantics, compute-pipeline, plan-engine, or filter-engine.
(function(){
  const VERSION = 'V2.9RC.fix-interact2';
  const STAMP = '29rc-interact2-20260513';
  if (window.LN_INTERACT_DEDUPE_V29RC2 && window.LN_INTERACT_DEDUPE_V29RC2.stamp === STAMP) return;

  window.LN_INTERACT_DEDUPE_OPT = (window.LN_INTERACT_DEDUPE_OPT !== false);
  window.LN_INTERACT_DEDUPE_VERSION = STAMP;

  const perf = () => (window.performance && performance.now ? performance.now() : Date.now());
  const state = {
    version: VERSION,
    stamp: STAMP,
    opt: !!window.LN_INTERACT_DEDUPE_OPT,
    patched: false,
    applyWrapped: false,
    changeListenerBound: false,
    pendingTimer: null,
    pendingReason: '',
    pendingFingerprint: '',
    pendingAt: 0,
    lastAppliedFingerprint: '',
    lastApplyAt: 0,
    lastApplyMs: 0,
    lastReason: '',
    lastSkipReason: '',
    applied: 0,
    skipped: 0,
    merged: 0,
    directDuplicateSkipped: 0,
    scheduled: 0,
    lastControl: null
  };

  function hashText(s){
    s = String(s || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  function detail(name, obj){
    try { window.LN_DEBUG_V2983?.detail?.(name, Object.assign({version: STAMP}, obj || {})); } catch(e) {}
  }
  function flags(obj){
    try { window.LN_DEBUG_V2983?.setFlags?.(obj || {}); } catch(e) {}
  }
  function markDebug(extra){
    const payload = {
      version: STAMP,
      opt: !!window.LN_INTERACT_DEDUPE_OPT,
      applied: state.applied,
      skipped: state.skipped,
      merged: state.merged,
      directDuplicateSkipped: state.directDuplicateSkipped,
      scheduled: state.scheduled,
      lastApplyMs: state.lastApplyMs,
      lastReason: state.lastReason,
      lastSkipReason: state.lastSkipReason,
      pendingReason: state.pendingReason,
      pendingFingerprintHash: hashText(state.pendingFingerprint),
      lastAppliedFingerprintHash: hashText(state.lastAppliedFingerprint),
      lastControl: state.lastControl,
      extra: extra || null
    };
    detail('interactDedupe', payload);
    flags({interactDedupe:'v29rcfix2', interactDedupeOpt:!!window.LN_INTERACT_DEDUPE_OPT, interactDedupeVersion:STAMP});
  }

  function valOf(id){
    const el = document.getElementById(id);
    if (!el) return '';
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') return el.checked ? '1' : '0';
    if (tag === 'select' && el.multiple) return Array.from(el.selectedOptions || []).map(o => o.value).sort().join(',');
    return String(el.value || '');
  }

  function activeChipKeys(selector, attr){
    try {
      return Array.from(document.querySelectorAll(selector))
        .filter(el => el.classList && el.classList.contains('active'))
        .map(el => String(el.dataset?.[attr] || el.textContent || '').trim())
        .filter(Boolean)
        .sort();
    } catch(e) { return []; }
  }

  function childInterestFingerprintParts(){
    const parts = [];
    try {
      const rt = window.LN_CHILD_INTEREST_RUNTIME_V296 || window.LN_CHILD_INTEREST_RUNTIME_V298 || window.LN_CHILD_INTEREST_RUNTIME_V2976;
      const s = rt?.readState?.() || {};
      parts.push('child.mode=' + String(s.mode || ''));
      parts.push('child.groups=' + JSON.stringify(Array.isArray(s.selectedGroups) ? s.selectedGroups : []));
      parts.push('child.majors=' + JSON.stringify(Array.isArray(s.selectedMajors) ? s.selectedMajors : []));
      parts.push('child.keywords=' + JSON.stringify(Array.isArray(s.selectedKeywords) ? [...s.selectedKeywords].sort() : []));
      parts.push('child.disabledAuto=' + JSON.stringify(Array.isArray(s.disabledAutoMappings) ? [...s.disabledAutoMappings].sort() : []));
      parts.push('child.manualOnly=' + (!!s.manualOnlyInterest ? '1' : '0'));
    } catch(e) {}
    try {
      const tr = window.LN_CHILD_INTENT_TRANSLATOR_V298 || window.LN_CHILD_INTENT_TRANSLATOR_V2976 || window.LN_CHILD_INTENT_TRANSLATOR_V2975;
      const t = tr?.readState?.() || {};
      parts.push('intent.ids=' + JSON.stringify(Array.isArray(t.selectedIntentIds) ? t.selectedIntentIds : []));
    } catch(e) {}
    return parts;
  }

  function getFilterFingerprint(){
    const ids = [
      'myScore','myRank','filterLevel','filterSubject','filterPrimary','filterTax','filterTier','filterConfusable','onlyKey','onlyConfusable',
      'regionMode','provinceSelect','cityMode','cityInput','feeType','budget','priority','sortBy','onlyChildInterestV296'
    ];
    const parts = ids.map(id => id + '=' + valOf(id));
    parts.push('provinceChips=' + JSON.stringify(activeChipKeys('#provinceChips .chip','province')));
    parts.push('rejectChips=' + JSON.stringify(activeChipKeys('#rejectChips .chip','reject')));
    parts.push('regionGroups=' + JSON.stringify(activeChipKeys('#regionGroupChips .chip','group')));
    try { parts.push('strategy=' + String(window.currentStrategy || window.LN_CURRENT_STRATEGY || '')); } catch(e) {}
    try { parts.push('rank=' + String(window.currentRank || '')); } catch(e) {}
    return parts.concat(childInterestFingerprintParts()).join('|');
  }

  function isKnownFilterControl(el){
    if (!el) return false;
    const id = el.id || '';
    const knownIds = new Set([
      'filterLevel','filterSubject','filterPrimary','filterTax','filterTier','filterConfusable','onlyKey','onlyConfusable',
      'regionMode','provinceSelect','cityMode','cityInput','feeType','budget','priority','sortBy','onlyChildInterestV296','myScore','myRank'
    ]);
    if (knownIds.has(id)) return true;
    if (el.closest && (el.closest('#provinceChips') || el.closest('#rejectChips') || el.closest('#regionGroupChips'))) return true;
    if (el.dataset && (el.dataset.action || el.dataset.reject || el.dataset.province || el.dataset.group)) {
      const a = String(el.dataset.action || '');
      return /filter|region|province|reject|scenario|strategy|child-interest|student-profile/.test(a);
    }
    return false;
  }

  function shouldSkipDirectDuplicate(fp, reason){
    if (!window.LN_INTERACT_DEDUPE_OPT) return false;
    const now = perf();
    if (!fp || !state.lastAppliedFingerprint) return false;
    if (fp !== state.lastAppliedFingerprint) return false;
    // Skip only very-near repeated calls with exactly the same UI fingerprint.
    // This keeps final results unchanged while preventing the second refresh from the same control event.
    if ((now - Number(state.lastApplyAt || 0)) <= 360) {
      state.skipped += 1;
      state.directDuplicateSkipped += 1;
      state.lastSkipReason = 'direct-duplicate:' + String(reason || 'applyFilters');
      markDebug({skip:true, reason:state.lastSkipReason});
      return true;
    }
    return false;
  }

  function wrapApplyFilters(){
    const fn = window.applyFilters;
    if (typeof fn !== 'function') return false;
    if (fn.__v29rcInteractDedupeWrapped) return true;

    const wrapped = function(){
      const reason = arguments[0] || state.pendingReason || 'direct-apply';
      const fp = getFilterFingerprint();
      if (shouldSkipDirectDuplicate(fp, reason)) return window.filtered || [];
      const t0 = perf();
      try {
        return fn.apply(this, arguments);
      } finally {
        const ms = Math.round(perf() - t0);
        state.applied += 1;
        state.lastApplyMs = ms;
        state.lastReason = String(reason || 'direct-apply');
        state.lastAppliedFingerprint = fp;
        state.lastApplyAt = perf();
        markDebug({reason:state.lastReason, ms});
      }
    };
    wrapped.__v29rcInteractDedupeWrapped = true;
    wrapped.__original = fn;
    window.applyFilters = wrapped;
    state.applyWrapped = true;
    return true;
  }

  function runScheduled(reason, fp){
    state.pendingTimer = null;
    state.pendingReason = reason || state.pendingReason || 'scheduled';
    state.pendingFingerprint = fp || getFilterFingerprint();
    if (typeof window.applyFilters === 'function') {
      // The wrapper will skip if an old listener already ran with the same final fingerprint.
      window.applyFilters(state.pendingReason);
    }
  }

  function requestApply(reason, delay){
    if (!window.LN_INTERACT_DEDUPE_OPT) {
      if (typeof window.applyFilters === 'function') window.applyFilters(reason || 'direct-opt-off');
      return;
    }
    const fp = getFilterFingerprint();
    state.pendingReason = reason || 'unknown';
    state.pendingFingerprint = fp;
    state.pendingAt = Math.round(perf());
    state.scheduled += 1;
    if (state.pendingTimer) {
      clearTimeout(state.pendingTimer);
      state.merged += 1;
      state.skipped += 1;
      state.lastSkipReason = 'merged-pending';
    }
    const d = Number.isFinite(delay) ? delay : 160;
    state.pendingTimer = setTimeout(() => runScheduled(state.pendingReason, state.pendingFingerprint), d);
    markDebug({scheduled:true, reason:state.pendingReason, delay:d});
  }

  function bindChangeListener(){
    if (state.changeListenerBound) return true;
    document.addEventListener('change', function(ev){
      const el = ev.target;
      if (!isKnownFilterControl(el)) return;
      state.lastControl = {id:el.id || '', tag:(el.tagName || '').toLowerCase(), type:el.type || '', value:valOf(el.id || ''), at:new Date().toLocaleTimeString()};
      requestApply('change:' + (el.id || el.dataset?.action || el.tagName || 'control'), 170);
    }, true);
    document.addEventListener('input', function(ev){
      const el = ev.target;
      const id = el && el.id || '';
      if (!/myScore|myRank|cityInput/.test(id)) return;
      state.lastControl = {id, tag:(el.tagName || '').toLowerCase(), type:el.type || '', value:valOf(id), at:new Date().toLocaleTimeString()};
      requestApply('input:' + id, 220);
    }, true);
    document.addEventListener('click', function(ev){
      const el = ev.target;
      if (!el || !el.closest) return;
      const chip = el.closest('#provinceChips .chip, #rejectChips .chip, #regionGroupChips .chip');
      if (!chip) return;
      state.lastControl = {id:chip.id || '', action:chip.dataset?.action || '', text:(chip.textContent || '').trim().slice(0,60), at:new Date().toLocaleTimeString()};
      requestApply('click:chip-filter', 170);
    }, true);
    state.changeListenerBound = true;
    return true;
  }

  function patch(){
    wrapApplyFilters();
    bindChangeListener();
    state.patched = state.applyWrapped && state.changeListenerBound;
    flags({interactDedupe:'v29rcfix2', interactDedupeOpt:!!window.LN_INTERACT_DEDUPE_OPT, interactDedupeVersion:STAMP});
    markDebug({patched:state.patched, applyWrapped:state.applyWrapped, changeListenerBound:state.changeListenerBound});
  }

  function boot(){
    patch();
    setTimeout(patch, 0);
    setTimeout(patch, 800);
    setTimeout(patch, 1800);
    setTimeout(patch, 3200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.LN_INTERACT_DEDUPE_V29RC2 = {
    ready: true,
    version: VERSION,
    stamp: STAMP,
    state,
    patch,
    requestApply,
    fingerprint: getFilterFingerprint,
    hash: hashText
  };
})();
