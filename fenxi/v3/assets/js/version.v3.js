(function () {
  'use strict';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.rc1.fix2｜入口别名同步与分数位次护栏修正版',
    shortName: 'V3.0.0.rc1.fix2',
    stamp: 'v300rc1fix2-20260512',
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-rc1-fix2',
    basePath: '/fenxi/v3/',
    releaseNote: '修复入口别名未同步问题：/debug、debug.htm、index.htm 与 debug/index.html 全部统一到 rc1.fix2；保留分数/位次一致性护栏，冲突输入阻止继续推荐，报告统一 effectiveInput 口径。'
  });
})();
