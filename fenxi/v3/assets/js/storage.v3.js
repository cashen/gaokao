(function () {
  'use strict';
  var prefix = 'LN_V3_DRAFT_';
  window.LN_V3_STORAGE = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(prefix + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        console.warn('[LN_V3_STORAGE] get failed', key, err);
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.warn('[LN_V3_STORAGE] set failed', key, err);
        return false;
      }
    },
    remove: function (key) {
      try { localStorage.removeItem(prefix + key); } catch (err) { console.warn('[LN_V3_STORAGE] remove failed', key, err); }
    }
  };
})();
