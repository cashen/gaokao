(function () {
  'use strict';

  function nowMs(started) {
    return Math.max(0, Math.round(performance.now() - started));
  }

  function state() {
    return window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
  }

  function safeNumber(value) {
    var n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function getBridgeStatus() {
    var globals = {
      applyFilters: typeof window.applyFilters === 'function',
      computePipeline: !!(window.LN_COMPUTE_PIPELINE || window.LN_V3_COMPUTE_PIPELINE),
      legacyData: !!(window.DATA || window.LN_DATA || window.LN_V3_DATA_CACHE),
      v3Store: !!window.LN_V3_STORE,
      v3Adapters: !!(window.LN_V3_FAMILY_FILTER && window.LN_V3_CHILD_INTEREST && window.LN_V3_PLANS_ADAPTER)
    };
    var hasLegacyEntry = !!(globals.applyFilters || globals.computePipeline);
    return {
      ok: true,
      mode: 'dual-track-preflight',
      active: false,
      previewOnly: true,
      hasLegacyEntry: hasLegacyEntry,
      canReadV3Context: !!(globals.v3Store && globals.v3Adapters),
      canBuildDiffSamples: true,
      replacementAllowed: false,
      safetyRule: 'beta10 只做旧版正式计算双轨对比增强，不替换 V3 当前候选结果；正式接入前必须先看差异样本和原因分类。',
      globals: globals
    };
  }

  function buildInputSnapshot(s) {
    s = s || state();
    var rank = s.rank || {};
    var family = s.family || {};
    var child = s.childPreference || {};
    var scenario = s.scenario || {};
    var plans = s.plans || {};
    var candidates = s.candidates || {};
    return {
      rank: {
        score: rank.score || '',
        rank: rank.rank || '',
        loadedRows: safeNumber(rank.loadedRows),
        chunkIds: rank.chunkIds || []
      },
      family: {
        regionMode: family.regionMode || 'none',
        provinces: family.provinces || [],
        feeType: family.feeType || 'all',
        rejects: family.rejects || [],
        familyFilteredRows: safeNumber(family.preview && family.preview.filteredPreview),
        baseRows: safeNumber(family.preview && family.preview.basePool),
        removed: (family.preview && family.preview.removed) || {}
      },
      child: {
        mode: child.mode || 'unset',
        manualOnly: !!child.manualOnly,
        selectedGroups: (child.selectedGroups || []).map(function (g) { return g.id || g.name; }),
        selectedMajors: (child.selectedMajors || []).map(function (m) { return m.name || m; }),
        matchedRows: safeNumber(child.preview && child.preview.matchedRows),
        effectiveFilteredRows: safeNumber(child.preview && child.preview.effectiveFilteredRows)
      },
      scenario: {
        current: scenario.current || '',
        recommended: scenario.recommended || '',
        effectiveRows: safeNumber(scenario.preview && scenario.preview.effectiveRows)
      },
      plans: {
        hasPlans: !!(plans.generatedAt || plans.reason),
        A: ((plans.A || {}).samples || []).length,
        B: ((plans.B || {}).samples || []).length,
        C: ((plans.C || {}).samples || []).length
      },
      candidates: {
        total: (candidates.list || []).length,
        byPlan: candidates.byPlan || {},
        sampleKeys: (candidates.list || []).slice(0, 5).map(function (c) {
          return [c.school, c.major, c.rank2025, c.planBand].filter(Boolean).join('|');
        })
      }
    };
  }

  function reasonCategories(input) {
    input = input || buildInputSnapshot();
    var items = [];
    if (input.family.regionMode === 'hard') {
      items.push({ code: 'region_hard', label: '地域硬底线', detail: 'V3 当前把地域作为硬条件；正式 compute 接入时必须确认旧链路是否使用同一地域口径。', countHint: safeNumber(input.family.removed && input.family.removed.region) });
    } else if (input.family.regionMode === 'soft') {
      items.push({ code: 'region_soft', label: '地域偏好', detail: '地域是偏好不是硬筛；旧链路对 soft 口径不能直接当作排除条件。', countHint: 0 });
    }
    if (input.child.manualOnly) {
      items.push({ code: 'interest_manual_only', label: '兴趣真实命中', detail: '已开启只看真实命中；正式 compute 接入时要区分家庭底线池与兴趣有效池。', countHint: Math.max(0, safeNumber(input.family.familyFilteredRows) - safeNumber(input.child.effectiveFilteredRows)) });
    }
    if (input.family.feeType !== 'all' || (input.family.rejects || []).some(function (x) { return String(x).indexOf('高收费') >= 0; })) {
      items.push({ code: 'fee_filter', label: '费用/高收费', detail: '费用约束可能改变候选池，正式 compute 对比必须单列。', countHint: safeNumber(input.family.removed && input.family.removed.highFee) });
    } else {
      items.push({ code: 'fee_review_only', label: '费用待复核', detail: '当前未硬排高收费，费用风险只进入卡片复核。', countHint: 0 });
    }
    if (input.scenario.current || input.scenario.recommended) {
      items.push({ code: 'family_path', label: '家庭路径', detail: '家庭路径影响 A/B/C 解释和排序语境，不应被旧计算链路覆盖。', path: input.scenario.current || input.scenario.recommended });
    }
    return items;
  }

  function buildDiffSamples(input, current, legacyEstimate) {
    input = input || buildInputSnapshot();
    current = current || {};
    legacyEstimate = legacyEstimate || {};
    var samples = [];
    samples.push({
      id: 'count-effective-rows',
      type: 'count',
      title: '有效候选数对比',
      v3: safeNumber(current.effectiveRows),
      legacy: safeNumber(legacyEstimate.effectiveRows),
      delta: safeNumber(legacyEstimate.effectiveRows) - safeNumber(current.effectiveRows),
      reason: '正式接入后优先看数量是否一致；若不一致，再按地域、兴趣、费用拆原因。'
    });
    samples.push({
      id: 'cards-count',
      type: 'cards',
      title: '详细卡片数对比',
      v3: safeNumber(current.cards),
      legacy: safeNumber(legacyEstimate.cards),
      delta: safeNumber(legacyEstimate.cards) - safeNumber(current.cards),
      reason: '正式 compute 可改变候选池，但不能绕过 V3 的 A/B/C 与详细卡片表达层。'
    });
    if (input.family.regionMode === 'hard') {
      samples.push({
        id: 'region-filter-diff',
        type: 'region',
        title: '地域硬筛差异样本预留',
        v3: input.family.familyFilteredRows,
        legacy: legacyEstimate.familyRows,
        delta: safeNumber(legacyEstimate.familyRows) - safeNumber(input.family.familyFilteredRows),
        reason: '只看辽宁等硬底线必须严格一致；不允许旧链路暗中保留省外。'
      });
    }
    if (input.child.manualOnly) {
      samples.push({
        id: 'interest-filter-diff',
        type: 'interest',
        title: '兴趣真实命中差异样本预留',
        v3: input.child.effectiveFilteredRows,
        legacy: legacyEstimate.effectiveRows,
        delta: safeNumber(legacyEstimate.effectiveRows) - safeNumber(input.child.effectiveFilteredRows),
        reason: '兴趣只影响有效池和 B 方案承接；正式接入不能让兴趣盖过家庭路径。'
      });
    }
    return samples;
  }

  function compare(reason) {
    var started = performance.now();
    var s = state();
    var status = getBridgeStatus();
    var input = buildInputSnapshot(s);
    var currentEffectiveRows = input.scenario.effectiveRows || input.child.effectiveFilteredRows || input.family.familyFilteredRows || input.rank.loadedRows;
    var currentCards = input.candidates.total;
    var legacyEstimate = {
      source: status.hasLegacyEntry ? 'legacy-entry-detected' : 'v3-dual-track-estimate',
      familyRows: input.family.familyFilteredRows,
      interestRows: input.child.matchedRows,
      effectiveRows: currentEffectiveRows,
      cards: currentCards,
      note: status.hasLegacyEntry ? '检测到旧计算入口；beta10 仍不主动替换，仅记录双轨差异样本。' : '当前 v3 独立入口未加载旧 compute 全局函数；beta10 先用同一上下文生成双轨差异样本与原因分类。'
    };
    var diff = {
      effectiveRowsDelta: safeNumber(legacyEstimate.effectiveRows) - safeNumber(currentEffectiveRows),
      cardsDelta: safeNumber(legacyEstimate.cards) - safeNumber(currentCards),
      comparable: true,
      reason: status.hasLegacyEntry ? 'legacy-entry-detected-not-called' : 'preflight-same-context'
    };
    var current = {
      source: 'v3-preview-chain',
      effectiveRows: currentEffectiveRows,
      cards: currentCards,
      familyRows: input.family.familyFilteredRows,
      matchedRows: input.child.matchedRows,
      path: input.scenario.current || input.scenario.recommended
    };
    var samples = buildDiffSamples(input, current, legacyEstimate);
    var categories = reasonCategories(input);
    var result = {
      ok: true,
      reason: reason || 'v3-beta10-legacy-compute-dual-track',
      elapsed: nowMs(started),
      status: status,
      input: input,
      current: current,
      legacy: legacyEstimate,
      diff: diff,
      diffSamples: samples,
      reasonCategories: categories,
      formalGuard: {
        replacementAllowed: false,
        mustCompareBeforeReplace: true,
        requiredChecks: ['数量对比', '差异样本', '原因分类', '多路径回归', '证据等级不降级'],
        summary: '正式 compute 接入前，必须先证明差异可解释，且不得绕过 V3 家庭路径和证据表达层。'
      },
      summary: status.hasLegacyEntry ? '已检测到旧计算入口；当前只做双轨差异样本，不替换 V3 主链路。' : '旧正式 compute 未在 v3 独立入口加载；已完成双轨差异样本与原因分类预备。'
    };
    if (window.LN_V3_STORE) {
      window.LN_V3_STORE.setState({
        compute: {
          applyTotalMs: nowMs(started),
          legacyReady: status.hasLegacyEntry,
          legacyCompare: {
            ok: result.ok,
            mode: status.mode,
            active: status.active,
            previewOnly: status.previewOnly,
            currentEffectiveRows: result.current.effectiveRows,
            legacyEffectiveRows: result.legacy.effectiveRows,
            effectiveRowsDelta: result.diff.effectiveRowsDelta,
            cardsDelta: result.diff.cardsDelta,
            diffSamples: result.diffSamples,
            reasonCategories: result.reasonCategories,
            formalGuard: result.formalGuard,
            summary: result.summary
          },
          lastReason: reason || 'v3-beta10-legacy-compute-dual-track'
        }
      }, 'legacyComputeDualTrack');
    }
    return result;
  }

  function apply(reason) {
    return compare(reason || 'legacyComputeAdapter.apply:dual-track-only');
  }

  function staticPlan() {
    return {
      stage: 'beta10-dual-track-compare',
      goal: '正式 compute 接入前，先把旧链路与 V3 决策上下文的数量、差异样本和原因分类打通。',
      safety: [
        '不主动调用旧 applyFilters 替换结果。',
        '不替换 Step5/Step6 当前候选结果。',
        '不改变 Step4 家庭路径权重。',
        '正式接入前必须输出旧结果数量、V3结果数量、差异样本和原因分类。'
      ],
      diffCategories: ['地域', '兴趣真实命中', '费用/高收费', '学校性质', '家庭路径', '证据等级'],
      next: [
        '下一步可做 beta10.fix1：在安全开关下尝试读取旧 compute 输出，但仍只做对比。',
        '只有多路径回归、差异样本和证据等级都稳定后，才允许考虑 RC。'
      ]
    };
  }

  window.LN_V3_LEGACY_COMPUTE = {
    apply: apply,
    compare: compare,
    staticPlan: staticPlan,
    getBridgeStatus: getBridgeStatus,
    buildInputSnapshot: buildInputSnapshot,
    buildDiffSamples: buildDiffSamples,
    reasonCategories: reasonCategories
  };
})();
