(function () {
  'use strict';

  function text(value) { return String(value === null || value === undefined ? '' : value).trim(); }
  function escLine(value) { return text(value).replace(/\n+/g, ' / '); }
  function num(value) { var n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function stateNow(state) { return state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {}); }
  function safeArray(value) { return Array.isArray(value) ? value : []; }
  function staticPlan() {
    return {
      stage: 'beta8-report-export-enhance',
      modes: ['compact', 'full'],
      defaultMode: 'compact',
      sections: ['家庭处境', 'A/B/C方案', '自选池', '条件变化', '复核任务', '证据等级'],
      copyTargets: ['微信', '飞书', 'Word', 'Markdown'],
      safety: 'beta8 只增强导出报告结构和复制体验，不改变家庭路径、A/B/C、候选生成和证据等级判断。'
    };
  }
  function ensureCandidates(state) {
    if (!state || !state.candidates || !Array.isArray(state.candidates.list) || !state.candidates.list.length) {
      if (window.LN_V3_CANDIDATES_ADAPTER && window.LN_V3_CANDIDATES_ADAPTER.apply) window.LN_V3_CANDIDATES_ADAPTER.apply('report:ensure-candidates');
      return window.LN_V3_STORE ? window.LN_V3_STORE.getState() : state;
    }
    return state;
  }
  function ensureCounterfactual(state) {
    if (!state || !state.counterfactual || !Array.isArray(state.counterfactual.cards) || !state.counterfactual.cards.length) {
      if (window.LN_V3_COUNTERFACTUAL_ADAPTER && window.LN_V3_COUNTERFACTUAL_ADAPTER.apply) window.LN_V3_COUNTERFACTUAL_ADAPTER.apply('report:ensure-counterfactual');
      return window.LN_V3_STORE ? window.LN_V3_STORE.getState() : state;
    }
    return state;
  }
  function ensureReview(state) {
    if (!state || !state.reviewChecklist || !Array.isArray(state.reviewChecklist.tasks) || !state.reviewChecklist.tasks.length) {
      if (window.LN_V3_REVIEW_CHECKLIST && window.LN_V3_REVIEW_CHECKLIST.apply) window.LN_V3_REVIEW_CHECKLIST.apply('report:ensure-review');
      return window.LN_V3_STORE ? window.LN_V3_STORE.getState() : state;
    }
    return state;
  }
  function planTitle(id) {
    return id === 'A' ? 'A 守底线' : id === 'B' ? 'B 孩子路径' : id === 'C' ? 'C 上限探索' : text(id);
  }
  function oneCard(card) {
    if (!card) return '- 暂无样例卡片。';
    return '- ' + escLine(card.school) + '｜' + escLine(card.major) + '｜' + escLine(card.score2025 || '待核验') + '分 / 位次' + escLine(card.rank2025 || '待核验') + '｜' + escLine(card.evidenceLevel || '需要复核') + '。' + escLine(card.conclusion || card.oneLine || card.matchReason || '需要继续复核。');
  }
  function cardLine(card, index) {
    return [
      String(index + 1) + '. ' + escLine(card.school) + '｜' + escLine(card.major),
      '   - 位置：' + escLine(card.score2025 || '待核验') + '分 / 位次 ' + escLine(card.rank2025 || '待核验') + '｜' + escLine(card.safety || '待复核'),
      '   - 角色：' + escLine(card.planTitle || planTitle(card.planBand)) + '｜' + escLine(card.planRole || ''),
      '   - 理由：' + escLine(card.conclusion || card.oneLine || card.matchReason || '需要结合家庭底线和复核项继续判断。'),
      '   - 证据：' + escLine(card.evidenceLevel || '需要复核') + (card.evidenceSummary ? '｜' + escLine(card.evidenceSummary) : ''),
      '   - 复核：' + ((card.nextReview && card.nextReview.length) ? card.nextReview.slice(0, 5).map(escLine).join('；') : (card.reviewTags || []).slice(0, 5).map(escLine).join('；') || '招生章程、学费、校区、专业培养方向')
    ].join('\n');
  }
  function shortlistLines(items) {
    if (!items || !items.length) return ['- 暂未加入自选。建议先从 B 方案和 A 方案里各挑 1～2 条，再做家庭讨论。'];
    return items.map(function (item, index) {
      return String(index + 1) + '. ' + escLine(item.school) + '｜' + escLine(item.major) + '｜' + escLine(item.planTitle || planTitle(item.planBand)) + '｜' + escLine(item.safety || '待复核') + '｜' + escLine(item.evidenceLevel || '需要复核');
    });
  }
  function buildDecisionLog(state) {
    var family = state.family || {};
    var child = state.childPreference || {};
    var scenario = state.scenario || {};
    var counter = state.counterfactual || {};
    return [
      '- 位次/分数：' + escLine((state.rank || {}).rank || '未填') + ' / ' + escLine((state.rank || {}).score || '未填') + '；加载候选约 ' + num((state.rank || {}).loadedRows) + ' 条。',
      '- 家庭底线：' + escLine(family.summary || '尚未设置') + '',
      '- 孩子兴趣：' + escLine(child.summary || '尚未选择') + '；真实命中模式：' + (child.manualOnly ? '开启' : '未开启') + '。',
      '- 家庭路径：' + escLine(scenario.reason || '尚未选择') + '',
      '- 条件变化：' + escLine(counter.summary || '尚未生成')
    ];
  }
  function evidenceLine(cards) {
    var evidenceStats = window.LN_V3_EVIDENCE_ADAPTER && window.LN_V3_EVIDENCE_ADAPTER.summarizeCards ? window.LN_V3_EVIDENCE_ADAPTER.summarizeCards(cards || []) : null;
    return evidenceStats ? escLine(evidenceStats.summary) : '暂未生成证据等级汇总。';
  }
  function buildCompact(data) {
    var lines = [];
    lines.push('# 辽宁物理类高考志愿初选家庭讨论报告（精简版）');
    lines.push('');
    lines.push('生成时间：' + data.generatedAt);
    lines.push('版本：' + data.versionName);
    lines.push('');
    lines.push('> 精简版适合发微信/家庭群；完整复核请看完整版。');
    lines.push('');
    lines.push('## 1. 当前结论');
    lines.push('- 分数段：' + escLine((data.ctx.band && data.ctx.band.label) || '待判断'));
    lines.push('- 地域选择：' + escLine((data.ctx.region && data.ctx.region.label) || '未设置'));
    lines.push('- 家庭路径：' + escLine(data.pathName || '未选择'));
    lines.push('- 有效候选：底线池 ' + num(data.ctx.familyRows) + ' 条；当前有效池 ' + num(data.ctx.effectiveRows) + ' 条；兴趣命中约 ' + num(data.ctx.matchedRows) + ' 条。');
    lines.push('');
    lines.push('## 2. A/B/C 先看这三类');
    ['A','B','C'].forEach(function (id) {
      var plan = data.plans[id] || {};
      var sample = (data.byPlan[id] || [])[0];
      lines.push('### ' + escLine((plan.title || planTitle(id)) + '｜' + (plan.role || '')));
      lines.push('- 重点：' + escLine((plan.focus || []).join('、') || plan.tone || '待生成'));
      lines.push(oneCard(sample));
    });
    lines.push('');
    lines.push('## 3. 必须复核');
    data.reviewTasks.slice(0, 6).forEach(function (task) { lines.push('- ' + escLine(task.title) + '：' + escLine(task.detail || task.source || '')); });
    lines.push('- 证据等级：' + evidenceLine(data.cards));
    lines.push('');
    lines.push('## 4. 条件变化');
    data.cfCards.slice(0, 3).forEach(function (card) {
      lines.push('- ' + escLine(card.title) + '：' + escLine(String(card.current)) + ' → ' + escLine(String(card.changed)) + '（' + escLine(card.deltaText) + '）。' + escLine(card.oneLine));
    });
    return lines.join('\n');
  }
  function buildFull(data) {
    var lines = [];
    lines.push('# 辽宁物理类高考志愿初选家庭讨论报告（完整版）');
    lines.push('');
    lines.push('生成时间：' + data.generatedAt);
    lines.push('版本：' + data.versionName);
    lines.push('');
    lines.push('> 这是一份家庭讨论用的初选摘要，不替代招生章程、官方计划、学费和校区复核。');
    lines.push('');
    lines.push('## 1. 当前家庭决策处境');
    lines.push('- 分数段：' + escLine((data.ctx.band && data.ctx.band.label) || '待判断'));
    lines.push('- 地域选择：' + escLine((data.ctx.region && data.ctx.region.label) || '未设置'));
    lines.push('- 家庭路径：' + escLine(data.pathName || '未选择'));
    lines.push('- 有效候选：底线池 ' + num(data.ctx.familyRows) + ' 条；当前有效池 ' + num(data.ctx.effectiveRows) + ' 条；兴趣命中约 ' + num(data.ctx.matchedRows) + ' 条。');
    lines.push('');
    lines.push('## 2. 决策日志');
    lines.push.apply(lines, buildDecisionLog(data.state));
    lines.push('');
    lines.push('## 3. A/B/C 方案包与详细卡片摘要');
    ['A','B','C'].forEach(function (id) {
      var plan = data.plans[id] || {};
      lines.push('### ' + escLine((plan.title || planTitle(id)) + '｜' + (plan.role || '')));
      lines.push('- 方案语气：' + escLine(plan.tone || '待生成'));
      lines.push('- 重点：' + escLine((plan.focus || []).join('、') || '待生成'));
      lines.push('');
      (data.byPlan[id] || []).slice(0, 4).forEach(function (card, index) { lines.push(cardLine(card, index)); });
      if (!(data.byPlan[id] || []).length) lines.push('- 暂无样例卡片。');
      lines.push('');
    });
    lines.push('## 4. 自选池');
    lines.push.apply(lines, shortlistLines(data.shortlist));
    lines.push('');
    lines.push('## 5. 条件变化对照');
    if (data.cfCards.length) {
      data.cfCards.forEach(function (card) {
        lines.push('- ' + escLine(card.title) + '：' + escLine(String(card.current)) + ' → ' + escLine(String(card.changed)) + '（' + escLine(card.deltaText) + '）。' + escLine(card.oneLine) + ' 代价：' + escLine(card.tradeoff));
      });
    } else {
      lines.push('- 暂未生成条件变化对照。');
    }
    lines.push('');
    lines.push('## 6. 证据等级与待核验');
    lines.push('- ' + evidenceLine(data.cards));
    var evidenceSample = data.cards.find(function (card) { return card.dataEvidence && card.dataEvidence.buckets; });
    if (evidenceSample && evidenceSample.dataEvidence) {
      var b = evidenceSample.dataEvidence.buckets || {};
      lines.push('- 数据确认：' + escLine(safeArray(b.data_confirmed).join('、') || '暂无'));
      lines.push('- 模型判断：' + escLine(safeArray(b.model_judgement).join('、') || '暂无'));
      lines.push('- 需要复核：' + escLine(safeArray(b.needs_review).join('、') || '暂无'));
      lines.push('- 缺失数据：' + escLine(safeArray(b.missing_data).join('、') || '暂无'));
    }
    lines.push('');
    lines.push('## 7. 下一步复核清单');
    if (data.reviewTasks.length) data.reviewTasks.forEach(function (task) { lines.push('- ' + escLine(task.title) + '：' + escLine(task.detail || task.source || '')); });
    else {
      lines.push('- 复核招生章程、培养方案、专业方向是否正主。');
      lines.push('- 复核学费、合作办学、校区、转专业限制。');
      lines.push('- 结合近两年位次变化，再决定保留、上探或删除。');
      lines.push('- 让孩子确认：能不能接受学习强度、专业课程和就业/升学路径。');
    }
    return lines.join('\n');
  }
  function prepareData(state) {
    state = ensureCandidates(stateNow(state));
    state = ensureCounterfactual(state);
    state = ensureReview(state);
    var ctx = window.LN_V3_DECISION_CONTEXT ? window.LN_V3_DECISION_CONTEXT.build(state) : {};
    var plans = (state.plans && state.plans.preview && state.plans.preview.plans) || {};
    var cards = (state.candidates && state.candidates.list) || [];
    var byPlan = {
      A: cards.filter(function (x) { return x.planBand === 'A'; }),
      B: cards.filter(function (x) { return x.planBand === 'B'; }),
      C: cards.filter(function (x) { return x.planBand === 'C'; })
    };
    return {
      state: state,
      ctx: ctx,
      plans: plans,
      cards: cards,
      byPlan: byPlan,
      shortlist: (state.shortlist && state.shortlist.items) || [],
      cfCards: (state.counterfactual && state.counterfactual.cards) || [],
      reviewTasks: (state.reviewChecklist && state.reviewChecklist.tasks) || [],
      pathName: (state.scenario && state.scenario.preview && (state.scenario.preview.selectedName || state.scenario.preview.recommendedName)) || (state.scenario && state.scenario.current) || '未选择',
      generatedAt: new Date().toLocaleString(),
      versionName: ((window.LN_V3_VERSION && window.LN_V3_VERSION.name) || 'V3')
    };
  }
  function generate(state, options) {
    var data = prepareData(state);
    var mode = (options && options.mode) || (data.state.exportReport && data.state.exportReport.mode) || staticPlan().defaultMode;
    var compactMarkdown = buildCompact(data);
    var fullMarkdown = buildFull(data);
    var markdown = mode === 'full' ? fullMarkdown : compactMarkdown;
    return {
      ok: true,
      reason: 'v3-family-report-beta8-enhanced',
      title: mode === 'full' ? '辽宁物理类高考志愿初选家庭讨论报告（完整版）' : '辽宁物理类高考志愿初选家庭讨论报告（精简版）',
      mode: mode,
      modes: staticPlan().modes,
      generatedAt: data.generatedAt,
      markdown: markdown,
      compactMarkdown: compactMarkdown,
      fullMarkdown: fullMarkdown,
      length: markdown.length,
      compactLength: compactMarkdown.length,
      fullLength: fullMarkdown.length,
      sectionCount: mode === 'full' ? 7 : 4,
      fullSectionCount: 7,
      compactSectionCount: 4,
      cardCount: data.cards.length,
      shortlistCount: data.shortlist.length,
      counterfactualCount: data.cfCards.length,
      reviewTaskCount: data.reviewTasks.length,
      summary: '已生成家庭讨论报告：支持精简版和完整版，包含决策处境、A/B/C方案、详细卡片摘要、自选池、条件变化、证据等级和复核任务。'
    };
  }
  function apply(reason, options) {
    if (!window.LN_V3_STORE) return null;
    var preview = generate(window.LN_V3_STORE.getState(), options || {});
    window.LN_V3_STORE.setState({
      exportReport: { preview: preview, markdown: preview.markdown, compactMarkdown: preview.compactMarkdown, fullMarkdown: preview.fullMarkdown, mode: preview.mode, generatedAt: preview.generatedAt, summary: preview.summary },
      ui: { lastMessage: preview.summary }
    }, reason || 'export-report:apply');
    if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('export', (reason || 'export-report') + ':complete-through');
    else if (window.LN_V3_STORE.markComplete) window.LN_V3_STORE.markComplete('export', (reason || 'export-report') + ':complete');
    return preview;
  }
  function copy(textValue) {
    var value = textValue || (window.LN_V3_STORE && window.LN_V3_STORE.getState().exportReport && window.LN_V3_STORE.getState().exportReport.markdown) || '';
    if (!value) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value).then(function () { return true; }).catch(function () { return false; });
    try {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(!!ok);
    } catch (err) { return Promise.resolve(false); }
  }
  window.LN_V3_REPORT_EXPORT = { staticPlan: staticPlan, generate: generate, apply: apply, copy: copy };
})();
