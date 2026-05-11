(function () {
  'use strict';
  var version = window.LN_V3_VERSION || {};
  var AUTH_BASE = '/fenxi';
  var serverSession = { checked: false, ok: false, configured: null, expiresAt: null, lastError: '' };

  function authUrl(path) { return AUTH_BASE + path; }
  function setServerSession(patch) {
    serverSession = Object.assign({}, serverSession, patch || {});
    window.LN_V3_SERVER_SESSION = serverSession;
    if (window.LN_V3_BUS) window.LN_V3_BUS.emit('access:server-session', serverSession);
  }
  function readJsonSafe(res) {
    return res.json().catch(function () { return {}; });
  }
  function checkServerSession() {
    return fetch(authUrl('/api/session'), { credentials: 'same-origin', cache: 'no-store' }).then(function (res) {
      return readJsonSafe(res).then(function (data) {
        var ok = !!(res.ok && data && data.ok);
        setServerSession({ checked: true, ok: ok, configured: data.configured, expiresAt: data.expiresAt || null, lastError: ok ? '' : (data.reason || ('HTTP ' + res.status)) });
        return ok;
      });
    }).catch(function (err) {
      setServerSession({ checked: true, ok: false, configured: null, expiresAt: null, lastError: err && err.message ? err.message : String(err) });
      return false;
    });
  }
  function loginServer(password) {
    return fetch(authUrl('/api/login'), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      return readJsonSafe(res).then(function (data) {
        if (!res.ok || !data.ok) {
          var reason = data && data.reason ? data.reason : ('HTTP ' + res.status);
          setServerSession({ checked: true, ok: false, configured: data.configured, expiresAt: null, lastError: reason });
          throw new Error(reason);
        }
        setServerSession({ checked: true, ok: true, configured: true, expiresAt: data.expiresAt || null, lastError: '' });
        return data;
      });
    });
  }
  function ensureServerSession() {
    return checkServerSession().then(function (ok) {
      if (ok) return true;
      return loginServer(version.accessCode).then(function () { return true; });
    });
  }

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
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = String(input.value || '').trim();
      if (value !== version.accessCode) {
        error.textContent = '访问码不对，请再确认一次。';
        input.select();
        return;
      }
      error.textContent = '正在验证访问状态…';
      if (button) button.disabled = true;
      loginServer(value).then(function () {
        localStorage.setItem(version.accessKey, '1');
        error.textContent = '';
        onPass('manual');
      }).catch(function (err) {
        error.textContent = '访问码本地正确，但服务器会话未建立：' + (err && err.message ? err.message : String(err));
        input.select();
      }).finally(function () {
        if (button) button.disabled = false;
      });
    });
    setTimeout(function () { input.focus(); }, 50);
  }

  function unlockApp(mode, reason) {
    var gate = document.getElementById('lnV3AccessGate');
    var app = document.getElementById('lnV3App');
    var debug = document.getElementById('lnV3Debug');
    var target = mode === 'debug' ? debug : app;
    if (gate) {
      gate.hidden = true;
      gate.classList.add('is-passed');
      gate.setAttribute('aria-hidden', 'true');
      gate.innerHTML = '';
    }
    if (mode === 'debug' && debug) debug.hidden = false;
    if (mode === 'app' && app) app.hidden = false;
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-unlocked');
    requestAnimationFrame(function () {
      window.scrollTo({ top: 0, left: 0, behavior: reason === 'manual' ? 'smooth' : 'auto' });
      if (target) {
        target.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
      }
    });
    if (window.LN_V3_BUS) window.LN_V3_BUS.emit('access:passed', { mode: mode, reason: reason, serverSession: serverSession });
  }

  window.LN_V3_ACCESS = {
    isPassed: function () { return localStorage.getItem(version.accessKey) === '1'; },
    isServerPassed: function () { return !!serverSession.ok; },
    getServerSession: function () { return Object.assign({}, serverSession); },
    ensureServerSession: ensureServerSession,
    clear: function () { localStorage.removeItem(version.accessKey); setServerSession({ checked: false, ok: false, configured: null, expiresAt: null, lastError: '' }); },
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
        gate.innerHTML = '<section class="access-card"><div class="v3-kicker">正在恢复访问状态</div><h1>正在进入 V3 工具</h1><p>正在同步服务器会话，避免数据文件 401。</p></section>';
        ensureServerSession().then(function () { pass('saved-server'); }).catch(function () {
          window.LN_V3_ACCESS.clear();
          renderGate(gate, pass);
        });
      } else {
        renderGate(gate, pass);
      }
    }
  };
  window.LN_V3_SERVER_SESSION = serverSession;
})();
