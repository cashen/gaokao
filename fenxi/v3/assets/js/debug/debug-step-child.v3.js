(function () {
  'use strict';
  function pass(name, detail) { return { ok: true, name: name, detail: detail || '' }; }
  function fail(name, detail) { return { ok: false, name: name, detail: detail || '' }; }
  function recordsCount() {
    var payload = window.LN_V3_CHILD_INTEREST && window.LN_V3_CHILD_INTEREST.getFamilyFilteredPayload ? window.LN_V3_CHILD_INTEREST.getFamilyFilteredPayload() : null;
    return payload && Array.isArray(payload.records) ? payload.records.length : 0;
  }
  window.LN_V3_DEBUG_STEP_CHILD = {
    run: function () {
      var results = [];
      var groups = window.LN_V3_CHILD_GROUPS && window.LN_V3_CHILD_GROUPS.all || [];
      results.push(groups.length === 9 ? pass('9大类专业方向存在', 'count=9') : fail('9大类专业方向存在', 'count=' + groups.length));
      results.push(window.LN_V3_STEP_CHILD ? pass('Step3 渲染模块存在') : fail('Step3 渲染模块存在'));
      results.push(window.LN_V3_CHILD_SEARCH ? pass('专业搜索模块存在') : fail('专业搜索模块存在'));
      results.push(window.LN_V3_CHILD_INTEREST ? pass('child-interest-adapter 存在') : fail('child-interest-adapter 存在'));
      var before = window.LN_V3_STORE.getState();
      try {
        window.LN_V3_STORE.setState({ childPreference: { mode: 'unset', selectedGroups: [], selectedMajors: [], weights: {}, summary: '测试前重置', manualOnly: false, preview: null } }, 'debug:child:reset');
        window.LN_V3_STEP_CHILD._test.toggleGroup('electric_energy');
        window.LN_V3_STEP_CHILD._test.toggleMajor('electric_energy', '电气工程及其自动化');
        var after = window.LN_V3_STORE.getState();
        var child = after.childPreference;
        results.push(child.selectedGroups.length === 1 && child.selectedGroups[0].id === 'electric_energy' ? pass('selectedGroups 写入 store', JSON.stringify(child.selectedGroups)) : fail('selectedGroups 写入 store', JSON.stringify(child.selectedGroups)));
        results.push(child.selectedMajors.length === 1 && child.selectedMajors[0].name === '电气工程及其自动化' ? pass('selectedMajors 写入 store', JSON.stringify(child.selectedMajors)) : fail('selectedMajors 写入 store', JSON.stringify(child.selectedMajors)));
        results.push(child.weights && child.weights.electric_energy ? pass('weights 已生成', JSON.stringify(child.weights)) : fail('weights 已生成', JSON.stringify(child.weights)));
        results.push(child.summary && child.summary.indexOf('电气能源') !== -1 ? pass('summary 已生成', child.summary) : fail('summary 已生成', child.summary));
        var preview = child.preview || {};
        var recCount = recordsCount();
        results.push(preview.reason ? pass('兴趣命中预览已生成', JSON.stringify({ reason: preview.reason, familyFilteredRows: preview.familyFilteredRows, matchedRows: preview.matchedRows, effectiveFilteredRows: preview.effectiveFilteredRows })) : fail('兴趣命中预览已生成', JSON.stringify(preview)));
        if (recCount > 0) {
          results.push(Number(preview.familyFilteredRows || 0) > 0 ? pass('Step3 可读取当前底线池', 'records=' + preview.familyFilteredRows) : fail('Step3 可读取当前底线池', JSON.stringify(preview)));
          results.push(Number(preview.matchedRows || 0) > 0 ? pass('电气能源方向在当前底线池有命中', 'matchedRows=' + preview.matchedRows) : fail('电气能源方向在当前底线池有命中', JSON.stringify(preview)));
        } else {
          results.push(pass('Step3 等待 Step1/Step2 数据', '当前没有 records，不做命中数量强校验'));
        }
        if (recCount > 0) {
          window.LN_V3_STEP_CHILD._test.toggleManualOnly();
          var manual = window.LN_V3_STORE.getState().childPreference.preview || {};
          results.push(manual.manualOnly === true ? pass('manualOnly 可写入并触发预览', JSON.stringify({ manualOnly: manual.manualOnly, effectiveFilteredRows: manual.effectiveFilteredRows, matchedRows: manual.matchedRows })) : fail('manualOnly 可写入并触发预览', JSON.stringify(manual)));
          if (Number(manual.matchedRows || 0) > 0) {
            results.push(Number(manual.effectiveFilteredRows || 0) === Number(manual.matchedRows || 0) ? pass('真实命中模式收窄到 matchedRows', JSON.stringify({ effectiveFilteredRows: manual.effectiveFilteredRows, matchedRows: manual.matchedRows })) : fail('真实命中模式收窄到 matchedRows', JSON.stringify(manual)));
          } else {
            results.push(pass('真实命中模式等待命中样本', '当前底线池没有命中样本，不做收窄强校验'));
          }
        } else {
          results.push(pass('manualOnly 等待 Step1/Step2 数据', '当前没有 records，不做真实命中强校验'));
        }
      } finally {
        window.LN_V3_STORE.setState({ childPreference: before.childPreference, ui: before.ui, compute: before.compute }, 'debug:child:restore');
        var restored = window.LN_V3_STORE.getState();
        var restoredChild = restored.childPreference || {};
        var beforeHadChoice = (before.childPreference.selectedGroups || []).length > 0 || (before.childPreference.selectedMajors || []).length > 0 || before.childPreference.mode === 'unknown';
        var cleanWhenEmpty = beforeHadChoice || ((restoredChild.selectedGroups || []).length === 0 && (restoredChild.selectedMajors || []).length === 0 && Object.keys(restoredChild.weights || {}).length === 0 && !restoredChild.preview && restoredChild.summary === '还没有选择专业方向。');
        results.push(cleanWhenEmpty ? pass('自测状态回滚干净', JSON.stringify(restoredChild)) : fail('自测状态回滚干净', JSON.stringify(restoredChild)));
      }
      return results;
    }
  };
})();
