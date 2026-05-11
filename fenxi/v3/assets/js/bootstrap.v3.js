(function () {
  'use strict';
  function isDebugPage() { return document.body.classList.contains('ln-v3-debug-page'); }
  function initApp() {
    if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.init();
    document.body.classList.add('v3-ready');
  }
  function initDebug() {
    if (window.LN_V3_DEBUG_PANEL) window.LN_V3_DEBUG_PANEL.init();
    document.body.classList.add('v3-debug-ready');
  }
  window.addEventListener('DOMContentLoaded', function () {
    var mode = isDebugPage() ? 'debug' : 'app';
    if (!window.LN_V3_ACCESS) return;
    window.LN_V3_ACCESS.init({
      mode: mode,
      onPass: function () {
        if (mode === 'debug') initDebug();
        else initApp();
      }
    });
  });
})();
