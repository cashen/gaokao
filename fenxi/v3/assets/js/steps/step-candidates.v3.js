(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function statePreview(state) {
    if (window.LN_V3_CANDIDATES_ADAPTER && window.LN_V3_CANDIDATES_ADAPTER.generate) return window.LN_V3_CANDIDATES_ADAPTER.generate(state);
    return { list: [], byPlan: { A: 0, B: 0, C: 0 }, summary: '候选卡片适配器未加载。' };
  }
  function comparePreview(cards, state) {
    if (window.LN_V3_CANDIDATE_COMPARE && window.LN_V3_CANDIDATE_COMPARE.generate) return window.LN_V3_CANDIDATE_COMPARE.generate(cards, state);
    return { filtered: cards || [], filteredCount: (cards || []).length, rows: [], counts: {}, options: { filterPlan: 'all', sortBy: 'plan_then_rank' }, summary: '候选比较适配器未加载。' };
  }
  function tagList(list) {
    return (list || []).slice(0, 4).map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('');
  }
  function evidenceHtml(card) {
    var ev = card.dataEvidence || {};
    var buckets = ev.buckets || {};
    var labels = ev.labels || { data_confirmed: '数据确认', model_judgement: '模型判断', needs_review: '需要复核', missing_data: '缺失数据' };
    var keys = ['data_confirmed','model_judgement','needs_review','missing_data'];
    return '<div class="candidate-evidence-grid">' + keys.map(function (key) {
      var items = buckets[key] || [];
      if (!items.length) return '';
      return '<div><b>' + esc(labels[key] || key) + '</b><span>' + esc(items.slice(0, 4).join('、')) + '</span></div>';
    }).join('') + '</div>';
  }
  function cardHtml(card) {
    var inText = card.inShortlist ? '已加入自选' : '加入自选';
    return [
      '<article class="candidate-detail-card" data-card-key="', esc(card.key), '" data-plan="', esc(card.planBand), '">',
      '<div class="candidate-card-top"><div><span class="plan-pill plan-', esc(card.planBand), '">', esc(card.planTitle), '</span><h3>', esc(card.school), '</h3><p>', esc(card.major), '</p></div><button type="button" class="v3-btn small" data-shortlist-toggle="', esc(card.key), '">', esc(inText), '</button></div>',
      '<div class="candidate-facts"><span>', esc(card.score2025), ' 分</span><span>位次 ', esc(card.rank2025), '</span><span>', esc(card.safety), '</span><span>', esc(card.lnArea || card.schoolProvince || '地域待核验'), '</span><span>', esc(card.schoolNatureLabel || '性质待核验'), '</span></div>',
      '<p class="candidate-one-line">', esc(card.conclusion || card.oneLine), '</p>',
      '<div class="candidate-evidence"><b>', esc(card.evidenceLevel), '</b><span>', esc(card.familyFit), '</span><span>', esc(card.interestFit), '</span></div>',
      card.evidenceSummary ? '<p class="candidate-evidence-summary">' + esc(card.evidenceSummary) + '</p>' : '',
      evidenceHtml(card),
      '<div class="candidate-tags">', tagList(card.reviewTags), '</div>',
      '<details class="candidate-detail-more"><summary>展开复核清单</summary>',
      '<ul>', (card.nextReview || []).map(function (item) { return '<li>' + esc(item) + '</li>'; }).join(''), '</ul>',
      '<p>', esc(card.profileFit || ''), '</p>',
      '</details>',
      '</article>'
    ].join('');
  }

  function optionLabel(sortBy) {
    return ({
      plan_then_rank: '按方案与接近程度',
      rank_near: '按位次最接近',
      rank_safe: '按安全垫更大',
      score_high: '按分数更高',
      review_more: '按复核风险更多',
      school_name: '按学校名称'
    })[sortBy] || '按方案与接近程度';
  }
  function filterLabel(id) {
    return ({ all: '全部', A: 'A 守底线', B: 'B 孩子路径', C: 'C 上限探索', shortlist: '只看自选' })[id] || id;
  }
  function compareToolbarHtml(compare) {
    var options = compare.options || { filterPlan: 'all', sortBy: 'plan_then_rank' };
    var counts = compare.counts || {};
    var filters = ['all', 'A', 'B', 'C', 'shortlist'];
    return [
      '<div class="candidate-compare-toolbar">',
      '<div><b>卡片筛选</b><div class="candidate-filter-pills">',
      filters.map(function (id) {
        var count = counts[id] === undefined ? '' : '<small>' + esc(String(counts[id])) + '</small>';
        return '<button type="button" class="compare-filter ' + (options.filterPlan === id ? 'is-active' : '') + '" data-candidates-filter="' + esc(id) + '">' + esc(filterLabel(id)) + count + '</button>';
      }).join(''),
      '</div></div>',
      '<label class="candidate-sort-label"><span>排序</span><select data-candidates-sort>',
      ['plan_then_rank','rank_near','rank_safe','score_high','review_more','school_name'].map(function (id) {
        return '<option value="' + esc(id) + '"' + (options.sortBy === id ? ' selected' : '') + '>' + esc(optionLabel(id)) + '</option>';
      }).join(''),
      '</select></label>',
      '</div>'
    ].join('');
  }
  function compareTableHtml(compare) {
    var rows = compare.rows || [];
    if (!rows.length) return '<div class="notice-box">横向比较会优先读取自选池。先加入 2～5 条候选后，这里会自动形成对比表。</div>';
    return [
      '<div class="candidate-compare-panel"><div class="section-title-row"><h3>横向比较</h3><span>先比角色、风险和复核点，不急着下结论</span></div>',
      '<div class="candidate-compare-table-wrap"><table class="candidate-compare-table"><thead><tr><th>方案</th><th>学校专业</th><th>位次/安全垫</th><th>兴趣命中</th><th>复核风险</th><th>一句判断</th></tr></thead><tbody>',
      rows.map(function (row) {
        return [
          '<tr><td><span class="plan-pill plan-', esc(row.planBand), '">', esc(row.planBand), '</span></td>',
          '<td><b>', esc(row.school), '</b><span>', esc(row.major), '</span></td>',
          '<td>', esc(row.score2025), '分 / ', esc(row.rank2025), '<small>', esc(row.safety || ''), '</small></td>',
          '<td>', esc(row.interestFit || '不强行解释兴趣'), '</td>',
          '<td>', esc(row.risk || '复核招生章程'), '</td>',
          '<td>', esc(row.conclusion || '继续比较'), '</td></tr>'
        ].join('');
      }).join(''),
      '</tbody></table></div></div>'
    ].join('');
  }

  function counterfactualHtml(state) {
    var preview = window.LN_V3_COUNTERFACTUAL_ADAPTER && window.LN_V3_COUNTERFACTUAL_ADAPTER.generate ? window.LN_V3_COUNTERFACTUAL_ADAPTER.generate(state) : { cards: [], summary: '条件变化对照未接入。' };
    var cards = preview.cards || [];
    if (!cards.length) return '<div class="step-section counterfactual-panel"><h3>条件变化对照</h3><div class="notice-box">' + esc(preview.summary || '暂无条件变化建议。') + '</div></div>';
    return [
      '<div class="step-section counterfactual-panel"><div class="section-title-row"><h3>条件变化对照</h3><span>只做比较，不替你改选择</span></div>',
      '<div class="notice-box">', esc(preview.summary || '已生成条件变化对照。'), '</div>',
      '<div class="counterfactual-list">', cards.map(function (card) {
        return [
          '<article class="counterfactual-card counterfactual-', esc(card.level), '">',
          '<div><b>', esc(card.title), '</b><p>', esc(card.oneLine), '</p></div>',
          '<div class="counterfactual-numbers"><span>', esc(String(card.current)), '</span><em>→</em><span>', esc(String(card.changed)), '</span><strong>', esc(card.deltaText), '</strong></div>',
          '<p class="counterfactual-tradeoff">', esc(card.tradeoff), '</p>',
          '<small>', esc(card.actionHint), '</small>',
          '</article>'
        ].join('');
      }).join(''), '</div></div>'
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
    var compare = comparePreview(cards, state);
    var visibleCards = compare.filtered || cards;
    var shortlist = (state.shortlist && state.shortlist.items) || [];
    var byA = visibleCards.filter(function (x) { return x.planBand === 'A'; });
    var byB = visibleCards.filter(function (x) { return x.planBand === 'B'; });
    var byC = visibleCards.filter(function (x) { return x.planBand === 'C'; });
    return [
      '<section class="step-card" data-step-view="candidates">',
      '<div class="step-hero"><div class="v3-kicker">第 6 步</div><h2>详细候选 & 自选池</h2><p>A/B/C 只是方案入口，这一页把具体学校专业拆成家长能复核的卡片：为什么进来、属于哪类、有什么风险、要不要加入自选。</p></div>',
      '<div class="step-body">', hint,
      '<div class="plans-overview candidates-overview">',
      '<div><span>详细卡片</span><strong>', esc(String(preview.total || cards.length)), '</strong><p>A ', esc(String((preview.byPlan || {}).A || 0)), ' 条，B ', esc(String((preview.byPlan || {}).B || 0)), ' 条，C ', esc(String((preview.byPlan || {}).C || 0)), ' 条。</p></div>',
      '<div><span>当前显示</span><strong>', esc(String(compare.filteredCount || visibleCards.length)), '</strong><p>', esc(filterLabel((compare.options || {}).filterPlan || 'all')), ' · ', esc(optionLabel((compare.options || {}).sortBy || 'plan_then_rank')), '</p></div>',
      '<div><span>自选池</span><strong>', esc(String(shortlist.length)), '</strong><p>建议先放入 2～5 条，再做横向比较。</p></div>',
      '</div>',
      '<div class="notice-box">', esc(compare.summary || preview.summary || '已生成详细候选卡片。'), '</div>',
      preview.evidenceSummary ? '<div class="notice-box evidence-summary-box">' + esc(preview.evidenceSummary.summary || '') + '</div>' : '',
      compareToolbarHtml(compare),
      compareTableHtml(compare),
      counterfactualHtml(state),
      '<div class="step-section shortlist-panel"><h3>自选池</h3>', shortlistHtml(shortlist), '</div>',
      groupHtml('A', byA), groupHtml('B', byB), groupHtml('C', byC),
      '<div class="v3-actions"><button type="button" class="v3-btn" data-candidates-refresh>刷新详细卡片</button><button type="button" class="v3-btn" data-candidates-next>去导出</button></div>',
      '</div></section>'
    ].join('');
  }
  function updateCompare(patch) {
    var state = window.LN_V3_STORE.getState();
    var current = (state.candidates && state.candidates.compare) || { filterPlan: 'all', sortBy: 'plan_then_rank' };
    var next = Object.assign({}, current, patch || {});
    if (window.LN_V3_CANDIDATE_COMPARE && window.LN_V3_CANDIDATE_COMPARE.normalizeOptions) next = window.LN_V3_CANDIDATE_COMPARE.normalizeOptions(next);
    window.LN_V3_STORE.setState({ candidates: { compare: next } }, 'candidates:compare-options');
    window.LN_V3_WIZARD.render();
  }
  function bind(root) {
    root.querySelectorAll('[data-candidates-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () { updateCompare({ filterPlan: btn.getAttribute('data-candidates-filter') }); });
    });
    var sortSelect = root.querySelector('[data-candidates-sort]');
    if (sortSelect) sortSelect.addEventListener('change', function () { updateCompare({ sortBy: sortSelect.value }); });
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
    var refreshBtn = root.querySelector('[data-candidates-refresh]');
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      if (window.LN_V3_CANDIDATES_ADAPTER) window.LN_V3_CANDIDATES_ADAPTER.apply('candidates:refresh');
      window.LN_V3_WIZARD.render();
    });
    var nextBtn = root.querySelector('[data-candidates-next]');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('candidates', 'candidates:complete-through'); else window.LN_V3_STORE.markComplete('candidates', 'candidates:complete');
      window.LN_V3_ROUTER.go('export', 'candidates:next');
    });
  }
  window.LN_V3_STEP_CANDIDATES = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
