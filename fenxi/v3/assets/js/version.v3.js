(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.alpha2.fix1｜服务器会话同步与数据401修正版',
    shortName: 'V3.0.0.alpha2.fix1',
    stamp: 'v300alpha2fix1-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-alpha2-fix1',
    basePath: '/fenxi/v3/',
    releaseNote: '修复 alpha2 中 v3 前端访问码只写 localStorage、没有同步 /fenxi/api/login 服务器会话，导致 /fenxi/data/manifest.json 返回 HTTP 401 的问题；数据 fetch 改为携带 same-origin credentials，并在 debug 中展示服务器会话状态。'
  });
})();
