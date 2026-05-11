(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.alpha1.fix2｜Debug自测版本戳与状态回滚修正版',
    shortName: 'V3.0.0.alpha1.fix2',
    stamp: 'v300alpha1fix2-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-alpha1-fix2',
    basePath: '/fenxi/v3/',
    releaseNote: '修正 debug 自测版本戳仍按 alpha1 旧值判断导致的误报；Step3 专业偏好自测改为测试后回滚 childPreference 与 ui 状态，避免污染调试快照；保留 fix1 的访问码跳转和 debug 路由兼容。'
  });
})();
