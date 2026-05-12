(function () {
  'use strict';
  var SCENARIOS = [
    { id: 'platform', name: '平台优先', shortName: '平台', desc: '高分段优先比较学校平台、城市资源、长期成长和读研空间。' },
    { id: 'major', name: '强专业优先', shortName: '专业', desc: '优先看专业质量、学科基础和未来路径，不只看学校名气。' },
    { id: 'province_public', name: '省内公办稳妥', shortName: '省内公办', desc: '适合普通家庭先守住地域、公办、费用和可接受度。' },
    { id: 'employment', name: '普通家庭就业路径', shortName: '就业', desc: '优先把专业方向、毕业去向和家庭能理解的路径讲清楚。' },
    { id: 'grid', name: '电网 / 能源稳定路径', shortName: '电网', desc: '适合中段家庭观察电气、能源、自动化等稳定行业机会。' },
    { id: 'exam', name: '考研深造路径', shortName: '考研', desc: '更重视学科基础、读研空间、长期转向余地。' },
    { id: 'broad', name: '宽口径比较路径', shortName: '宽口径', desc: '地域或兴趣暂不锁死，先保留更多比较空间。' },
    { id: 'guarantee', name: '真实保底路径', shortName: '保底', desc: '低分段优先确认本科机会、成本、学校性质和安全垫。' },
    { id: 'cost_risk', name: '成本风险控制', shortName: '成本', desc: '重点防高收费、性质误判、专业名误认和家庭承受风险。' }
  ];
  var NAMES = SCENARIOS.reduce(function (acc, item) { acc[item.id] = item.name; return acc; }, {});
  function has(list, id) { return (list || []).indexOf(id) !== -1; }
  function top(scores) {
    var winner = Object.keys(scores)[0] || 'broad';
    Object.keys(scores).forEach(function (id) { if (scores[id] > scores[winner]) winner = id; });
    return winner;
  }
  function pathExplain() { return window.LN_V3_PATH_EXPLANATION_ADAPTER || null; }
  function contextFromState(state) {
    if (window.LN_V3_DECISION_CONTEXT) return window.LN_V3_DECISION_CONTEXT.build(state);
    return { band: { id: '500_549', label: '500–549 家庭底线主导段' }, region: { mode: 'none', label: '全国都可比较' }, groupIds: [], selectedMajors: [], basePool: 0, familyRows: 0, matchedRows: 0, effectiveRows: 0, manualOnly: false, hasInterest: false, bigPool: false, childMode: 'unset' };
  }
  function initScores() {
    return { platform: 30, major: 30, province_public: 30, employment: 30, grid: 22, exam: 28, broad: 34, guarantee: 22, cost_risk: 20 };
  }
  function score(ctx) {
    var scores = initScores();
    var reasons = [];
    var band = ctx.band || { id: '500_549' };
    var region = ctx.region || { mode: 'none' };
    if (band.id === '625_plus') {
      scores.platform += 48; scores.major += 28; scores.exam += 16; scores.grid -= 8; scores.guarantee -= 10;
      reasons.push('当前属于高分平台段，优先比较平台、专业上限、城市和深造空间。');
    } else if (band.id === '590_624') {
      scores.platform += 22; scores.major += 30; scores.employment += 10; scores.exam += 8;
      reasons.push('当前属于学校专业平衡段，重点处理层级和专业质量的取舍。');
    } else if (band.id === '550_589') {
      scores.major += 28; scores.employment += 18; scores.province_public += 12;
      reasons.push('当前属于专业优先段，先比较专业正主程度、就业确定性和学科/行业匹配，再看学校层级与城市。');
    } else if (band.id === '500_549') {
      scores.province_public += 24; scores.employment += 18; scores.broad += 8;
      reasons.push('当前是家庭底线主导段，先把地域、费用和公办范围讲清楚，再看兴趣命中。');
    } else if (band.id === '450_499') {
      scores.guarantee += 38; scores.cost_risk += 28; scores.province_public += 18; scores.grid -= 6;
      reasons.push('当前是低分保底与风险段，优先确认保底真实性、费用和学校性质。');
    } else if (band.id === '367_449') {
      scores.guarantee += 64; scores.cost_risk += 34; scores.broad += 8; scores.grid -= 10; scores.platform -= 12;
      reasons.push('当前接近本科机会边缘，先看本科机会、成本和兜底路径。');
    }
    if (!ctx.hasInterest || ctx.childMode === 'unknown') {
      scores.broad += 22;
      reasons.push('孩子兴趣暂不明确，先保留宽口径，避免过早锁死。');
    }
    if (ctx.bigPool) {
      scores.broad += 14;
      reasons.push('当前候选仍偏多，需要用宽口径比较或继续收窄底线。');
    }
    if (region.mode === 'hard') {
      scores.province_public += 14;
      if (band.id === '500_549' || band.id === '550_589') {
        scores.province_public += 10;
        reasons.push('当前分数段遇到地域硬底线时，省内公办稳妥应压住普通就业叙事，孩子兴趣和就业画像进入 B 方案解释。');
      }
      scores.guarantee += (band.id === '450_499' || band.id === '367_449') ? 8 : 0;
      reasons.push('地域是硬底线，后续优先在目标地区内解释方案。');
    } else if (region.mode === 'soft') {
      scores.broad += 12; scores.employment += 5; scores.platform += (band.id === '625_plus' || band.id === '590_624') ? 6 : 0;
      reasons.push('地域是偏好不是硬筛，保留外部参照空间不等于放弃目标地区。');
    } else {
      scores.platform += (band.id === '625_plus' || band.id === '590_624') ? 8 : 0;
      scores.broad += 8;
      reasons.push('地域目前开放，适合先比较平台、专业和成本，再决定是否收窄。');
    }
    if (ctx.manualOnly && ctx.matchedRows > 0) {
      scores.employment += 6; scores.major += 6;
      reasons.push('已开启真实命中，后续可以围绕兴趣命中池解释，但不代表兴趣权重高于家庭路径。');
    }
    var sp = ctx.studentProfile || {};
    var reviewTags = sp.reviewTags || [];
    var prefTags = sp.preferenceTags || [];
    if (reviewTags.indexOf('learning_load') !== -1) {
      scores.cost_risk += 8;
      reasons.push('学生画像提示学习强度需复核：后续详细卡片会把强数学、强代码、长周期方向前置提醒。');
    }
    if (prefTags.indexOf('work_first') !== -1) {
      var workBoost = (region.mode === 'hard' && (band.id === '500_549' || band.id === '550_589')) ? 3 : 8;
      scores.employment += workBoost;
      reasons.push('学生画像偏本科就业：场景解释会优先复核本科出口，但不盖过当前分数段和家庭地域底线。');
    }
    if (reviewTags.indexOf('misread_review') !== -1) {
      scores.cost_risk += 5;
      reasons.push('学生对专业理解仍需确认：后续会强化易混专业和培养方案复核。');
    }
    if (has(ctx.groupIds, 'electric_energy')) {
      if (band.id === '625_plus') { scores.major += 14; scores.platform += 10; scores.grid += 6; reasons.push('高分段的电气兴趣应进入强专业/平台比较，不宜直接降成单一电网路径。'); }
      else if (band.id === '590_624') { scores.major += 16; scores.grid += 18; scores.employment += 8; reasons.push('电气兴趣可作为专业路径重点，同时保留学校层级比较。'); }
      else if (band.id === '550_589' || band.id === '500_549') { scores.grid += 34; scores.employment += 10; reasons.push('中段家庭偏电气能源时，可以把稳定行业路径作为重点解释。'); }
      else { scores.grid += 6; scores.guarantee += 8; scores.cost_risk += 4; reasons.push('低分段偏电气时，先确认是否有真实可接受机会，再谈稳定行业想象。'); }
    }
    if (has(ctx.groupIds, 'computer_ai')) {
      if (band.id === '625_plus' || band.id === '590_624') { scores.major += 18; scores.platform += 12; }
      else if (band.id === '450_499' || band.id === '367_449') { scores.cost_risk += 10; scores.guarantee += 8; }
      else scores.employment += 24;
      reasons.push('计算机兴趣要结合分数段判断：高分看平台专业，低分先防成本和误认。');
    }
    if (has(ctx.groupIds, 'science_material') || has(ctx.groupIds, 'medicine_health')) {
      scores.exam += 25; scores.major += 8;
      reasons.push('理学、医学、新材料等培养周期更长，需要关注深造和学科基础。');
    }
    if (has(ctx.groupIds, 'agri_animal_food')) {
      scores.employment += 10; scores.exam += 10; scores.cost_risk += (band.id === '450_499' || band.id === '367_449') ? 6 : 0;
      reasons.push('农学、动物医学与食品要同时看行业路径、深造空间和地域机会。');
    }
    var recommended = top(scores);
    return { scores: scores, recommended: recommended, reasons: reasons.slice(0, 6) };
  }
  function explain(id, ctx, scored) {
    var name = NAMES[id] || id;
    var bandText = ctx.band && ctx.band.label ? ctx.band.label : '当前分数段';
    if (id === 'platform') return '推荐“' + name + '”：' + bandText + '更应该先比较学校平台、城市资源和长期成长，不要过早被单一就业叙事锁死。';
    if (id === 'major') return '推荐“' + name + '”：当前更需要把专业质量、学科基础和孩子是否能长期投入讲清楚。';
    if (id === 'province_public') return '推荐“' + name + '”：家庭底线和地域接受度已经是主线，先在可接受范围内看稳妥组合。';
    if (id === 'employment') return '推荐“' + name + '”：优先把专业方向和毕业后的实际路径讲清楚，适合多数普通家庭先看 B 方案。';
    if (id === 'grid') return '推荐“' + name + '”：只在当前分数段和兴趣命中都适合时，把电气/能源/自动化的稳定路径作为重点解释。';
    if (id === 'exam') return '推荐“' + name + '”：这些方向更看重学科基础和继续深造，适合把读研空间放在前面。';
    if (id === 'guarantee') return '推荐“' + name + '”：当前更应该先确认本科机会、成本和安全垫是否真实。';
    if (id === 'cost_risk') return '推荐“' + name + '”：当前要把高收费、学校性质、专业名误认和家庭成本放在前面复核。';
    return '推荐“' + name + '”：当前兴趣或地域限制还不够明确，先保留比较空间，避免过早锁死。';
  }
  function planTone(id, ctx) {
    var abc = (ctx.band && ctx.band.abc) || { A: '守底线', B: '孩子路径', C: '上限比较' };
    if (id === 'province_public') return { A: abc.A, B: '在省内公办底线内兼顾孩子兴趣和可就业路径', C: abc.C };
    if (id === 'grid') return { A: abc.A, B: '重点看电气/自动化真实命中、区域和稳定路径', C: abc.C };
    if (id === 'guarantee') return { A: '真实保底和成本底线', B: '可读专业路径', C: '兜底和替代路径复核' };
    if (id === 'platform') return { A: '稳妥强校或强平台', B: '强专业与长期成长路径', C: '平台上限与城市资源' };
    return { A: abc.A, B: abc.B, C: abc.C };
  }
  function visibleScenarios(ctx) {
    var ids;
    if (ctx.band && ctx.band.id === '625_plus') ids = ['platform', 'major', 'exam', 'broad'];
    else if (ctx.band && ctx.band.id === '590_624') ids = ['major', 'platform', 'employment', 'exam', 'broad'];
    else if (ctx.band && ctx.band.id === '550_589') ids = ['major', 'employment', 'province_public', 'grid', 'broad'];
    else if (ctx.band && (ctx.band.id === '450_499' || ctx.band.id === '367_449')) ids = ['guarantee', 'cost_risk', 'province_public', 'broad'];
    else ids = ['province_public', 'employment', 'grid', 'major', 'broad'];
    return SCENARIOS.filter(function (s) { return ids.indexOf(s.id) !== -1; });
  }
  function preview(state, forcedId) {
    var ctx = contextFromState(state);
    var scored = score(ctx);
    var selected = forcedId || ((state && state.scenario && state.scenario.current) || scored.recommended);
    var pathAdapter = pathExplain();
    var closeCall = pathAdapter && pathAdapter.detectCloseCall ? pathAdapter.detectCloseCall(scored.scores) : { exists: false };
    var cardExplanations = pathAdapter && pathAdapter.explainAll ? pathAdapter.explainAll(SCENARIOS, ctx, scored, selected) : {};
    var explanation = explain(scored.recommended, ctx, scored);
    if (closeCall && closeCall.exists && closeCall.message) explanation = closeCall.message;
    var out = {
      ok: true,
      reason: 'v3-family-path-preview-only',
      recommended: scored.recommended,
      recommendedName: NAMES[scored.recommended] || scored.recommended,
      selected: selected,
      selectedName: NAMES[selected] || selected,
      scores: scored.scores,
      basePool: ctx.basePool,
      familyFilteredRows: ctx.familyRows,
      matchedRows: ctx.matchedRows,
      effectiveRows: ctx.manualOnly && ctx.matchedRows > 0 ? ctx.matchedRows : ctx.familyRows,
      manualOnly: ctx.manualOnly,
      hasInterest: ctx.hasInterest,
      bigPool: ctx.bigPool,
      groupIds: ctx.groupIds,
      selectedMajors: ctx.selectedMajors,
      scoreBand: ctx.band,
      regionPreference: ctx.region,
      studentProfile: ctx.studentProfile,
      majorProfile: ctx.majorProfile,
      visibleScenarioIds: visibleScenarios(ctx).map(function (s) { return s.id; }),
      explanation: explanation,
      selectedExplanation: explain(selected, ctx, scored),
      reasons: scored.reasons,
      planTone: planTone(selected, ctx),
      bPlanBoost: ctx.hasInterest ? 1.1 : 1,
      cardFocus: (ctx.band && ctx.band.cardFocus) || [],
      closeCall: closeCall,
      tieNotice: closeCall && closeCall.exists ? closeCall.message : '',
      cardExplanations: cardExplanations,
      pathExplainPlan: pathAdapter && pathAdapter.staticPlan ? pathAdapter.staticPlan() : null,
      summary: '建议优先看“' + (NAMES[scored.recommended] || scored.recommended) + '”。' + (ctx.region && ctx.region.display ? ' 地域：' + ctx.region.display : '')
    };
    return out;
  }
  function applyScenario(id, source) {
    if (!window.LN_V3_STORE) return null;
    var state = window.LN_V3_STORE.getState();
    var p = preview(state, id);
    window.LN_V3_STORE.setState({
      scenario: { current: id, recommended: p.recommended, reason: p.selectedExplanation, source: source || 'user', preview: p, locked: source === 'user' },
      ui: { lastMessage: '家庭路径已选择：' + p.selectedName + '。' },
      compute: { basePool: p.familyFilteredRows || 0, filtered: p.effectiveRows || 0, lastReason: 'v3-step4-family-path-preview' }
    }, 'scenario:apply');
    return p;
  }
  function applyRecommended(source) { var p = preview(window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {}, null); return applyScenario(p.recommended, source || 'auto-recommended'); }
  function matrix() {
    function fake(opts) {
      var ctxState = window.LN_V3_DECISION_CONTEXT ? window.LN_V3_DECISION_CONTEXT.fake(opts) : null;
      var state = {
        rank: { score: String(opts.score || ''), rank: String(opts.rank || ''), loadedRows: opts.basePool || 7934 },
        family: { regionMode: opts.regionMode || 'none', provinces: opts.provinces || [], preview: { filteredPreview: opts.familyRows || 1597, bigPool: !!opts.bigPool } },
        childPreference: { mode: opts.mode || ((opts.groups || []).length ? 'selected' : 'unknown'), selectedGroups: (opts.groups || []).map(function (id) { return { id: id, name: id }; }), selectedMajors: [], manualOnly: !!opts.manualOnly, preview: { familyFilteredRows: opts.familyRows || 1597, matchedRows: opts.matchedRows || 0, effectiveFilteredRows: opts.manualOnly ? (opts.matchedRows || 0) : (opts.familyRows || 1597), bigPool: !!opts.bigPool } },
        scenario: {}, compute: { filtered: opts.familyRows || 1597 }
      };
      state._ctx = ctxState;
      return state;
    }
    var cases = [
      { name: '650+ 高分 + 电气 + 全国可比 → 平台优先', expected: 'platform', preview: preview(fake({ score: 650, rank: 9000, regionMode: 'none', groups: ['electric_energy'], familyRows: 900, matchedRows: 80 })) },
      { name: '610 分 + 计算机 + 地域偏好 → 强专业/平台平衡', expected: 'major', preview: preview(fake({ score: 610, rank: 26000, regionMode: 'soft', provinces: ['辽宁', '吉林', '黑龙江'], groups: ['computer_ai'], familyRows: 2100, matchedRows: 180 })) },
      { name: '560 分 + 省内优先 + 兴趣不明 → 强专业/省内公办平衡', expected: 'province_public', preview: preview(fake({ score: 560, rank: 42000, regionMode: 'hard', provinces: ['辽宁'], groups: [], mode: 'unknown', familyRows: 1800, matchedRows: 0 })) },
      { name: '500 分 + 辽宁 hard + 电气真实命中 → 省内公办稳妥，B方案承接电气', expected: 'province_public', preview: preview(fake({ score: 500, rank: 56548, regionMode: 'hard', provinces: ['辽宁'], groups: ['electric_energy'], manualOnly: true, familyRows: 1597, matchedRows: 116 })) },
      { name: '470 分 + 辽宁 hard + 电气兴趣 → 真实保底优先', expected: 'guarantee', preview: preview(fake({ score: 470, rank: 85000, regionMode: 'hard', provinces: ['辽宁'], groups: ['electric_energy'], familyRows: 900, matchedRows: 40 })) },
      { name: '405 分 + 地域偏好 + 兴趣不明 → 真实保底优先', expected: 'guarantee', preview: preview(fake({ score: 405, rank: 118000, regionMode: 'soft', provinces: ['辽宁'], groups: [], mode: 'unknown', familyRows: 1600, matchedRows: 0 })) },
      { name: '500 分 + 东北 soft + 兴趣不明 → 宽口径比较', expected: 'broad', preview: preview(fake({ score: 500, rank: 56548, regionMode: 'soft', provinces: ['辽宁','吉林','黑龙江'], groups: [], mode: 'unknown', familyRows: 6200, bigPool: true, matchedRows: 0 })) },
      { name: '500 分 + 动物医学兴趣 + 辽宁 hard → 省内公办稳妥，详细卡片承接动物医学', expected: 'province_public', preview: preview(fake({ score: 500, rank: 56548, regionMode: 'hard', provinces: ['辽宁'], groups: ['agri_animal_food'], familyRows: 1597, matchedRows: 60 })) }
    ];
    var pathAdapter = pathExplain();
    if (pathAdapter && pathAdapter.assertions) {
      pathAdapter.assertions(window.LN_V3_SCENARIO_ADAPTER || { preview: preview }).forEach(function (item) {
        cases.push({ name: 'fix6：' + item.name, expected: 'pass', preview: { recommended: item.ok ? 'pass' : 'fail', scores: {}, detail: item.detail || '' } });
      });
    }
    return cases;
  }
  // fix6 debug matrix assertions: fix6：路径解释适配器存在；路径卡加减分因素存在；并列路径提示存在；不改变原推荐权重。
  window.LN_V3_SCENARIO_ADAPTER = {
    scenarios: SCENARIOS,
    visibleScenarios: function (state) { return visibleScenarios(contextFromState(state)); },
    preview: preview,
    recommend: function (state) { return preview(state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {}), null); },
    applyScenario: applyScenario,
    applyRecommended: applyRecommended,
    matrix: matrix,
    names: NAMES,
    _test: { score: score, contextFromState: contextFromState }
  };
})();
