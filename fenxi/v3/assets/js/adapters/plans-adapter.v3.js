(function () {
  'use strict';

  function num(value) {
    var n = Number(String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function text(value) { return String(value || '').trim(); }
  function clampList(list, count) { return (list || []).slice(0, count || 6); }
  function uniqueRecords(records) {
    var seen = Object.create(null);
    var out = [];
    (records || []).forEach(function (item) {
      var key = [item.school || '', item.major || '', item.rank2025 || '', item.score2025 || ''].join('|');
      if (seen[key]) return;
      seen[key] = true;
      out.push(item);
    });
    return out;
  }
  function compact(record, extra) {
    extra = extra || {};
    return {
      school: record.school || '',
      major: record.major || '',
      score2025: record.score2025 || '',
      rank2025: record.rank2025 || '',
      schoolProvince: record.schoolProvince || '',
      lnArea: record.lnArea || '',
      schoolNatureLabel: record.schoolNatureLabel || '',
      isHighFee: record.isHighFee === true,
      planReason: extra.reason || '',
      matchReason: extra.matchReason || '',
      band: extra.band || ''
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
  function match(record, child) {
    if (window.LN_V3_CHILD_INTEREST && window.LN_V3_CHILD_INTEREST.matchRecord) {
      return window.LN_V3_CHILD_INTEREST.matchRecord(record, child || {});
    }
    return null;
  }
  function effectiveRecords(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var payload = getFamilyPayload(state);
    var familyRecords = Array.isArray(payload.records) ? payload.records : [];
    var child = state.childPreference || {};
    var matches = [];
    var records = familyRecords;
    if (child.manualOnly) {
      records = familyRecords.filter(function (item) {
        var m = match(item, child);
        if (m) matches.push({ record: item, match: m });
        return !!m;
      });
    } else {
      familyRecords.forEach(function (item) {
        var m = match(item, child);
        if (m) matches.push({ record: item, match: m });
      });
    }
    return {
      familyRecords: familyRecords,
      records: records,
      matches: matches,
      basePool: Number(payload.basePool || familyRecords.length || 0),
      familyRows: familyRecords.length,
      effectiveRows: records.length
    };
  }
  function enrich(records, state) {
    var child = (state || {}).childPreference || {};
    var userRank = num(((state || {}).rank || {}).rank);
    return uniqueRecords(records).map(function (record) {
      var rank = num(record.rank2025);
      var score = num(record.score2025);
      var m = match(record, child);
      var interestBoost = m ? (m.type === 'major' ? 18 : 10) : 0;
      var distance = rank && userRank ? rank - userRank : 999999;
      return {
        record: record,
        rank: rank,
        score: score,
        distance: distance,
        absDistance: Math.abs(distance),
        match: m,
        interestBoost: interestBoost
      };
    });
  }
  function fallback(items, count, exclude) {
    exclude = exclude || Object.create(null);
    var out = [];
    items.forEach(function (item) {
      var key = [item.record.school || '', item.record.major || '', item.rank || ''].join('|');
      if (exclude[key]) return;
      exclude[key] = true;
      out.push(item);
    });
    return out.slice(0, count);
  }
  function selectPlans(state) {
    var payload = effectiveRecords(state);
    var userRank = num(((state || {}).rank || {}).rank) || 56548;
    var items = enrich(payload.records, state);
    var ranked = items.filter(function (item) { return item.rank > 0; });
    var rankless = items.filter(function (item) { return !item.rank; });
    var aLine = userRank * 0.96;
    var bLine = userRank * 1.13;
    var cLine = userRank * 1.55;
    var used = Object.create(null);
    function key(item) { return [item.record.school || '', item.record.major || '', item.rank || ''].join('|'); }
    function take(list, count) {
      var out = [];
      list.forEach(function (item) {
        var k = key(item);
        if (used[k]) return;
        used[k] = true;
        out.push(item);
      });
      return out.slice(0, count);
    }
    var aCandidates = ranked.filter(function (item) { return item.rank > 0 && item.rank < aLine; })
      .sort(function (a, b) { return (b.rank - a.rank) || (b.interestBoost - a.interestBoost); });
    var bCandidates = ranked.filter(function (item) { return item.rank >= aLine && item.rank <= bLine; })
      .sort(function (a, b) { return (b.interestBoost - a.interestBoost) || (a.absDistance - b.absDistance); });
    var cCandidates = ranked.filter(function (item) { return item.rank > bLine && item.rank <= cLine; })
      .sort(function (a, b) { return (a.rank - b.rank) || (b.interestBoost - a.interestBoost); });
    var allByNear = ranked.slice().sort(function (a, b) { return (a.absDistance - b.absDistance) || (b.interestBoost - a.interestBoost); }).concat(rankless);
    var A = take(aCandidates, 6);
    if (A.length < 4) A = A.concat(fallback(allByNear, 6 - A.length, used));
    var B = take(bCandidates, 6);
    if (B.length < 4) B = B.concat(fallback(allByNear, 6 - B.length, used));
    var C = take(cCandidates, 6);
    if (C.length < 4) C = C.concat(fallback(ranked.slice().sort(function (a, b) { return (b.rank - a.rank) || (b.interestBoost - a.interestBoost); }).concat(rankless), 6 - C.length, used));
    function sample(list, band, reason) {
      return clampList(list, 6).map(function (item) {
        return compact(item.record, {
          band: band,
          reason: reason,
          matchReason: item.match ? item.match.reason : ''
        });
      });
    }
    var scenario = (state || {}).scenario || {};
    var tone = scenario.preview && scenario.preview.planTone ? scenario.preview.planTone : {};
    var child = (state || {}).childPreference || {};
    var manualOnly = !!child.manualOnly;
    var hasInterest = (child.selectedGroups || []).length > 0 || (child.selectedMajors || []).length > 0;
    return {
      ok: true,
      reason: 'v3-plans-preview-only',
      userRank: userRank,
      basePool: payload.basePool,
      familyFilteredRows: payload.familyRows,
      effectiveRows: payload.effectiveRows,
      matchedRows: child.preview && child.preview.matchedRows ? Number(child.preview.matchedRows || 0) : payload.matches.length,
      manualOnly: manualOnly,
      scenario: scenario.current || '',
      scenarioName: scenario.preview && scenario.preview.selectedName ? scenario.preview.selectedName : (scenario.current || '尚未选择'),
      counts: { A: A.length, B: B.length, C: C.length },
      plans: {
        A: {
          id: 'A',
          name: 'A 冲一冲',
          tone: tone.A || '适度看层级和专业弹性',
          summary: '比当前位次略靠前，作为少量冲击观察，不作为主仓位。',
          sample: sample(A, 'A', '位次略靠前，适合少量冲击观察。')
        },
        B: {
          id: 'B',
          name: 'B 稳妥主方案',
          tone: tone.B || '重点看兴趣命中、家庭底线和录取稳妥性',
          summary: hasInterest ? '优先把孩子兴趣放进稳妥区间，是这一步最该重点看的方案。' : '兴趣暂不明确时，先按家庭底线和稳妥区间组织主方案。',
          sample: sample(B, 'B', manualOnly ? '真实命中兴趣方向，并处在较适合重点比较的区间。' : '兼顾稳妥、兴趣和家庭底线，适合作为主方案。')
        },
        C: {
          id: 'C',
          name: 'C 保底安全',
          tone: tone.C || '保底不牺牲安全垫',
          summary: '更重视录取安全，不为了兴趣牺牲安全垫。',
          sample: sample(C, 'C', '安全垫相对更厚，用来保护底线。')
        }
      },
      advice: manualOnly ? '已开启真实命中，A/B/C 均基于兴趣命中池生成预览。' : '当前默认不硬排除，B 方案会优先兼顾孩子兴趣。',
      generatedAt: new Date().toISOString()
    };
  }
  function apply(source) {
    if (!window.LN_V3_STORE) return null;
    var state = window.LN_V3_STORE.getState();
    var preview = selectPlans(state);
    window.LN_V3_STORE.setState({
      plans: { A: preview.plans.A.sample, B: preview.plans.B.sample, C: preview.plans.C.sample, preview: preview },
      compute: { basePool: preview.familyFilteredRows || 0, filtered: preview.effectiveRows || 0, lastReason: 'v3-step5-plans-preview' },
      ui: { lastMessage: 'A/B/C 方案预览已生成：A ' + preview.counts.A + ' 条、B ' + preview.counts.B + ' 条、C ' + preview.counts.C + ' 条。' }
    }, source || 'plans:apply');
    return preview;
  }
  window.LN_V3_PLANS_ADAPTER = {
    preview: selectPlans,
    apply: apply,
    _effectiveRecords: effectiveRecords
  };
})();
