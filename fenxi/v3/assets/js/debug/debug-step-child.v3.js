(function () {
  'use strict';
  function pass(name, detail) { return { ok: true, name: name, detail: detail || '' }; }
  function fail(name, detail) { return { ok: false, name: name, detail: detail || '' }; }
  window.LN_V3_DEBUG_STEP_CHILD = {
    run: function () {
      var results = [];
      var groups = window.LN_V3_CHILD_GROUPS && window.LN_V3_CHILD_GROUPS.all || [];
      results.push(groups.length === 9 ? pass('9大类专业方向存在', 'count=9') : fail('9大类专业方向存在', 'count=' + groups.length));
      results.push(window.LN_V3_STEP_CHILD ? pass('Step3 渲染模块存在') : fail('Step3 渲染模块存在'));
      results.push(window.LN_V3_CHILD_SEARCH ? pass('专业搜索模块存在') : fail('专业搜索模块存在'));
      var before = window.LN_V3_STORE.getState();
      try {
        window.LN_V3_STORE.setState({ childPreference: { mode: 'unset', selectedGroups: [], selectedMajors: [], weights: {}, summary: '测试前重置', manualOnly: false } }, 'debug:child:reset');
        window.LN_V3_STEP_CHILD._test.toggleGroup('electric_energy');
        window.LN_V3_STEP_CHILD._test.toggleMajor('electric_energy', '电气工程及其自动化');
        var after = window.LN_V3_STORE.getState();
        var child = after.childPreference;
        results.push(child.selectedGroups.length === 1 && child.selectedGroups[0].id === 'electric_energy' ? pass('selectedGroups 写入 store', JSON.stringify(child.selectedGroups)) : fail('selectedGroups 写入 store', JSON.stringify(child.selectedGroups)));
        results.push(child.selectedMajors.length === 1 && child.selectedMajors[0].name === '电气工程及其自动化' ? pass('selectedMajors 写入 store', JSON.stringify(child.selectedMajors)) : fail('selectedMajors 写入 store', JSON.stringify(child.selectedMajors)));
        results.push(child.weights && child.weights.electric_energy ? pass('weights 已生成', JSON.stringify(child.weights)) : fail('weights 已生成', JSON.stringify(child.weights)));
        results.push(child.summary && child.summary.indexOf('电气能源') !== -1 ? pass('summary 已生成', child.summary) : fail('summary 已生成', child.summary));
      } finally {
        window.LN_V3_STORE.setState({ childPreference: before.childPreference, ui: before.ui }, 'debug:child:restore');
      }
      return results;
    }
  };
})();
