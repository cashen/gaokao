(function () {
  'use strict';
  var listeners = {};
  window.LN_V3_BUS = {
    on: function (eventName, handler) {
      if (!listeners[eventName]) listeners[eventName] = [];
      listeners[eventName].push(handler);
      return function () {
        listeners[eventName] = (listeners[eventName] || []).filter(function (fn) { return fn !== handler; });
      };
    },
    emit: function (eventName, payload) {
      (listeners[eventName] || []).slice().forEach(function (handler) {
        try { handler(payload); } catch (err) { console.error('[LN_V3_BUS]', eventName, err); }
      });
    }
  };
})();
