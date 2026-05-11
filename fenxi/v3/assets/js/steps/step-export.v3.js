(function () {
  'use strict';
  function html(state) {
    var exportStatus = window.LN_V3_LEGACY_EXPORT ? window.LN_V3_LEGACY_EXPORT.status() : { hasExport: false };
    return [
      '<section class="step-card" data-step-view="export">',
      '<div class="step-hero"><div class="v3-kicker">导出</div><h2>导出结果摘要</h2><p>后续接入旧版导出能力，并针对家长阅读优化摘要图片。</p></div>',
      '<div class="step-body">',
      '<div class="step-section"><h3>导出状态</h3><p>旧导出入口检测：', exportStatus.hasExport ? '存在' : '未接入', '</p><pre class="debug-pre">', JSON.stringify(state, null, 2), '</pre></div>',
      '<div class="v3-actions"><button type="button" class="v3-btn secondary" data-export-back>返回方案</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelector('[data-export-back]').addEventListener('click', function () { window.LN_V3_ROUTER.go('plans', 'export:back'); });
  }
  window.LN_V3_STEP_EXPORT = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
