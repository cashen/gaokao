(function () {
  'use strict';
  var STAMP = 'v300rc1fix6-20260512';
  window.LN_V3_VERSION = Object.freeze({
    name: 'V3.0.0.rc1.fix6｜家庭路径解释透明化与并列推荐提示版',
    shortName: 'V3.0.0.rc1.fix6',
    stamp: STAMP,
    accessCode: 'ln2026',
    accessKey: 'LN_V3_ACCESS_2026_OK',
    bodyClass: 'ln-v3-rc1-fix6',
    basePath: '/fenxi/v3/',
    releaseNote: 'Step4 家庭路径卡增加匹配分解释、加分因素、扣分因素、对 A/B/C 的影响，并在平台优先与强专业优先接近时给出并列提醒；不改变原推荐权重，不改变 A/B/C 生成。'
  });
  function loadCss(href) {
    if (document.querySelector('link[href*="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/fenxi/v3/assets/css/' + href + '?v=' + STAMP;
    document.head.appendChild(link);
  }
  function loadScript(src) {
    if (document.querySelector('script[src*="' + src + '"]')) return;
    var script = document.createElement('script');
    script.defer = true;
    script.src = '/fenxi/v3/assets/js/adapters/' + src + '?v=' + STAMP;
    document.head.appendChild(script);
  }
  function syncBody() {
    if (!document.body) return;
    document.body.classList.remove('ln-v3-rc1-fix5');
    document.body.classList.add('ln-v3-rc1-fix6');
    document.body.setAttribute('data-ln-version', 'V3.0.0.rc1.fix6');
    document.body.setAttribute('data-ln-stamp', STAMP);
  }
  loadCss('path-explanation.v3.css');
  loadScript('path-explanation-adapter.v3.js');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncBody); else syncBody();
})();
