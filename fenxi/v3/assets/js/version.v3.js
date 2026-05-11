(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.alpha2｜Step1位次输入与数据加载状态版',
    shortName: 'V3.0.0.alpha2',
    stamp: 'v300alpha2-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-alpha2',
    basePath: '/fenxi/v3/',
    releaseNote: '在 alpha1.fix3 稳定骨架基础上，只开发 Step1：输入位次/分数后通过 v3 legacy-data-adapter 读取 fix12 已有 manifest、rank_2025_physics 与 rank chunks，写入 loadedRows、chunkIds、loadMs、rankSource 等状态；同步增加 Step1 debug 自测。暂不接入 Step2 以后主筛选链路。'
  });
})();
