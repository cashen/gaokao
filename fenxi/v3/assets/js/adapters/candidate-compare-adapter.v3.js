(function () {
  'use strict';

  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function num(value) {
    var n = Number(String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function uniq(list) {
    var seen = Object.create(null);
    return (list || []).filter(function (item) {
      var key = text(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function shortlistKeys(state) {
    return (((state || {}).shortlist || {}).items || []).map(function (item) { return item.key; }).filter(Boolean);
  }
  function normalizeOptions(options) {
    options = options || {};
    var filterPlan = text(options.filterPlan || options.plan || 'all');
    if (['all', 'A', 'B', 'C', 'shortlist'].indexOf(filterPlan) === -1) filterPlan = 'all';
    var sortBy = text(options.sortBy || 'plan_then_rank');
    if (['plan_then_rank', 'rank_near', 'rank_safe', 'score_high', 'review_more', 'school_name'].indexOf(sortBy) === -1) sortBy = 'plan_then_rank';
    return { filterPlan: filterPlan, sortBy: sortBy };
  }
  function planOrder(plan) {
    if (plan === 'A') return 1;
    if (plan === 'B') return 2;
    if (plan === 'C') return 3;
    return 9;
  }
  function rankDistance(card) { return Number(card && card.rankDistance || 0); }
  function rankNearScore(card) { return Math.abs(rankDistance(card)); }
  function reviewCount(card) { return ((card && card.reviewTags) || []).length + ((card && card.nextReview) || []).length; }
  function scoreValue(card) { return num(card && card.score2025); }
  function sortCards(cards, sortBy) {
    var out = (cards || []).slice();
    out.sort(function (a, b) {
      if (sortBy === 'rank_near') return rankNearScore(a) - rankNearScore(b);
      if (sortBy === 'rank_safe') return rankDistance(b) - rankDistance(a);
      if (sortBy === 'score_high') return scoreValue(b) - scoreValue(a);
      if (sortBy === 'review_more') return reviewCount(b) - reviewCount(a);
      if (sortBy === 'school_name') return text(a.school).localeCompare(text(b.school), 'zh-Hans-CN');
      var p = planOrder(a.planBand) - planOrder(b.planBand);
      if (p !== 0) return p;
      return rankNearScore(a) - rankNearScore(b);
    });
    return out;
  }
  function filterCards(cards, state, options) {
    options = normalizeOptions(options || (((state || {}).candidates || {}).compare));
    var keys = shortlistKeys(state);
    var out = (cards || []).filter(function (card) {
      if (options.filterPlan === 'shortlist') return keys.indexOf(card.key) !== -1 || card.inShortlist;
      if (options.filterPlan === 'A' || options.filterPlan === 'B' || options.filterPlan === 'C') return card.planBand === options.filterPlan;
      return true;
    });
    return sortCards(out, options.sortBy);
  }
  function counts(cards, state) {
    var keys = shortlistKeys(state);
    var list = cards || [];
    return {
      all: list.length,
      A: list.filter(function (x) { return x.planBand === 'A'; }).length,
      B: list.filter(function (x) { return x.planBand === 'B'; }).length,
      C: list.filter(function (x) { return x.planBand === 'C'; }).length,
      shortlist: list.filter(function (x) { return keys.indexOf(x.key) !== -1 || x.inShortlist; }).length
    };
  }
  function riskText(card) {
    var tags = uniq((card.reviewTags || []).concat(card.nextReview || []));
    if (!tags.length) return '暂无明显风险，但仍建议复核招生章程。';
    return tags.slice(0, 2).join('；');
  }
  function compareRows(cards, state, options) {
    options = normalizeOptions(options || {});
    var list = filterCards(cards, state, options);
    if (!list.length && options.filterPlan === 'shortlist') list = filterCards(cards, state, { filterPlan: 'all', sortBy: options.sortBy }).slice(0, 3);
    return list.slice(0, 4).map(function (card) {
      return {
        key: card.key,
        planBand: card.planBand,
        school: card.school,
        major: card.major,
        score2025: card.score2025,
        rank2025: card.rank2025,
        rankDistance: card.rankDistance,
        safety: card.safety,
        familyFit: card.familyFit,
        interestFit: card.interestFit,
        evidenceLevel: card.evidenceLevel,
        risk: riskText(card),
        conclusion: card.conclusion || card.oneLine || '继续复核。'
      };
    });
  }
  function generate(cards, state, options) {
    options = normalizeOptions(options || (((state || {}).candidates || {}).compare));
    var filtered = filterCards(cards || [], state || {}, options);
    var rows = compareRows(cards || [], state || {}, Object.assign({}, options, { filterPlan: options.filterPlan === 'all' ? 'shortlist' : options.filterPlan }));
    var cnt = counts(cards || [], state || {});
    return {
      ok: true,
      reason: 'v3-candidate-compare-preview-only',
      options: options,
      counts: cnt,
      filtered: filtered,
      filteredCount: filtered.length,
      rows: rows,
      rowCount: rows.length,
      summary: '已生成卡片筛选、排序和横向比较视图：先按 A/B/C 或自选池缩小，再看安全垫、兴趣命中和复核风险。'
    };
  }
  function staticPlan() {
    return {
      filterPlans: ['all', 'A', 'B', 'C', 'shortlist'],
      sortBy: ['plan_then_rank', 'rank_near', 'rank_safe', 'score_high', 'review_more', 'school_name'],
      compareColumns: ['方案', '学校专业', '位次/安全垫', '兴趣命中', '复核风险', '结论'],
      defaultFilter: 'all',
      defaultSort: 'plan_then_rank'
    };
  }

  window.LN_V3_CANDIDATE_COMPARE = {
    staticPlan: staticPlan,
    normalizeOptions: normalizeOptions,
    filterCards: filterCards,
    sortCards: sortCards,
    counts: counts,
    compareRows: compareRows,
    generate: generate
  };
})();
