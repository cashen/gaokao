(function () {
  'use strict';
  var SCENARIOS = [
    { id: 'employment', name: '就业优先', shortName: '就业', desc: '优先看就业解释清楚、路径相对明确、家长容易判断的方向。' },
    { id: 'grid', name: '电网 / 体制内倾向', shortName: '电网', desc: '适合电气、能源、自动化等方向，重点看稳定行业和区域机会。' },
    { id: 'exam', name: '考研深造', shortName: '考研', desc: '更重视学科基础、读研空间和长期转向余地。' },
    { id: 'broad', name: '宽口径稳妥', shortName: '宽口径', desc: '兴趣暂不明确或候选仍偏多时，先保留更多后续调整空间。' }
  ];
  var NAMES = SCENARIOS.reduce(function (acc, item) { acc[item.id] = item.name; return acc; }, {});
  function num(v) { return Number(v || 0); }
  function ids(list) { return (list || []).map(function (item) { return typeof item === 'string' ? item : item.id; }).filter(Boolean); }
  function has(list, id) { return list.indexOf(id) !== -1; }
  function top(scores) {
    var winner = 'broad';
    Object.keys(scores).forEach(function (id) {
      if (scores[id] > scores[winner]) winner = id;
    });
    return winner;
  }
  function contextFromState(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var rank = state.rank || {};
    var family = state.family || {};
    var child = state.childPreference || {};
    var preview = child.preview || {};
    var groupIds = ids(child.selectedGroups || []);
    var selectedMajorNames = (child.selectedMajors || []).map(function (item) { return item.name || ''; }).filter(Boolean);
    var basePool = num(rank.loadedRows);
    var familyRows = num(preview.familyFilteredRows || (family.preview && family.preview.filteredPreview) || (state.compute && state.compute.filtered) || rank.loadedRows);
    var matchedRows = num(preview.matchedRows);
    var effectiveRows = child.manualOnly ? num(preview.effectiveFilteredRows || matchedRows) : familyRows;
    var bigPool = !!((family.preview && family.preview.bigPool) || (preview && preview.bigPool) || familyRows > 5000);
    var hasInterest = groupIds.length > 0 || selectedMajorNames.length > 0;
    return {
      basePool: basePool,
      familyRows: familyRows,
      matchedRows: matchedRows,
      effectiveRows: effectiveRows,
      bigPool: bigPool,
      manualOnly: !!child.manualOnly,
      mode: child.mode || 'unset',
      hasInterest: hasInterest,
      groupIds: groupIds,
      selectedMajorNames: selectedMajorNames,
      family: family,
      child: child
    };
  }
  function score(ctx) {
    var scores = { employment: 42, grid: 35, exam: 36, broad: 44 };
    var reasons = [];
    if (!ctx.hasInterest || ctx.mode === 'unknown') {
      scores.broad += 28;
      reasons.push('孩子兴趣暂不明确，先用宽口径稳妥路径。');
    }
    if (ctx.bigPool) {
      scores.broad += 14;
      reasons.push('当前候选仍偏多，宽口径路径更利于继续收窄。');
    }
    if (ctx.manualOnly && ctx.matchedRows > 0) {
      scores.employment += 7;
      reasons.push('已开启真实命中，后续场景可以围绕兴趣命中池解释。');
    }
    if (has(ctx.groupIds, 'electric_energy')) {
      scores.grid += 46;
      scores.employment += 12;
      reasons.push('孩子偏电气能源与自动化，适合优先观察电网/稳定行业路径。');
    }
    if (has(ctx.groupIds, 'electronic_comm')) {
      scores.employment += 20;
      scores.grid += 8;
      reasons.push('电子信息与通信更适合先按就业路径解释。');
    }
    if (has(ctx.groupIds, 'computer_ai')) {
      scores.employment += 24;
      scores.broad += 5;
      reasons.push('计算机与人工智能更适合先看就业和能力成长路径。');
    }
    if (has(ctx.groupIds, 'mechanical_instrument')) {
      scores.employment += 12;
      scores.grid += 6;
      reasons.push('机械、车辆与智能制造可按传统工科就业路径观察。');
    }
    if (has(ctx.groupIds, 'medicine_health') || has(ctx.groupIds, 'science_material')) {
      scores.exam += 25;
      reasons.push('医学、理学基础或新材料方向培养周期较长，建议关注读研深造路径。');
    }
    if (has(ctx.groupIds, 'law_human_edu')) {
      scores.exam += 12;
      scores.broad += 10;
      reasons.push('法学、人文与教育往往更依赖长期积累和考试路径。');
    }
    if (has(ctx.groupIds, 'agri_animal_food')) {
      scores.exam += 11;
      scores.employment += 8;
      reasons.push('农学、动物医学与食品需要结合行业场景和深造路径一起看。');
    }
    if (has(ctx.groupIds, 'finance_manage')) {
      scores.employment += 12;
      scores.broad += 8;
      reasons.push('经济管理金融方向竞争差异较大，先兼顾就业与宽口径。');
    }
    if (ctx.familyRows > 0 && ctx.familyRows <= 1800 && ctx.hasInterest) {
      scores.employment += 4;
      scores.grid += has(ctx.groupIds, 'electric_energy') ? 5 : 0;
      reasons.push('家庭底线池已经收窄，可以进入更具体的场景解释。');
    }
    var recommended = top(scores);
    if (!reasons.length) reasons.push('信息还不充分，先按宽口径稳妥路径进入下一步。');
    return { scores: scores, recommended: recommended, reasons: reasons };
  }
  function explain(id, ctx, scored) {
    var name = NAMES[id] || id;
    if (id === 'grid') return '推荐“' + name + '”：孩子偏电气/能源/自动化时，这条路径最容易把兴趣、稳定就业和家庭可接受度讲清楚。';
    if (id === 'employment') return '推荐“' + name + '”：优先把专业方向和毕业后的实际路径讲清楚，适合多数家庭先看 B 方案。';
    if (id === 'exam') return '推荐“' + name + '”：这些方向更看重学科基础和继续深造，适合把读研空间放在前面。';
    return '推荐“' + name + '”：当前兴趣或限制还不够明确，先保留宽口径，避免过早把机会锁死。';
  }
  function planTone(id, ctx) {
    if (id === 'grid') return { A: '适度看层级和专业弹性', B: '重点看电气/自动化命中、区域和稳定路径', C: '保底不牺牲安全垫' };
    if (id === 'employment') return { A: '看可解释的就业路径', B: '重点看兴趣命中与岗位方向', C: '保留就业相对清楚的安全选择' };
    if (id === 'exam') return { A: '看学科基础和学校平台', B: '重点看读研路径与专业基础', C: '安全垫优先，避免过窄专业' };
    return { A: '少量保留冲击机会', B: '稳妥主线先不锁死', C: '先保证录取安全和家庭可接受' };
  }
  function preview(state, forcedId) {
    var ctx = contextFromState(state);
    var scored = score(ctx);
    var selected = forcedId || ((state && state.scenario && state.scenario.current) || scored.recommended);
    var rowsForNext = ctx.manualOnly && ctx.matchedRows > 0 ? ctx.matchedRows : ctx.familyRows;
    var out = {
      ok: true,
      reason: 'v3-scenario-preview-only',
      recommended: scored.recommended,
      recommendedName: NAMES[scored.recommended] || scored.recommended,
      selected: selected,
      selectedName: NAMES[selected] || selected,
      scores: scored.scores,
      basePool: ctx.basePool,
      familyFilteredRows: ctx.familyRows,
      matchedRows: ctx.matchedRows,
      effectiveRows: rowsForNext,
      manualOnly: ctx.manualOnly,
      hasInterest: ctx.hasInterest,
      bigPool: ctx.bigPool,
      groupIds: ctx.groupIds,
      selectedMajors: ctx.selectedMajorNames,
      explanation: explain(scored.recommended, ctx, scored),
      selectedExplanation: explain(selected, ctx, scored),
      reasons: scored.reasons.slice(0, 4),
      planTone: planTone(selected, ctx),
      bPlanBoost: ctx.hasInterest ? (selected === 'grid' ? 1.2 : 1.1) : 1,
      summary: '建议优先看“' + (NAMES[scored.recommended] || scored.recommended) + '”，下一步 B 方案会按这个场景调整解释重点。'
    };
    return out;
  }
  function applyScenario(id, source) {
    if (!window.LN_V3_STORE) return null;
    var state = window.LN_V3_STORE.getState();
    var p = preview(state, id);
    window.LN_V3_STORE.setState({
      scenario: { current: id, recommended: p.recommended, reason: p.selectedExplanation, source: source || 'user', preview: p, locked: source === 'user' },
      ui: { lastMessage: '场景已选择：' + p.selectedName + '。' },
      compute: { basePool: p.familyFilteredRows || 0, filtered: p.effectiveRows || 0, lastReason: 'v3-step4-scenario-preview' }
    }, 'scenario:apply');
    return p;
  }
  function applyRecommended(source) {
    var p = preview(window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {}, null);
    return applyScenario(p.recommended, source || 'auto-recommended');
  }
  function matrix() {
    function fake(groups, opts) {
      opts = opts || {};
      return {
        rank: { loadedRows: opts.basePool || 7934 },
        family: { preview: { filteredPreview: opts.familyRows || 1597, bigPool: !!opts.bigPool } },
        childPreference: {
          mode: opts.mode || (groups.length ? 'selected' : 'unknown'),
          selectedGroups: groups.map(function (id) { var g = window.LN_V3_CHILD_GROUPS && window.LN_V3_CHILD_GROUPS.find ? window.LN_V3_CHILD_GROUPS.find(id) : null; return { id: id, name: g ? g.name : id }; }),
          selectedMajors: opts.majors || [],
          manualOnly: !!opts.manualOnly,
          preview: { familyFilteredRows: opts.familyRows || 1597, matchedRows: opts.matchedRows || 116, effectiveFilteredRows: opts.manualOnly ? (opts.matchedRows || 116) : (opts.familyRows || 1597) }
        },
        scenario: {},
        compute: { filtered: opts.familyRows || 1597 }
      };
    }
    return [
      { name: '兴趣不确定 → 宽口径', expected: 'broad', preview: preview(fake([], { mode: 'unknown', matchedRows: 0 })) },
      { name: '电气能源 → 电网/体制内', expected: 'grid', preview: preview(fake(['electric_energy'], { manualOnly: true, matchedRows: 116 })) },
      { name: '计算机AI → 就业优先', expected: 'employment', preview: preview(fake(['computer_ai'], { matchedRows: 180 })) },
      { name: '理学材料 → 考研深造', expected: 'exam', preview: preview(fake(['science_material'], { matchedRows: 130 })) },
      { name: '大池且兴趣不明 → 宽口径', expected: 'broad', preview: preview(fake([], { mode: 'unknown', familyRows: 7494, bigPool: true, matchedRows: 0 })) }
    ];
  }
  window.LN_V3_SCENARIO_ADAPTER = {
    scenarios: SCENARIOS,
    preview: preview,
    recommend: function (state) { return preview(state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {}), null); },
    applyScenario: applyScenario,
    applyRecommended: applyRecommended,
    matrix: matrix,
    names: NAMES
  };
})();
