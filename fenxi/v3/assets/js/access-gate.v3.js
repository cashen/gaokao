(function () {
  'use strict';
  var version = window.LN_V3_VERSION || {};

  function renderGate(root, onPass) {
    root.innerHTML = [
      '<section class="access-card">',
      '<div class="v3-kicker">V3 测试版访问</div>',
      '<h1>辽宁物理类高考志愿初选工具</h1>',
      '<p>这是 V3 分步向导测试版。先输入访问码，再进入工具。</p>',
      '<form class="access-form" id="lnV3AccessForm">',
      '<label for="lnV3AccessInput">访问码</label>',
      '<input id="lnV3AccessInput" class="access-input" autocomplete="one-time-code" placeholder="请输入访问码" />',
      '<div id="lnV3AccessError" class="access-error" role="alert"></div>',
      '<button class="access-button" type="submit">进入工具</button>',
      '</form>',
      '<div class="access-note">本页面用于 v3 内部测试；旧版 /fenxi/ 入口保持不变。</div>',
      '</section>'
    ].join('');
    var form = document.getElementById('lnV3AccessForm');
    var input = document.getElementById('lnV3AccessInput');
    var error = document.getElementById('lnV3AccessError');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = String(input.value || '').trim();
      if (value === version.accessCode) {
        localStorage.setItem(version.accessKey, '1');
        error.textContent = '';
        onPass('manual');
      } else {
        error.textContent = '访问码不对，请再确认一次。';
        input.select();
      }
    });
    setTimeout(function () { input.focus(); }, 50);
  }

  function unlockApp(mode, reason) {
    var gate = document.getElementById('lnV3AccessGate');
    var app = document.getElementById('lnV3App');
    var debug = document.getElementById('lnV3Debug');
    if (gate) gate.hidden = true;
    if (mode === 'debug' && debug) debug.hidden = false;
    if (mode === 'app' && app) app.hidden = false;
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-unlocked');
    if (window.LN_V3_BUS) window.LN_V3_BUS.emit('access:passed', { mode: mode, reason: reason });
  }

  window.LN_V3_ACCESS = {
    isPassed: function () { return localStorage.getItem(version.accessKey) === '1'; },
    clear: function () { localStorage.removeItem(version.accessKey); },
    init: function (options) {
      var mode = (options && options.mode) || 'app';
      var onPass = (options && options.onPass) || function () {};
      var gate = document.getElementById('lnV3AccessGate');
      if (!gate) return;
      function pass(reason) {
        unlockApp(mode, reason);
        onPass(reason);
      }
      if (window.LN_V3_ACCESS.isPassed()) {
        pass('saved');
      } else {
        renderGate(gate, pass);
      }
    }
  };
})();
