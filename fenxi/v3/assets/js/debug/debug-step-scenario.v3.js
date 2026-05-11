(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function run() {
    var results = [];
    var store = window.LN_V3_STORE;
    var saved = store ? store.getState() : null;
    results.push(check('Step4 渲染模块存在', !!window.LN_V3_STEP_SCENARIO));
    results.push(check('scenario-adapter 存在', !!window.LN_V3_SCENARIO_ADAPTER));
    if (!store || !window.LN_V3_SCENARIO_ADAPTER) return results;
    var adapter = window.LN_V3_SCENARIO_ADAPTER;
    results.push(check('场景数量为 4', (adapter.scenarios || []).length === 4, 'count=' + ((adapter.scenarios || []).length)));
    var matrix = adapter.matrix ? adapter.matrix() : [];
    matrix.forEach(function (item) {
      results.push(check('场景矩阵：' + item.name, item.preview && item.preview.recommended === item.expected, JSON.stringify({ expected: item.expected, recommended: item.preview && item.preview.recommended, scores: item.preview && item.preview.scores })));
    });
    var current = store.getState();
    var p = adapter.recommend(current);
    results.push(check('当前状态可生成场景推荐', !!(p && p.recommended), JSON.stringify({ recommended: p && p.recommended, familyRows: p && p.familyFilteredRows, matchedRows: p && p.matchedRows })));
    if (!current.rank || !current.rank.loadedRows) {
      results.push(check('Step4 等待 Step1/Step2/Step3 数据', true, '当前没有 loadedRows，仅做矩阵覆盖，不做路由强校验'));
      return results;
    }
    var applied = window.LN_V3_STEP_SCENARIO._test.applyRecommended();
    var afterApply = store.getState();
    results.push(check('采用系统建议可写入 store', !!(afterApply.scenario && afterApply.scenario.current), JSON.stringify(afterApply.scenario || {})));
    results.push(check('场景 preview 写入 store', !!(afterApply.scenario && afterApply.scenario.preview && afterApply.scenario.preview.reason), JSON.stringify(afterApply.scenario && afterApply.scenario.preview || {})));
    var routed = window.LN_V3_STEP_SCENARIO._test.saveAndGoNext('debug-step4-next');
    var afterNext = store.getState();
    results.push(check('Step4 保存后进入 Step5', afterNext.ui.activeStep === 'plans' && afterNext.ui.activeTab === 'plans', JSON.stringify(afterNext.ui || {})));
    if (saved) window.LN_V3_STORE.setState(clone(saved), 'debug-step4:restore');
    var restored = window.LN_V3_STORE.getState();
    results.push(check('Step4 自测状态回滚干净', JSON.stringify(restored.scenario || {}) === JSON.stringify((saved && saved.scenario) || {}), JSON.stringify(restored.scenario || {})));
    return results;
  }
  window.LN_V3_DEBUG_STEP_SCENARIO = { run: run };
})();
