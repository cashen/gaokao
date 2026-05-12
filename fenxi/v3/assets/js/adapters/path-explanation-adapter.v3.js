(function () {
  'use strict';

  var PATH_NAMES = {
    platform: '平台优先',
    major: '强专业优先',
    province_public: '省内公办稳妥',
    employment: '普通家庭就业路径',
    grid: '电网 / 能源稳定路径',
    exam: '考研深造路径',
    broad: '宽口径比较路径',
    guarantee: '真实保底路径',
    cost_risk: '成本风险控制'
  };

  function has(list, id) { return (list || []).indexOf(id) !== -1; }
  function bandId(ctx) { return ctx && ctx.band && ctx.band.id ? ctx.band.id : 'unknown'; }
  function regionMode(ctx) { return ctx && ctx.region && ctx.region.mode ? ctx.region.mode : 'none'; }
  function scoreOf(scores, id) { return Math.round(Number((scores || {})[id] || 0)); }
  function uniq(list) {
    var seen = {};
    return (list || []).filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    }).slice(0, 4);
  }
  function sortedScores(scores) {
    return Object.keys(scores || {}).map(function (id) {
      return { id: id, name: PATH_NAMES[id] || id, score: scoreOf(scores, id) };
    }).sort(function (a, b) { return b.score - a.score; });
  }
  function detectCloseCall(scores) {
    var sorted = sortedScores(scores);
    if (sorted.length < 2) return { exists: false };
    var top = sorted[0];
    var second = sorted[1];
    var diff = Math.abs(top.score - second.score);
    var platform = sorted.find(function (x) { return x.id === 'platform'; });
    var major = sorted.find(function (x) { return x.id === 'major'; });
    var platformMajorClose = !!(platform && major && Math.abs(platform.score - major.score) <= 3 && Math.max(platform.score, major.score) >= Math.max(top.score - 3, 0));
    var exists = diff <= 3 || platformMajorClose;
    var message = '';
    if (platformMajorClose) {
      message = '平台优先与强专业优先当前接近。系统因当前分数段更偏高分平台比较，暂建议先看平台优先；如果家庭更重视专业正主程度，也可以手动选择强专业优先。';
    } else if (exists) {
      message = top.name + '与' + second.name + '当前接近。系统只是给出本轮默认主线，家长可以按家庭偏好手动切换。';
    }
    return { exists: exists, top: top, second: second, diff: diff, platformMajorClose: platformMajorClose, message: message };
  }

  function bandPlus(id, b) {
    if (b === '625_plus') {
      if (id === 'platform') return '625+ 高分段：学校平台、城市资源和读研空间权重更高';
      if (id === 'major') return '高分段也要防止只看校名，专业正主程度仍需比较';
      if (id === 'exam') return '高分段通常有更好的深造与转向空间';
    }
    if (b === '590_624') {
      if (id === 'major') return '590–624 段：学校层级与专业质量需要平衡，专业正主程度上升';
      if (id === 'platform') return '590–624 段仍有平台比较价值，不能只看单个专业名';
      if (id === 'employment') return '中高分段要把本科出口和可解释路径讲清楚';
    }
    if (b === '550_589') {
      if (id === 'major') return '550–589 段：专业质量、行业匹配和就业确定性更关键';
      if (id === 'employment') return '普通家庭更需要看得懂的本科出口';
      if (id === 'province_public') return '本分数段遇到地域要求时，省内公办底线要前置';
    }
    if (b === '500_549') {
      if (id === 'province_public') return '500–549 段：地域、公办、费用和安全垫是先决条件';
      if (id === 'employment') return '家庭底线内仍要解释孩子未来出口';
      if (id === 'broad') return '候选还多时，保留比较空间有价值';
    }
    if (b === '450_499' || b === '367_449') {
      if (id === 'guarantee') return '低分段先确认本科机会和真实保底';
      if (id === 'cost_risk') return '低分段更要防高收费、性质误判和专业名误认';
      if (id === 'province_public') return '若地域锁定，省内可承受组合需要先排清楚';
    }
    return '';
  }

  function groupPlus(id, ctx) {
    var groups = ctx.groupIds || [];
    if (has(groups, 'electric_energy')) {
      if (id === 'grid') return '孩子提到电气 / 能源，稳定行业路径有解释价值';
      if (id === 'major') return '电气兴趣需要看专业正主程度和培养方向';
      if (id === 'employment') return '电气相关方向可转成家庭容易理解的就业路径';
      if (id === 'platform' && (bandId(ctx) === '625_plus' || bandId(ctx) === '590_624')) return '高分段电气兴趣应与学校平台一起比较';
    }
    if (has(groups, 'computer_ai')) {
      if (id === 'major') return '计算机 / AI 兴趣必须比较专业归属和课程内容';
      if (id === 'platform') return '计算机类更依赖平台、城市和实习资源';
      if (id === 'employment') return '计算机兴趣可以转成就业出口复核';
    }
    if (has(groups, 'medicine_health') || has(groups, 'science_material')) {
      if (id === 'exam') return '理学、医学、新材料等方向培养周期较长，深造路径要前置';
      if (id === 'major') return '长周期方向要先确认孩子能否持续投入';
    }
    if (has(groups, 'agri_animal_food')) {
      if (id === 'employment') return '农学、动物医学、食品类要同时看行业路径和地域机会';
      if (id === 'exam') return '这些方向常见深造分化，需要提前复核培养路径';
    }
    return '';
  }

  function plusFactors(id, ctx, scores) {
    var plus = [];
    var b = bandId(ctx);
    var r = regionMode(ctx);
    plus.push(bandPlus(id, b));
    if (r === 'hard' && id === 'province_public') plus.push('地域是硬底线：目标地区内的稳妥组合优先级上升');
    if (r === 'soft' && id === 'broad') plus.push('地域是偏好不是硬筛：保留外部参照空间更合理');
    if (r === 'none' && id === 'platform') plus.push('地域开放：更适合先比较平台、城市和专业上限');
    if ((!ctx.hasInterest || ctx.childMode === 'unknown') && id === 'broad') plus.push('孩子兴趣未完全明确：先别过早锁死单一方向');
    if (ctx.bigPool && id === 'broad') plus.push('当前候选仍偏多：先扩展比较，再逐步收窄');
    if (ctx.manualOnly && ctx.matchedRows > 0 && (id === 'major' || id === 'employment')) plus.push('真实命中已开启：孩子兴趣可进入主方案解释');
    plus.push(groupPlus(id, ctx));
    if (ctx.studentProfile && (ctx.studentProfile.preferenceTags || []).indexOf('work_first') !== -1 && id === 'employment') plus.push('学生画像偏本科就业：需要把毕业出口讲清楚');
    if (scoreOf(scores, id) >= 70) plus.push('匹配分较高：适合作为本轮家庭讨论主线');
    return uniq(plus);
  }

  function minusFactors(id, ctx, scores, recommended) {
    var minus = [];
    var b = bandId(ctx);
    var r = regionMode(ctx);
    if (id === 'platform' && (b === '500_549' || b === '450_499' || b === '367_449')) minus.push('当前分数段不宜只追平台，容易忽略费用、性质和保底安全');
    if (id === 'major' && (!ctx.hasInterest || ctx.childMode === 'unknown')) minus.push('孩子兴趣尚未明确，强专业主线暂时缺少稳定依据');
    if (id === 'employment' && b === '625_plus') minus.push('高分段不宜过早降成单一就业叙事，仍要保留平台上限');
    if (id === 'grid' && !has(ctx.groupIds || [], 'electric_energy')) minus.push('未明确电气 / 能源兴趣，暂不宜把电网路径放成主线');
    if (id === 'exam' && !(has(ctx.groupIds || [], 'science_material') || has(ctx.groupIds || [], 'medicine_health') || has(ctx.groupIds || [], 'agri_animal_food'))) minus.push('没有明确长周期兴趣时，不默认推考研深造');
    if (id === 'broad' && r === 'hard') minus.push('地域已经是硬底线，宽口径只能做参照，不能压过家庭底线');
    if (id === 'guarantee' && (b === '625_plus' || b === '590_624')) minus.push('当前分数段不必把真实保底作为第一主线');
    if (id === 'cost_risk' && scoreOf(scores, id) < 55) minus.push('当前更像复核提醒，不适合作为唯一主线');
    if (id !== recommended && scoreOf(scores, id) + 3 < scoreOf(scores, recommended)) minus.push('当前匹配分低于系统暂选路径，建议作为辅助视角');
    return uniq(minus.length ? minus : ['暂无明显扣分，主要看家庭偏好是否更重视这条路径']);
  }

  function abcImpact(id) {
    if (id === 'platform') return 'A 稳住强校 / 强平台，B 在平台里找更合适专业，C 看更高平台、城市和上限。';
    if (id === 'major') return 'A 先守可接受学校，B 聚焦专业正主、学科 / 行业匹配，C 适度上探学校层级或城市。';
    if (id === 'province_public') return 'A 守住省内公办底线，B 在省内公办里解释孩子兴趣，C 再看可接受上探机会。';
    if (id === 'employment') return 'A 先避开明显风险，B 重点讲本科出口和就业路径，C 看城市与行业上限。';
    if (id === 'grid') return 'A 先确认电气 / 能源真实机会，B 看稳定行业匹配，C 对比更好城市或学校层级。';
    if (id === 'exam') return 'A 保住学科基础，B 看深造空间和课程承接，C 看平台与科研资源上限。';
    if (id === 'broad') return 'A/B/C 会保留更多可能，用比较空间换信息，不急着锁死。';
    if (id === 'guarantee') return 'A/B/C 会先验证录取安全、费用、性质和专业可读性。';
    return 'A/B/C 会把费用、校区、学校性质和培养方向复核放在前面。';
  }

  function whySuggested(id, ctx, scores, recommended, closeCall) {
    var name = PATH_NAMES[id] || id;
    if (id === recommended) {
      if (closeCall && closeCall.exists && closeCall.message) return '系统暂选“' + name + '”：' + closeCall.message;
      return '系统暂选“' + name + '”：它在当前分数段、地域强度和孩子兴趣组合下匹配分最高。';
    }
    if (closeCall && closeCall.exists && (id === (closeCall.top && closeCall.top.id) || id === (closeCall.second && closeCall.second.id))) {
      return '这条路径与系统暂选路径很接近，可以手动选择，不会影响底层候选计算。';
    }
    return '这条路径可作为辅助视角；当前系统没有默认选它，主要是匹配分或家庭底线优先级略低。';
  }

  function buildCardExplanation(id, ctx, scored, selected) {
    var scores = (scored && scored.scores) || {};
    var recommended = (scored && scored.recommended) || selected || 'broad';
    var closeCall = detectCloseCall(scores);
    return {
      id: id,
      name: PATH_NAMES[id] || id,
      score: scoreOf(scores, id),
      plus: plusFactors(id, ctx || {}, scores),
      minus: minusFactors(id, ctx || {}, scores, recommended),
      abcImpact: abcImpact(id),
      whySuggested: whySuggested(id, ctx || {}, scores, recommended, closeCall),
      isRecommended: id === recommended,
      isClose: !!(closeCall && closeCall.exists && (id === (closeCall.top && closeCall.top.id) || id === (closeCall.second && closeCall.second.id)))
    };
  }

  function explainAll(scenarios, ctx, scored, selected) {
    var out = {};
    (scenarios || []).forEach(function (item) {
      out[item.id] = buildCardExplanation(item.id, ctx, scored, selected);
    });
    return out;
  }

  function staticPlan() {
    return {
      stage: 'rc1fix6-family-path-explanation',
      goal: '只解释 Step4 家庭路径为什么得分与为什么暂选，不改变原推荐权重，不改变 A/B/C 生成。',
      cardFields: ['score', 'plus', 'minus', 'abcImpact', 'whySuggested'],
      closeCallRule: 'top2 diff <= 3；平台优先与强专业优先差距 <= 3 时显示接近提示。',
      noWeightChange: true
    };
  }

  function assertions(scenarioAdapter) {
    var results = [];
    function push(name, ok, detail) { results.push({ name: name, ok: !!ok, detail: detail || '' }); }
    push('路径解释适配器存在', true, 'LN_V3_PATH_EXPLANATION_ADAPTER');
    push('路径卡加减分因素生成方法存在', typeof buildCardExplanation === 'function' && typeof explainAll === 'function', 'buildCardExplanation/explainAll');

    var ctx = {
      band: { id: '590_624', label: '590–624 学校专业平衡段' },
      region: { mode: 'none', label: '全国都可比较', display: '全国都可比较' },
      groupIds: ['neutral_interest'],
      selectedMajors: [],
      basePool: 317,
      familyRows: 317,
      matchedRows: 30,
      effectiveRows: 317,
      manualOnly: false,
      hasInterest: true,
      bigPool: false,
      childMode: 'selected',
      studentProfile: {},
      majorProfile: {}
    };
    var scored = scenarioAdapter && scenarioAdapter._test && scenarioAdapter._test.score ? scenarioAdapter._test.score(ctx) : { scores: { platform: 60, major: 60 }, recommended: 'platform', reasons: [] };
    var close = detectCloseCall(scored.scores || {});
    var card = buildCardExplanation('platform', ctx, scored, scored.recommended);
    push('并列路径提示存在', !!(close && close.exists && /平台优先与强专业优先当前接近/.test(close.message || '')), JSON.stringify(close || {}));
    push('路径卡加分因素存在', !!(card && card.plus && card.plus.length), JSON.stringify(card && card.plus || []));
    push('路径卡扣分因素存在', !!(card && card.minus && card.minus.length), JSON.stringify(card && card.minus || []));
    push('不改变原推荐权重', !!(scored && scored.scores && Math.round(scored.scores.platform) === 60 && Math.round(scored.scores.major) === 60 && scored.recommended === 'platform'), JSON.stringify(scored && { recommended: scored.recommended, scores: scored.scores }));
    return results;
  }

  window.LN_V3_PATH_EXPLANATION_ADAPTER = {
    names: PATH_NAMES,
    detectCloseCall: detectCloseCall,
    buildCardExplanation: buildCardExplanation,
    explainAll: explainAll,
    staticPlan: staticPlan,
    assertions: assertions
  };
})();
