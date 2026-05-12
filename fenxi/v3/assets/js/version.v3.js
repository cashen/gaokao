(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.rc2.fix1｜位次先行与候选复核语义修正版',
    shortName: 'V3.0.0.rc2.fix1',
    stamp: 'v300rc2fix1-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-rc2-fix1',
    basePath: '/fenxi/v3/',
    releaseNote: 'RC2.fix1 回到旧版 /fenxi 的核心顺序：先位次可行性，再家庭底线，再专业路径，最后生成 A/B/C；候选复核池与家庭自选池彻底分离，系统候选不再自动冒充自选。'
  });
})();
