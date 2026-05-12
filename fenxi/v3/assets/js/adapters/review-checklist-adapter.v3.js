(function () {
  'use strict';
  function uniq(list) {
    var seen = {};
    return (list || []).filter(function (item) {
      var key = (item.type || '') + '|' + (item.title || '') + '|' + (item.detail || '');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function addTask(list, type, title, detail, source, level) {
    list.push({
      type: type || 'review',
      title: title,
      detail: detail || '',
      source: source || '系统提醒',
      level: level || '待复核'
    });
  }
  function fromCards(tasks, state) {
    var cards = ((state.candidates || {}).list || []).slice(0, 12);
    cards.forEach(function (card) {
      if (/中外合作|高收费/.test(String(card.major || '') + ' ' + (card.reviewTags || []).join(' '))) {
        addTask(tasks, 'cost', '复核学费 / 中外合作', (card.school || '') + '｜' + (card.major || ''), '详细卡片', '优先');
      }
      if (/自动化|机械|新能源|能源/.test(String(card.major || '')) || /正主|相近|复核/.test((card.reviewTags || []).join(' '))) {
        addTask(tasks, 'major', '复核专业正主程度', (card.major || '') + '：看培养方案、专业代码和课程结构。', '专业画像', '优先');
      }
      if (card.evidenceLevel && /复核|需要/.test(card.evidenceLevel)) {
        addTask(tasks, 'evidence', '复核证据等级', (card.school || '') + '｜' + (card.major || '') + ' 仍有模型判断项。', '证据等级', '待复核');
      }
    });
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
      addTask(tasks, 'cost', '确认是否接受高收费 / 中外合作', '当前费用条件未强排高收费，详细卡片里需要逐条看学费和合作办学。', '家庭底线', '优先');
    }
    if (family.qualificationMode === 'include' || (family.rejects || []).indexOf('查看资格计划') !== -1) {
      tasks.push({ type: 'qualification', title: '复核资格型计划报考条件', detail: '已临时打开少数民族预科、专项计划、定向等需资格项目，必须逐条确认孩子是否具备资格。', source: '家庭底线', level: '优先' });
    }
    if (child.manualOnly) {
      addTask(tasks, 'interest', '确认兴趣池是否过窄', '已开启只看真实命中，当前可能会排掉部分稳妥但非正命中的机会。', '孩子兴趣', '待确认');
    }
    if ((profile.reviewTags || []).indexOf('learning_load') !== -1) {
      addTask(tasks, 'profile', '复核学习强度', '强数学、强代码、长周期方向需要和孩子确认能否接受。', '学生画像', '优先');
    }
    if ((profile.reviewTags || []).indexOf('misread_review') !== -1) {
      addTask(tasks, 'major', '复核热门词误读', '孩子可能只知道热门词，需要用本科目录、培养方案和课程表确认专业真实内容。', '学生画像', '优先');
    }
    (majorProfile.misreadRules || []).forEach(function (rule) {
      addTask(tasks, 'major', rule.tag || '名称复核', rule.message || '', '专业画像', '优先');
    });
    if ((state.counterfactual || {}).cards && (state.counterfactual.cards || []).length) {
      addTask(tasks, 'choice', '看一次条件变化对照', '重点比较：地域从只看改优先、关闭真实命中、排除高收费以后候选池如何变化。', '条件变化对照', '建议');
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
    tasks = uniq(tasks).slice(0, 8);
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
    if (window.LN_V3_STORE) {
      window.LN_V3_STORE.setState({ reviewChecklist: preview }, reason || 'review-checklist:apply');
    }
    return preview;
  }
  window.LN_V3_REVIEW_CHECKLIST = Object.freeze({ generate: generate, apply: apply });
})();
