(function () {
  'use strict';
  var trace = [];
  function addTrace(action, detail) {
    var item = { time: new Date().toLocaleTimeString(), action: action || '', detail: detail || '' };
    trace.push(item);
    if (trace.length > 80) trace.shift();
    return item;
  }
  function clearTrace() { trace = []; }
  function getTrace() { return trace.slice(); }
  function kvRows(items) {
    return items.map(function (item) {
      return '<div class="debug-kv-row"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>';
    }).join('');
  }
  window.LN_V3_DEBUG_RUNTIME = {
    kvRows: kvRows,
    addTrace: addTrace,
    clearTrace: clearTrace,
    getTrace: getTrace,
    snapshot: function () {
      var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
      var version = window.LN_V3_VERSION || {};
      return {
        time: new Date().toLocaleString(),
        version: version.name,
        stamp: version.stamp,
        accessPassed: window.LN_V3_ACCESS ? window.LN_V3_ACCESS.isPassed() : false,
        serverSession: window.LN_V3_ACCESS && window.LN_V3_ACCESS.getServerSession ? window.LN_V3_ACCESS.getServerSession() : (window.LN_V3_SERVER_SESSION || {}),
        bodyClass: document.body.className,
        isDebugPage: document.body.classList.contains('ln-v3-debug-page'),
        tabs: window.LN_V3_ROUTER ? window.LN_V3_ROUTER.steps.length : 0,
        progressSteps: window.LN_V3_ROUTER ? window.LN_V3_ROUTER.progressSteps.length : 0,
        dataStatus: window.LN_V3_LEGACY_DATA ? window.LN_V3_LEGACY_DATA.status() : {},
        trace: getTrace(),
        state: state
      };
    }
  };
})();
