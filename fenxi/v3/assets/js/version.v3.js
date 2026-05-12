(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.alpha6.fix1｜A/B/C方案包重构与缓存校验修正版',
    shortName: 'V3.0.0.alpha6.fix1',
    stamp: 'v300alpha6fix1-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-alpha6-fix1',
    basePath: '/fenxi/v3/',
    releaseNote: '基于 alpha5.fix2 的决策上下文，重构 Step5 A/B/C 方案包，并增加缓存校验，防止加载旧 alpha6 场景逻辑：按分数段、家庭路径、地域选择强度、孩子兴趣、学生画像和专业画像生成预览，并明确 Step6 详细卡片承接。'
  });
})();
