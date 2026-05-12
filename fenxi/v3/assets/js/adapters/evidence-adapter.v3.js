(function () {
  'use strict';

  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function hasValue(value) {
    var v = text(value);
    return !!v && !/待核验|待复核|需核验|暂无|未知|--|null|undefined/i.test(v);
  }
  function uniq(list) {
    var seen = Object.create(null);
    return (list || []).filter(function (item) {
      var key = text(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function boolTest(regex, item) {
    var s = [item.school, item.major, item.tuition2025, item.schoolNatureLabel, item.evidenceLevel, (item.reviewTags || []).join(' ')].map(text).join(' ');
    return regex.test(s);
  }
  function staticPlan() {
    return {
      stage: 'beta7-evidence-system',
      buckets: ['data_confirmed', 'model_judgement', 'needs_review', 'missing_data'],
      labels: {
        data_confirmed: '数据确认',
        model_judgement: '模型判断',
        needs_review: '需要复核',
        missing_data: '缺失数据'
      },
      rules: [
        '分数/位次来自当前已加载分块时标为数据确认。',
        '兴趣命中、专业正主/相近、学生画像提醒属于模型判断。',
        '学费、中外合作、学校性质、校区、招生章程等一律保留复核任务。',
        '空分数、空位次、待核验字段进入缺失数据桶，不假装确定。'
      ],
      safety: 'beta7 只增强证据等级与待核验表达，不改变候选生成、A/B/C 和家庭路径权重。'
    };
  }
  function assess(item, ctx) {
    item = item || {};
    ctx = ctx || {};
    var confirmed = [];
    var model = [];
    var review = [];
    var missing = [];
    var tasks = [];

    if (hasValue(item.score2025)) confirmed.push('2025分数'); else missing.push('2025分数');
    if (hasValue(item.rank2025)) confirmed.push('2025位次'); else missing.push('2025位次');
    if (hasValue(item.school) && hasValue(item.major)) confirmed.push('学校专业名称');
    if (hasValue(item.schoolProvince) || hasValue(item.lnArea)) confirmed.push('地域字段'); else missing.push('地域字段');

    if (hasValue(item.schoolNatureLabel) && !/需核验|待核验/.test(text(item.schoolNatureLabel))) confirmed.push('学校性质初判');
    else { review.push('学校性质'); tasks.push('复核学校性质/办学性质'); }

    if (hasValue(item.tuition2025)) confirmed.push('学费字段');
    else { review.push('学费'); missing.push('学费'); tasks.push('复核学费'); }

    if (boolTest(/中外合作|合作办学|高收费|国际|较高收费/, item)) {
      review.push('中外合作/高收费');
      tasks.push('复核合作办学、收费标准和培养方式');
    }
    if (item.matchReason) model.push('兴趣命中解释');
    if ((item.reviewTags || []).length) model.push('画像/专业提醒');
    if (boolTest(/自动化|新能源|能源|材料|测控|大数据|管理与应用/, item)) {
      review.push('专业正主程度');
      tasks.push('复核是否为正主专业、相近方向或名称误认');
    }
    if (boolTest(/金融学类|金融学|投资学|保险学|金融工程|金融科技/, item)) {
      review.push('金融类资源依赖');
      tasks.push('复核学校层级、实习资源和家庭资源是否支撑金融路径');
    }
    if (ctx && ctx.studentProfile && (ctx.studentProfile.reviewTags || []).length) {
      model.push('学生画像提醒');
      if ((ctx.studentProfile.reviewTags || []).indexOf('learning_load') !== -1) tasks.push('复核数学物理/代码/长周期学习强度');
      if ((ctx.studentProfile.reviewTags || []).indexOf('misread_review') !== -1) tasks.push('让孩子确认是否理解专业名称和培养方向');
    }
    if (ctx && ctx.region && ctx.region.level === 'bottomline') model.push('地域底线解释');

    var priority = 'normal';
    if (missing.length || review.indexOf('中外合作/高收费') !== -1 || review.indexOf('学费') !== -1) priority = 'high';
    var displayLevel = missing.length ? '缺失数据 + 需要复核' : (review.length ? '数据确认 + 需要复核' : '数据确认 + 模型判断');
    var summary = [];
    if (confirmed.length) summary.push('已确认：' + confirmed.slice(0, 3).join('、'));
    if (model.length) summary.push('模型判断：' + model.slice(0, 3).join('、'));
    if (review.length) summary.push('需复核：' + review.slice(0, 4).join('、'));
    if (missing.length) summary.push('缺失：' + missing.slice(0, 3).join('、'));
    return {
      ok: true,
      level: displayLevel,
      priority: priority,
      buckets: {
        data_confirmed: uniq(confirmed),
        model_judgement: uniq(model),
        needs_review: uniq(review),
        missing_data: uniq(missing)
      },
      tasks: uniq(tasks),
      summary: summary.join('；'),
      hasMissingData: missing.length > 0,
      hasReviewRisk: review.length > 0,
      labels: staticPlan().labels
    };
  }
  function summarizeCards(cards) {
    cards = cards || [];
    var stats = { total: cards.length, high: 0, missing: 0, review: 0, confirmedOnly: 0 };
    cards.forEach(function (card) {
      var ev = card.dataEvidence || assess(card, {});
      if (ev.priority === 'high') stats.high += 1;
      if (ev.hasMissingData) stats.missing += 1;
      if (ev.hasReviewRisk) stats.review += 1;
      if (!ev.hasMissingData && !ev.hasReviewRisk) stats.confirmedOnly += 1;
    });
    stats.summary = '证据等级：共 ' + stats.total + ' 条卡片，其中高优先复核 ' + stats.high + ' 条，存在缺失数据 ' + stats.missing + ' 条。';
    return stats;
  }
  window.LN_V3_EVIDENCE_ADAPTER = { staticPlan: staticPlan, assess: assess, summarizeCards: summarizeCards };
})();
