(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function line(item, index) { return (item.ok ? 'PASS' : 'FAIL') + ' ' + String(index + 1).padStart(2, '0') + '｜' + item.name + (item.detail ? '｜' + item.detail : ''); }
  function summarize(results) {
    var pass = results.filter(function (item) { return item.ok; }).length;
    var fail = results.length - pass;
    return { total: results.length, pass: pass, fail: fail };
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function trace(action, detail) {
    if (window.LN_V3_DEBUG_RUNTIME && window.LN_V3_DEBUG_RUNTIME.addTrace) window.LN_V3_DEBUG_RUNTIME.addTrace(action, detail || '');
  }
  function quick() {
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    return [
      check('版本号正确', snap.version && snap.version.indexOf('V3.0.0.alpha4') !== -1, snap.version),
      check('版本戳正确', !!window.LN_V3_VERSION && snap.stamp === window.LN_V3_VERSION.stamp, snap.stamp),
      check('访问码状态 PASS', snap.accessPassed, String(snap.accessPassed)),
      check('服务器会话已同步', !!(snap.serverSession && snap.serverSession.ok), JSON.stringify(snap.serverSession || {})),
      check('state-store 存在', !!window.LN_V3_STORE),
      check('router 存在', !!window.LN_V3_ROUTER),
      check('Tab 数量为 7', snap.tabs === 7, 'tabs=' + snap.tabs),
      check('向导步骤数量为 6', snap.progressSteps === 6, 'steps=' + snap.progressSteps),
      check('旧主页面未作为 v3 入口启动', !document.body.classList.contains('ln-fenxi-app'), document.body.className)
    ];
  }
  function full() {
    var results = quick();
    ['LN_V3_STEP_RANK','LN_V3_STEP_FAMILY','LN_V3_STEP_CHILD','LN_V3_STEP_SCENARIO','LN_V3_STEP_PLANS','LN_V3_STEP_CANDIDATES','LN_V3_STEP_EXPORT'].forEach(function (name) {
      results.push(check(name + ' 存在', !!window[name]));
    });
    if (window.LN_V3_DEBUG_STEP_RANK) results = results.concat(window.LN_V3_DEBUG_STEP_RANK.run());
    if (window.LN_V3_DEBUG_STEP_FAMILY) results = results.concat(window.LN_V3_DEBUG_STEP_FAMILY.run());
    results = results.concat(window.LN_V3_DEBUG_STEP_CHILD.run());
    return results;
  }
  function ensureServerSession() {
    if (window.LN_V3_ACCESS && window.LN_V3_ACCESS.ensureServerSession) return window.LN_V3_ACCESS.ensureServerSession();
    return Promise.resolve(false);
  }
  function resetForMainflow() {
    if (window.LN_V3_DEBUG_RUNTIME && window.LN_V3_DEBUG_RUNTIME.clearTrace) window.LN_V3_DEBUG_RUNTIME.clearTrace();
    trace('开始一键主流程自测', '56548 / 500 / 只看辽宁 / 电气能源');
    if (window.LN_V3_STORE && window.LN_V3_STORE.resetDraft) window.LN_V3_STORE.resetDraft();
    window.LN_V3_DATA_CACHE = null;
  }
  function mainflow() {
    var results = [];
    var started = performance.now();
    resetForMainflow();
    results = results.concat(quick());
    results.push(check('一键主流程参数固定', true, 'rank=56548 score=500 region=辽宁 group=electric_energy major=电气工程及其自动化'));

    if (!window.LN_V3_STORE || !window.LN_V3_LEGACY_DATA || !window.LN_V3_FAMILY_FILTER || !window.LN_V3_CHILD_INTEREST || !window.LN_V3_STEP_CHILD) {
      results.push(check('一键主流程依赖完整', false, 'store/data/family/child missing'));
      return Promise.resolve(results);
    }

    return ensureServerSession().then(function () {
      var session = window.LN_V3_ACCESS && window.LN_V3_ACCESS.getServerSession ? window.LN_V3_ACCESS.getServerSession() : {};
      trace('服务器会话检查', JSON.stringify(session || {}));
      results.push(check('服务器会话可用于读取数据', !!(session && session.ok), JSON.stringify(session || {})));
      trace('Step1 加载位次数据', 'rank=56548 score=500');
      return window.LN_V3_LEGACY_DATA.loadForRankOrScore({ rank: '56548', score: '500' });
    }).then(function (res) {
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
          rankSource: res.resolvedRankSource || '用户输入位次',
          sample: res.sample || []
        },
        ui: { activeStep: 'family', activeTab: 'family', completedSteps: ['rank'], dataWaiting: false, loading: false, lastMessage: '一键自测：Step1 数据加载完成。' },
        compute: { waitDataMs: res.ms || 0, lastReason: 'debug-mainflow-step1' }
      }, 'debug-mainflow:step1');
      trace('Step1 完成', 'loadedRows=' + res.loadedRows + ' chunks=' + JSON.stringify(res.chunkIds || []));
      results.push(check('Step1 数据加载成功', !!res.ok, JSON.stringify({ loadedRows: res.loadedRows, chunkIds: res.chunkIds, ms: res.ms })));
      results.push(check('Step1 loadedRows 大于 0', Number(res.loadedRows || 0) > 0, 'loadedRows=' + res.loadedRows));
      results.push(check('Step1 loadedRows 接近当前样本', Number(res.loadedRows || 0) >= 7000 && Number(res.loadedRows || 0) <= 9000, 'loadedRows=' + res.loadedRows + '；预期约 7934'));
      results.push(check('Step1 分块窗口正确', Array.isArray(res.chunkIds) && res.chunkIds.indexOf('rank_50000_80000') !== -1, JSON.stringify(res.chunkIds || [])));

      var family = { budget: 'normal', feeType: 'all', regionMode: 'hard', provinces: ['辽宁'], cityMode: 'none', cities: '', rejects: [] };
      trace('Step2 应用家庭底线', '只看辽宁');
      var preview = window.LN_V3_FAMILY_FILTER.preview(family);
      family.preview = preview;
      family.summary = preview && preview.summary ? preview.summary : '家庭底线已保存。';
      window.LN_V3_STORE.setState({
        family: family,
        compute: { basePool: preview ? preview.basePool : 0, filtered: preview ? preview.filteredPreview : 0, lastReason: 'debug-mainflow-step2-family' },
        ui: { activeStep: 'family', activeTab: 'family', completedSteps: ['rank'], bigPool: !!(preview && preview.bigPool), lastMessage: family.summary }
      }, 'debug-mainflow:step2');
      trace('Step2 预览完成', 'base=' + (preview && preview.basePool) + ' filtered=' + (preview && preview.filteredPreview) + ' unmatchedKept=' + (preview && preview.unmatchedKept));
      results.push(check('Step2 辽宁 hard 预览可运行', !!(preview && preview.ok), JSON.stringify(preview || {})));
      results.push(check('Step2 从 loadedRows 收窄', !!(preview && Number(preview.filteredPreview || 0) > 0 && Number(preview.filteredPreview || 0) < Number(preview.basePool || 0)), JSON.stringify({ basePool: preview && preview.basePool, filteredPreview: preview && preview.filteredPreview })));
      results.push(check('Step2 辽宁 hard filtered 接近当前样本', !!(preview && Number(preview.filteredPreview || 0) >= 1200 && Number(preview.filteredPreview || 0) <= 2200), 'filtered=' + (preview && preview.filteredPreview) + '；预期约 1597'));
      results.push(check('Step2 辽宁 hard 目标存在', !!(preview && preview.targetExists), JSON.stringify({ targetExists: preview && preview.targetExists })));
      results.push(check('Step2 辽宁 hard unmatchedKept=0', Number((preview && preview.unmatchedKept) || 0) === 0, JSON.stringify({ unmatchedKept: preview && preview.unmatchedKept, sampleUnexpectedKept: preview && preview.sampleUnexpectedKept })));

      window.LN_V3_STORE.markComplete('family', 'debug-mainflow:family-complete');
      var routed = false;
      if (window.LN_V3_ROUTER && window.LN_V3_ROUTER.go) routed = window.LN_V3_ROUTER.go('child', 'debug-mainflow:save-family-next');
      if (!routed) window.LN_V3_STORE.setActiveStep('child', 'debug-mainflow:force-child');
      var afterRoute = window.LN_V3_STORE.getState();
      trace('Step2 保存并继续', 'routed=' + routed + ' activeStep=' + ((afterRoute.ui || {}).activeStep || ''));
      results.push(check('Step2 保存后进入 Step3', afterRoute.ui.activeStep === 'child' && afterRoute.ui.activeTab === 'child', JSON.stringify(afterRoute.ui)));

      trace('Step3 选择兴趣方向', '电气能源与自动化 + 电气工程及其自动化');
      window.LN_V3_STORE.setState({ childPreference: { mode: 'unset', selectedGroups: [], selectedMajors: [], weights: {}, summary: '还没有选择专业方向。', manualOnly: false, preview: null } }, 'debug-mainflow:child-reset');
      window.LN_V3_STEP_CHILD._test.toggleGroup('electric_energy');
      window.LN_V3_STEP_CHILD._test.toggleMajor('electric_energy', '电气工程及其自动化');
      var childState = window.LN_V3_STORE.getState().childPreference || {};
      var childPreview = childState.preview || {};
      trace('Step3 兴趣预览完成', 'familyRows=' + childPreview.familyFilteredRows + ' matched=' + childPreview.matchedRows + ' effective=' + childPreview.effectiveFilteredRows);
      results.push(check('Step3 selectedGroups 写入', (childState.selectedGroups || []).some(function (item) { return item.id === 'electric_energy'; }), JSON.stringify(childState.selectedGroups || [])));
      results.push(check('Step3 selectedMajors 写入', (childState.selectedMajors || []).some(function (item) { return item.name === '电气工程及其自动化'; }), JSON.stringify(childState.selectedMajors || [])));
      results.push(check('Step3 兴趣命中预览已生成', !!childPreview.reason, JSON.stringify({ reason: childPreview.reason, familyFilteredRows: childPreview.familyFilteredRows, matchedRows: childPreview.matchedRows, effectiveFilteredRows: childPreview.effectiveFilteredRows })));
      results.push(check('Step3 可读取当前底线池', Number(childPreview.familyFilteredRows || 0) === Number((preview && preview.filteredPreview) || 0), JSON.stringify({ familyFilteredRows: childPreview.familyFilteredRows, expected: preview && preview.filteredPreview })));
      results.push(check('Step3 电气能源方向有命中', Number(childPreview.matchedRows || 0) > 0, JSON.stringify({ matchedRows: childPreview.matchedRows, sampleMatched: childPreview.sampleMatched || [] })));
      results.push(check('Step3 默认不硬排除', Number(childPreview.effectiveFilteredRows || 0) === Number(childPreview.familyFilteredRows || 0), JSON.stringify({ effectiveFilteredRows: childPreview.effectiveFilteredRows, familyFilteredRows: childPreview.familyFilteredRows })));

      trace('Step3 开启真实命中', 'manualOnly=true');
      window.LN_V3_STEP_CHILD._test.toggleManualOnly();
      var manualChild = window.LN_V3_STORE.getState().childPreference || {};
      var manual = manualChild.preview || {};
      trace('Step3 真实命中完成', 'manualOnly=' + manual.manualOnly + ' matched=' + manual.matchedRows + ' effective=' + manual.effectiveFilteredRows);
      results.push(check('manualOnly 已开启', manual.manualOnly === true, JSON.stringify(manual)));
      results.push(check('真实命中模式收窄到 matchedRows', Number(manual.effectiveFilteredRows || 0) === Number(manual.matchedRows || 0), JSON.stringify({ effectiveFilteredRows: manual.effectiveFilteredRows, matchedRows: manual.matchedRows })));
      results.push(check('真实命中后候选少于底线池', Number(manual.effectiveFilteredRows || 0) < Number(manual.familyFilteredRows || 0), JSON.stringify({ effectiveFilteredRows: manual.effectiveFilteredRows, familyFilteredRows: manual.familyFilteredRows })));

      var finalState = window.LN_V3_STORE.getState();
      results.push(check('主流程最终停在 Step3', finalState.ui.activeStep === 'child', JSON.stringify(finalState.ui)));
      results.push(check('主流程总耗时已记录', Math.round(performance.now() - started) >= 0, Math.round(performance.now() - started) + 'ms'));
      trace('一键主流程自测结束', 'fail=' + (results.filter(function (item) { return !item.ok; }).length));
      return results;
    }).catch(function (err) {
      trace('一键主流程异常', err && err.message ? err.message : String(err));
      results.push(check('一键主流程执行无异常', false, err && err.message ? err.message : String(err)));
      return results;
    });
  }
  function format(type, started, results) {
    var sum = summarize(results);
    var elapsed = Math.round(performance.now() - started);
    var traceLines = (window.LN_V3_DEBUG_RUNTIME && window.LN_V3_DEBUG_RUNTIME.getTrace ? window.LN_V3_DEBUG_RUNTIME.getTrace() : []).map(function (item, index) {
      return String(index + 1).padStart(2, '0') + '｜' + item.time + '｜' + item.action + (item.detail ? '｜' + item.detail : '');
    });
    var header = [
      '【辽宁物理类工具 V3 Debug Report】',
      '读取时间：' + new Date().toLocaleString(),
      '模式：' + type,
      '版本：' + window.LN_V3_VERSION.name,
      '版本戳：' + window.LN_V3_VERSION.stamp,
      '总步骤：' + sum.total + '；通过：' + sum.pass + '；失败：' + sum.fail,
      '耗时：' + elapsed + 'ms',
      ''
    ].join('\n');
    var traceBlock = traceLines.length ? '\n\n【操作轨迹】\n' + traceLines.join('\n') : '';
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    var stateBlock = type === 'mainflow' ? '\n\n【主流程最终状态】\n数据状态：' + JSON.stringify(snap.dataStatus || {}) + '\nStore：' + JSON.stringify(snap.state || {}) : '';
    return { results: results, summary: sum, text: header + results.map(line).join('\n') + traceBlock + stateBlock };
  }
  window.LN_V3_DEBUG_SELFTEST = {
    run: function (type) {
      var started = performance.now();
      if (type === 'rank') {
        return window.LN_V3_DEBUG_STEP_RANK.runAsync().then(function (results) { return format(type, started, results); });
      }
      if (type === 'mainflow') {
        return mainflow().then(function (results) { return format(type, started, results); });
      }
      var results = type === 'family' && window.LN_V3_DEBUG_STEP_FAMILY ? window.LN_V3_DEBUG_STEP_FAMILY.run() : (type === 'child' ? window.LN_V3_DEBUG_STEP_CHILD.run() : (type === 'full' ? full() : quick()));
      return format(type, started, results);
    }
  };
})();
