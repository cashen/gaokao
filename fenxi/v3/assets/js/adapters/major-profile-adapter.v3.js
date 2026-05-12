(function () {
  'use strict';
  var GROUP_RULES = {
    computer_ai: { label: '计算机/AI方向', family: '工学/计算机相关', path: '技术迭代快，本科阶段要看数学、代码、项目训练和学校平台。', risks: ['强代码与持续学习', '热门词误认', '低分段成本与培养质量复核'] },
    electronic_comm: { label: '电子信息/通信方向', family: '工学/电子信息类', path: '偏硬件、通信、芯片、信号和嵌入式，课程常见电路、信号、通信原理。', risks: ['数学物理基础', '学校实验平台', '芯片/微电子方向门槛'] },
    electric_energy: { label: '电气能源/自动化方向', family: '工学/电气能源控制相关', path: '电气工程是电力主线，自动化/能源动力属于相近工程路径，不能全部当成纯电气。', risks: ['正主电气与相近自动化要分清', '行业路径需看学校和地域', '低分段先看真实机会'] },
    mechanical_instrument: { label: '机械车辆/智能制造方向', family: '工学/装备制造相关', path: '偏传统工科底盘，智能制造、车辆、仪器方向差异较大。', risks: ['工作场景差异', '机械与电气/计算机混淆', '课程强度'] },
    medicine_health: { label: '医学药学/健康方向', family: '医学/药学/医学技术相关', path: '医学内部差异极大，临床、药学、医学技术、护理不能混为一谈。', risks: ['培养周期长', '执业资格差异', '医学技术不等于临床医学'] },
    agri_animal_food: { label: '农学动物医学/食品方向', family: '农学/食品相关', path: '动物医学属于农学门类下动物医学类，不是医学门类；食品更偏工艺、检测和安全。', risks: ['行业场景差异', '动物医学不等于临床医学', '地域和实践条件'] },
    finance_manage: { label: '经管金融方向', family: '经管/管理科学相关', path: '经管类要看学校平台、城市资源、证书/实习和专业真实内涵。', risks: ['泛管理偏宽', '金融不等于高薪', '大数据管理不等于计算机'] },
    law_human_edu: { label: '法学人文/教育方向', family: '法学/文学/教育相关', path: '更看重表达、考试、长期积累和资格路径。', risks: ['法学不等于天然稳定', '师范属性需核验', '就业路径依赖个人投入'] },
    science_material: { label: '理学基础/新材料方向', family: '理学/材料/环境相关', path: '通常更依赖继续深造和学科基础，本科出口需要提前复核。', risks: ['读研依赖', '基础学科耐受度', '材料环境方向出口差异'] }
  };
  var MISREAD_RULES = [
    { id: 'data_science_vs_management', keywords: ['大数据管理与应用'], message: '大数据管理与应用属于管理科学与工程类，不等同于计算机类的大数据技术。', tag: '易混专业', evidence: '模型判断' },
    { id: 'data_science_cs', keywords: ['数据科学与大数据技术'], message: '数据科学与大数据技术通常归入计算机类，和大数据管理与应用不是一回事。', tag: '本科目录复核', evidence: '模型判断' },
    { id: 'automation_not_cs', keywords: ['自动化'], message: '自动化不等同于计算机，也不等同于纯电气，更偏控制、系统和工程应用。', tag: '名称复核', evidence: '模型判断' },
    { id: 'instrument_not_electrical', keywords: ['测控技术与仪器', '精密仪器', '智能感知工程'], message: '仪器/测控不等同于电气工程，更偏测量、控制、传感和仪器。', tag: '名称复核', evidence: '模型判断' },
    { id: 'animal_medicine_not_clinical', keywords: ['动物医学', '动物药学', '动植物检疫'], message: '动物医学属于农学门类下的动物医学类，不是医学门类。', tag: '名称复核', evidence: '模型判断' },
    { id: 'pharmacy_not_clinical', keywords: ['药学', '临床药学', '药物制剂'], message: '药学不等同于临床医生方向，要分清临床医学、药学、医学技术和护理。', tag: '名称复核', evidence: '模型判断' },
    { id: 'medical_tech_not_clinical', keywords: ['医学检验技术', '医学影像技术', '康复治疗学', '口腔医学技术'], message: '医学技术类不等同于临床医学，培养目标和执业路径需要单独核验。', tag: '名称复核', evidence: '模型判断' },
    { id: 'law_path_review', keywords: ['法学', '知识产权'], message: '法学不等于天然稳定，稳定通常来自法考、公考、学校层次和个人长期投入。', tag: '路径复核', evidence: '模型判断' }
  ];
  function text(v) { return String(v || '').trim(); }
  function groupNames(ids) { return (ids || []).map(function (id) { return GROUP_RULES[id] ? GROUP_RULES[id].label : id; }); }
  function matchRules(major) {
    var name = text(major);
    return MISREAD_RULES.filter(function (rule) { return (rule.keywords || []).some(function (k) { return name.indexOf(k) !== -1; }); });
  }
  function studentNotices(groupIds, student) {
    var derived = window.LN_V3_STUDENT_PROFILE ? window.LN_V3_STUDENT_PROFILE.derive(student || {}) : { reviewTags: [], preferenceTags: [] };
    var notices = [];
    if ((derived.reviewTags || []).indexOf('learning_load') !== -1) {
      if (groupIds.indexOf('computer_ai') !== -1) notices.push('学习强度敏感：计算机/AI方向要复核强代码和持续学习压力。');
      if (groupIds.indexOf('medicine_health') !== -1) notices.push('学习强度敏感：医学健康方向要复核培养周期和学习负荷。');
      if (groupIds.indexOf('electric_energy') !== -1 || groupIds.indexOf('electronic_comm') !== -1) notices.push('学习强度敏感：电气/电子/自动化方向要复核数学物理和工科训练强度。');
    }
    if ((derived.reviewTags || []).indexOf('misread_review') !== -1) notices.push('孩子目前对专业理解可能还停在热门词，详细卡片会强化名称和本科目录复核。');
    if ((derived.preferenceTags || []).indexOf('work_first') !== -1) {
      if (groupIds.indexOf('science_material') !== -1 || groupIds.indexOf('medicine_health') !== -1) notices.push('本科就业优先：理学、材料、医学相关方向要复核本科出口和读研依赖。');
    }
    return notices.slice(0, 4);
  }
  function profileSelection(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var child = state.childPreference || {};
    var groups = (child.selectedGroups || []).map(function (g) { return g.id; }).filter(Boolean);
    var majors = (child.selectedMajors || []).map(function (m) { return m.name; }).filter(Boolean);
    var groupProfiles = groups.map(function (id) { return Object.assign({ id: id }, GROUP_RULES[id] || { label: id, path: '需要复核专业内涵。', risks: ['培养方案复核'] }); });
    var misread = [];
    majors.forEach(function (m) { misread = misread.concat(matchRules(m).map(function (rule) { return Object.assign({ major: m }, rule); })); });
    var profileNotices = studentNotices(groups, state.studentProfile || {});
    var tags = [];
    groupProfiles.forEach(function (p) { tags.push(p.label); });
    misread.forEach(function (m) { tags.push(m.tag); });
    profileNotices.forEach(function () { tags.push('画像提醒'); });
    var summary = '专业画像只用于解释和复核，不作为硬筛选。';
    if (groupProfiles.length) summary = '已生成' + groupProfiles.length + '个方向的专业画像，后续详细卡片会区分正主、相近和需复核方向。';
    if (misread.length) summary += ' 当前存在名称/路径复核点。';
    return { ok: true, hardExclude: false, selectedGroupCount: groups.length, selectedMajorCount: majors.length, groupProfiles: groupProfiles, misreadRules: misread.slice(0, 6), profileNotices: profileNotices, evidenceLevel: '模型判断 + 待复核', tags: Array.from(new Set(tags)).slice(0, 8), summary: summary };
  }
  function profileRecord(record, child, student) {
    var major = text(record && record.major);
    var rules = matchRules(major);
    var groupIds = (child && child.selectedGroups || []).map(function (g) { return g.id; });
    var notices = studentNotices(groupIds, student || {});
    return { major: major, tags: rules.map(function (r) { return r.tag; }), warnings: rules.map(function (r) { return r.message; }).concat(notices).slice(0, 4), evidenceLevel: rules.length ? '需复核' : '模型判断', hardExclude: false };
  }
  window.LN_V3_MAJOR_PROFILE = { GROUP_RULES: GROUP_RULES, MISREAD_RULES: MISREAD_RULES, profileSelection: profileSelection, profileRecord: profileRecord, matchRules: matchRules, ready: true };
})();
