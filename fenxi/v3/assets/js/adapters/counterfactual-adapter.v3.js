(function () {
  'use strict';

  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
  function num(value) { var n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function getState(state) { return state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {}); }
  function previewFamily(family) {
    if (!window.LN_V3_FAMILY_FILTER || !window.LN_V3_FAMILY_FILTER.preview) return null;
    try { return window.LN_V3_FAMILY_FILTER.preview(family || {}); } catch (err) { return null; }
  }
  function regionName(provinces) {
    provinces = Array.isArray(provinces) ? provinces.filter(Boolean) : [];
    return provinces.length ? provinces.join('、') : '全国';
  }
  function makeCard(opts) {
    opts = opts || {};
    var before = num(opts.before);
    var after = num(opts.after);
    var delta = after - before;
    return {
      id: opts.id || '',
      type: opts.type || 'compare',
      title: opts.title || '',
      current: before,
      changed: after,
      delta: delta,
      deltaText: (delta > 0 ? '+' : '') + String(delta),
      level: opts.level || (delta > 0 ? 'expand' : delta < 0 ? 'narrow' : 'neutral'),
      oneLine: opts.oneLine || '',
      tradeoff: opts.tradeoff || '',
      actionHint: opts.actionHint || '',
      evidence: opts.evidence || '预览估算',
      shouldShow: opts.shouldShow !== false
    };
  }

  function generate(state) {
    state = getState(state);
    var family = clone(state.family || {});
    var child = state.childPreference || {};
    var familyPreview = family.preview || previewFamily(family) || {};
    var familyRows = num(familyPreview.filteredPreview || child.preview && child.preview.familyFilteredRows || 0);
    var matchedRows = num(child.preview && child.preview.matchedRows || 0);
    var effectiveRows = num(child.preview && child.preview.effectiveFilteredRows || state.compute && state.compute.filtered || familyRows);
    var cards = [];

    if (family.regionMode === 'hard' && (family.provinces || []).length) {
      var softFamily = clone(family);
      softFamily.regionMode = 'soft';
      var softPreview = previewFamily(softFamily) || {};
      var softRows = num(softPreview.filteredPreview || familyRows);
      cards.push(makeCard({
        id: 'region-hard-to-soft',
        type: 'region',
        title: '地域从“只看”改成“优先”',
        before: familyRows,
        after: softRows,
        level: softRows > familyRows ? 'expand' : 'neutral',
        oneLine: '不是放弃' + regionName(family.provinces) + '，而是把它从硬底线改成优先解释，保留外省/其它地区作参照。',
        tradeoff: '选择面会明显扩大，但需要在详细卡片里看清“目标地区 / 参照地区”的取舍。',
        actionHint: '适合家里不是绝对不能出省，只是优先省内时对照。',
        evidence: '基于当前分块数据与地域筛选预览'
      }));
    } else if (family.regionMode === 'soft') {
      var hardFamily = clone(family);
      hardFamily.regionMode = 'hard';
      var hardPreview = previewFamily(hardFamily) || {};
      var hardRows = num(hardPreview.filteredPreview || familyRows);
      cards.push(makeCard({
        id: 'region-soft-to-hard',
        type: 'region',
        title: '地域从“优先”收紧成“只看”',
        before: familyRows,
        after: hardRows,
        level: hardRows < familyRows ? 'narrow' : 'neutral',
        oneLine: '如果家里实际不能接受外地，可以把偏好收紧为底线。',
        tradeoff: '候选会减少，方案会更聚焦，但可能错过外省性价比参照。',
        actionHint: '适合家庭地域约束非常明确时使用。',
        evidence: '基于当前分块数据与地域筛选预览'
      }));
    }

    if (child.manualOnly && matchedRows > 0 && familyRows > matchedRows) {
      cards.push(makeCard({
        id: 'manual-only-off',
        type: 'interest',
        title: '关闭“只看真实命中兴趣方向”',
        before: matchedRows,
        after: familyRows,
        level: 'expand',
        oneLine: '孩子兴趣继续进入 B 方案和详细卡片，但不把其它稳妥机会提前排掉。',
        tradeoff: '会多出一些非兴趣正命中的候选，需要靠详细卡片判断是否值得保留。',
        actionHint: '适合担心兴趣池过窄、想先看稳妥底线的家庭。',
        evidence: '基于 Step3 兴趣命中预览'
      }));
    } else if (!child.manualOnly && matchedRows > 0 && familyRows > matchedRows) {
      cards.push(makeCard({
        id: 'manual-only-on',
        type: 'interest',
        title: '开启“只看真实命中兴趣方向”',
        before: familyRows,
        after: matchedRows,
        level: 'narrow',
        oneLine: '只围绕孩子明确兴趣生成候选，决策会更集中。',
        tradeoff: '可能把一些更稳、更便宜或学校更合适的非兴趣候选排除。',
        actionHint: '适合孩子兴趣非常明确、家庭愿意优先尊重孩子方向时使用。',
        evidence: '基于 Step3 兴趣命中预览'
      }));
    }

    if (!(family.feeType === 'rejectHigh' || (family.rejects || []).indexOf('高收费') !== -1 || family.budget === 'strict')) {
      var feeFamily = clone(family);
      feeFamily.feeType = 'rejectHigh';
      feeFamily.rejects = Array.isArray(feeFamily.rejects) ? feeFamily.rejects.slice() : [];
      if (feeFamily.rejects.indexOf('高收费') === -1) feeFamily.rejects.push('高收费');
      var feePreview = previewFamily(feeFamily) || {};
      var feeRows = num(feePreview.filteredPreview || familyRows);
      cards.push(makeCard({
        id: 'reject-high-fee',
        type: 'cost',
        title: '排除高收费 / 中外合作',
        before: familyRows,
        after: feeRows,
        level: feeRows < familyRows ? 'narrow' : 'neutral',
        oneLine: '把费用风险先排除，减少后面详细卡片里的复核压力。',
        tradeoff: '可能会少掉部分学校层级或城市更好的中外合作选择。',
        actionHint: '适合预算比较明确、不能接受高收费的家庭。',
        evidence: '基于当前家庭底线预览'
      }));
    }

    if ((family.rejects || []).indexOf('民办独立') === -1) {
      var publicFamily = clone(family);
      publicFamily.rejects = Array.isArray(publicFamily.rejects) ? publicFamily.rejects.slice() : [];
      publicFamily.rejects.push('民办独立');
      var publicPreview = previewFamily(publicFamily) || {};
      var publicRows = num(publicPreview.filteredPreview || familyRows);
      cards.push(makeCard({
        id: 'reject-private-independent',
        type: 'nature',
        title: '只保留公办倾向 / 排除民办独立',
        before: familyRows,
        after: publicRows,
        level: publicRows < familyRows ? 'narrow' : 'neutral',
        oneLine: '把学校性质风险前置处理，后续卡片更容易比较。',
        tradeoff: '低分段可能显著减少保底空间，需要同步看真实保底厚度。',
        actionHint: '适合家庭对学校性质非常敏感时使用。',
        evidence: '基于当前学校性质标签预览'
      }));
    }


    if (window.LN_V3_QUALIFICATION_FILTER && window.LN_V3_QUALIFICATION_FILTER.shouldExclude && window.LN_V3_QUALIFICATION_FILTER.shouldExclude(family)) {
      var qualFamily = clone(family);
      qualFamily.qualificationMode = 'include';
      qualFamily.rejects = Array.isArray(qualFamily.rejects) ? qualFamily.rejects.filter(function (x) { return x !== '资格计划'; }) : [];
      if (qualFamily.rejects.indexOf('查看资格计划') === -1) qualFamily.rejects.push('查看资格计划');
      var qualPreview = previewFamily(qualFamily) || {};
      var qualRows = num(qualPreview.filteredPreview || familyRows);
      cards.push(makeCard({
        id: 'include-qualification-plan',
        type: 'qualification',
        title: '临时查看资格型计划',
        before: familyRows,
        after: qualRows,
        level: qualRows > familyRows ? 'expand' : 'neutral',
        oneLine: '把少数民族预科、专项计划、定向等需资格项目临时放回来，只作为核验参照。',
        tradeoff: '这些项目通常需要额外资格，不适合直接混进普通候选；打开后必须逐条核对报考条件。',
        actionHint: '适合家庭确实具备专项、少数民族、定向等资格时使用。',
        evidence: '基于 Step2 资格型计划默认过滤预览'
      }));
    }

    cards = cards.filter(function (card) { return card.shouldShow && Number(card.delta || 0) !== 0; }).slice(0, 5);
    return {
      ok: true,
      reason: 'v3-counterfactual-preview-only',
      baseRows: familyRows,
      effectiveRows: effectiveRows,
      matchedRows: matchedRows,
      count: cards.length,
      cards: cards,
      summary: cards.length ? '已生成 ' + cards.length + ' 条条件变化对照：不是替家长改选择，而是让家长看清每个条件的代价。' : '当前条件变化空间不明显，建议继续看详细卡片。'
    };
  }

  function apply(reason) {
    if (!window.LN_V3_STORE) return null;
    var state = window.LN_V3_STORE.getState();
    var preview = generate(state);
    window.LN_V3_STORE.setState({
      counterfactual: { preview: preview, cards: preview.cards, summary: preview.summary },
      ui: { lastMessage: preview.summary }
    }, reason || 'counterfactual:apply');
    return preview;
  }

  window.LN_V3_COUNTERFACTUAL_ADAPTER = { generate: generate, apply: apply };
})();
