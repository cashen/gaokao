(function () {
  'use strict';
  var OPTIONS = {
    gender: [['unspecified', '不填写'], ['female', '女'], ['male', '男']],
    source: [['child_self', '孩子自己表达'], ['parent_observe', '家长观察'], ['family_discussion', '家庭讨论'], ['unconfirmed', '暂未确认']],
    learning: [['science', '偏理工'], ['expression', '偏表达'], ['practice', '偏动手实践'], ['path_clear', '偏稳定路径'], ['unclear', '暂不确定']],
    load: [['normal', '正常'], ['sensitive', '对强度较敏感'], ['unknown', '暂不确定']],
    path: [['grad_ok', '能接受读研'], ['exam_ok', '能接受考证考编'], ['work_first', '更希望本科就业'], ['unknown', '暂不确定']],
    understanding: [['has_direction', '已有大概方向'], ['hot_words', '只知道几个热门词'], ['unclear', '还没想清楚']]
  };
  var DEFAULT_STATE = { gender: 'unspecified', source: 'unconfirmed', learning: 'unclear', load: 'unknown', path: 'unknown', understanding: 'unclear', tags: [], preferenceTags: [], reviewTags: [], summary: '学生画像未补充：只用于调整提醒顺序，不作为专业排除条件。', hardExclude: false };
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function optionLabel(group, value) {
    var hit = (OPTIONS[group] || []).find(function (item) { return item[0] === value; });
    return hit ? hit[1] : String(value || '');
  }
  function clean(input) {
    var out = Object.assign({}, DEFAULT_STATE, input || {});
    Object.keys(OPTIONS).forEach(function (key) {
      if (!(OPTIONS[key] || []).some(function (item) { return item[0] === out[key]; })) out[key] = DEFAULT_STATE[key];
    });
    return out;
  }
  function tagsFrom(state) {
    var s = clean(state);
    var tags = [];
    if (s.gender === 'female') tags.push('画像：女孩');
    if (s.gender === 'male') tags.push('画像：男孩');
    if (s.learning === 'science') tags.push('偏理工');
    if (s.learning === 'expression') tags.push('偏表达');
    if (s.learning === 'practice') tags.push('偏实践');
    if (s.learning === 'path_clear') tags.push('关注路径清楚');
    if (s.load === 'sensitive') tags.push('学习强度需复核');
    if (s.path === 'grad_ok') tags.push('可接受读研');
    if (s.path === 'exam_ok') tags.push('可接受考证考编');
    if (s.path === 'work_first') tags.push('本科就业优先');
    if (s.understanding === 'hot_words') tags.push('需分清热门词');
    return tags;
  }
  function derive(state) {
    var s = clean(state);
    var preferenceTags = [];
    var reviewTags = [];
    if (s.learning === 'expression') preferenceTags.push('expression', 'humanities');
    if (s.learning === 'science') preferenceTags.push('science', 'engineering');
    if (s.learning === 'practice') preferenceTags.push('practice', 'engineering');
    if (s.learning === 'path_clear') preferenceTags.push('path_clear');
    if (s.load === 'sensitive') reviewTags.push('learning_load');
    if (s.path === 'grad_ok') preferenceTags.push('grad_path');
    if (s.path === 'exam_ok') preferenceTags.push('exam_path');
    if (s.path === 'work_first') preferenceTags.push('work_first');
    if (s.understanding === 'hot_words' || s.understanding === 'unclear') reviewTags.push('misread_review');
    return {
      state: s,
      tags: tagsFrom(s),
      preferenceTags: Array.from(new Set(preferenceTags)),
      reviewTags: Array.from(new Set(reviewTags)),
      hardExclude: false
    };
  }
  function notices(state) {
    var s = clean(state);
    var lines = [];
    if (s.source === 'parent_observe') lines.push('当前画像来自家长观察，后续最好让孩子确认一次。');
    if (s.source === 'family_discussion') lines.push('当前画像来自家庭讨论，系统按中等偏好处理。');
    if (s.source === 'child_self') lines.push('当前画像来自孩子自己表达，兴趣权重可以略高，但仍不高于家庭路径。');
    if (s.load === 'sensitive') lines.push('学习强度较敏感：强数学、强代码、医学长周期方向会前置复核提醒。');
    if (s.path === 'work_first') lines.push('本科就业优先：遇到读研依赖方向会提醒复核本科出口。');
    if (s.path === 'grad_ok') lines.push('能接受读研：深造依赖方向不直接降权，但仍要看本科平台。');
    if (s.understanding === 'hot_words') lines.push('只知道热门词：系统会强化易混专业和本科目录代码提醒。');
    return lines.slice(0, 4);
  }
  function summarize(state) {
    var d = derive(state);
    var lines = notices(d.state);
    if (!d.tags.length && !lines.length) return '学生画像未补充：只用于调整提醒顺序，不作为专业排除条件。';
    var prefix = d.tags.length ? d.tags.slice(0, 4).join('｜') + '。' : '';
    return prefix + (lines.length ? lines.join(' ') : '画像只调整提醒顺序，不硬筛专业。');
  }
  function normalized(state) {
    var d = derive(state);
    var s = Object.assign({}, d.state, { tags: d.tags, preferenceTags: d.preferenceTags, reviewTags: d.reviewTags, summary: summarize(d.state), hardExclude: false });
    return s;
  }
  function apply(patch, reason) {
    if (!window.LN_V3_STORE) return null;
    var current = window.LN_V3_STORE.getState().studentProfile || {};
    var next = normalized(Object.assign({}, current, patch || {}));
    window.LN_V3_STORE.setState({ studentProfile: next, ui: { lastMessage: next.summary } }, reason || 'studentProfile:apply');
    return next;
  }
  function optionsFor(field) { return clone(OPTIONS[field] || []); }
  window.LN_V3_STUDENT_PROFILE = { OPTIONS: OPTIONS, DEFAULT_STATE: DEFAULT_STATE, clean: clean, derive: derive, notices: notices, summarize: summarize, normalized: normalized, optionLabel: optionLabel, optionsFor: optionsFor, apply: apply, ready: true };
})();
