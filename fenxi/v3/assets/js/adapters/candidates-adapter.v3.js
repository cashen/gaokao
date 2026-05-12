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
  function keyOf(item) {
    return [text(item.school), text(item.major), text(item.rank2025), text(item.planBand || item.band || item.planRole)].join('|');
  }
  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }
  function profileFit(item) {
    var tags = item.reviewTags || [];
    if (!tags.length) return '暂无明显画像冲突，但仍建议看培养方案。';
    return '需要复核：' + tags.slice(0, 2).join('；');
  }
  function interestFit(item) {
    if (item.matchReason) return item.matchReason;
    if (item.planRole === '孩子路径') return '与孩子兴趣路径相关，但命中原因需要进一步复核。';
    return '不强行按兴趣解释，先看家庭底线与方案角色。';
  }
  function familyFit(item, ctx) {
    var bits = [];
    if (item.schoolProvince) bits.push(item.schoolProvince === '辽宁' ? '省内' : item.schoolProvince);
    if (item.schoolNatureLabel) bits.push(item.schoolNatureLabel);
    if (item.safety) bits.push(item.safety);
    if (ctx && ctx.region && ctx.region.level === 'bottomline') bits.push('符合地域底线视角');
    return bits.length ? bits.join('｜') : '家庭底线待复核';
  }
  function buildConclusion(item) {
    if (item.planRole === '孩子路径') return '更像 B 方案：把兴趣命中、专业正主程度和家庭可接受度放在一起比较。';
    if (item.planRole === '守底线') return '更像 A 方案：先守住家庭底线和录取安全，再看是否值得继续保留。';
    if (item.planRole === '上限探索') return '更像 C 方案：用于上限和参照比较，不宜直接当稳妥结果。';
    return item.oneLine || '需要进入详细复核。';
  }
  function normalizeCard(item, planId, ctx) {
    item = item || {};
    var reviewTags = uniq((item.reviewTags || []).concat(item.evidenceLevel === '需要复核' ? ['证据等级复核'] : []));
    var score = firstNonEmpty(item.score2025, '待复核');
    var rank = firstNonEmpty(item.rank2025, '待复核');
    var card = {
      key: keyOf(Object.assign({}, item, { planBand: planId })),
      planBand: planId,
      planTitle: planId === 'A' ? 'A 守底线' : planId === 'B' ? 'B 孩子路径' : 'C 上限探索',
      school: text(item.school) || '学校待复核',
      major: text(item.major) || '专业待复核',
      score2025: score,
      rank2025: rank,
      rankDistance: Number(item.rankDistance || 0),
      schoolProvince: text(item.schoolProvince),
      lnArea: text(item.lnArea),
      schoolNatureLabel: text(item.schoolNatureLabel),
      tuition2025: firstNonEmpty(item.tuition2025, '待核验'),
      planRole: text(item.planRole),
      safety: text(item.safety) || '待复核',
      matchReason: text(item.matchReason),
      evidenceLevel: text(item.evidenceLevel) || '模型判断',
      reviewTags: reviewTags,
      oneLine: text(item.oneLine),
      familyFit: familyFit(item, ctx),
      interestFit: interestFit(item),
      profileFit: profileFit(item),
      conclusion: buildConclusion(item),
      nextReview: uniq([
        '复核招生章程/培养方案',
        item.tuition2025 === '待核验' || !item.tuition2025 ? '复核学费' : '',
        /合作|中外|高收费/.test(text(item.major) + text(item.tuition2025) + reviewTags.join(' ')) ? '复核合作办学与费用' : '',
        item.matchReason ? '复核是否为正主专业或相近方向' : '复核为什么进入当前方案',
        '结合近两年位次变化再决定是否保留'
      ]).slice(0, 5)
    };
    return card;
  }
  function flattenPlans(preview, ctx) {
    var out = [];
    var plans = (preview && preview.plans) || {};
    ['A', 'B', 'C'].forEach(function (id) {
      var p = plans[id] || {};
      (p.samples || []).forEach(function (item) { out.push(normalizeCard(item, id, ctx)); });
    });
    return out;
  }
  function generate(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var planPreview = state.plans && state.plans.preview;
    if (!planPreview && window.LN_V3_PLANS_ADAPTER && window.LN_V3_PLANS_ADAPTER.generate) {
      planPreview = window.LN_V3_PLANS_ADAPTER.generate(state);
    }
    var ctx = window.LN_V3_DECISION_CONTEXT ? window.LN_V3_DECISION_CONTEXT.build(state) : {};
    var cards = flattenPlans(planPreview, ctx);
    var shortlistKeys = ((state.shortlist || {}).items || []).map(function (item) { return item.key || keyOf(item); });
    cards = cards.map(function (card) {
      card.inShortlist = shortlistKeys.indexOf(card.key) !== -1;
      return card;
    });
    return {
      ok: true,
      reason: 'v3-candidates-detail-preview-only',
      list: cards,
      total: cards.length,
      byPlan: {
        A: cards.filter(function (x) { return x.planBand === 'A'; }).length,
        B: cards.filter(function (x) { return x.planBand === 'B'; }).length,
        C: cards.filter(function (x) { return x.planBand === 'C'; }).length
      },
      shortlistCount: shortlistKeys.length,
      summary: '已从 A/B/C 方案包生成详细候选卡片，每张卡片都带证据等级、复核项和加入自选池入口。'
    };
  }
  function apply(reason) {
    if (!window.LN_V3_STORE) return null;
    var state = window.LN_V3_STORE.getState();
    if ((!state.plans || !state.plans.preview) && window.LN_V3_PLANS_ADAPTER) window.LN_V3_PLANS_ADAPTER.apply('candidates:ensure-plans');
    state = window.LN_V3_STORE.getState();
    var preview = generate(state);
    window.LN_V3_STORE.setState({
      candidates: { list: preview.list, page: 1, pageSize: 20, preview: preview, summary: preview.summary },
      ui: { lastMessage: preview.summary }
    }, reason || 'candidates:apply');
    return preview;
  }
  function add(cardKey) {
    if (!window.LN_V3_STORE) return false;
    var state = window.LN_V3_STORE.getState();
    var list = (state.candidates && state.candidates.list) || [];
    if (!list.length) {
      var generated = apply('shortlist:ensure-candidates');
      list = generated ? generated.list : [];
    }
    var card = list.find(function (item) { return item.key === cardKey; });
    if (!card) return false;
    var items = ((state.shortlist || {}).items || []).slice();
    if (!items.some(function (item) { return item.key === cardKey; })) items.push(Object.assign({}, card, { addedAt: new Date().toISOString() }));
    window.LN_V3_STORE.setState({ shortlist: { items: items } }, 'shortlist:add');
    return true;
  }
  function remove(cardKey) {
    if (!window.LN_V3_STORE) return false;
    var state = window.LN_V3_STORE.getState();
    var items = ((state.shortlist || {}).items || []).filter(function (item) { return item.key !== cardKey; });
    window.LN_V3_STORE.setState({ shortlist: { items: items } }, 'shortlist:remove');
    return true;
  }
  window.LN_V3_CANDIDATES_ADAPTER = { generate: generate, apply: apply, add: add, remove: remove, keyOf: keyOf };
})();
