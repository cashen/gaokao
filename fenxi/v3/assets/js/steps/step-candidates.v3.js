(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function statePreview(state) {
    if (window.LN_V3_CANDIDATES_ADAPTER && window.LN_V3_CANDIDATES_ADAPTER.generate) return window.LN_V3_CANDIDATES_ADAPTER.generate(state);
    return { list: [], byPlan: { A: 0, B: 0, C: 0 }, summary: '候选卡片适配器未加载。' };
  }
  function tagList(list) {
    return (list || []).slice(0, 4).map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('');
  }
  function cardHtml(card) {
    var inText = card.inShortlist ? '已加入自选' : '加入自选';
    return [
      '<article class="candidate-detail-card" data-card-key="', esc(card.key), '" data-plan="', esc(card.planBand), '">',
      '<div class="candidate-card-top"><div><span class="plan-pill plan-', esc(card.planBand), '">', esc(card.planTitle), '</span><h3>', esc(card.school), '</h3><p>', esc(card.major), '</p></div><button type="button" class="v3-btn small" data-shortlist-toggle="', esc(card.key), '">', esc(inText), '</button></div>',
      '<div class="candidate-facts"><span>', esc(card.score2025), ' 分</span><span>位次 ', esc(card.rank2025), '</span><span>', esc(card.safety), '</span><span>', esc(card.lnArea || card.schoolProvince || '地域待核验'), '</span><span>', esc(card.schoolNatureLabel || '性质待核验'), '</span></div>',
      '<p class="candidate-one-line">', esc(card.conclusion || card.oneLine), '</p>',
      '<div class="candidate-evidence"><b>', esc(card.evidenceLevel), '</b><span>', esc(card.familyFit), '</span><span>', esc(card.interestFit), '</span></div>',
      '<div class="candidate-tags">', tagList(card.reviewTags), '</div>',
      '<details class="candidate-detail-more"><summary>展开复核清单</summary>',
      '<ul>', (card.nextReview || []).map(function (item) { return '<li>' + esc(item) + '</li>'; }).join(''), '</ul>',
      '<p>', esc(card.profileFit || ''), '</p>',
      '</details>',
      '</article>'
    ].join('');
  }
  function groupHtml(planId, cards) {
    var title = planId === 'A' ? 'A 守底线' : planId === 'B' ? 'B 孩子路径' : 'C 上限探索';
    var body = cards.length ? cards.map(cardHtml).join('') : '<div class="notice-box">这一组暂时没有候选卡片。</div>';
    return ['<section class="candidate-group"><h3>', title, '<small>', cards.length, ' 条预览</small></h3><div class="candidate-card-list">', body, '</div></section>'].join('');
  }
  function shortlistHtml(items) {
    if (!items.length) return '<div class="notice-box">还没有加入自选。先从下方卡片里挑 2～5 个，后面再横向比较。</div>';
    return '<div class="shortlist-mini-list">' + items.map(function (item) {
      return '<div><b>' + esc(item.school) + '</b><span>' + esc(item.major) + '</span><button type="button" class="link-btn" data-shortlist-remove="' + esc(item.key) + '">移出</button></div>';
    }).join('') + '</div>';
  }
  function html(state) {
    var hint = window.LN_V3_BIGPOOL_HINT.shouldShow(state) ? window.LN_V3_BIGPOOL_HINT.html() : '';
    var preview = statePreview(state);
    var cards = preview.list || [];
    var shortlist = (state.shortlist && state.shortlist.items) || [];
    var byA = cards.filter(function (x) { return x.planBand === 'A'; });
    var byB = cards.filter(function (x) { return x.planBand === 'B'; });
    var byC = cards.filter(function (x) { return x.planBand === 'C'; });
    return [
      '<section class="step-card" data-step-view="candidates">',
      '<div class="step-hero"><div class="v3-kicker">第 6 步</div><h2>详细候选 & 自选池</h2><p>A/B/C 只是方案入口，这一页把具体学校专业拆成家长能复核的卡片：为什么进来、属于哪类、有什么风险、要不要加入自选。</p></div>',
      '<div class="step-body">', hint,
      '<div class="plans-overview candidates-overview">',
      '<div><span>详细卡片</span><strong>', esc(String(preview.total || cards.length)), '</strong><p>A ', esc(String((preview.byPlan || {}).A || byA.length)), ' 条，B ', esc(String((preview.byPlan || {}).B || byB.length)), ' 条，C ', esc(String((preview.byPlan || {}).C || byC.length)), ' 条。</p></div>',
      '<div><span>自选池</span><strong>', esc(String(shortlist.length)), '</strong><p>建议先放入 2～5 条，再做横向比较。</p></div>',
      '<div><span>复核原则</span><strong>先看证据</strong><p>待核验、合作办学、专业正主程度都不要跳过。</p></div>',
      '</div>',
      '<div class="notice-box">', esc(preview.summary || '已生成详细候选卡片。'), '</div>',
      '<div class="step-section shortlist-panel"><h3>自选池</h3>', shortlistHtml(shortlist), '</div>',
      groupHtml('A', byA), groupHtml('B', byB), groupHtml('C', byC),
      '<div class="v3-actions"><button type="button" class="v3-btn" data-candidates-refresh>刷新详细卡片</button><button type="button" class="v3-btn" data-candidates-next>去导出</button></div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelectorAll('[data-shortlist-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-shortlist-toggle');
        var state = window.LN_V3_STORE.getState();
        var exists = ((state.shortlist || {}).items || []).some(function (item) { return item.key === key; });
        if (exists) window.LN_V3_CANDIDATES_ADAPTER.remove(key);
        else window.LN_V3_CANDIDATES_ADAPTER.add(key);
        window.LN_V3_WIZARD.render();
      });
    });
    root.querySelectorAll('[data-shortlist-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.LN_V3_CANDIDATES_ADAPTER.remove(btn.getAttribute('data-shortlist-remove'));
        window.LN_V3_WIZARD.render();
      });
    });
    root.querySelector('[data-candidates-refresh]').addEventListener('click', function () {
      if (window.LN_V3_CANDIDATES_ADAPTER) window.LN_V3_CANDIDATES_ADAPTER.apply('candidates:refresh');
      window.LN_V3_WIZARD.render();
    });
    root.querySelector('[data-candidates-next]').addEventListener('click', function () {
      window.LN_V3_STORE.markComplete('candidates', 'candidates:complete');
      window.LN_V3_ROUTER.go('export', 'candidates:next');
    });
  }
  window.LN_V3_STEP_CANDIDATES = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
