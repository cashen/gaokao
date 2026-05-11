(function () {
  'use strict';
  window.LN_V3_BIGPOOL_HINT = {
    shouldShow: function (state) {
      return Number(state && state.compute && state.compute.filtered || 0) > 5000;
    },
    html: function () {
      return [
        '<div class="notice-box">',
        '<strong>当前候选仍然较多。</strong><br>',
        '这通常不是错误，而是条件还比较宽。建议继续收窄地域、预算，或开启“只看真实命中兴趣方向”。',
        '</div>'
      ].join('');
    }
  };
})();
