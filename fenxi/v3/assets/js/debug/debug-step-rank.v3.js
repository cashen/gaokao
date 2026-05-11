(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function run() {
    var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
    var rank = state.rank || {};
    return [
      check('Step1 渲染模块存在', !!window.LN_V3_STEP_RANK),
      check('legacy-data-adapter 存在', !!window.LN_V3_LEGACY_DATA),
      check('loadForRankOrScore 方法存在', !!(window.LN_V3_LEGACY_DATA && window.LN_V3_LEGACY_DATA.loadForRankOrScore)),
      check('rank 状态字段完整', Object.prototype.hasOwnProperty.call(rank, 'loadedRows') && Array.isArray(rank.chunkIds) && Array.isArray(rank.sample), JSON.stringify(rank)),
      check('compute.waitDataMs 字段存在', !!(state.compute && Object.prototype.hasOwnProperty.call(state.compute, 'waitDataMs')), JSON.stringify(state.compute || {}))
    ];
  }
  function runAsync() {
    var before = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : null;
    var results = run();
    if (!window.LN_V3_LEGACY_DATA || !window.LN_V3_LEGACY_DATA.loadForRankOrScore || !window.LN_V3_STORE) {
      return Promise.resolve(results.concat([check('Step1 数据加载自测可运行', false, 'adapter/store missing')]));
    }
    var started = performance.now();
    return window.LN_V3_LEGACY_DATA.loadForRankOrScore({ rank: '56548', score: '500' }).then(function (res) {
      window.LN_V3_STORE.setState({
        rank: {
          rank: String(res.rank || 56548),
          score: '500',
          mode: 'rank',
          loadedRows: res.loadedRows || 0,
          chunkIds: res.chunkIds || [],
          chunkCount: res.chunkCount || 0,
          loadMs: res.ms || 0,
          loadedAt: new Date().toISOString(),
          rankSource: res.resolvedRankSource || '',
          sample: res.sample || []
        },
        compute: { waitDataMs: res.ms || 0, lastReason: 'debug-step-rank-load' },
        ui: { dataWaiting: false, loading: false, lastMessage: 'Step1 debug 数据加载完成。' }
      }, 'debug-step-rank:loaded');
      results.push(check('Step1 数据加载成功', !!res.ok, JSON.stringify({ loadedRows: res.loadedRows, chunkIds: res.chunkIds, ms: res.ms })));
      results.push(check('loadedRows 大于 0', Number(res.loadedRows || 0) > 0, 'loadedRows=' + res.loadedRows));
      results.push(check('chunkIds 已生成', Array.isArray(res.chunkIds) && res.chunkIds.length > 0, JSON.stringify(res.chunkIds || [])));
      results.push(check('位次附近样例已生成', Array.isArray(res.sample) && res.sample.length > 0, JSON.stringify((res.sample || []).slice(0, 2))));
      results.push(check('waitDataMs 已记录', Number(res.ms || 0) >= 0, 'ms=' + res.ms));
      return results;
    }).catch(function (err) {
      results.push(check('Step1 数据加载成功', false, err && err.message ? err.message : String(err)));
      return results;
    }).then(function (items) {
      if (before) {
        window.LN_V3_STORE.setState({ rank: before.rank, compute: before.compute, ui: before.ui }, 'debug-step-rank:restore');
        var after = window.LN_V3_STORE.getState();
        items.push(check('Step1 自测状态回滚干净', JSON.stringify(after.rank) === JSON.stringify(before.rank), JSON.stringify(after.rank)));
      }
      items.push(check('Step1 自测总耗时已记录', Math.round(performance.now() - started) >= 0, Math.round(performance.now() - started) + 'ms'));
      return items;
    });
  }
  window.LN_V3_DEBUG_STEP_RANK = { run: run, runAsync: runAsync };
})();
