(function () {
  'use strict';

  var PROTECTED_PATTERNS = [
    { id: 'minority', label: '少数民族/预科/民族班', re: /少数民族|民族班|预科|预科班|民族预科/ },
    { id: 'special_plan', label: '专项计划', re: /高校专项|高校专项计划|国家专项|国家专项计划|地方专项|地方专项计划|专项计划|农村专项|辽宁省高校专项计划/ },
    { id: 'directed', label: '定向/订单/公费类', re: /定向|订单定向|免费医学定向|公费师范|优师专项|乡村医生|辽西北/ },
    { id: 'political_physical', label: '政审/体检/特殊条件', re: /政审|体检|面试|军校|公安|司法|航海类|空乘|飞行技术/ }
  ];

  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function haystack(record) {
    record = record || {};
    return [
      record.major,
      record.school,
      record.remark,
      record.note,
      record.notes,
      record.batch,
      record.category,
      record.planType,
      record.specialType,
      Array.isArray(record.riskFlags) ? record.riskFlags.join(' ') : record.riskFlags
    ].map(text).filter(Boolean).join(' ');
  }
  function analyze(record) {
    var h = haystack(record);
    var hits = PROTECTED_PATTERNS.filter(function (item) { return item.re.test(h); }).map(function (item) {
      return { id: item.id, label: item.label };
    });
    return {
      protected: hits.length > 0,
      hits: hits,
      labels: hits.map(function (item) { return item.label; }),
      reason: hits.map(function (item) { return item.label; }).join('、')
    };
  }
  function shouldExclude(family) {
    family = family || {};
    var rejects = Array.isArray(family.rejects) ? family.rejects : [];
    if (family.qualificationMode === 'include') return false;
    if (rejects.indexOf('查看资格计划') !== -1) return false;
    if (family.qualificationMode === 'exclude') return true;
    if (rejects.indexOf('资格计划') !== -1) return true;
    // RC1.fix3: default is protection on. A family must explicitly open qualification items.
    return true;
  }
  function normalizeFamily(family) {
    family = family || {};
    var copy = Object.assign({}, family);
    copy.rejects = Array.isArray(copy.rejects) ? copy.rejects.slice() : [];
    if (copy.qualificationMode !== 'include') {
      copy.qualificationMode = 'exclude';
      if (copy.rejects.indexOf('资格计划') === -1) copy.rejects.push('资格计划');
      copy.rejects = copy.rejects.filter(function (x) { return x !== '查看资格计划'; });
    } else {
      copy.rejects = copy.rejects.filter(function (x) { return x !== '资格计划'; });
      if (copy.rejects.indexOf('查看资格计划') === -1) copy.rejects.push('查看资格计划');
    }
    return copy;
  }
  function staticPlan() {
    return {
      stage: 'rc1fix4-scoreband-major-guard',
      defaultMode: 'exclude',
      label: '资格型计划默认过滤',
      protectedTypes: PROTECTED_PATTERNS.map(function (item) { return item.label; }),
      examples: ['少数民族预科', '民族班', '高校专项计划', '国家专项/地方专项', '定向/免费医学定向', '公费师范/优师专项'],
      safety: '默认不把需要额外资格、政审体检或专项条件的计划混入普通家庭候选；用户可在 Step2 手动打开临时查看。'
    };
  }

  window.LN_V3_QUALIFICATION_FILTER = {
    analyze: analyze,
    isProtected: function (record) { return analyze(record).protected; },
    shouldExclude: shouldExclude,
    normalizeFamily: normalizeFamily,
    staticPlan: staticPlan,
    patterns: PROTECTED_PATTERNS.slice()
  };
})();
