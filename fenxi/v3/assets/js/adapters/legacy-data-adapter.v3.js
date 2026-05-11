(function () {
  'use strict';
  window.LN_V3_LEGACY_DATA = {
    status: function () {
      return {
        loadedRows: Array.isArray(window.DATA) ? window.DATA.length : 0,
        hasLegacyData: Array.isArray(window.DATA),
        note: 'alpha1 暂不主动接入旧数据加载，只保留 adapter 入口。'
      };
    }
  };
})();
