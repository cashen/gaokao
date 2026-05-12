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
      mode: 'preflight',
      active: false,
      previewOnly: true,
      hasLegacyEntry: hasLegacyEntry,
      canReadV3Context: !!(globals.v3Store && globals.v3Adapters),
      replacementAllowed: false,
      safetyRule: 'beta6 只做旧版正式计算链路接入预备与双轨对比，不替换 V3 当前候选结果。',
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
        familyFilteredRows: safeNumber(family.preview && family.preview.filteredPreview)
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
        byPlan: candidates.byPlan || {}
      }
    };
  }

  function compare(reason) {
    var started = performance.now();
    var s = state();
    var status = getBridgeStatus();
    var input = buildInputSnapshot(s);
    var currentEffectiveRows = input.scenario.effectiveRows || input.child.effectiveFilteredRows || input.family.familyFilteredRows || input.rank.loadedRows;
    var currentCards = input.candidates.total;
    var legacyEstimate = {
      source: status.hasLegacyEntry ? 'legacy-entry-detected' : 'v3-preflight-estimate',
      familyRows: input.family.familyFilteredRows,
      interestRows: input.child.matchedRows,
      effectiveRows: currentEffectiveRows,
      cards: currentCards,
      note: status.hasLegacyEntry ? '检测到旧计算入口；beta6 暂不主动调用，只记录接入状态。' : '当前 v3 独立入口未加载旧 compute 全局函数；beta6 先记录同一上下文下的 V3 预览结果，等待后续 beta 接入正式 compute。'
    };
    var diff = {
      effectiveRowsDelta: safeNumber(legacyEstimate.effectiveRows) - safeNumber(currentEffectiveRows),
      cardsDelta: safeNumber(legacyEstimate.cards) - safeNumber(currentCards),
      comparable: true,
      reason: 'preflight-same-context'
    };
    var result = {
      ok: true,
      reason: reason || 'v3-beta6-legacy-compute-preflight',
      elapsed: nowMs(started),
      status: status,
      input: input,
      current: {
        source: 'v3-preview-chain',
        effectiveRows: currentEffectiveRows,
        cards: currentCards,
        familyRows: input.family.familyFilteredRows,
        matchedRows: input.child.matchedRows,
        path: input.scenario.current || input.scenario.recommended
      },
      legacy: legacyEstimate,
      diff: diff,
      summary: status.hasLegacyEntry ? '已具备旧计算入口探测能力；当前仍保护 V3 主链路，不自动替换。' : '旧正式 compute 未在 v3 独立入口加载；已完成接入预备与双轨对比占位。'
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
            summary: result.summary
          },
          lastReason: reason || 'v3-beta6-legacy-compute-preflight'
        }
      }, 'legacyComputePreflight');
    }
    return result;
  }

  function apply(reason) {
    return compare(reason || 'legacyComputeAdapter.apply:preflight-only');
  }

  function staticPlan() {
    return {
      stage: 'beta6-preflight',
      goal: '把旧版正式 compute 接入前的输入上下文、入口检测、双轨对比和回归保护先打通。',
      safety: [
        '不主动调用旧 applyFilters。',
        '不替换 Step5/Step6 当前候选结果。',
        '不改变 Step4 家庭路径权重。',
        '只在 debug 和 compute.legacyCompare 中记录对比信息。'
      ],
      next: [
        'beta6 通过后，再设计 beta6.fix1 / beta7 的正式 compute 接入方案。',
        '正式接入时必须输出旧结果数量、V3结果数量、差异样本和原因分类。'
      ]
    };
  }

  window.LN_V3_LEGACY_COMPUTE = {
    apply: apply,
    compare: compare,
    staticPlan: staticPlan,
    getBridgeStatus: getBridgeStatus,
    buildInputSnapshot: buildInputSnapshot
  };
})();
