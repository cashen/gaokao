(function () {
  'use strict';

  function initTargetMajorPool() {
    const root = document.getElementById('target-major-pool-placeholder');
    if (!root || !window.TargetMajorPoolEngine || !window.TargetMajorPoolRender) return;

    const E = window.TargetMajorPoolEngine;
    const R = window.TargetMajorPoolRender;
    const expanded = { upper: false, near: false, lower: false };
    let lastResult = null;

    R.renderShell(root);

    function readOptions() {
      return {
        subjectKey: E.getActiveSubject(),
        targetScore: E.getTargetScoreFromPage(),
        region: R.qs('#targetMajorRegion')?.value || 'all',
        schoolKeyword: R.qs('#targetMajorSchool')?.value || '',
        majorKeyword: R.qs('#targetMajorMajor')?.value || ''
      };
    }

    async function runQuery() {
      try {
        expanded.upper = expanded.near = expanded.lower = false;
        R.renderStatus('正在通过安全接口读取 /fenxi 数据，请稍候……', 'loading');
        lastResult = await E.query(readOptions());
        R.renderResults(lastResult, expanded);
      } catch (error) {
        console.error('[target-major-pool]', error);
        R.renderStatus('没有读取到 /fenxi 数据。请检查 Cloudflare 环境变量、/api/target-majors 接口和 /fenxi 数据权限。', 'error');
      }
    }

    root.addEventListener('click', (event) => {
      const loadBtn = event.target.closest('#targetMajorLoadBtn');
      if (loadBtn) {
        runQuery();
        return;
      }
      const moreBtn = event.target.closest('[data-target-major-more]');
      if (moreBtn && lastResult) {
        expanded[moreBtn.dataset.targetMajorMore] = true;
        R.renderResults(lastResult, expanded);
      }
    });

    root.addEventListener('change', (event) => {
      if (event.target.matches('#targetMajorRegion') && lastResult) runQuery();
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('#targetMajorSchool, #targetMajorMajor')) {
        runQuery();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTargetMajorPool);
  } else {
    initTargetMajorPool();
  }
})();
