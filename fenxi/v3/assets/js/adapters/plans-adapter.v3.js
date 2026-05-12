(function () {
  'use strict';

  function num(value) {
    var n = Number(String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function uniq(list) {
    var seen = Object.create(null);
    return (list || []).filter(function (item) {
      var key = text(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }
  function compact(record, extra) {
    record = record || {};
    extra = extra || {};
    var majorProfile = extra.majorProfile || (window.LN_V3_MAJOR_PROFILE && window.LN_V3_MAJOR_PROFILE.profileRecord ? window.LN_V3_MAJOR_PROFILE.profileRecord(record, extra.child || {}, extra.student || {}) : null);
    var rank2025 = num(record.rank2025);
    var score2025 = firstNonEmpty(record.score2025, '');
    var rankNo = num(extra.rankNo);
    var safety = '待复核';
    var distance = 0;
    if (rankNo && rank2025) {
      distance = rankNo - rank2025;
      if (rank2025 >= rankNo) safety = '相对稳妥';
      else if (distance <= Math.max(3500, Math.round(rankNo * 0.08))) safety = '小幅上探';
      else safety = '上限探索';
    }
    var warnings = [];
    if (record.isHighFee === true || /高收费|中外合作|合作办学/.test(text(record.major) + ' ' + text(record.tuitionStatus) + ' ' + text(record.riskFlags))) warnings.push('费用/合作办学复核');
    if (/需核验/.test(text(record.schoolNatureLabel))) warnings.push('学校性质复核');
    if (majorProfile && Array.isArray(majorProfile.warnings)) warnings = warnings.concat(majorProfile.warnings);
    return {
      school: text(record.school),
      major: text(record.major),
      score2025: score2025,
      rank2025: firstNonEmpty(record.rank2025, ''),
      schoolProvince: text(record.schoolProvince),
      lnArea: text(record.lnArea),
      schoolNatureLabel: text(record.schoolNatureLabel),
      tuition2025: firstNonEmpty(record.tuition2025, record.tuitionStatus, ''),
      planRole: extra.role || '',
      safety: safety,
      rankDistance: distance,
      matchReason: extra.matchReason || '',
      evidenceLevel: warnings.length ? '需要复核' : '模型判断',
      reviewTags: uniq(warnings).slice(0, 4),
      oneLine: extra.oneLine || ''
    };
  }
  function getFamilyPayload(state) {
    if (window.LN_V3_FAMILY_FILTER && window.LN_V3_FAMILY_FILTER.getPreviewRecords) {
      return window.LN_V3_FAMILY_FILTER.getPreviewRecords((state || {}).family || {});
    }
    var cache = window.LN_V3_DATA_CACHE || {};
    var records = Array.isArray(cache.records) ? cache.records : [];
    return { ok: records.length > 0, records: records, basePool: records.length, filteredPreview: records.length };
  }
  function getInterestRecords(records, state) {
    var child = (state || {}).childPreference || {};
    var out = [];
    if (!window.LN_V3_CHILD_INTEREST || !window.LN_V3_CHILD_INTEREST.matchRecord) return out;
    (records || []).forEach(function (record) {
      var m = window.LN_V3_CHILD_INTEREST.matchRecord(record, child);
      if (m) out.push({ record: record, match: m });
    });
    return out;
  }
  function rankOf(record) { return num(record && record.rank2025); }
  function hasRank(record) { return rankOf(record) > 0; }
  function stableSort(rankNo) {
    return function (a, b) {
      var ar = rankOf(a), br = rankOf(b);
      var as = ar ? Math.abs(ar - rankNo) : 999999999;
      var bs = br ? Math.abs(br - rankNo) : 999999999;
      if (ar && br) return as - bs;
      if (ar) return -1;
      if (br) return 1;
      return text(a.school + a.major).localeCompare(text(b.school + b.major), 'zh-CN');
    };
  }
  function upperSort(rankNo) {
    return function (a, b) {
      var ar = rankOf(a), br = rankOf(b);
      var ad = ar ? (rankNo - ar) : 999999999;
      var bd = br ? (rankNo - br) : 999999999;
      if (ar && br) return ad - bd;
      if (ar) return -1;
      if (br) return 1;
      return 0;
    };
  }
  function splitPools(records, rankNo) {
    records = Array.isArray(records) ? records : [];
    rankNo = num(rankNo);
    var stable = [], upper = [], unknown = [];
    records.forEach(function (record) {
      var r = rankOf(record);
      if (!rankNo || !r) unknown.push(record);
      else if (r >= rankNo) stable.push(record);
      else upper.push(record);
    });
    stable.sort(stableSort(rankNo));
    upper.sort(upperSort(rankNo));
    return { stable: stable, upper: upper, unknown: unknown };
  }
  function planTone(ctx, scenarioPreview) {
    var band = ctx.band || {};
    var base = (scenarioPreview && scenarioPreview.planTone) || (band && band.abc) || {};
    return {
      A: base.A || '守住家庭底线，先看相对稳妥和可接受组合。',
      B: base.B || '把孩子兴趣、专业画像和可持续路径放在一起比较。',
      C: base.C || '保留上限探索和城市/学校层级比较，但不牺牲底线。'
    };
  }
  function planNames(ctx, scenarioPreview) {
    var band = ctx.band || {};
    var path = (scenarioPreview && scenarioPreview.selected) || (ctx.scenario && ctx.scenario.current) || '';
    if (band.id === '625_plus') {
      return {
        A: { title: 'A 稳妥强校', role: '守住强校平台底线' },
        B: { title: 'B 强专业路径', role: '专业质量与长期成长' },
        C: { title: 'C 平台上限', role: '城市、平台和上限探索' }
      };
    }
    if (band.id === '450_499' || band.id === '367_449' || path === 'guarantee' || path === 'cost_risk') {
      return {
        A: { title: 'A 真实保底', role: '先确认本科机会和成本底线' },
        B: { title: 'B 可读专业', role: '孩子能读、家庭能承受' },
        C: { title: 'C 替代比较', role: '民办/成本/地域替代复核' }
      };
    }
    return {
      A: { title: 'A 守底线方案', role: '家庭底线内的稳妥组合' },
      B: { title: 'B 孩子路径方案', role: '兴趣、专业画像和就业/深造路径' },
      C: { title: 'C 上限探索方案', role: '学校层级、城市或专业弹性比较' }
    };
  }
  function samplePlan(records, opts) {
    opts = opts || {};
    var child = opts.state && opts.state.childPreference || {};
    var student = opts.state && opts.state.studentProfile || {};
    return (records || []).slice(0, opts.limit || 5).map(function (record) {
      return compact(record, {
        role: opts.role,
        rankNo: opts.rankNo,
        matchReason: opts.matchReasonMap && opts.matchReasonMap.get ? (opts.matchReasonMap.get(record) || '') : '',
        child: child,
        student: student,
        oneLine: opts.oneLine
      });
    });
  }
  function buildMatchMap(items) {
    var map = new Map();
    (items || []).forEach(function (item) { map.set(item.record, item.match && item.match.reason ? item.match.reason : '兴趣方向命中'); });
    return map;
  }
  function pickUnique(primary, fallback, limit) {
    var out = [];
    var seen = Object.create(null);
    function add(record) {
      if (!record) return;
      var key = text(record.school) + '|' + text(record.major) + '|' + text(record.rank2025);
      if (seen[key]) return;
      seen[key] = true;
      out.push(record);
    }
    (primary || []).forEach(add);
    (fallback || []).forEach(add);
    return out.slice(0, limit || 8);
  }
  function generate(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var ctx = window.LN_V3_DECISION_CONTEXT ? window.LN_V3_DECISION_CONTEXT.build(state) : { band: {}, region: {}, effectiveRows: 0, familyRows: 0, matchedRows: 0, manualOnly: false };
    var familyPayload = getFamilyPayload(state);
    var familyRecords = Array.isArray(familyPayload.records) ? familyPayload.records : [];
    var interestPairs = getInterestRecords(familyRecords, state);
    var interestRecords = interestPairs.map(function (item) { return item.record; });
    var matchMap = buildMatchMap(interestPairs);
    var effectiveRecords = (state.childPreference && state.childPreference.manualOnly && interestRecords.length) ? interestRecords : familyRecords;
    var rankNo = num((state.rank || {}).rank);
    var familySplit = splitPools(familyRecords, rankNo);
    var interestSplit = splitPools(interestRecords, rankNo);
    var effectiveSplit = splitPools(effectiveRecords, rankNo);
    var scenarioPreview = (state.scenario && state.scenario.preview) || (window.LN_V3_SCENARIO_ADAPTER && window.LN_V3_SCENARIO_ADAPTER.recommend ? window.LN_V3_SCENARIO_ADAPTER.recommend(state) : null);
    var names = planNames(ctx, scenarioPreview);
    var tone = planTone(ctx, scenarioPreview);
    var bSource = pickUnique(interestSplit.stable.concat(interestSplit.upper), effectiveSplit.stable.concat(effectiveSplit.upper).concat(effectiveSplit.unknown), 12);
    var cSource = pickUnique(effectiveSplit.upper, familySplit.upper, 12);
    var aSource = pickUnique(familySplit.stable, effectiveSplit.stable.concat(familySplit.unknown), 12);
    var plans = {
      A: {
        id: 'A',
        title: names.A.title,
        role: names.A.role,
        tone: tone.A,
        count: aSource.length,
        sourcePool: familyRecords.length,
        focus: uniq([ctx.region && ctx.region.name, '底线命中', '费用/性质复核', '安全垫']).slice(0, 5),
        samples: samplePlan(aSource, { state: state, rankNo: rankNo, role: '守底线', oneLine: '先看家庭能接受、位次相对稳妥或需要补证据的组合。' })
      },
      B: {
        id: 'B',
        title: names.B.title,
        role: names.B.role,
        tone: tone.B,
        count: bSource.length,
        sourcePool: interestRecords.length || effectiveRecords.length,
        focus: uniq(['孩子兴趣', '专业画像', '学生画像提醒', scenarioPreview && scenarioPreview.recommendedName]).slice(0, 5),
        samples: samplePlan(bSource, { state: state, rankNo: rankNo, role: '孩子路径', matchReasonMap: matchMap, oneLine: '把兴趣命中、专业正主程度和可持续路径放在一起看。' })
      },
      C: {
        id: 'C',
        title: names.C.title,
        role: names.C.role,
        tone: tone.C,
        count: cSource.length,
        sourcePool: effectiveRecords.length,
        focus: uniq(['上限探索', '学校/城市比较', '不要牺牲底线', '复核风险']).slice(0, 5),
        samples: samplePlan(cSource, { state: state, rankNo: rankNo, role: '上限探索', matchReasonMap: matchMap, oneLine: '只作为上探和参照，不等于稳妥结果。' })
      }
    };
    var preview = {
      ok: true,
      reason: 'v3-plans-preview-only',
      scoreBand: ctx.band || null,
      regionPreference: ctx.region || null,
      familyPath: scenarioPreview ? { id: scenarioPreview.selected || scenarioPreview.recommended, name: scenarioPreview.selectedName || scenarioPreview.recommendedName, summary: scenarioPreview.summary || scenarioPreview.explanation } : null,
      basePool: ctx.basePool || familyPayload.basePool || familyRecords.length,
      familyFilteredRows: familyRecords.length,
      matchedRows: interestRecords.length,
      effectiveRows: effectiveRecords.length,
      manualOnly: !!(state.childPreference && state.childPreference.manualOnly),
      studentProfile: ctx.studentProfile || null,
      majorProfile: ctx.majorProfile || null,
      plans: plans,
      summary: '已按“分数段 + 家庭路径 + 地域强度 + 孩子兴趣/画像”生成 A/B/C 方案包预览。',
      nextStep: '下一步进入详细候选卡片：每条学校专业还要看证据等级、复核项和是否加入自选池。'
    };
    return preview;
  }
  function apply(reason) {
    if (!window.LN_V3_STORE) return null;
    var state = window.LN_V3_STORE.getState();
    var preview = generate(state);
    window.LN_V3_STORE.setState({
      plans: { A: preview.plans.A.samples, B: preview.plans.B.samples, C: preview.plans.C.samples, preview: preview, meta: { generatedAt: new Date().toISOString(), reason: preview.reason } },
      compute: { basePool: preview.familyFilteredRows, filtered: preview.effectiveRows, lastReason: 'v3-step5-plans-preview' },
      ui: { lastMessage: preview.summary }
    }, reason || 'plans:apply');
    return preview;
  }
  function matrix() {
    var cases = [
      { name: '650+ 平台路径 → A稳平台/B强专业/C上限', opts: { score: 660, regionMode: 'none', groups: ['electric_energy'], matchedRows: 240, familyRows: 900 }, expectA: '稳妥强校', expectB: '强专业' },
      { name: '500 辽宁电气 → A守底线/B孩子路径/C上限探索', opts: { score: 500, regionMode: 'hard', provinces: ['辽宁'], groups: ['electric_energy'], majors: ['电气工程及其自动化'], manualOnly: true, matchedRows: 116, familyRows: 1597 }, expectA: '守底线', expectB: '孩子路径' },
      { name: '470 低分保底 → A真实保底/B可读专业/C替代比较', opts: { score: 470, regionMode: 'hard', provinces: ['辽宁'], groups: ['electric_energy'], matchedRows: 42, familyRows: 1200 }, expectA: '真实保底', expectB: '可读专业' }
    ];
    return cases.map(function (item) {
      var ctx = window.LN_V3_DECISION_CONTEXT ? window.LN_V3_DECISION_CONTEXT.fake(item.opts) : { band: {}, scenario: {} };
      var scenarioPreview = window.LN_V3_SCENARIO_ADAPTER && window.LN_V3_SCENARIO_ADAPTER.recommendContext ? window.LN_V3_SCENARIO_ADAPTER.recommendContext(ctx) : null;
      var names = planNames(ctx, scenarioPreview);
      return { name: item.name, titles: names, expectA: item.expectA, expectB: item.expectB, ok: names.A.title.indexOf(item.expectA) !== -1 && names.B.title.indexOf(item.expectB) !== -1 };
    });
  }
  window.LN_V3_PLANS_ADAPTER = { generate: generate, apply: apply, matrix: matrix, _splitPools: splitPools, ready: true };
})();
