(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.alpha4.fix4｜一键主流程自测与操作轨迹诊断版',
    shortName: 'V3.0.0.alpha4.fix4',
    stamp: 'v300alpha4fix4-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-alpha4-fix4',
    basePath: '/fenxi/v3/',
    releaseNote: '针对线上点击 Step2“保存底线并继续”后未进入 Step3 的反馈，增加捕获级点击兜底、强制路由兜底和跳转后状态诊断；不改旧 compute 主链路。'
  });
})();
