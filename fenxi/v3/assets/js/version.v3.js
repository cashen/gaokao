(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.alpha1.fix3｜Debug残留状态清理修正版',
    shortName: 'V3.0.0.alpha1.fix3',
    stamp: 'v300alpha1fix3-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-alpha1-fix3',
    basePath: '/fenxi/v3/',
    releaseNote: '清理 alpha1.fix2 暴露出的 debug 自测残留状态：当 childPreference 已无选择项时自动清空 weights，并把不匹配的 ui.lastMessage 回归到骨架启动提示；同时保留 fix1/fix2 的访问码跳转、debug 路由兼容和动态版本戳自测。'
  });
})();
