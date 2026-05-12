(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function run() {
    var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
    var family = state.family || {};
    var adapter = window.LN_V3_FAMILY_FILTER;
    var results = [
      check('Step2 渲染模块存在', !!window.LN_V3_STEP_FAMILY),
      check('family-filter-adapter 存在', !!adapter),
      check('qualification-filter-adapter 存在', !!window.LN_V3_QUALIFICATION_FILTER),
      check('family 状态字段完整', Array.isArray(family.provinces) && Array.isArray(family.rejects) && Object.prototype.hasOwnProperty.call(family, 'preview'), JSON.stringify(family)),
      check('compute.basePool/filtered 字段存在', !!(state.compute && Object.prototype.hasOwnProperty.call(state.compute, 'basePool') && Object.prototype.hasOwnProperty.call(state.compute, 'filtered')), JSON.stringify(state.compute || {}))
    ];
    if (!adapter) return results;
    var records = adapter.getRecords ? adapter.getRecords() : [];
    var storedLoadedRows = Number(((state.rank || {}).loadedRows) || 0);
    results.push(check('Step2 可读取 Step1 已加载记录', Array.isArray(records), 'records=' + (records ? records.length : 0) + ' storeLoadedRows=' + storedLoadedRows));
    results.push(check('Step2 原始数据缓存已水合', storedLoadedRows === 0 || (records && records.length > 0), JSON.stringify({ records: records ? records.length : 0, storeLoadedRows: storedLoadedRows })));
    if (!records.length) {
      results.push(check('Step2 预览等待 Step1 数据', storedLoadedRows === 0, storedLoadedRows ? 'Store已有loadedRows但原始缓存为空，应触发debug数据水合' : '当前没有 loadedRows，不做 hard 辽宁强校验'));
      return results;
    }
    var liaoningPreview = adapter.preview({ regionMode: 'hard', provinces: ['辽宁'], budget: 'normal', feeType: 'all', rejects: [] });
    results.push(check('辽宁 hard 预览可运行', !!(liaoningPreview && liaoningPreview.ok), JSON.stringify(liaoningPreview || {})));
    results.push(check('辽宁 hard 目标存在', !!liaoningPreview.targetExists, JSON.stringify({ targetExists: liaoningPreview.targetExists, basePool: liaoningPreview.basePool, filteredPreview: liaoningPreview.filteredPreview })));
    results.push(check('辽宁 hard unmatchedKept=0', Number(liaoningPreview.unmatchedKept || 0) === 0, JSON.stringify({ unmatchedKept: liaoningPreview.unmatchedKept, sampleUnexpectedKept: liaoningPreview.sampleUnexpectedKept || [] })));
    var highFeePreview = adapter.preview({ regionMode: 'none', provinces: [], budget: 'normal', feeType: 'rejectHigh', rejects: ['高收费'] });
    results.push(check('高收费排除预览可运行', !!(highFeePreview && highFeePreview.ok), JSON.stringify({ removed: highFeePreview && highFeePreview.removed, filteredPreview: highFeePreview && highFeePreview.filteredPreview })));
    var qualPreview = adapter.preview({ regionMode: 'hard', provinces: ['辽宁'], budget: 'normal', feeType: 'all', qualificationMode: 'exclude', rejects: ['资格计划'] });
    var qualIncludePreview = adapter.preview({ regionMode: 'hard', provinces: ['辽宁'], budget: 'normal', feeType: 'all', qualificationMode: 'include', rejects: ['查看资格计划'] });
    results.push(check('资格型计划默认排除预览可运行', !!(qualPreview && qualPreview.ok && qualPreview.removed && Object.prototype.hasOwnProperty.call(qualPreview.removed, 'qualification')), JSON.stringify({ removed: qualPreview && qualPreview.removed, filteredPreview: qualPreview && qualPreview.filteredPreview })));
    results.push(check('临时查看资格型计划不会少于默认过滤', !!(qualPreview && qualIncludePreview && Number(qualIncludePreview.filteredPreview || 0) >= Number(qualPreview.filteredPreview || 0)), JSON.stringify({ exclude: qualPreview && qualPreview.filteredPreview, include: qualIncludePreview && qualIncludePreview.filteredPreview })));
    var before = clone(family);
    window.LN_V3_STORE.setState({
      family: {
        regionMode: 'hard',
        provinces: ['辽宁'],
        budget: 'normal',
        feeType: 'rejectHigh',
        qualificationMode: 'exclude',
        rejects: ['高收费', '资格计划'],
        preview: liaoningPreview,
        summary: liaoningPreview.summary
      },
      compute: { basePool: liaoningPreview.basePool, filtered: liaoningPreview.filteredPreview, lastReason: 'debug-step-family-preview' },
      ui: { bigPool: liaoningPreview.bigPool, lastMessage: liaoningPreview.summary }
    }, 'debug-step-family:set');
    var afterSet = window.LN_V3_STORE.getState();
    results.push(check('family 写入 store', afterSet.family.regionMode === 'hard' && afterSet.family.provinces.indexOf('辽宁') !== -1, JSON.stringify(afterSet.family)));
    results.push(check('compute 记录底线预览', Number(afterSet.compute.basePool || 0) === Number(liaoningPreview.basePool || 0) && Number(afterSet.compute.filtered || 0) === Number(liaoningPreview.filteredPreview || 0), JSON.stringify(afterSet.compute)));
    window.LN_V3_STORE.setState({ family: before }, 'debug-step-family:restore');
    var restored = window.LN_V3_STORE.getState().family;
    results.push(check('Step2 自测状态回滚干净', JSON.stringify(restored) === JSON.stringify(before), JSON.stringify(restored)));

    var uiBefore = clone((window.LN_V3_STORE.getState() || {}).ui || {});
    if (window.LN_V3_ROUTER && window.LN_V3_STORE) {
      window.LN_V3_STORE.setActiveStep('family', 'debug-step-family:route-start');
      window.LN_V3_STORE.markComplete('rank', 'debug-step-family:rank-ready');
      window.LN_V3_STORE.markComplete('family', 'debug-step-family:family-complete');
      window.LN_V3_ROUTER.go('child', 'debug-step-family:save-next');
      var routed = window.LN_V3_STORE.getState();
      results.push(check('Step2 保存继续可进入 Step3', routed.ui.activeStep === 'child' && routed.ui.activeTab === 'child', JSON.stringify(routed.ui)));
      window.LN_V3_STORE.setState({ ui: uiBefore }, 'debug-step-family:route-restore');
    } else {
      results.push(check('Step2 保存继续可进入 Step3', false, 'router/store missing'));
    }
    return results;
  }
  window.LN_V3_DEBUG_STEP_FAMILY = { run: run };
})();
