(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function line(item, index) { return (item.ok ? 'PASS' : 'FAIL') + ' ' + String(index + 1).padStart(2, '0') + '｜' + item.name + (item.detail ? '｜' + item.detail : ''); }
  function summarize(results) {
    var pass = results.filter(function (item) { return item.ok; }).length;
    var fail = results.length - pass;
    return { total: results.length, pass: pass, fail: fail };
  }
  function quick() {
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    return [
      check('版本号正确', snap.version && snap.version.indexOf('V3.0.0.alpha4') !== -1, snap.version),
      check('版本戳正确', !!window.LN_V3_VERSION && snap.stamp === window.LN_V3_VERSION.stamp, snap.stamp),
      check('访问码状态 PASS', snap.accessPassed, String(snap.accessPassed)),
      check('服务器会话已同步', !!(snap.serverSession && snap.serverSession.ok), JSON.stringify(snap.serverSession || {})),
      check('state-store 存在', !!window.LN_V3_STORE),
      check('router 存在', !!window.LN_V3_ROUTER),
      check('Tab 数量为 7', snap.tabs === 7, 'tabs=' + snap.tabs),
      check('向导步骤数量为 6', snap.progressSteps === 6, 'steps=' + snap.progressSteps),
      check('旧主页面未作为 v3 入口启动', !document.body.classList.contains('ln-fenxi-app'), document.body.className)
    ];
  }
  function full() {
    var results = quick();
    ['LN_V3_STEP_RANK','LN_V3_STEP_FAMILY','LN_V3_STEP_CHILD','LN_V3_STEP_SCENARIO','LN_V3_STEP_PLANS','LN_V3_STEP_CANDIDATES','LN_V3_STEP_EXPORT'].forEach(function (name) {
      results.push(check(name + ' 存在', !!window[name]));
    });
    if (window.LN_V3_DEBUG_STEP_RANK) results = results.concat(window.LN_V3_DEBUG_STEP_RANK.run());
    if (window.LN_V3_DEBUG_STEP_FAMILY) results = results.concat(window.LN_V3_DEBUG_STEP_FAMILY.run());
    results = results.concat(window.LN_V3_DEBUG_STEP_CHILD.run());
    return results;
  }
  function format(type, started, results) {
    var sum = summarize(results);
    var elapsed = Math.round(performance.now() - started);
    var header = [
      '【辽宁物理类工具 V3 Debug Report】',
      '读取时间：' + new Date().toLocaleString(),
      '模式：' + type,
      '版本：' + window.LN_V3_VERSION.name,
      '版本戳：' + window.LN_V3_VERSION.stamp,
      '总步骤：' + sum.total + '；通过：' + sum.pass + '；失败：' + sum.fail,
      '耗时：' + elapsed + 'ms',
      ''
    ].join('\n');
    return { results: results, summary: sum, text: header + results.map(line).join('\n') };
  }
  window.LN_V3_DEBUG_SELFTEST = {
    run: function (type) {
      var started = performance.now();
      if (type === 'rank') {
        return window.LN_V3_DEBUG_STEP_RANK.runAsync().then(function (results) { return format(type, started, results); });
      }
      var results = type === 'family' && window.LN_V3_DEBUG_STEP_FAMILY ? window.LN_V3_DEBUG_STEP_FAMILY.run() : (type === 'child' ? window.LN_V3_DEBUG_STEP_CHILD.run() : (type === 'full' ? full() : quick()));
      return format(type, started, results);
    }
  };
})();
