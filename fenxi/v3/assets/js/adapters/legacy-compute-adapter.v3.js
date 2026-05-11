(function () {
  'use strict';
  window.LN_V3_LEGACY_COMPUTE = {
    apply: function (reason) {
      var started = performance.now();
      var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
      var hasApply = typeof window.applyFilters === 'function';
      var elapsed = Math.round(performance.now() - started);
      if (window.LN_V3_STORE) {
        window.LN_V3_STORE.setState({
          compute: {
            applyTotalMs: elapsed,
            preQuietMs: 0,
            lastReason: reason || 'v3-alpha1-adapter-placeholder'
          },
          ui: { lastMessage: hasApply ? '已检测到旧计算入口，但 alpha1 暂不主动调用。' : 'alpha1 骨架版：旧计算入口未接入。' }
        }, 'legacyComputeAdapter');
      }
      return { ok: true, hasApply: hasApply, elapsed: elapsed, state: state };
    }
  };
})();
