(function () {
  'use strict';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (s) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]; }); }
  function factorDetail(item, preview) {
    var id = item.id;
    var score = Math.round(Number((preview.scores || {})[id] || 0));
    var plus = ['当前匹配分：' + score, '用于解释本轮 A/B/C 主线，不改变底层候选计算'];
    var minus = ['只是讨论口径，不代表排除其它路径'];
    if (id === 'platform') plus.push('更重视学校平台、城市资源和长期成长空间');
    if (id === 'major') plus.push('更重视专业正主程度、学科基础和行业匹配');
    if (id === 'province_public') plus.push('更重视地域、公办、费用和家庭可接受度');
    if (id === 'employment') plus.push('更重视本科出口和普通家庭能看懂的就业路径');
    if (id === 'broad') plus.push('兴趣或地域暂未锁死，先保留比较空间');
    if (id !== preview.recommended && score + 3 < Math.round(Number((preview.scores || {})[preview.recommended] || 0))) minus.push('当前匹配分低于系统暂选路径，适合作为辅助视角');
    return { score: score, plus: plus, minus: minus };
  }
  function impact(id) { return ({ platform: 'A 稳住强校 / 强平台，B 在平台里找更合适专业，C 看更高平台、城市和上限。', major: 'A 先守可接受学校，B 聚焦专业正主、学科 / 行业匹配，C 适度上探学校层级或城市。', province_public: 'A 守住省内公办底线，B 在省内公办里解释孩子兴趣，C 再看可接受上探机会。', employment: 'A 先避开明显风险，B 重点讲本科出口和就业路径，C 看城市与行业上限。', broad: 'A/B/C 会保留更多可能，用比较空间换信息，不急着锁死。', guarantee: 'A/B/C 会先验证录取安全、费用、性质和专业可读性。' })[id] || 'A/B/C 会按这条路径重排解释重点。'; }
  function list(title, items, cls) { return '<div class="scenario-factor-block ' + cls + '"><span>' + esc(title) + '</span><ul>' + (items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; }
  function closeNotice(preview) { var p = Math.round(Number((preview.scores || {}).platform || 0)); var m = Math.round(Number((preview.scores || {}).major || 0)); if (!p || !m || Math.abs(p - m) > 3) return ''; return '<div class="scenario-close-notice"><strong>并列 / 接近提醒</strong><p>平台优先与强专业优先当前接近。系统因当前分数段更偏高分平台比较，暂建议先看平台优先；如果家庭更重视专业正主程度，也可以手动选择强专业优先。</p></div>'; }
  function scenarioCard(item, state, preview) {
    var current = (state.scenario || {}).current;
    var active = current === item.id;
    var isRecommended = preview.recommended === item.id;
    var d = factorDetail(item, preview);
    return ['<article class="scenario-card', active ? ' is-selected' : '', isRecommended ? ' is-recommended' : '', '" data-scenario-card="', esc(item.id), '">',
      '<div class="scenario-card-head"><strong>', esc(item.name), '</strong>', isRecommended ? '<span>系统建议</span>' : '', '</div>',
      '<p>', esc(item.desc), '</p>',
      '<div class="scenario-score"><span>路径匹配度</span><strong>', d.score, '</strong></div>',
      '<div class="scenario-why"><strong>为什么这样看：</strong><span>', esc(isRecommended ? '系统暂选这条路径：它在当前分数段、地域强度和孩子兴趣组合下匹配分较高。' : '这条路径可作为辅助视角；如家庭更看重这点，可以手动切换。'), '</span></div>',
      '<div class="scenario-factors">', list('加分因素', d.plus, 'is-plus'), list('扣分因素', d.minus, 'is-minus'), '</div>',
      '<div class="scenario-abc-impact"><strong>对 A/B/C 的影响：</strong><span>', esc(impact(item.id)), '</span></div>',
      '<button type="button" class="v3-btn ', active ? '' : 'secondary', '" data-scenario="', esc(item.id), '">', active ? '当前选择' : '选择这条路径', '</button>',
      '</article>'].join('');
  }
  function metrics(preview) { return ['<div class="scenario-metrics">', '<div><span>底线池</span><strong>', preview.familyFilteredRows || 0, '</strong></div>', '<div><span>兴趣命中</span><strong>', preview.matchedRows || 0, '</strong></div>', '<div><span>后续有效池</span><strong>', preview.effectiveRows || 0, '</strong></div>', '<div><span>B方案权重</span><strong>', preview.bPlanBoost || 1, '</strong></div>', '</div>'].join(''); }
  function html(state) {
    var adapter = window.LN_V3_SCENARIO_ADAPTER;
    var preview = adapter ? adapter.recommend(state) : { recommended: 'broad', recommendedName: '宽口径稳妥', explanation: '场景推荐模块未加载。', reasons: [], scores: {}, familyFilteredRows: 0, matchedRows: 0, effectiveRows: 0, planTone: {} };
    var current = (state.scenario || {}).current;
    var currentName = current && adapter && adapter.names ? adapter.names[current] : '';
    var scenarios = adapter ? (adapter.visibleScenarios ? adapter.visibleScenarios(state) : adapter.scenarios) : [];
    var planTone = current && state.scenario && state.scenario.preview ? state.scenario.preview.planTone : preview.planTone;
    return ['<section class="step-card" data-step-view="scenario">',
      '<div class="step-hero"><div class="v3-kicker">第 4 步</div><h2>选择这次家庭主要看哪条路径</h2><p>这里不是让你放弃其它可能，而是先确定本轮比较的主线。地域可以是硬底线，也可以是偏好；孩子兴趣会进入解释，但不会压过家庭路径。</p></div>',
      '<div class="step-body">',
      '<div class="scenario-context-panel"><div><span>分数段策略</span><strong>' + esc((preview.scoreBand && preview.scoreBand.label) || '待判断') + '</strong><p>' + esc((preview.scoreBand && preview.scoreBand.firstQuestion) || '') + '</p></div><div><span>地域选择强度</span><strong>' + esc((preview.regionPreference && preview.regionPreference.label) || '待判断') + '</strong><p>' + esc((preview.regionPreference && preview.regionPreference.display) || '') + '</p></div></div>',
      '<div class="scenario-recommend-panel"><div><span class="scenario-label">系统建议</span><h3>', esc(preview.recommendedName || '宽口径稳妥'), '</h3><p>', esc(preview.explanation || ''), '</p></div>', metrics(preview), closeNotice(preview), '<div class="scenario-reasons">', (preview.reasons || []).map(function (r) { return '<span>' + esc(r) + '</span>'; }).join(''), '</div>', '<div class="v3-actions"><button type="button" class="v3-btn" data-scenario-use-recommended>采用系统建议</button>', current ? '<button type="button" class="v3-btn secondary" data-scenario-clear>重新选择</button>' : '', '</div></div>',
      current ? '<div class="notice-box">当前选择：' + esc(currentName) + '。下一步 A/B/C 会按当前分数段、地域选择和孩子兴趣一起解释。</div>' : '<div class="notice-box">还没有手动选择。可以直接采用系统建议，也可以点下面的家庭路径卡片。</div>',
      '<div class="scenario-grid">', scenarios.map(function (item) { return scenarioCard(item, state, preview); }).join(''), '</div>',
      '<div class="scenario-plan-tone"><h3>下一步 A/B/C 会怎样解释？</h3><div><strong>A 冲一冲：</strong><span>', esc((planTone && planTone.A) || '少量保留冲击机会'), '</span></div><div><strong>B 稳妥主方案：</strong><span>', esc((planTone && planTone.B) || '稳妥主线先不锁死'), '</span></div><div><strong>C 保底安全：</strong><span>', esc((planTone && planTone.C) || '先保证录取安全'), '</span></div></div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-scenario-next>保存家庭路径并继续看 A/B/C</button><button type="button" class="v3-btn secondary" data-scenario-back-child>回到专业偏好</button></div>', '</div></section>'].join('');
  }
  function saveAndGoNext(source) { var state = window.LN_V3_STORE.getState(); var current = (state.scenario || {}).current; var preview = current && state.scenario.preview ? state.scenario.preview : null; if (!current) preview = window.LN_V3_SCENARIO_ADAPTER.applyRecommended(source || 'next-default'); else preview = window.LN_V3_SCENARIO_ADAPTER.applyScenario(current, source || 'next-current'); if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('scenario', 'scenario:complete-through'); else window.LN_V3_STORE.markComplete('scenario', 'scenario:complete'); window.LN_V3_STORE.setState({ ui: { lastMessage: '家庭路径已保存：' + (preview && preview.selectedName ? preview.selectedName : '已选择') + '，进入 A/B/C 方案。' } }, 'scenario:next-message'); if (window.LN_V3_ROUTER) return window.LN_V3_ROUTER.go('plans', 'scenario:next'); return false; }
  function bind(root) { root.querySelectorAll('[data-scenario]').forEach(function (btn) { btn.addEventListener('click', function () { var id = btn.getAttribute('data-scenario'); window.LN_V3_SCENARIO_ADAPTER.applyScenario(id, 'user'); window.LN_V3_WIZARD.render(); }); }); var rec = root.querySelector('[data-scenario-use-recommended]'); if (rec) rec.addEventListener('click', function () { window.LN_V3_SCENARIO_ADAPTER.applyRecommended('user-recommended'); window.LN_V3_WIZARD.render(); }); var clear = root.querySelector('[data-scenario-clear]'); if (clear) clear.addEventListener('click', function () { window.LN_V3_STORE.setState({ scenario: { current: '', recommended: '', reason: '', source: '', preview: null, locked: false }, ui: { lastMessage: '已清除场景选择，可重新选择。' } }, 'scenario:clear'); window.LN_V3_WIZARD.render(); }); var next = root.querySelector('[data-scenario-next]'); if (next) next.addEventListener('click', function () { saveAndGoNext('user-next'); }); var back = root.querySelector('[data-scenario-back-child]'); if (back) back.addEventListener('click', function () { window.LN_V3_ROUTER.go('child', 'scenario:back-child'); }); }
  window.LN_V3_STEP_SCENARIO = { render: function (root, state) { root.innerHTML = html(state); bind(root); }, _test: { applyRecommended: function () { return window.LN_V3_SCENARIO_ADAPTER.applyRecommended('debug'); }, selectScenario: function (id) { return window.LN_V3_SCENARIO_ADAPTER.applyScenario(id, 'debug'); }, saveAndGoNext: saveAndGoNext } };
})();
