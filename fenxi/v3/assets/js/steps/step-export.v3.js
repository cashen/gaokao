(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function getPreview(state) {
    if (window.LN_V3_REPORT_EXPORT && window.LN_V3_REPORT_EXPORT.generate) return window.LN_V3_REPORT_EXPORT.generate(state);
    return { ok: false, markdown: '', summary: '家庭讨论报告导出适配器未加载。', length: 0, sectionCount: 0, cardCount: 0, counterfactualCount: 0, shortlistCount: 0 };
  }
  function html(state) {
    var preview = getPreview(state);
    var exportStatus = window.LN_V3_LEGACY_EXPORT ? window.LN_V3_LEGACY_EXPORT.status() : { hasExport: false };
    return [
      '<section class="step-card" data-step-view="export">',
      '<div class="step-hero"><div class="v3-kicker">导出</div><h2>导出家庭讨论报告</h2><p>把前面几步形成的选择过程整理成一份可复制 Markdown：位次、底线、孩子兴趣、家庭路径、A/B/C、详细卡片、自选池和条件变化对照。</p></div>',
      '<div class="step-body">',
      '<div class="step-section export-summary-panel"><h3>报告摘要</h3>',
      '<div class="plans-overview export-overview">',
      '<div><span>报告长度</span><strong>', esc(String(preview.length || 0)), '</strong><p>可复制到微信、飞书、Word 或 Markdown 工具。</p></div>',
      '<div><span>章节</span><strong>', esc(String(preview.sectionCount || 0)), '</strong><p>包含家庭处境、方案包、卡片、自选和复核。</p></div>',
      '<div><span>详细卡片</span><strong>', esc(String(preview.cardCount || 0)), '</strong><p>来自 Step6 的 A/B/C 候选卡片。</p></div>',
      '<div><span>条件对照</span><strong>', esc(String(preview.counterfactualCount || 0)), '</strong><p>用于讨论是否放宽或收紧条件。</p></div>',
      '</div>',
      '<div class="notice-box">', esc(preview.summary || '报告已生成。'), '</div>',
      '</div>',
      '<div class="step-section"><h3>可复制报告</h3><textarea class="export-report-textarea" data-export-markdown readonly>', esc(preview.markdown || ''), '</textarea></div>',
      '<div class="step-section"><h3>导出说明</h3><p>旧导出入口检测：', exportStatus.hasExport ? '存在' : '未接入', '。当前 V3 先提供可复制 Markdown，后续再接 PNG / PDF / 家庭报告页。</p><p>这份报告是家庭讨论稿，不替代官方招生章程、学费、校区和计划复核。</p></div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-export-copy>复制报告</button><button type="button" class="v3-btn secondary" data-export-refresh>重新生成</button><button type="button" class="v3-btn secondary" data-export-back>返回自选池</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    var copyBtn = root.querySelector('[data-export-copy]');
    var refreshBtn = root.querySelector('[data-export-refresh]');
    var backBtn = root.querySelector('[data-export-back]');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var preview = window.LN_V3_REPORT_EXPORT ? window.LN_V3_REPORT_EXPORT.apply('export:copy-generate') : null;
      var text = preview ? preview.markdown : (root.querySelector('[data-export-markdown]') || {}).value || '';
      if (window.LN_V3_REPORT_EXPORT) {
        window.LN_V3_REPORT_EXPORT.copy(text).then(function (ok) {
          window.LN_V3_STORE.setState({ ui: { lastMessage: ok ? '家庭讨论报告已复制。' : '复制失败，请手动选中文本复制。' } }, 'export:copy');
          if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.flashMessage(ok ? '家庭讨论报告已复制。' : '复制失败，请手动选中文本复制。');
        });
      }
    });
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      if (window.LN_V3_REPORT_EXPORT) window.LN_V3_REPORT_EXPORT.apply('export:refresh');
      window.LN_V3_WIZARD.render();
    });
    if (backBtn) backBtn.addEventListener('click', function () { window.LN_V3_ROUTER.go('candidates', 'export:back'); });
  }
  window.LN_V3_STEP_EXPORT = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
