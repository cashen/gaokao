(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function line(item, index) { return (item.ok ? 'PASS' : 'FAIL') + ' ' + String(index + 1).padStart(2, '0') + '｜' + item.name + (item.detail ? '｜' + item.detail : ''); }
  function summarize(results) {
    var pass = results.filter(function (item) { return item.ok; }).length;
    var fail = results.length - pass;
    return { total: results.length, pass: pass, fail: fail };
  }
  function trace(action, detail) {
    if (window.LN_V3_DEBUG_RUNTIME && window.LN_V3_DEBUG_RUNTIME.addTrace) window.LN_V3_DEBUG_RUNTIME.addTrace(action, detail || '');
  }
  function quick() {
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    return [
      check('版本号正确', snap.version && snap.version.indexOf('V3.0.0.beta6') !== -1, snap.version),
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
    if (window.LN_V3_DEBUG_STEP_CHILD) results = results.concat(window.LN_V3_DEBUG_STEP_CHILD.run());
    if (window.LN_V3_DEBUG_STEP_SCENARIO) results = results.concat(window.LN_V3_DEBUG_STEP_SCENARIO.run());
    return results;
  }
  function ensureServerSession() {
    if (window.LN_V3_ACCESS && window.LN_V3_ACCESS.ensureServerSession) return window.LN_V3_ACCESS.ensureServerSession();
    return Promise.resolve(false);
  }
  function resetForMainflow() {
    if (window.LN_V3_DEBUG_RUNTIME && window.LN_V3_DEBUG_RUNTIME.clearTrace) window.LN_V3_DEBUG_RUNTIME.clearTrace();
    trace('开始一键主流程自测', '56548 / 500 / 只看辽宁 / 电气能源 / 家庭路径推荐');
    if (window.LN_V3_STORE && window.LN_V3_STORE.resetDraft) window.LN_V3_STORE.resetDraft();
    window.LN_V3_DATA_CACHE = null;
  }
  function runScenarioMatrix(results) {
    if (!window.LN_V3_SCENARIO_ADAPTER || !window.LN_V3_SCENARIO_ADAPTER.matrix) {
      results.push(check('Step4 家庭路径矩阵依赖存在', false, 'scenario adapter missing'));
      return results;
    }
    var matrix = window.LN_V3_SCENARIO_ADAPTER.matrix();
    results.push(check('Step4 家庭路径矩阵覆盖路径数', matrix.length >= 5, 'count=' + matrix.length));
    matrix.forEach(function (item) {
      results.push(check('Step4 家庭路径矩阵：' + item.name, item.preview && item.preview.recommended === item.expected, JSON.stringify({ expected: item.expected, recommended: item.preview && item.preview.recommended, scores: item.preview && item.preview.scores })));
    });
    return results;
  }

  function pathmatrix() {
    var results = quick();
    results.push(check('分数段策略适配器存在', !!window.LN_V3_SCORE_BAND_STRATEGY));
    results.push(check('地域偏好适配器存在', !!window.LN_V3_REGION_PREFERENCE));
    results.push(check('决策上下文适配器存在', !!window.LN_V3_DECISION_CONTEXT));
    results.push(check('学生画像适配器存在', !!window.LN_V3_STUDENT_PROFILE));
    results.push(check('专业画像适配器存在', !!window.LN_V3_MAJOR_PROFILE));
    results.push(check('方案包适配器存在', !!window.LN_V3_PLANS_ADAPTER));
    results.push(check('详细候选适配器存在', !!window.LN_V3_CANDIDATES_ADAPTER));
    results.push(check('候选比较适配器存在', !!window.LN_V3_CANDIDATE_COMPARE));
    results.push(check('旧版正式计算预备适配器存在', !!window.LN_V3_LEGACY_COMPUTE));
    results.push(check('反事实比较适配器存在', !!window.LN_V3_COUNTERFACTUAL_ADAPTER || !window.LN_V3_REVIEW_CHECKLIST));
    results.push(check('家庭讨论报告适配器存在', !!window.LN_V3_REPORT_EXPORT));
    results.push(check('复核清单适配器存在', !!window.LN_V3_REVIEW_CHECKLIST));
    results.push(check('进度闭环方法存在', !!(window.LN_V3_STORE && window.LN_V3_STORE.markCompleteThrough && window.LN_V3_STORE.isCompleteThrough)));
    results.push(check('家长端决策摘要渲染方法存在', !!(window.LN_V3_WIZARD && window.LN_V3_WIZARD.renderDecisionRibbon)));
    results.push(check('家长端复核清单渲染方法存在', !!(window.LN_V3_WIZARD && window.LN_V3_WIZARD.renderReviewChecklist)));
    results.push(check('页面体验适配器存在', !!window.LN_V3_PAGE_EXPERIENCE));
    if (window.LN_V3_PAGE_EXPERIENCE && window.LN_V3_PAGE_EXPERIENCE.staticPlan) {
      var xp = window.LN_V3_PAGE_EXPERIENCE.staticPlan();
      results.push(check('真实页面体验策略已收口', !!(xp.autoScrollAfterRoute && xp.stepFocusNote && xp.mobileStickyAction), JSON.stringify(xp)));
      results.push(check('移动端折叠与底部安全区策略存在', !!(xp.mobileReviewCollapsed && xp.bottomTabSafeArea), JSON.stringify(xp)));
      results.push(check('复制按钮反馈策略存在', !!xp.copyButtonFeedback, JSON.stringify(xp)));
    }
    if (window.LN_V3_CANDIDATE_COMPARE) {
      var cmpPlan = window.LN_V3_CANDIDATE_COMPARE.staticPlan ? window.LN_V3_CANDIDATE_COMPARE.staticPlan() : {};
      results.push(check('候选比较筛选/排序策略存在', !!(cmpPlan.filterPlans && cmpPlan.filterPlans.indexOf('shortlist') !== -1 && cmpPlan.sortBy && cmpPlan.sortBy.indexOf('rank_near') !== -1), JSON.stringify(cmpPlan)));
    }
    if (window.LN_V3_LEGACY_COMPUTE) {
      var legacyPlan = window.LN_V3_LEGACY_COMPUTE.staticPlan ? window.LN_V3_LEGACY_COMPUTE.staticPlan() : {};
      var bridge = window.LN_V3_LEGACY_COMPUTE.getBridgeStatus ? window.LN_V3_LEGACY_COMPUTE.getBridgeStatus() : {};
      results.push(check('旧版计算接入预备策略存在', !!(legacyPlan.stage === 'beta6-preflight' && legacyPlan.safety && legacyPlan.safety.length), JSON.stringify(legacyPlan)));
      results.push(check('旧版计算桥接默认不替换 V3 主链路', !!(bridge && bridge.active === false && bridge.previewOnly === true && bridge.replacementAllowed === false), JSON.stringify(bridge)));
    }
    if (window.LN_V3_REVIEW_CHECKLIST) {
      var reviewPreview = window.LN_V3_REVIEW_CHECKLIST.generate({ rank: { loadedRows: 7934 }, family: { regionMode: 'hard', provinces: ['辽宁'], rejects: [], feeType: 'all' }, childPreference: { manualOnly: true, preview: { majorProfile: { misreadRules: [{ tag: '名称复核', message: '自动化不等同于纯电气。' }] } } }, studentProfile: window.LN_V3_STUDENT_PROFILE ? window.LN_V3_STUDENT_PROFILE.normalized({ source: 'parent_observe', learning: 'science', load: 'sensitive', path: 'work_first', understanding: 'hot_words' }) : {}, candidates: { list: [] }, counterfactual: { cards: [{ id: 'manual-only-off' }] }, shortlist: { items: [] } });
      results.push(check('复核清单可生成家庭可执行任务', reviewPreview.count >= 4 && reviewPreview.tasks.some(function (t) { return /学费|高收费|中外合作/.test(t.title + t.detail); }), JSON.stringify({ count: reviewPreview.count, urgent: reviewPreview.urgentCount, sample: reviewPreview.tasks.slice(0, 3) })));
    }
    runScenarioMatrix(results);
    if (window.LN_V3_SCENARIO_ADAPTER && window.LN_V3_SCENARIO_ADAPTER.matrix) {
      var antiRegressionMatrix = window.LN_V3_SCENARIO_ADAPTER.matrix();
      results.push(check('Step4 不是旧简化场景矩阵', antiRegressionMatrix.length >= 8 && antiRegressionMatrix.some(function (m) { return String(m.expected || '').indexOf('province_public') !== -1 || String(m.name || '').indexOf('650+') !== -1; }), 'matrixCount=' + antiRegressionMatrix.length));
    }
    if (window.LN_V3_SCENARIO_ADAPTER && window.LN_V3_SCENARIO_ADAPTER.matrix) {
      var matrix = window.LN_V3_SCENARIO_ADAPTER.matrix();
      var highElectric = matrix.find(function (m) { return m.name.indexOf('650+') !== -1; });
      var lowElectric = matrix.find(function (m) { return m.name.indexOf('470') !== -1; });
      var softRegion = matrix.find(function (m) { return m.name.indexOf('东北 soft') !== -1; });
      results.push(check('高分电气不误推单一电网路径', !!(highElectric && highElectric.preview && highElectric.preview.recommended !== 'grid'), JSON.stringify(highElectric && { recommended: highElectric.preview.recommended, scoreBand: highElectric.preview.scoreBand && highElectric.preview.scoreBand.id, reasons: highElectric.preview.reasons })));
      results.push(check('低分电气优先保底/成本，不被兴趣带偏', !!(lowElectric && lowElectric.preview && (lowElectric.preview.recommended === 'guarantee' || lowElectric.preview.recommended === 'cost_risk')), JSON.stringify(lowElectric && { recommended: lowElectric.preview.recommended, scoreBand: lowElectric.preview.scoreBand && lowElectric.preview.scoreBand.id, reasons: lowElectric.preview.reasons })));
      results.push(check('地域 soft 表达为偏好而非放弃', !!(softRegion && softRegion.preview && softRegion.preview.regionPreference && softRegion.preview.regionPreference.level === 'preference'), JSON.stringify(softRegion && softRegion.preview && softRegion.preview.regionPreference || {})));
    }
    if (window.LN_V3_STUDENT_PROFILE) {
      var profile = window.LN_V3_STUDENT_PROFILE.normalized({ source: 'parent_observe', learning: 'science', load: 'sensitive', path: 'work_first', understanding: 'hot_words' });
      results.push(check('学生画像只调整提醒不硬筛', profile.hardExclude === false && (profile.reviewTags || []).indexOf('learning_load') !== -1, JSON.stringify(profile)));
    }
    if (window.LN_V3_MAJOR_PROFILE) {
      var rules = window.LN_V3_MAJOR_PROFILE.matchRules('大数据管理与应用');
      results.push(check('专业画像覆盖大数据易混提醒', rules && rules.length > 0 && rules[0].message.indexOf('不等同于计算机') !== -1, JSON.stringify(rules)));
    }
    if (window.LN_V3_PLANS_ADAPTER && window.LN_V3_PLANS_ADAPTER.matrix) {
      var planMatrix = window.LN_V3_PLANS_ADAPTER.matrix();
      results.push(check('Step5 A/B/C 方案矩阵覆盖路径数', planMatrix.length >= 3, 'count=' + planMatrix.length));
      planMatrix.forEach(function (item) {
        results.push(check('Step5 方案矩阵：' + item.name, !!item.ok, JSON.stringify({ titles: item.titles, expectA: item.expectA, expectB: item.expectB })));
      });
    }
    return results;
  }

  function mainflow() {
    var results = [];
    var started = performance.now();
    resetForMainflow();
    results = results.concat(quick());
    results.push(check('一键主流程参数固定', true, 'rank=56548 score=500 region=辽宁 group=electric_energy major=电气工程及其自动化 path=auto profile=hot_words'));

    if (!window.LN_V3_STORE || !window.LN_V3_LEGACY_DATA || !window.LN_V3_FAMILY_FILTER || !window.LN_V3_CHILD_INTEREST || !window.LN_V3_STEP_CHILD || !window.LN_V3_SCENARIO_ADAPTER || !window.LN_V3_STEP_SCENARIO || !window.LN_V3_PLANS_ADAPTER || !window.LN_V3_CANDIDATES_ADAPTER || !window.LN_V3_COUNTERFACTUAL_ADAPTER || !window.LN_V3_REVIEW_CHECKLIST) {
      results.push(check('一键主流程依赖完整', false, 'store/data/family/child/scenario/plans/candidates/counterfactual/review/report missing'));
      return Promise.resolve(results);
    }
    runScenarioMatrix(results);

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
      var testProfile = window.LN_V3_STUDENT_PROFILE ? window.LN_V3_STUDENT_PROFILE.normalized({ source: 'parent_observe', learning: 'science', load: 'sensitive', path: 'work_first', understanding: 'hot_words' }) : {};
      window.LN_V3_STORE.setState({ studentProfile: testProfile, childPreference: { mode: 'unset', selectedGroups: [], selectedMajors: [], weights: {}, summary: '还没有选择专业方向。', manualOnly: false, preview: null } }, 'debug-mainflow:child-reset');
      results.push(check('Step3 学生画像写入且不硬筛', !testProfile.hardExclude && (testProfile.reviewTags || []).indexOf('learning_load') !== -1, JSON.stringify(testProfile)));
      trace('Step3 学生画像写入', JSON.stringify({ tags: testProfile.tags, reviewTags: testProfile.reviewTags }));
      window.LN_V3_STEP_CHILD._test.toggleGroup('electric_energy');
      window.LN_V3_STEP_CHILD._test.toggleMajor('electric_energy', '电气工程及其自动化');
      var childState = window.LN_V3_STORE.getState().childPreference || {};
      var childPreview = childState.preview || {};
      trace('Step3 兴趣预览完成', 'familyRows=' + childPreview.familyFilteredRows + ' matched=' + childPreview.matchedRows + ' effective=' + childPreview.effectiveFilteredRows);
      results.push(check('Step3 selectedGroups 写入', (childState.selectedGroups || []).some(function (item) { return item.id === 'electric_energy'; }), JSON.stringify(childState.selectedGroups || [])));
      results.push(check('Step3 selectedMajors 写入', (childState.selectedMajors || []).some(function (item) { return item.name === '电气工程及其自动化'; }), JSON.stringify(childState.selectedMajors || [])));
      results.push(check('Step3 兴趣命中预览已生成', !!childPreview.reason, JSON.stringify({ reason: childPreview.reason, familyFilteredRows: childPreview.familyFilteredRows, matchedRows: childPreview.matchedRows, effectiveFilteredRows: childPreview.effectiveFilteredRows })));
      results.push(check('Step3 专业画像已进入预览', !!(childPreview.majorProfile && childPreview.majorProfile.hardExclude === false), JSON.stringify(childPreview.majorProfile || {})));
      results.push(check('Step3 画像提醒不改变候选池', Number(childPreview.effectiveFilteredRows || 0) === Number(childPreview.familyFilteredRows || 0), JSON.stringify({ effectiveFilteredRows: childPreview.effectiveFilteredRows, familyFilteredRows: childPreview.familyFilteredRows }))); 
      results.push(check('Step3 可读取当前底线池', Number(childPreview.familyFilteredRows || 0) === Number((preview && preview.filteredPreview) || 0), JSON.stringify({ familyFilteredRows: childPreview.familyFilteredRows, expected: preview && preview.filteredPreview })));
      results.push(check('Step3 电气能源方向有命中', Number(childPreview.matchedRows || 0) > 0, JSON.stringify({ matchedRows: childPreview.matchedRows, sampleMatched: childPreview.sampleMatched || [] })));
      results.push(check('Step3 默认不硬排除', Number(childPreview.effectiveFilteredRows || 0) === Number(childPreview.familyFilteredRows || 0), JSON.stringify({ effectiveFilteredRows: childPreview.effectiveFilteredRows, familyFilteredRows: childPreview.familyFilteredRows })));
      if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('child', 'debug-mainflow:child-complete-through');

      trace('Step3 开启真实命中', 'manualOnly=true');
      window.LN_V3_STEP_CHILD._test.toggleManualOnly();
      var manualChild = window.LN_V3_STORE.getState().childPreference || {};
      var manual = manualChild.preview || {};
      trace('Step3 真实命中完成', 'manualOnly=' + manual.manualOnly + ' matched=' + manual.matchedRows + ' effective=' + manual.effectiveFilteredRows);
      results.push(check('manualOnly 已开启', manual.manualOnly === true, JSON.stringify(manual)));
      results.push(check('真实命中模式收窄到 matchedRows', Number(manual.effectiveFilteredRows || 0) === Number(manual.matchedRows || 0), JSON.stringify({ effectiveFilteredRows: manual.effectiveFilteredRows, matchedRows: manual.matchedRows })));
      results.push(check('真实命中后候选少于底线池', Number(manual.effectiveFilteredRows || 0) < Number(manual.familyFilteredRows || 0), JSON.stringify({ effectiveFilteredRows: manual.effectiveFilteredRows, familyFilteredRows: manual.familyFilteredRows })));

      trace('Step4 生成家庭路径推荐', '基于分数段/地域偏好/家庭底线/孩子兴趣');
      if (window.LN_V3_ROUTER) window.LN_V3_ROUTER.go('scenario', 'debug-mainflow:to-scenario');
      var scenarioPreview = window.LN_V3_SCENARIO_ADAPTER.recommend(window.LN_V3_STORE.getState());
      trace('Step4 家庭路径推荐完成', 'recommended=' + scenarioPreview.recommended + ' scoreBand=' + ((scenarioPreview.scoreBand || {}).id || '') + ' region=' + ((scenarioPreview.regionPreference || {}).mode || '') + ' effectiveRows=' + scenarioPreview.effectiveRows);
      results.push(check('Step4 家庭路径推荐预览已生成', !!scenarioPreview.recommended, JSON.stringify({ recommended: scenarioPreview.recommended, scores: scenarioPreview.scores, explanation: scenarioPreview.explanation })));
      results.push(check('Step4 未回退旧 grid 简化逻辑', scenarioPreview.reason === 'v3-family-path-preview-only' && scenarioPreview.recommended === 'province_public', JSON.stringify({ reason: scenarioPreview.reason, recommended: scenarioPreview.recommended, scoreBand: scenarioPreview.scoreBand && scenarioPreview.scoreBand.id })));
      results.push(check('Step4 读取学生画像与专业画像', !!(scenarioPreview.studentProfile && scenarioPreview.majorProfile), JSON.stringify({ studentProfile: scenarioPreview.studentProfile, majorTags: scenarioPreview.majorProfile && scenarioPreview.majorProfile.tags }))); 
      results.push(check('Step4 500分辽宁电气路径优先省内公办，B方案承接电气', scenarioPreview.recommended === 'province_public', JSON.stringify({ recommended: scenarioPreview.recommended, reasons: scenarioPreview.reasons })));
      results.push(check('Step4 读取真实命中有效池', Number(scenarioPreview.effectiveRows || 0) === Number(manual.effectiveFilteredRows || 0), JSON.stringify({ effectiveRows: scenarioPreview.effectiveRows, manualRows: manual.effectiveFilteredRows })));
      var appliedScenario = window.LN_V3_STEP_SCENARIO._test.applyRecommended();
      var scenarioState = window.LN_V3_STORE.getState().scenario || {};
      trace('Step4 采用系统建议', 'current=' + scenarioState.current + ' recommended=' + scenarioState.recommended);
      results.push(check('Step4 系统建议写入 store', scenarioState.current === scenarioPreview.recommended, JSON.stringify(scenarioState)));
      results.push(check('Step4 B方案解释承接兴趣与家庭路径', !!(scenarioState.preview && scenarioState.preview.planTone && scenarioState.preview.planTone.B), JSON.stringify(scenarioState.preview && scenarioState.preview.planTone || {})));
      var step4Routed = window.LN_V3_STEP_SCENARIO._test.saveAndGoNext('debug-mainflow:scenario-next');
      if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('scenario', 'debug-mainflow:scenario-complete-through');
      var finalState = window.LN_V3_STORE.getState();
      trace('Step4 保存家庭路径并继续', 'routed=' + step4Routed + ' activeStep=' + ((finalState.ui || {}).activeStep || ''));
      results.push(check('Step4 保存后进入 Step5', finalState.ui.activeStep === 'plans' && finalState.ui.activeTab === 'plans', JSON.stringify(finalState.ui)));

      trace('Step5 生成 A/B/C 方案包', '基于分数段/家庭路径/地域强度/兴趣画像');
      var plansPreview = window.LN_V3_PLANS_ADAPTER.apply('debug-mainflow:plans');
      var planState = window.LN_V3_STORE.getState();
      var plans = (plansPreview && plansPreview.plans) || {};
      trace('Step5 方案包完成', 'A=' + ((plans.A && plans.A.samples || []).length) + ' B=' + ((plans.B && plans.B.samples || []).length) + ' C=' + ((plans.C && plans.C.samples || []).length) + ' effective=' + (plansPreview && plansPreview.effectiveRows));
      results.push(check('Step5 方案包预览已生成', !!(plansPreview && plansPreview.ok), JSON.stringify({ effectiveRows: plansPreview && plansPreview.effectiveRows, familyRows: plansPreview && plansPreview.familyFilteredRows, matchedRows: plansPreview && plansPreview.matchedRows })));
      results.push(check('Step5 A/B/C 结构存在', !!(plans.A && plans.B && plans.C), JSON.stringify(Object.keys(plans || {}))));
      results.push(check('Step5 A 守底线方案有样例', !!(plans.A && plans.A.samples && plans.A.samples.length > 0), JSON.stringify(plans.A && { title: plans.A.title, samples: plans.A.samples && plans.A.samples.length })));
      results.push(check('Step5 B 孩子路径方案有样例', !!(plans.B && plans.B.samples && plans.B.samples.length > 0), JSON.stringify(plans.B && { title: plans.B.title, samples: plans.B.samples && plans.B.samples.length, focus: plans.B.focus })));
      results.push(check('Step5 C 上限探索方案有样例', !!(plans.C && plans.C.samples && plans.C.samples.length > 0), JSON.stringify(plans.C && { title: plans.C.title, samples: plans.C.samples && plans.C.samples.length })));
      results.push(check('Step5 B方案承接兴趣/画像/家庭路径', !!(plans.B && /兴趣|画像|路径/.test((plans.B.tone || '') + ' ' + (plans.B.role || '') + ' ' + (plans.B.focus || []).join(','))), JSON.stringify(plans.B || {})));
      results.push(check('Step5 样例卡片带证据等级和复核项', !!(plans.B && plans.B.samples && plans.B.samples[0] && plans.B.samples[0].evidenceLevel), JSON.stringify(plans.B && plans.B.samples && plans.B.samples[0] || {})));
      results.push(check('Step5 方案写入 store', !!(planState.plans && planState.plans.preview && planState.plans.preview.reason === 'v3-plans-preview-only'), JSON.stringify(planState.plans && planState.plans.meta || {})));
      if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('plans', 'debug-mainflow:plans-complete-through');

      trace('Step6 生成详细候选卡片', '从 A/B/C 方案包生成可复核卡片');
      if (window.LN_V3_ROUTER) window.LN_V3_ROUTER.go('candidates', 'debug-mainflow:to-candidates');
      var candidatePreview = window.LN_V3_CANDIDATES_ADAPTER.apply('debug-mainflow:candidates');
      var cards = (candidatePreview && candidatePreview.list) || [];
      var bCard = cards.find(function (item) { return item.planBand === 'B'; }) || cards[0] || {};
      trace('Step6 详细卡片完成', 'cards=' + cards.length + ' A=' + ((candidatePreview.byPlan || {}).A || 0) + ' B=' + ((candidatePreview.byPlan || {}).B || 0) + ' C=' + ((candidatePreview.byPlan || {}).C || 0));
      results.push(check('Step6 详细候选卡片已生成', !!(candidatePreview && candidatePreview.ok && cards.length >= 10), JSON.stringify({ total: candidatePreview && candidatePreview.total, byPlan: candidatePreview && candidatePreview.byPlan })));
      results.push(check('Step6 A/B/C 卡片承接方案包', !!(candidatePreview && candidatePreview.byPlan && candidatePreview.byPlan.A > 0 && candidatePreview.byPlan.B > 0 && candidatePreview.byPlan.C > 0), JSON.stringify(candidatePreview && candidatePreview.byPlan || {})));
      results.push(check('Step6 卡片带证据等级与复核清单', !!(bCard.evidenceLevel && bCard.reviewTags && bCard.reviewTags.length && bCard.nextReview && bCard.nextReview.length), JSON.stringify(bCard)));
      results.push(check('Step6 B卡片承接兴趣命中与画像提醒', !!(bCard.planBand === 'B' && bCard.matchReason && /复核|自动化|学习强度|热门词/.test((bCard.reviewTags || []).join(' '))), JSON.stringify({ planBand: bCard.planBand, matchReason: bCard.matchReason, reviewTags: bCard.reviewTags })));
      var comparePreview = window.LN_V3_CANDIDATE_COMPARE ? window.LN_V3_CANDIDATE_COMPARE.generate(cards, window.LN_V3_STORE.getState(), { filterPlan: 'B', sortBy: 'rank_near' }) : null;
      var compareRows = comparePreview && comparePreview.rows || [];
      results.push(check('Step6 卡片筛选排序能力已接入', !!(comparePreview && comparePreview.filteredCount > 0 && comparePreview.options.filterPlan === 'B' && comparePreview.options.sortBy === 'rank_near'), JSON.stringify({ filtered: comparePreview && comparePreview.filteredCount, options: comparePreview && comparePreview.options })));
      results.push(check('Step6 横向比较表可生成', !!(compareRows.length > 0 && compareRows[0].school && compareRows[0].risk), JSON.stringify(compareRows.slice(0, 2))));
      var legacyCompare = window.LN_V3_LEGACY_COMPUTE && window.LN_V3_LEGACY_COMPUTE.compare ? window.LN_V3_LEGACY_COMPUTE.compare('debug-mainflow:legacy-compute-preflight') : null;
      results.push(check('旧版正式计算链路预备对比已生成', !!(legacyCompare && legacyCompare.ok && legacyCompare.current && legacyCompare.legacy && legacyCompare.diff), JSON.stringify({ current: legacyCompare && legacyCompare.current, legacy: legacyCompare && legacyCompare.legacy, diff: legacyCompare && legacyCompare.diff })));
      results.push(check('旧版计算预备不替换当前 V3 候选结果', !!(legacyCompare && legacyCompare.status && legacyCompare.status.active === false && legacyCompare.status.replacementAllowed === false && legacyCompare.current.cards === ((window.LN_V3_STORE.getState().candidates || {}).list || []).length), JSON.stringify(legacyCompare && legacyCompare.status || {})));
      var counterPreview = window.LN_V3_COUNTERFACTUAL_ADAPTER.apply('debug-mainflow:counterfactual');
      var cfCards = (counterPreview && counterPreview.cards) || [];
      var regionCf = cfCards.find(function (item) { return item.id === 'region-hard-to-soft'; });
      var interestCf = cfCards.find(function (item) { return item.id === 'manual-only-off'; });
      var costCf = cfCards.find(function (item) { return item.id === 'reject-high-fee'; });
      trace('Step6 生成条件变化对照', 'cards=' + cfCards.length + ' region=' + !!regionCf + ' interest=' + !!interestCf);
      results.push(check('Step6 反事实比较已生成', !!(counterPreview && counterPreview.ok && cfCards.length >= 3), JSON.stringify({ count: counterPreview && counterPreview.count, summary: counterPreview && counterPreview.summary })));
      results.push(check('Step6 地域 hard→soft 对照存在', !!(regionCf && regionCf.changed >= regionCf.current), JSON.stringify(regionCf || {})));
      results.push(check('Step6 关闭真实命中可恢复底线池对照存在', !!(interestCf && interestCf.changed > interestCf.current), JSON.stringify(interestCf || {})));
      results.push(check('Step6 费用风险收窄对照存在', !!costCf, JSON.stringify(costCf || {})));
      var reviewPreview = window.LN_V3_REVIEW_CHECKLIST.apply('debug-mainflow:review-checklist');
      results.push(check('Step6 复核任务清单已生成', !!(reviewPreview && reviewPreview.ok && reviewPreview.count >= 4), JSON.stringify({ count: reviewPreview && reviewPreview.count, urgent: reviewPreview && reviewPreview.urgentCount, summary: reviewPreview && reviewPreview.summary })));
      results.push(check('Step6 复核清单覆盖费用/专业/学习强度', !!(reviewPreview && reviewPreview.tasks && /学费|高收费|中外合作/.test(JSON.stringify(reviewPreview.tasks)) && /专业|正主|名称/.test(JSON.stringify(reviewPreview.tasks)) && /学习强度|热门词/.test(JSON.stringify(reviewPreview.tasks))), JSON.stringify((reviewPreview && reviewPreview.tasks || []).slice(0, 5))));
      var addOk = window.LN_V3_CANDIDATES_ADAPTER.add(bCard.key);
      var afterAdd = window.LN_V3_STORE.getState();
      results.push(check('Step6 自选池可加入候选', addOk && ((afterAdd.shortlist || {}).items || []).some(function (item) { return item.key === bCard.key; }), JSON.stringify((afterAdd.shortlist || {}).items || [])));
      var removeOk = window.LN_V3_CANDIDATES_ADAPTER.remove(bCard.key);
      var afterRemove = window.LN_V3_STORE.getState();
      results.push(check('Step6 自选池可移出候选', removeOk && !(((afterRemove.shortlist || {}).items || []).some(function (item) { return item.key === bCard.key; })), JSON.stringify((afterRemove.shortlist || {}).items || [])));
      if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('candidates', 'debug-mainflow:candidates-complete-through');

      trace('Step7 生成家庭讨论报告', '把 Step1-Step6 的选择过程整理为 Markdown');
      if (window.LN_V3_ROUTER) window.LN_V3_ROUTER.go('export', 'debug-mainflow:to-export');
      var reportPreview = window.LN_V3_REPORT_EXPORT.apply('debug-mainflow:export-report');
      var reportText = reportPreview && reportPreview.markdown || '';
      trace('Step7 家庭讨论报告完成', 'length=' + (reportPreview && reportPreview.length) + ' cards=' + (reportPreview && reportPreview.cardCount) + ' counterfactual=' + (reportPreview && reportPreview.counterfactualCount));
      results.push(check('Step7 家庭讨论报告已生成', !!(reportPreview && reportPreview.ok && reportText.length > 500), JSON.stringify({ length: reportPreview && reportPreview.length, sections: reportPreview && reportPreview.sectionCount, cards: reportPreview && reportPreview.cardCount })));
      results.push(check('Step7 报告包含家庭处境与决策日志', /当前家庭决策处境/.test(reportText) && /决策日志/.test(reportText), reportText.slice(0, 220)));
      results.push(check('Step7 报告包含 A\/B\/C 与详细卡片摘要', /A\/B\/C 方案包/.test(reportText) && /沈阳航空航天大学|辽宁工程技术大学|详细卡片/.test(reportText), 'length=' + reportText.length));
      results.push(check('Step7 报告包含自选池与条件变化对照', /自选池/.test(reportText) && /条件变化对照/.test(reportText), 'counterfactual=' + (reportPreview && reportPreview.counterfactualCount)));
      if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('export', 'debug-mainflow:export-complete-through');
      var finalAfterExport = window.LN_V3_STORE.getState();
      var done = (finalAfterExport.ui && finalAfterExport.ui.completedSteps) || [];
      var expectedDone = ['rank','family','child','scenario','plans','candidates','export'];
      results.push(check('Step7 进度闭环完整', expectedDone.every(function (id) { return done.indexOf(id) !== -1; }), JSON.stringify(done)));
      if (window.LN_V3_PAGE_EXPERIENCE && window.LN_V3_PAGE_EXPERIENCE.staticPlan) {
        var pagePlan = window.LN_V3_PAGE_EXPERIENCE.staticPlan();
        results.push(check('真实页面结构检查已纳入总检', !!(pagePlan.autoScrollAfterRoute && pagePlan.stepFocusNote && pagePlan.mobileStickyAction && pagePlan.copyButtonFeedback), JSON.stringify(pagePlan)));
      }
      results.push(check('主流程最终停在导出页', finalAfterExport.ui.activeStep === 'export' && finalAfterExport.ui.activeTab === 'export', JSON.stringify(finalAfterExport.ui)));
      results.push(check('主流程总耗时已记录', Math.round(performance.now() - started) >= 0, Math.round(performance.now() - started) + 'ms'));
      trace('一键主流程自测结束', 'fail=' + (results.filter(function (item) { return !item.ok; }).length));
      return results;
    }).catch(function (err) {
      trace('一键主流程异常', err && err.message ? err.message : String(err));
      results.push(check('一键主流程执行无异常', false, err && err.message ? err.message : String(err)));
      return results;
    });
  }

  function oneclick() {
    var started = performance.now();
    var matrixResults = pathmatrix();
    return mainflow().then(function (mainResults) {
      return formatCombined(started, matrixResults, mainResults);
    }).catch(function (err) {
      var mainResults = [check('一键主流程执行无异常', false, err && err.message ? err.message : String(err))];
      return formatCombined(started, matrixResults, mainResults);
    });
  }

  function formatCombined(started, matrixResults, mainResults) {
    var all = [].concat(matrixResults || [], mainResults || []);
    var sum = summarize(all);
    var matrixSum = summarize(matrixResults || []);
    var mainSum = summarize(mainResults || []);
    var elapsed = Math.round(performance.now() - started);
    var traceLines = (window.LN_V3_DEBUG_RUNTIME && window.LN_V3_DEBUG_RUNTIME.getTrace ? window.LN_V3_DEBUG_RUNTIME.getTrace() : []).map(function (item, index) {
      return String(index + 1).padStart(2, '0') + '｜' + item.time + '｜' + item.action + (item.detail ? '｜' + item.detail : '');
    });
    var header = [
      '【辽宁物理类工具 V3 Debug Report】',
      '读取时间：' + new Date().toLocaleString(),
      '模式：oneclick',
      '版本：' + window.LN_V3_VERSION.name,
      '版本戳：' + window.LN_V3_VERSION.stamp,
      '总步骤：' + sum.total + '；通过：' + sum.pass + '；失败：' + sum.fail,
      '路径矩阵：' + matrixSum.total + ' 步；通过：' + matrixSum.pass + '；失败：' + matrixSum.fail,
      '主流程：' + mainSum.total + ' 步；通过：' + mainSum.pass + '；失败：' + mainSum.fail,
      '耗时：' + elapsed + 'ms',
      '',
      '【结论】',
      sum.fail === 0 ? 'PASS｜一键总检通过，可以继续作为当前反馈基线。' : 'FAIL｜一键总检发现问题，请直接复制本报告反馈。',
      '',
      '【路径矩阵自测】'
    ].join('\n');
    var matrixBlock = (matrixResults || []).map(line).join('\n');
    var mainBlock = '\n\n【主流程自测】\n' + (mainResults || []).map(line).join('\n');
    var traceBlock = traceLines.length ? '\n\n【操作轨迹】\n' + traceLines.join('\n') : '';
    var snap = window.LN_V3_DEBUG_RUNTIME.snapshot();
    var stateBlock = '\n\n【主流程最终状态】\n数据状态：' + JSON.stringify(snap.dataStatus || {}) + '\nStore：' + JSON.stringify(snap.state || {});
    return { results: all, summary: sum, text: header + matrixBlock + mainBlock + traceBlock + stateBlock };
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
      if (type === 'oneclick') {
        return oneclick();
      }
      if (type === 'rank') {
        return window.LN_V3_DEBUG_STEP_RANK.runAsync().then(function (results) { return format(type, started, results); });
      }
      if (type === 'mainflow') {
        return mainflow().then(function (results) { return format(type, started, results); });
      }
      if (type === 'pathmatrix') {
        return format(type, started, pathmatrix());
      }
      var results = type === 'family' && window.LN_V3_DEBUG_STEP_FAMILY ? window.LN_V3_DEBUG_STEP_FAMILY.run()
        : (type === 'child' && window.LN_V3_DEBUG_STEP_CHILD ? window.LN_V3_DEBUG_STEP_CHILD.run()
        : (type === 'scenario' && window.LN_V3_DEBUG_STEP_SCENARIO ? window.LN_V3_DEBUG_STEP_SCENARIO.run()
        : (type === 'full' ? full() : quick())));
      return format(type, started, results);
    }
  };
})();
