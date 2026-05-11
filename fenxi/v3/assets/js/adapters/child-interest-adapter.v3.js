(function () {
  'use strict';
  var GROUP_ALIASES = {
    computer_ai: ['计算机', '软件', '人工智能', '数据科学', '大数据技术', '网络空间安全', '信息安全', '物联网', '数字媒体技术', '智能科学'],
    electronic_comm: ['电子信息', '通信', '微电子', '集成电路', '电子科学', '光电信息', '电波传播', '电子封装', '电磁场', '芯片'],
    electric_energy: ['电气', '自动化', '智能电网', '能源与动力', '新能源', '储能', '电力', '能源动力', '电机', '电气工程'],
    mechanical_instrument: ['机械', '车辆', '测控', '仪器', '智能制造', '机器人工程', '飞行器', '过程装备', '材料成型', '工业设计'],
    medicine_health: ['临床医学', '口腔医学', '药学', '医学', '护理', '康复', '检验', '影像', '麻醉', '儿科', '中医'],
    agri_animal_food: ['动物医学', '动物科学', '食品', '农学', '园艺', '植物保护', '农业', '水产', '园林', '生物育种'],
    finance_manage: ['金融', '会计', '财务管理', '工商管理', '大数据管理', '工程造价', '工程管理', '经济', '审计', '物流管理'],
    law_human_edu: ['法学', '汉语言', '英语', '教育', '思想政治', '公共事业', '新闻', '历史', '外国语', '小学教育'],
    science_material: ['数学', '物理', '化学', '材料', '环境', '生物科学', '统计', '应用化学', '应用物理', '新能源材料']
  };
  function text(value) { return String(value || '').trim(); }
  function getRecords() {
    if (window.LN_V3_FAMILY_FILTER && window.LN_V3_FAMILY_FILTER.getPreviewRecords) {
      var payload = window.LN_V3_FAMILY_FILTER.getPreviewRecords();
      if (payload && Array.isArray(payload.records)) return payload.records;
    }
    var cache = window.LN_V3_DATA_CACHE || {};
    return Array.isArray(cache.records) ? cache.records : [];
  }
  function getFamilyFilteredPayload(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    if (window.LN_V3_FAMILY_FILTER && window.LN_V3_FAMILY_FILTER.getPreviewRecords) {
      return window.LN_V3_FAMILY_FILTER.getPreviewRecords(state.family || {});
    }
    var records = getRecords();
    return { ok: records.length > 0, records: records, preview: null, basePool: records.length, filteredPreview: records.length };
  }
  function groupById(id) {
    return window.LN_V3_CHILD_GROUPS && window.LN_V3_CHILD_GROUPS.find ? window.LN_V3_CHILD_GROUPS.find(id) : null;
  }
  function compact(item, match) {
    return {
      school: item.school || '',
      major: item.major || '',
      score2025: item.score2025 || '',
      rank2025: item.rank2025 || '',
      schoolProvince: item.schoolProvince || '',
      lnArea: item.lnArea || '',
      matchReason: match && match.reason ? match.reason : ''
    };
  }
  function buildKeywords(groupId) {
    var group = groupById(groupId);
    var keywords = [];
    if (group) keywords = keywords.concat(group.examples || []);
    keywords = keywords.concat(GROUP_ALIASES[groupId] || []);
    var seen = Object.create(null);
    return keywords.map(text).filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
  function selectedGroupIds(child) {
    return (child.selectedGroups || []).map(function (item) { return item.id; }).filter(Boolean);
  }
  function selectedMajorNames(child) {
    return (child.selectedMajors || []).map(function (item) { return item.name; }).filter(Boolean);
  }
  function matchRecord(record, child) {
    child = child || {};
    var majorText = text(record.major);
    if (!majorText) return null;
    var majors = selectedMajorNames(child);
    for (var i = 0; i < majors.length; i += 1) {
      if (majors[i] && majorText.indexOf(majors[i]) !== -1) {
        return { score: 1, type: 'major', id: 'major:' + majors[i], name: majors[i], reason: '具体专业命中：' + majors[i] };
      }
    }
    var groups = selectedGroupIds(child);
    for (var g = 0; g < groups.length; g += 1) {
      var groupId = groups[g];
      var keywords = buildKeywords(groupId);
      for (var k = 0; k < keywords.length; k += 1) {
        if (keywords[k] && majorText.indexOf(keywords[k]) !== -1) {
          var group = groupById(groupId) || { name: groupId };
          return { score: 0.84, type: 'group', id: groupId, name: group.name, reason: '方向命中：' + group.name + ' / ' + keywords[k] };
        }
      }
    }
    return null;
  }
  function emptyPreview(reason, state) {
    var rankRows = Number(((state || {}).rank || {}).loadedRows || 0);
    return {
      ok: false,
      reason: reason || 'no-data',
      basePool: rankRows,
      familyFilteredRows: 0,
      matchedRows: 0,
      effectiveFilteredRows: 0,
      manualOnly: false,
      selectedGroupCount: 0,
      selectedMajorCount: 0,
      groupHits: {},
      majorHits: {},
      sampleMatched: [],
      noMatchGroups: [],
      summary: '先完成第 1 步位次和第 2 步家庭底线，再看孩子兴趣命中情况。',
      advice: '先完成前两步。'
    };
  }
  function buildSummary(child, preview) {
    if (child.mode === 'unknown') return '孩子暂不确定，系统先按位次、家庭底线和稳妥路径推荐。';
    if (!preview.selectedGroupCount && !preview.selectedMajorCount) return '还没有选择专业方向。可以先选 1—3 个方向，也可以听系统推荐。';
    if (!preview.familyFilteredRows) return '当前底线池为空，先回到家庭底线检查地域或预算条件。';
    if (!preview.matchedRows) return '当前底线内暂未直接命中已选兴趣方向，建议放宽地域/预算，或先按系统稳妥路径看。';
    var text = '当前底线池 ' + preview.familyFilteredRows + ' 条，其中兴趣直接命中约 ' + preview.matchedRows + ' 条。';
    if (child.manualOnly) text += '已开启真实命中，后续候选会收窄到兴趣命中结果。';
    else text += '默认不硬排除，后续主要提升 B 方案里的相关专业。';
    return text;
  }
  function previewForState(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var child = state.childPreference || {};
    var payload = getFamilyFilteredPayload(state);
    var records = Array.isArray(payload.records) ? payload.records : [];
    if (!records.length) return emptyPreview('no-family-records', state);
    var groups = selectedGroupIds(child);
    var majors = selectedMajorNames(child);
    var groupHits = {};
    var majorHits = {};
    var matched = [];
    if (child.mode !== 'unknown' && (groups.length || majors.length)) {
      records.forEach(function (record) {
        var m = matchRecord(record, child);
        if (!m) return;
        matched.push({ record: record, match: m });
        if (m.type === 'group') groupHits[m.id] = (groupHits[m.id] || 0) + 1;
        if (m.type === 'major') majorHits[m.name] = (majorHits[m.name] || 0) + 1;
      });
    }
    var selectedNoHit = groups.filter(function (id) { return !groupHits[id]; }).map(function (id) { var group = groupById(id); return group ? group.name : id; });
    var effective = child.manualOnly ? matched.length : records.length;
    var preview = {
      ok: true,
      reason: 'v3-child-interest-preview-only',
      basePool: Number(payload.basePool || ((window.LN_V3_DATA_CACHE && window.LN_V3_DATA_CACHE.records || []).length) || records.length),
      familyFilteredRows: records.length,
      matchedRows: matched.length,
      effectiveFilteredRows: effective,
      manualOnly: !!child.manualOnly,
      selectedGroupCount: groups.length,
      selectedMajorCount: majors.length,
      groupHits: groupHits,
      majorHits: majorHits,
      sampleMatched: matched.slice(0, 6).map(function (item) { return compact(item.record, item.match); }),
      noMatchGroups: selectedNoHit,
      bigPool: effective > 5000,
      summary: '',
      advice: ''
    };
    preview.summary = buildSummary(child, preview);
    preview.advice = preview.summary;
    return preview;
  }
  window.LN_V3_CHILD_INTEREST = {
    previewForState: previewForState,
    matchRecord: matchRecord,
    getFamilyFilteredPayload: getFamilyFilteredPayload,
    _buildKeywords: buildKeywords
  };
})();
