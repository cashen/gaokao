(function () {
  'use strict';
  function renderVersion() {
    var box = document.getElementById('debugVersionBox');
    if (!box) return;
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    box.innerHTML = window.LN_V3_DEBUG_RUNTIME.kvRows([
      ['版本', snap.version],
      ['版本戳', snap.stamp],
      ['访问码状态', snap.accessPassed ? 'PASS' : 'FAIL'],
      ['body class', snap.bodyClass],
      ['入口', snap.isDebugPage ? location.pathname : location.pathname]
    ]);
  }
  function renderTab() {
    var box = document.getElementById('debugTabBox');
    if (!box) return;
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    var ui = snap.state.ui || {};
    box.innerHTML = window.LN_V3_DEBUG_RUNTIME.kvRows([
      ['当前 Step', ui.activeStep || ''],
      ['当前 Tab', ui.activeTab || ''],
      ['已完成步骤', (ui.completedSteps || []).join(', ') || '无'],
      ['Tab 数量', String(snap.tabs)],
      ['向导步骤数量', String(snap.progressSteps)]
    ]);
  }
  function renderStore() {
    var box = document.getElementById('debugStoreBox');
    if (!box) return;
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    box.textContent = JSON.stringify(snap.state, null, 2);
  }
  function refresh() { renderVersion(); renderTab(); renderStore(); }

  window.LN_V3_DEBUG_PANEL = {
    init: function () {
      refresh();
      if (window.LN_V3_STORE) window.LN_V3_STORE.subscribe(refresh);
      document.querySelectorAll('[data-debug-run]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var type = btn.getAttribute('data-debug-run');
          var box = document.getElementById('debugSelftestBox');
          box.textContent = '正在运行 ' + type + ' 自测…';
          Promise.resolve(window.LN_V3_DEBUG_SELFTEST.run(type)).then(function (report) {
            box.textContent = report.text;
            refresh();
          }).catch(function (err) {
            box.textContent = '自测运行失败：' + (err && err.message ? err.message : err);
            refresh();
          });
        });
      });
      var copy = document.querySelector('[data-debug-copy]');
      if (copy) copy.addEventListener('click', function () {
        var report = window.LN_V3_DEBUG_REPORT.build();
        navigator.clipboard.writeText(report).then(function () {
          document.getElementById('debugSelftestBox').textContent = report + '\n\n复制状态：OK';
        }).catch(function () {
          document.getElementById('debugSelftestBox').textContent = report + '\n\n复制状态：浏览器拒绝，请手动复制。';
        });
      });
    },
    refresh: refresh
  };
})();
