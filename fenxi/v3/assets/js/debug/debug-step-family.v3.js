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
      check('family 状态字段完整', Array.isArray(family.provinces) && Array.isArray(family.rejects) && Object.prototype.hasOwnProperty.call(family, 'preview'), JSON.stringify(family)),
      check('compute.basePool/filtered 字段存在', !!(state.compute && Object.prototype.hasOwnProperty.call(state.compute, 'basePool') && Object.prototype.hasOwnProperty.call(state.compute, 'filtered')), JSON.stringify(state.compute || {}))
    ];
    if (!adapter) return results;
    var records = adapter.getRecords ? adapter.getRecords() : [];
    results.push(check('Step2 可读取 Step1 已加载记录', Array.isArray(records), 'records=' + (records ? records.length : 0)));
    if (!records.length) {
      results.push(check('Step2 预览等待 Step1 数据', true, '当前没有 loadedRows，不做 hard 辽宁强校验'));
      return results;
    }
    var liaoningPreview = adapter.preview({ regionMode: 'hard', provinces: ['辽宁'], budget: 'normal', feeType: 'all', rejects: [] });
    results.push(check('辽宁 hard 预览可运行', !!(liaoningPreview && liaoningPreview.ok), JSON.stringify(liaoningPreview || {})));
    results.push(check('辽宁 hard 目标存在', !!liaoningPreview.targetExists, JSON.stringify({ targetExists: liaoningPreview.targetExists, basePool: liaoningPreview.basePool, filteredPreview: liaoningPreview.filteredPreview })));
    results.push(check('辽宁 hard unmatchedKept=0', Number(liaoningPreview.unmatchedKept || 0) === 0, JSON.stringify({ unmatchedKept: liaoningPreview.unmatchedKept, sampleUnexpectedKept: liaoningPreview.sampleUnexpectedKept || [] })));
    var highFeePreview = adapter.preview({ regionMode: 'none', provinces: [], budget: 'normal', feeType: 'rejectHigh', rejects: ['高收费'] });
    results.push(check('高收费排除预览可运行', !!(highFeePreview && highFeePreview.ok), JSON.stringify({ removed: highFeePreview && highFeePreview.removed, filteredPreview: highFeePreview && highFeePreview.filteredPreview })));
    var before = clone(family);
    window.LN_V3_STORE.setState({
      family: {
        regionMode: 'hard',
        provinces: ['辽宁'],
        budget: 'normal',
        feeType: 'rejectHigh',
        rejects: ['高收费'],
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
    return results;
  }
  window.LN_V3_DEBUG_STEP_FAMILY = { run: run };
})();
