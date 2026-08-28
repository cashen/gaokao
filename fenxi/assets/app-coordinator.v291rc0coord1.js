// V2.91RC0.coordinator1: app coordination facade and diagnostics bridge.
// Boundary: no formulas, no filter rules, no A/B/C logic, no click semantics, no engine replacement.
(function(){
  const VERSION = 'V2.91RC0.coordinator1';
  const STAMP = '291rc0-coordinator1-20260513';
  if (window.LN_APP_COORDINATOR && window.LN_APP_COORDINATOR.stamp === STAMP) return;

  window.LN_APP_COORDINATOR_OPT = (window.LN_APP_COORDINATOR_OPT !== false);
  window.LN_APP_COORDINATOR_VERSION = STAMP;

  const perf = () => (window.performance && performance.now ? performance.now() : Date.now());
  const state = {
    version: VERSION,
    stamp: STAMP,
    opt: !!window.LN_APP_COORDINATOR_OPT,
    startedAt: new Date().toLocaleString(),
    actions: [],
    applyRequests: [],
    renderRequests: [],
    drawer: {dirty:{}, lastOpen:null, lastClose:null},
    counters: {dispatch:0, applyRequest:0, renderRequest:0, drawerOpen:0, drawerClose:0, drawerDirty:0, debug:0},
    lastAction: null,
    lastApplyRequest: null,
    lastRenderRequest: null,
    lastSnapshotHash: ''
  };

  function trim(arr,n){ while(arr.length>n) arr.shift(); return arr; }
  function hashText(s){
    s = String(s || '');
    let h = 0;
    for (let i=0;i<s.length;i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return String(h);
  }
  function safeCall(fn, fallback){ try { return fn(); } catch(e) { return fallback; } }
  function val(id){
    const el = document.getElementById(id);
    if (!el) return '';
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') return el.checked ? '1' : '0';
    if (tag === 'select' && el.multiple) return Array.from(el.selectedOptions || []).map(o=>o.value).sort().join(',');
    return String(el.value || '');
  }
  function active(selector, attr){
    return safeCall(()=>Array.from(document.querySelectorAll(selector))
      .filter(el => el.classList && el.classList.contains('active'))
      .map(el => String((el.dataset && el.dataset[attr]) || el.textContent || '').trim())
      .filter(Boolean)
      .sort(), []);
  }
  function readChildState(){
    return safeCall(()=>{
      const rt = window.LN_CHILD_INTEREST_RUNTIME_V296 || window.LN_CHILD_INTEREST_RUNTIME_V298 || window.LN_CHILD_INTEREST_RUNTIME_V2976;
      const s = rt && rt.readState ? (rt.readState() || {}) : {};
      return {
        mode: String(s.mode || ''),
        selectedGroups: Array.isArray(s.selectedGroups) ? s.selectedGroups.slice() : [],
        selectedMajors: Array.isArray(s.selectedMajors) ? s.selectedMajors.slice() : [],
        selectedKeywords: Array.isArray(s.selectedKeywords) ? s.selectedKeywords.slice().sort() : [],
        disabledAutoMappings: Array.isArray(s.disabledAutoMappings) ? s.disabledAutoMappings.slice().sort() : [],
        manualOnlyInterest: !!s.manualOnlyInterest
      };
    }, {});
  }
  function readProfileState(){
    return safeCall(()=>{
      const rules = window.LN_STUDENT_PROFILE_RULES_V2981 || window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976;
      return rules && rules.readState ? (rules.readState() || {}) : {};
    }, {});
  }
  function snapshot(scope){
    const base = {
      scope: scope || 'default',
      rank: val('myRank') || String(window.currentRank || ''),
      score: val('myScore'),
      budget: val('budget'),
      regionMode: val('regionMode'),
      cityMode: val('cityMode'),
      cityInput: val('cityInput'),
      feeType: val('feeType'),
      filterLevel: val('filterLevel'),
      filterSubject: val('filterSubject'),
      filterPrimary: val('filterPrimary'),
      filterTax: val('filterTax'),
      filterTier: val('filterTier'),
      filterConfusable: val('filterConfusable'),
      onlyKey: val('onlyKey'),
      onlyConfusable: val('onlyConfusable'),
      onlyChildInterest: val('onlyChildInterestV296'),
      sortBy: val('sortBy'),
      priority: val('priority'),
      currentStrategy: String(window.currentStrategy || window.LN_CURRENT_STRATEGY || ''),
      provinceChips: active('#provinceChips .chip','province'),
      rejectChips: active('#rejectChips .chip','reject'),
      regionGroups: active('#regionGroupChips .chip','group'),
      pools: safeCall(()=>Object.assign({}, window.LN_DEBUG_V2983?.state?.pools || {}), {}),
      queue: safeCall(()=>Object.assign({}, window.LN_DEBUG_V2983?.state?.queue || {}), {}),
      child: readChildState(),
      profile: readProfileState()
    };
    state.lastSnapshotHash = hashText(JSON.stringify(base));
    return base;
  }
  function fingerprint(scope){ return hashText(JSON.stringify(snapshot(scope || 'default'))); }
  function debug(event, data){
    state.counters.debug += 1;
    const payload = Object.assign({version: STAMP, event: String(event || 'debug'), at: new Date().toLocaleTimeString()}, data || {});
    try { window.LN_DEBUG_V2983?.detail?.('appCoordinator', compactState(payload)); } catch(e) {}
    try { window.LN_DEBUG_V2983?.setFlags?.({appCoordinator:'v291rc0coord1', appCoordinatorOpt:!!window.LN_APP_COORDINATOR_OPT, appCoordinatorVersion:STAMP}); } catch(e) {}
  }
  function compactState(extra){
    return {
      version: STAMP,
      opt: !!window.LN_APP_COORDINATOR_OPT,
      counters: Object.assign({}, state.counters),
      lastAction: state.lastAction,
      lastApplyRequest: state.lastApplyRequest,
      lastRenderRequest: state.lastRenderRequest,
      drawer: Object.assign({}, state.drawer, {dirty:Object.assign({}, state.drawer.dirty)}),
      lastSnapshotHash: state.lastSnapshotHash,
      extra: extra || null
    };
  }
  function pushAction(type, payload){
    const item = {t:new Date().toLocaleTimeString(), ms:Math.round(perf()), type:String(type||'action'), payload:payload||null};
    state.lastAction = item;
    state.actions.push(item); trim(state.actions, 80);
    return item;
  }
  function dispatch(action){
    state.counters.dispatch += 1;
    const item = pushAction(action && action.type || 'dispatch', action || null);
    debug('dispatch', {type:item.type});
    return item;
  }
  function requestApply(reason, options){
    state.counters.applyRequest += 1;
    const opts = options || {};
    const item = {t:new Date().toLocaleTimeString(), reason:String(reason||'unknown'), options:Object.assign({}, opts), fingerprint:fingerprint('apply')};
    state.lastApplyRequest = item;
    state.applyRequests.push(item); trim(state.applyRequests, 60);
    debug('requestApply', {reason:item.reason, execute:opts.execute===true, defer:Number(opts.defer||0)});
    if (!window.LN_APP_COORDINATOR_OPT) return {ok:false, disabled:true, item};
    if (opts.execute === true && typeof window.applyFilters === 'function') {
      const run = () => window.applyFilters(item.reason);
      if (Number(opts.defer||0) > 0) {
        setTimeout(run, Number(opts.defer||0));
        return {ok:true, scheduled:true, item};
      }
      return {ok:true, result: run(), item};
    }
    return {ok:true, dryRun:true, item};
  }
  function requestRender(reason, options){
    state.counters.renderRequest += 1;
    const opts = options || {};
    const item = {t:new Date().toLocaleTimeString(), reason:String(reason||'unknown'), options:Object.assign({}, opts), fingerprint:fingerprint('render')};
    state.lastRenderRequest = item;
    state.renderRequests.push(item); trim(state.renderRequests, 60);
    debug('requestRender', {reason:item.reason, execute:opts.execute===true});
    if (!window.LN_APP_COORDINATOR_OPT) return {ok:false, disabled:true, item};
    if (opts.execute === true && typeof window.renderCards === 'function') return {ok:true, result:window.renderCards(), item};
    return {ok:true, dryRun:true, item};
  }
  const drawer = {
    markDirty(type, reason){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      state.counters.drawerDirty += 1;
      state.drawer.dirty[k] = {reason:String(reason||''), at:new Date().toLocaleTimeString(), fingerprint:fingerprint('drawer-dirty')};
      debug('drawerDirty', {type:k, reason:String(reason||'')});
      return state.drawer.dirty[k];
    },
    open(type, meta){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      state.counters.drawerOpen += 1;
      state.drawer.lastOpen = {type:k, meta:meta||null, at:new Date().toLocaleTimeString(), fingerprint:fingerprint('drawer-open')};
      debug('drawerOpen', {type:k});
      return state.drawer.lastOpen;
    },
    close(type, meta){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      state.counters.drawerClose += 1;
      state.drawer.lastClose = {type:k, meta:meta||null, at:new Date().toLocaleTimeString(), dirty:!!state.drawer.dirty[k], fingerprint:fingerprint('drawer-close')};
      debug('drawerClose', {type:k, dirty:!!state.drawer.dirty[k]});
      return state.drawer.lastClose;
    },
    clearDirty(type){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      delete state.drawer.dirty[k];
      debug('drawerClearDirty', {type:k});
      return true;
    }
  };

  window.LN_APP_COORDINATOR = {
    version: VERSION,
    stamp: STAMP,
    state,
    ready: true,
    dispatch,
    requestApply,
    requestRender,
    snapshot,
    fingerprint,
    drawer,
    debug,
    getState(){ return compactState(); }
  };
  debug('ready', {bootLoads:(window.__LN_BOOT_LOADS__||[]).filter(x=>x.ok).length});
})();
