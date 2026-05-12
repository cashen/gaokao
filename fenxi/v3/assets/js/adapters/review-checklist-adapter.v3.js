(function () {
  'use strict';
  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function hasAny(haystack, patterns) {
    haystack = text(haystack);
    return patterns.some(function (p) { return p.test(haystack); });
  }
  function addTask(list, type, title, detail, source, level) {
    if (list.some(function (item) { return item.type === type && item.title === title; })) return;
    list.push({
      type: type || 'review',
      title: title,
      detail: detail || '',
      source: source || '系统提醒',
      level: level || '待复核'
    });
  }
  function counterNames(state) {
    var cards = ((state.counterfactual || {}).cards || []).filter(function (card) { return Number(card.delta || 0) !== 0; });
    var names = [];
    cards.forEach(function (card) {
      if (card.type === 'region') names.push('地域松紧');
      else if (card.type === 'interest') names.push('兴趣真实命中');
      else if (card.type === 'cost') names.push('高收费/中外合作');
      else if (card.type === 'qualification') names.push('资格型计划');
      else if (card.type === 'nature') names.push('学校性质');
    });
    return names.filter(function (x, i) { return names.indexOf(x) === i; });
  }
  function fromCards(tasks, state) {
    var cards = ((state.candidates || {}).list || []).slice(0, 20);
    var allText = cards.map(function (card) {
      return [card.school, card.major, card.evidenceLevel, card.evidenceSummary, (card.reviewTags || []).join(' '), (card.nextReview || []).join(' ')].join(' ');
    }).join(' ');
    if (hasAny(allText, [/专业|正主|相近|名称误认|培养方向|培养方案|课程结构|热门词|大数据|自动化|计算机|学习强度|数学|代码|长周期/])) {
      addTask(tasks, 'major_content', '专业真实内容复核', '核对本科专业目录、培养方案和核心课程，确认是正主方向、相近方向，还是名称容易误认。', '详细卡片', '优先');
    }
    if (hasAny(allText, [/招生章程|招生计划|录取规则|校区|转专业|专项计划|高校专项|定向|预科|民族班|单列|合作办学/])) {
      addTask(tasks, 'admission_rule', '招生章程复核', '核对招生章程、招生计划、校区、单列/专项/合作办学说明，确认是否普通家庭可直接填报。', '详细卡片', '优先');
    }
    if (hasAny(allText, [/学费|费用|中外合作|高收费|校区|资格|专项|定向|预科|民族班|学校性质|办学性质|待核验|缺失/])) {
      addTask(tasks, 'cost_qualification', '资格 / 费用 / 校区复核', '确认学费、住宿/校区、中外合作/高收费、专项/预科/定向资格，不把需资格项目当普通计划。', '详细卡片', '优先');
    }
  }
  function fromState(tasks, state) {
    var family = state.family || {};
    var child = state.childPreference || {};
    var profile = state.studentProfile || {};
    var majorProfile = (child.preview && child.preview.majorProfile) || (state.scenario && state.scenario.preview && state.scenario.preview.majorProfile) || {};
    if (family.regionMode === 'hard') {
      addTask(tasks, 'region', '确认地域底线是否绝对', '当前是“只看 ' + (family.provinces || []).join('、') + '”，建议家庭再确认是否完全不能出省。', '家庭底线', '待确认');
    }
    if (family.feeType !== 'no_high_fee' && !(family.rejects || []).some(function (x) { return /高收费|中外/.test(x); })) {
      addTask(tasks, 'cost_qualification', '资格 / 费用 / 校区复核', '当前费用条件未强排高收费，详细卡片里需要逐条看学费、合作办学、校区和资格条件。', '家庭底线', '优先');
    }
    if (family.qualificationMode === 'include' || (family.rejects || []).indexOf('查看资格计划') !== -1) {
      addTask(tasks, 'cost_qualification', '资格 / 费用 / 校区复核', '已临时打开少数民族预科、专项计划、定向等需资格项目，必须逐条确认孩子是否具备资格。', '家庭底线', '优先');
    }
    if (child.manualOnly) {
      addTask(tasks, 'interest', '确认兴趣池是否过窄', '已开启只看真实命中，可能排掉部分稳妥但非正命中的机会。', '孩子兴趣', '待确认');
    }
    if ((profile.reviewTags || []).indexOf('learning_load') !== -1 || (profile.reviewTags || []).indexOf('misread_review') !== -1) {
      addTask(tasks, 'major_content', '专业真实内容复核', '孩子可能只知道热门词，建议用本科专业目录、培养方案和课程表确认专业真实内容与学习强度。', '学生画像', '优先');
    }
    (majorProfile.misreadRules || []).forEach(function (rule) {
      addTask(tasks, 'major_content', '专业真实内容复核', rule.message || '存在名称或方向误认风险，建议核对培养方案和课程结构。', '专业画像', '优先');
    });
    var names = counterNames(state);
    if (names.length) {
      addTask(tasks, 'choice', '看一次条件变化对照', '重点比较：' + names.join('、') + ' 调整后候选池如何变化。', '条件变化对照', '建议');
    }
    if ((state.shortlist || {}).items && (state.shortlist.items || []).length === 0) {
      addTask(tasks, 'shortlist', '至少加入 3–5 个自选项', '先把值得家庭讨论的卡片放入自选池，后面再做横向比较。', '自选池', '建议');
    }
  }
  function generate(state) {
    state = state || (window.LN_V3_STORE && window.LN_V3_STORE.getState && window.LN_V3_STORE.getState()) || {};
    var tasks = [];
    fromState(tasks, state);
    fromCards(tasks, state);
    tasks = tasks.slice(0, 8);
    return {
      ok: true,
      count: tasks.length,
      tasks: tasks,
      urgentCount: tasks.filter(function (t) { return t.level === '优先'; }).length,
      summary: tasks.length ? ('已生成 ' + tasks.length + ' 项复核任务，其中 ' + tasks.filter(function (t) { return t.level === '优先'; }).length + ' 项建议优先处理。') : '当前暂无明显复核任务。'
    };
  }
  function apply(reason) {
    var state = window.LN_V3_STORE && window.LN_V3_STORE.getState ? window.LN_V3_STORE.getState() : {};
    var preview = generate(state);
    if (window.LN_V3_STORE) window.LN_V3_STORE.setState({ reviewChecklist: preview }, reason || 'review-checklist:apply');
    return preview;
  }
  window.LN_V3_REVIEW_CHECKLIST = Object.freeze({ generate: generate, apply: apply });
})();
