(function () {
  'use strict';
  window.LN_V3_DEBUG_REPORT = {
    build: function () {
      var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
      var self = window.LN_V3_DEBUG_SELFTEST.run('full');
      return [
        '【辽宁物理类工具 V3 Debug Report】',
        '读取时间：' + snap.time,
        '版本：' + snap.version,
        '版本戳：' + snap.stamp,
        '入口：' + (snap.isDebugPage ? '/fenxi/v3/debug.html' : '/fenxi/v3/index.html'),
        '访问码状态：' + (snap.accessPassed ? 'PASS' : 'FAIL'),
        '服务器会话：' + JSON.stringify(snap.serverSession || {}),
        'body class：' + snap.bodyClass,
        '当前 Step：' + ((snap.state.ui || {}).activeStep || ''),
        '当前 Tab：' + ((snap.state.ui || {}).activeTab || ''),
        'Tab 数量：' + snap.tabs,
        '向导步骤数量：' + snap.progressSteps,
        '数据状态：' + JSON.stringify(snap.dataStatus || {}),
        '操作轨迹：' + JSON.stringify(snap.trace || []),
        'Store：' + JSON.stringify(snap.state),
        '',
        self.text
      ].join('\n');
    }
  };
})();
