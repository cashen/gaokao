(function () {
  'use strict';
  function toNumber(value) {
    var n = Number(String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function normalizeText(value) { return String(value || '').trim(); }
  function normalizeList(list) {
    if (Array.isArray(list)) return list.map(normalizeText).filter(Boolean);
    return String(list || '').split(/[、,，\s]+/).map(normalizeText).filter(Boolean);
  }
  function isLiaoningProvince(name) { return /辽宁|辽/.test(String(name || '')); }
  function isRecordInProvince(record, province) {
    var p = normalizeText(province);
    var recProvince = normalizeText(record.schoolProvince);
    var lnArea = normalizeText(record.lnArea);
    if (!p) return false;
    if (isLiaoningProvince(p)) return lnArea === '省内' || isLiaoningProvince(recProvince);
    if (recProvince && recProvince.indexOf(p.replace(/省|市|自治区|壮族|回族|维吾尔/g, '')) !== -1) return true;
    return false;
  }
  function isRecordInAnyProvince(record, provinces) {
    provinces = normalizeList(provinces);
    if (!provinces.length) return true;
    return provinces.some(function (province) { return isRecordInProvince(record, province); });
  }
  function isHighFeeRecord(record) {
    if (!record) return false;
    if (record.isHighFee === true) return true;
    var tuition = normalizeText(record.tuition2025 || record.tuition || record.tuitionStatus);
    var flags = Array.isArray(record.riskFlags) ? record.riskFlags.join(' ') : normalizeText(record.riskFlags);
    return /高收费|中外合作|合作办学|国际|较高|昂贵/.test(tuition + ' ' + flags + ' ' + normalizeText(record.major));
  }
  function isPublicLike(record) {
    var cls = normalizeText(record.schoolNatureCls);
    var label = normalizeText(record.schoolNatureLabel);
    return cls === 'public' || /公办/.test(label);
  }
  function getRecords() {
    var cache = window.LN_V3_DATA_CACHE || {};
    return Array.isArray(cache.records) ? cache.records : [];
  }
  function makeEmpty(reason) {
    return {
      ok: false,
      reason: reason || 'no-data',
      basePool: 0,
      filteredPreview: 0,
      removed: { region: 0, highFee: 0, nature: 0 },
      targetExists: false,
      unmatchedKept: 0,
      sampleUnexpectedKept: [],
      sampleKept: [],
      bigPool: false,
      summary: '先完成第 1 步位次数据加载，再设置家庭底线。'
    };
  }

  function filterRecords(records, family) {
    records = Array.isArray(records) ? records : [];
    family = family || {};
    var provinces = normalizeList(family.provinces);
    var regionMode = family.regionMode || 'none';
    var rejectHigh = family.feeType === 'rejectHigh' || (family.rejects || []).indexOf('高收费') !== -1 || family.budget === 'strict';
    var rejectNonPublic = (family.rejects || []).indexOf('民办独立') !== -1;
    var filtered = filterRecords(records, family);
    var removed = filtered.removed;
    var unmatchedKept = filtered.unmatchedKept;
    var sampleUnexpectedKept = filtered.sampleUnexpectedKept;
    var kept = filtered.records;
    return { records: kept, removed: removed, unmatchedKept: unmatchedKept, sampleUnexpectedKept: sampleUnexpectedKept };
  }

  function applyFamily(records, family) {
    records = Array.isArray(records) ? records : [];
    family = family || {};
    if (!records.length) return makeEmpty('no-loaded-records');
    var provinces = normalizeList(family.provinces);
    var regionMode = family.regionMode || 'none';
    var rejectHigh = family.feeType === 'rejectHigh' || (family.rejects || []).indexOf('高收费') !== -1 || family.budget === 'strict';
    var rejectNonPublic = (family.rejects || []).indexOf('民办独立') !== -1;
    var targetExists = provinces.length ? records.some(function (item) { return isRecordInAnyProvince(item, provinces); }) : false;
    var filtered = filterRecords(records, family);
    var removed = filtered.removed;
    var unmatchedKept = filtered.unmatchedKept;
    var sampleUnexpectedKept = filtered.sampleUnexpectedKept;
    var kept = filtered.records;
    var summary = buildSummary(family, records.length, kept.length, removed, targetExists);
    return {
      ok: true,
      reason: 'v3-family-preview-only',
      basePool: records.length,
      filteredPreview: kept.length,
      removed: removed,
      targetExists: targetExists,
      unmatchedKept: unmatchedKept,
      sampleUnexpectedKept: sampleUnexpectedKept,
      sampleKept: kept.slice(0, 5).map(compact),
      bigPool: kept.length > 5000,
      summary: summary
    };
  }
  function compact(item) {
    return {
      school: item.school || '',
      major: item.major || '',
      score2025: item.score2025 || '',
      rank2025: item.rank2025 || '',
      schoolProvince: item.schoolProvince || '',
      lnArea: item.lnArea || '',
      isHighFee: item.isHighFee === true,
      schoolNatureLabel: item.schoolNatureLabel || ''
    };
  }
  function buildSummary(family, total, kept, removed, targetExists) {
    var parts = [];
    var provinces = normalizeList(family.provinces);
    if ((family.regionMode || 'none') === 'hard' && provinces.length) {
      parts.push('只看' + provinces.join('、'));
      if (!targetExists) parts.push('当前分段里暂未发现目标省份样本');
    } else if ((family.regionMode || 'none') === 'soft' && provinces.length) {
      parts.push('优先考虑' + provinces.join('、'));
    } else {
      parts.push('地域暂不硬限制');
    }
    if (family.feeType === 'rejectHigh' || (family.rejects || []).indexOf('高收费') !== -1 || family.budget === 'strict') parts.push('排除高收费');
    var text = parts.join('，') + '。当前预览从 ' + total + ' 条缩到 ' + kept + ' 条。';
    if (kept > 5000) text += '候选仍然偏多，后面建议继续收窄地域、预算或开启真实命中兴趣。';
    if (removed.region || removed.highFee || removed.nature) text += '已预览排除：地域 ' + removed.region + ' 条，高收费 ' + removed.highFee + ' 条。';
    return text;
  }
  function preview(family) {
    return applyFamily(getRecords(), family || ((window.LN_V3_STORE && window.LN_V3_STORE.getState().family) || {}));
  }

  function getPreviewRecords(family) {
    var records = getRecords();
    family = family || ((window.LN_V3_STORE && window.LN_V3_STORE.getState().family) || {});
    if (!records.length) return { ok: false, reason: 'no-loaded-records', records: [], basePool: 0, filteredPreview: 0, preview: makeEmpty('no-loaded-records') };
    var filtered = filterRecords(records, family || {});
    var preview = applyFamily(records, family || {});
    return {
      ok: true,
      reason: 'v3-family-filter-records',
      records: filtered.records,
      basePool: records.length,
      filteredPreview: filtered.records.length,
      preview: preview,
      removed: filtered.removed,
      unmatchedKept: filtered.unmatchedKept
    };
  }

  window.LN_V3_FAMILY_FILTER = {
    preview: preview,
    applyFamily: applyFamily,
    getRecords: getRecords,
    getPreviewRecords: getPreviewRecords,
    filterRecords: filterRecords,
    _isRecordInProvince: isRecordInProvince,
    _isHighFeeRecord: isHighFeeRecord,
    _normalizeList: normalizeList
  };
})();
