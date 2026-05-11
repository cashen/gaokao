(function () {
  'use strict';
  function kvRows(items) {
    return items.map(function (item) {
      return '<div class="debug-kv-row"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>';
    }).join('');
  }
  window.LN_V3_DEBUG_RUNTIME = {
    kvRows: kvRows,
    snapshot: function () {
      var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
      var version = window.LN_V3_VERSION || {};
      return {
        time: new Date().toLocaleString(),
        version: version.name,
        stamp: version.stamp,
        accessPassed: window.LN_V3_ACCESS ? window.LN_V3_ACCESS.isPassed() : false,
        bodyClass: document.body.className,
        isDebugPage: document.body.classList.contains('ln-v3-debug-page'),
        tabs: window.LN_V3_ROUTER ? window.LN_V3_ROUTER.steps.length : 0,
        progressSteps: window.LN_V3_ROUTER ? window.LN_V3_ROUTER.progressSteps.length : 0,
        dataStatus: window.LN_V3_LEGACY_DATA ? window.LN_V3_LEGACY_DATA.status() : {},
        state: state
      };
    }
  };
})();
