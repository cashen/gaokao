(function () {
  'use strict';
  window.LN_V3_LEGACY_EXPORT = {
    status: function () {
      return { hasExport: typeof window.exportResultImage === 'function', note: 'alpha1 仅保留导出入口占位。' };
    }
  };
})();
