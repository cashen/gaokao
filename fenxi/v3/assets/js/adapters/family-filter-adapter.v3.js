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
  function qualification() { return window.LN_V3_QUALIFICATION_FILTER || null; }
  function shouldExcludeQualification(family) {
    var q = qualification();
    if (q && q.shouldExclude) return q.shouldExclude(family || {});
    family = family || {};
    return family.qualificationMode !== 'include';
  }
  function isQualificationRecord(record) {
    var q = qualification();
    if (q && q.isProtected) return q.isProtected(record);
    return /少数民族|民族班|预科|高校专项|专项计划|定向|公费师范|优师专项|政审|体检/.test(normalizeText(record && record.major));
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
      removed: { region: 0, highFee: 0, nature: 0, qualification: 0 },
      targetExists: false,
      unmatchedKept: 0,
      sampleUnexpectedKept: [],
      sampleKept: [],
      qualificationMode: 'exclude',
      bigPool: false,
      summary: '先完成第 1 步位次数据加载，再设置家庭底线。'
    };
  }

  function normalizeFamily(family) {
    var q = qualification();
    if (q && q.normalizeFamily) return q.normalizeFamily(family || {});
    family = family || {};
    var copy = Object.assign({}, family);
    copy.rejects = Array.isArray(copy.rejects) ? copy.rejects.slice() : [];
    copy.qualificationMode = copy.qualificationMode === 'include' ? 'include' : 'exclude';
    if (copy.qualificationMode !== 'include' && copy.rejects.indexOf('资格计划') === -1) copy.rejects.push('资格计划');
    return copy;
  }

  function filterRecords(records, family) {
    records = Array.isArray(records) ? records : [];
    family = normalizeFamily(family || {});
    var provinces = normalizeList(family.provinces);
    var regionMode = family.regionMode || 'none';
    var rejectHigh = family.feeType === 'rejectHigh' || (family.rejects || []).indexOf('高收费') !== -1 || family.budget === 'strict';
    var rejectNonPublic = (family.rejects || []).indexOf('民办独立') !== -1;
    var rejectQualification = shouldExcludeQualification(family);
    var removed = { region: 0, highFee: 0, nature: 0, qualification: 0 };
    var kept = [];
    var unmatchedKept = 0;
    var sampleUnexpectedKept = [];
    var sampleQualificationRemoved = [];

    records.forEach(function (record) {
      var keep = true;
      var inTargetProvince = !provinces.length || isRecordInAnyProvince(record, provinces);

      if (regionMode === 'hard' && provinces.length && !inTargetProvince) {
        removed.region += 1;
        keep = false;
      }
      if (keep && rejectHigh && isHighFeeRecord(record)) {
        removed.highFee += 1;
        keep = false;
      }
      if (keep && rejectNonPublic && !isPublicLike(record)) {
        removed.nature += 1;
        keep = false;
      }
      if (keep && rejectQualification && isQualificationRecord(record)) {
        removed.qualification += 1;
        if (sampleQualificationRemoved.length < 5) sampleQualificationRemoved.push(compact(record));
        keep = false;
      }
      if (keep) {
        if (regionMode === 'hard' && provinces.length && !inTargetProvince) {
          unmatchedKept += 1;
          if (sampleUnexpectedKept.length < 5) sampleUnexpectedKept.push(compact(record));
        }
        kept.push(record);
      }
    });

    return {
      records: kept,
      removed: removed,
      unmatchedKept: unmatchedKept,
      sampleUnexpectedKept: sampleUnexpectedKept,
      sampleQualificationRemoved: sampleQualificationRemoved
    };
  }

  function applyFamily(records, family) {
    records = Array.isArray(records) ? records : [];
    family = normalizeFamily(family || {});
    if (!records.length) return makeEmpty('no-loaded-records');
    var provinces = normalizeList(family.provinces);
    var targetExists = provinces.length ? records.some(function (item) { return isRecordInAnyProvince(item, provinces); }) : false;
    var filtered = filterRecords(records, family);
    var removed = filtered.removed;
    var kept = filtered.records;
    var summary = buildSummary(family, records.length, kept.length, removed, targetExists);
    return {
      ok: true,
      reason: 'v3-family-preview-only',
      basePool: records.length,
      filteredPreview: kept.length,
      removed: removed,
      targetExists: targetExists,
      unmatchedKept: filtered.unmatchedKept,
      sampleUnexpectedKept: filtered.sampleUnexpectedKept,
      sampleQualificationRemoved: filtered.sampleQualificationRemoved,
      sampleKept: kept.slice(0, 5).map(compact),
      qualificationMode: family.qualificationMode || 'exclude',
      qualificationDefaultExcluded: shouldExcludeQualification(family),
      bigPool: kept.length > 5000,
      summary: summary
    };
  }
  function compact(item) {
    var q = qualification();
    var qa = q && q.analyze ? q.analyze(item) : { protected: false, labels: [] };
    return {
      school: item.school || '',
      major: item.major || '',
      score2025: item.score2025 || '',
      rank2025: item.rank2025 || '',
      schoolProvince: item.schoolProvince || '',
      lnArea: item.lnArea || '',
      isHighFee: item.isHighFee === true,
      schoolNatureLabel: item.schoolNatureLabel || '',
      qualificationProtected: !!qa.protected,
      qualificationLabels: qa.labels || []
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
    if (shouldExcludeQualification(family)) parts.push('默认不看资格型计划');
    else parts.push('临时查看资格型计划');
    var text = parts.join('，') + '。当前预览从 ' + total + ' 条缩到 ' + kept + ' 条。';
    if (kept > 5000) text += '候选仍然偏多，后面建议继续收窄地域、预算或开启真实命中兴趣。';
    var removedBits = [];
    if (removed.region) removedBits.push('地域 ' + removed.region + ' 条');
    if (removed.highFee) removedBits.push('高收费 ' + removed.highFee + ' 条');
    if (removed.nature) removedBits.push('学校性质 ' + removed.nature + ' 条');
    if (removed.qualification) removedBits.push('资格型计划 ' + removed.qualification + ' 条');
    if (removedBits.length) text += '已预览排除：' + removedBits.join('，') + '。';
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
    normalizeFamily: normalizeFamily,
    _isRecordInProvince: isRecordInProvince,
    _isHighFeeRecord: isHighFeeRecord,
    _isQualificationRecord: isQualificationRecord,
    _normalizeList: normalizeList
  };
})();
