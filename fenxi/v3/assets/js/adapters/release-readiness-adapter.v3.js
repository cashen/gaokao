(function () {
  'use strict';

  var STAGE = 'rc1fix1-input-consistency-guard';
  var REQUIRED = [
    'versionStamp',
    'inputConsistency',
    'accessGate',
    'stepModules',
    'dataLoading',
    'familyPathMatrix',
    'regressionSamples',
    'plans',
    'candidates',
    'evidence',
    'reportModes',
    'legacyGuard',
    'debugOneclick'
  ];

  function staticPlan() {
    return {
      stage: STAGE,
      goal: '在 RC1 受控试用候选基础上增加分数/位次一致性护栏：冲突输入不得继续推荐，分数段、候选池、报告必须统一 effectiveInput。',
      decision: '可作为 /fenxi/v3/ 受控试用入口；不可替换旧 /fenxi/ 主入口。',
      required: REQUIRED.slice(),
      mustStayOff: ['replaceLegacyCompute', 'overwriteFenxiIndex', 'silentOldLogic'],
      safety: [
        'rc1.fix2 修复 /debug、debug.htm、index.htm 等入口别名仍引用旧版本的问题，并保留输入一致性护栏，不改变家庭路径、A/B/C、候选生成、证据等级和导出报告。',
        '旧版正式 compute 仍保持只读/预备对比，不允许替换 V3 当前候选结果。',
        'V3 可继续放在 /fenxi/v3/ 做受控体验，不覆盖旧 /fenxi/index.html。'
      ]
    };
  }

  function has(fn) { return typeof fn === 'function'; }
  function getState() { return window.LN_V3_STORE && window.LN_V3_STORE.getState ? window.LN_V3_STORE.getState() : {}; }

  function evaluate(state) {
    var s = state || getState();
    var version = window.LN_V3_VERSION || {};
    var legacyBridge = window.LN_V3_LEGACY_COMPUTE && window.LN_V3_LEGACY_COMPUTE.getBridgeStatus ? window.LN_V3_LEGACY_COMPUTE.getBridgeStatus() : {};
    var regression = window.LN_V3_REGRESSION_SAMPLES && window.LN_V3_REGRESSION_SAMPLES.run ? window.LN_V3_REGRESSION_SAMPLES.run() : null;
    var reportPlan = window.LN_V3_REPORT_EXPORT && window.LN_V3_REPORT_EXPORT.staticPlan ? window.LN_V3_REPORT_EXPORT.staticPlan() : {};
    var evidencePlan = window.LN_V3_EVIDENCE_ADAPTER && window.LN_V3_EVIDENCE_ADAPTER.staticPlan ? window.LN_V3_EVIDENCE_ADAPTER.staticPlan() : {};
    var scenarioMatrix = window.LN_V3_SCENARIO_ADAPTER && window.LN_V3_SCENARIO_ADAPTER.matrix ? window.LN_V3_SCENARIO_ADAPTER.matrix() : [];
    var planMatrix = window.LN_V3_PLANS_ADAPTER && window.LN_V3_PLANS_ADAPTER.matrix ? window.LN_V3_PLANS_ADAPTER.matrix() : [];
    var completed = (s.ui && s.ui.completedSteps) || [];

    var checks = [
      { id: 'versionStamp', name: '版本戳已升级到 rc1.fix1', ok: version.stamp === 'v300rc1fix2-20260512', detail: version.stamp || '' },
      { id: 'inputConsistency', name: '分数/位次一致性护栏存在', ok: !!(window.LN_V3_LEGACY_DATA && window.LN_V3_LEGACY_DATA.checkRankScoreConsistency && window.LN_V3_SCORE_BAND_STRATEGY), detail: 'checkRankScoreConsistency + effectiveInput' },
      { id: 'accessGate', name: '访问码仍启用 ln2026', ok: version.accessCode === 'ln2026' && !!version.accessKey, detail: version.accessKey || '' },
      { id: 'stepModules', name: '七个页面模块存在', ok: ['LN_V3_STEP_RANK','LN_V3_STEP_FAMILY','LN_V3_STEP_CHILD','LN_V3_STEP_SCENARIO','LN_V3_STEP_PLANS','LN_V3_STEP_CANDIDATES','LN_V3_STEP_EXPORT'].every(function (name) { return !!window[name]; }), detail: 'rank/family/child/scenario/plans/candidates/export' },
      { id: 'dataLoading', name: '数据加载适配器存在', ok: !!(window.LN_V3_LEGACY_DATA && has(window.LN_V3_LEGACY_DATA.loadForRankOrScore)), detail: 'legacy-data-adapter' },
      { id: 'familyPathMatrix', name: '家庭路径矩阵不少于 8 条', ok: scenarioMatrix.length >= 8, detail: 'count=' + scenarioMatrix.length },
      { id: 'regressionSamples', name: '多路径真实样本回归通过', ok: !!(regression && regression.ok && regression.total >= 10), detail: regression ? ('pass=' + regression.pass + '/' + regression.total) : 'missing' },
      { id: 'plans', name: 'A/B/C 方案矩阵存在', ok: planMatrix.length >= 3, detail: 'count=' + planMatrix.length },
      { id: 'candidates', name: '详细候选与比较能力存在', ok: !!(window.LN_V3_CANDIDATES_ADAPTER && window.LN_V3_CANDIDATE_COMPARE), detail: 'candidates + compare' },
      { id: 'evidence', name: '证据等级四桶存在', ok: !!(evidencePlan.buckets && evidencePlan.buckets.indexOf('missing_data') !== -1 && evidencePlan.buckets.indexOf('needs_review') !== -1), detail: JSON.stringify(evidencePlan.buckets || []) },
      { id: 'reportModes', name: '导出报告双模式存在', ok: !!(reportPlan.modes && reportPlan.modes.indexOf('compact') !== -1 && reportPlan.modes.indexOf('full') !== -1), detail: JSON.stringify(reportPlan.modes || []) },
      { id: 'legacyGuard', name: '旧 compute 替换护栏关闭', ok: !!(legacyBridge && legacyBridge.replacementAllowed === false && legacyBridge.previewOnly === true), detail: JSON.stringify({ replacementAllowed: legacyBridge.replacementAllowed, previewOnly: legacyBridge.previewOnly, mode: legacyBridge.mode }) },
      { id: 'debugOneclick', name: '一键总检仍作为反馈入口', ok: !!(window.LN_V3_DEBUG_SELFTEST && has(window.LN_V3_DEBUG_SELFTEST.run)), detail: 'debug-selftest' }
    ];

    var pass = checks.filter(function (item) { return item.ok; }).length;
    var fail = checks.length - pass;
    var exportComplete = ['rank','family','child','scenario','plans','candidates','export'].every(function (id) { return completed.indexOf(id) !== -1; });
    return {
      ok: fail === 0,
      stage: STAGE,
      decision: fail === 0 ? '可作为 /fenxi/v3/ 受控试用入口；仍不建议替换旧 /fenxi/ 主入口。' : '发布候选检查未通过，继续保持测试入口。',
      pass: pass,
      fail: fail,
      total: checks.length,
      exportComplete: exportComplete,
      checks: checks,
      guard: {
        canReplaceOldFenxi: false,
        canOpenControlledTrial: fail === 0,
        legacyReplacementAllowed: false,
        reason: '当前仍是 V3 独立试用线，旧 compute 只做双轨对比，不替换当前结果。'
      }
    };
  }

  window.LN_V3_RELEASE_READINESS = {
    staticPlan: staticPlan,
    evaluate: evaluate
  };
})();
