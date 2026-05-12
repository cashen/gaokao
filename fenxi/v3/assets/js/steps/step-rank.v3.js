(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch];
    });
  }
  function sampleHtml(sample) {
    if (!Array.isArray(sample) || !sample.length) return '<div class="placeholder-item">加载后会显示位次附近样例，方便确认数据是否读到。</div>';
    return sample.map(function (item) {
      return '<div class="rank-sample-item"><strong>' + esc(item.school) + '</strong><span>' + esc(item.major) + '</span><em>' + esc(item.score2025) + '分 / ' + esc(item.rank2025) + '位</em></div>';
    }).join('');
  }
  function consistencyHtml(rank) {
    var guard = (rank && rank.inputConsistency) || null;
    if (!guard || !guard.status || guard.status === 'ok') return '';
    var cls = guard.ok === false ? 'notice-box warning' : 'notice-box';
    var lines = [];
    lines.push('<div class="' + cls + '">');
    if (guard.status === 'conflict') {
      lines.push('<strong>分数和位次需要确认：</strong>');
    } else {
      lines.push('<strong>当前采用口径：</strong>');
    }
    lines.push(esc(guard.message || '系统已记录当前输入口径。'));
    if (guard.status === 'conflict') {
      lines.push('<br>建议只保留一个：要么以位次为准，要么删掉位次后只填分数重新换算。');
    } else if (guard.effectiveRank) {
      lines.push('<br>有效位次：' + esc(guard.effectiveRank) + (guard.effectiveScore ? '；有效分数：' + esc(guard.effectiveScore) : '') + '。');
    }
    lines.push('</div>');
    return lines.join('');
  }
  function html(state) {
    var loading = !!state.ui.loading || !!state.ui.dataWaiting;
    var loadedRows = Number(state.rank.loadedRows || 0);
    var hasLoaded = loadedRows > 0;
    return [
      '<section class="step-card" data-step-view="rank">',
      '<div class="step-hero"><div class="v3-kicker">第 1 步</div><h2>先输入孩子的大概分数或位次</h2><p>先不用想学校和专业。系统先根据位次，把可能范围缩出来。</p></div>',
      '<div class="step-body">',
      '<div class="step-section">',
      '<h3>位次 / 分数</h3><p>优先填位次；如果只有分数，系统会按 2025 辽宁物理类一分一段换算一个参考位次。</p>',
      '<div class="v3-form-grid">',
      '<div class="v3-field"><label for="v3RankInput">位次</label><input id="v3RankInput" class="v3-input" inputmode="numeric" placeholder="例如 56548" value="', esc(state.rank.rank), '"></div>',
      '<div class="v3-field"><label for="v3ScoreInput">分数</label><input id="v3ScoreInput" class="v3-input" inputmode="numeric" placeholder="例如 500" value="', esc(state.rank.score), '"></div>',
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-rank-load>', loading ? '正在加载数据…' : '加载位次范围并继续', '</button><button type="button" class="v3-btn secondary" data-rank-demo>填入测试样例并加载</button><button type="button" class="v3-btn ghost" data-rank-save-only>只保存，不继续</button></div>',
      '<p class="step-help">这一步只读取相关分段数据，不触发旧版完整筛选链路。</p>',
      '</div>',
      '<div class="rank-status-grid">',
      '<div class="rank-status-card"><span>加载状态</span><strong>', loading ? '正在加载' : (hasLoaded ? '已加载' : '未加载'), '</strong></div>',
      '<div class="rank-status-card"><span>loadedRows</span><strong>', loadedRows, '</strong></div>',
      '<div class="rank-status-card"><span>分块数量</span><strong>', Number(state.rank.chunkCount || 0), '</strong></div>',
      '<div class="rank-status-card"><span>耗时</span><strong>', Number(state.rank.loadMs || 0), 'ms</strong></div>',
      '</div>',
      '<div class="notice-box">',
      hasLoaded ? ('已读取 ' + loadedRows + ' 条位次附近记录；分块：' + esc((state.rank.chunkIds || []).join(', ')) + '。' + (state.rank.rankSource ? '<br>位次来源：' + esc(state.rank.rankSource) + '。' : '')) : '还没读取数据。输入位次或分数后，点击“加载位次范围并继续”。',
      '</div>',
      consistencyHtml(state.rank),
      '<div class="step-section rank-sample-section"><h3>位次附近样例</h3><p>这里只做数据是否读到的轻量确认，正式筛选从下一步开始逐步接入。</p><div class="rank-sample-list">', sampleHtml(state.rank.sample), '</div></div>',
      '</div></section>'
    ].join('');
  }
  function cleanNum(value) { return String(value || '').replace(/[^0-9]/g, ''); }
  function downstreamResetPatch() {
    return {
      family: { preview: null, summary: '家庭底线尚未设置。' },
      childPreference: { preview: null },
      scenario: { current: '', recommended: '', reason: '', source: '', preview: null, locked: false },
      plans: { A: [], B: [], C: [], preview: null, meta: null },
      candidates: { list: [], page: 1, pageSize: 20 },
      counterfactual: { preview: null, cards: [], summary: '条件变化对照尚未生成。' },
      exportReport: { preview: null, markdown: '', compactMarkdown: '', fullMarkdown: '', generatedAt: '', summary: '家庭讨论报告尚未生成。' },
      reviewChecklist: { ok: false, count: 0, tasks: [], urgentCount: 0, summary: '复核清单尚未生成。' },
      shortlist: { items: [] }
    };
  }
  function saveInputs(rankInput, scoreInput, message) {
    var rank = cleanNum(rankInput.value);
    var score = cleanNum(scoreInput.value);
    var done = function (guard) {
      guard = guard || { ok: true, status: rank ? 'rank-only' : 'score-only', effectiveRank: rank, effectiveScore: score, rawRank: rank, rawScore: score, message: message || '位次信息已保存。' };
      var patch = downstreamResetPatch();
      patch.rank = { rank: rank, score: score, rawRank: rank, rawScore: score, effectiveRank: guard.effectiveRank || rank, effectiveScore: guard.effectiveScore || score, mode: guard.ok === false ? 'conflict' : (rank ? 'rank' : 'score'), inputConsistency: guard, loadedRows: 0, chunkIds: [], chunkCount: 0, sample: [] };
      patch.ui = { completedSteps: [], lastMessage: guard.ok === false ? guard.message : (message || guard.message || '位次信息已保存。') };
      patch.compute = { basePool: 0, filtered: 0, waitDataMs: 0, lastReason: 'v3-step1-input-saved' };
      window.LN_V3_STORE.setState(patch, 'rank:save-inputs');
    };
    if (window.LN_V3_LEGACY_DATA && window.LN_V3_LEGACY_DATA.checkRankScoreConsistency) {
      window.LN_V3_LEGACY_DATA.checkRankScoreConsistency({ rank: rank, score: score }).then(done).catch(function () { done(null); });
    } else done(null);
  }
  function applyLoadResult(result, rankInput, scoreInput, shouldNext, guard) {
    guard = guard || result.inputConsistency || {};
    var rank = cleanNum(rankInput.value) || String(result.rank || '');
    var score = cleanNum(scoreInput.value) || (result.score ? String(result.score) : '');
    var effectiveRank = String(guard.effectiveRank || result.rank || rank || '');
    var effectiveScore = String(guard.effectiveScore || score || '');
    var patch = downstreamResetPatch();
    patch.ui = { completedSteps: [], loading: false, dataWaiting: false, lastMessage: '位次附近数据已加载：' + result.loadedRows + ' 条。' };
    patch.rank = {
        rank: String(result.rank || rank),
        score: score,
        rawRank: rank,
        rawScore: score,
        effectiveRank: effectiveRank,
        effectiveScore: effectiveScore,
        mode: effectiveRank ? 'rank' : 'score',
        inputConsistency: guard,
        loadedRows: result.loadedRows || 0,
        chunkIds: result.chunkIds || [],
        chunkCount: result.chunkCount || 0,
        loadMs: result.ms || 0,
        loadedAt: new Date().toISOString(),
        rankSource: result.resolvedRankSource || result.source || '',
        sample: result.sample || []
      };
    patch.compute = { basePool: result.loadedRows || 0, filtered: 0, waitDataMs: result.ms || 0, lastReason: 'v3-step1-load-data' };
    window.LN_V3_STORE.setState(patch, 'rank:data-loaded');
    if (window.LN_V3_STORE.markCompleteThrough) window.LN_V3_STORE.markCompleteThrough('rank', 'rank:complete-through'); else window.LN_V3_STORE.markComplete('rank', 'rank:complete');
    if (shouldNext) window.LN_V3_ROUTER.go('family', 'rank:next-after-load');
    else if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.render();
  }
  function loadData(root, rankInput, scoreInput, shouldNext) {
    var rank = cleanNum(rankInput.value);
    var score = cleanNum(scoreInput.value);
    if (!rank && !score) {
      window.LN_V3_WIZARD.flashMessage('先填一个位次或分数。');
      return;
    }
    if (!window.LN_V3_LEGACY_DATA || !window.LN_V3_LEGACY_DATA.loadForRankOrScore) {
      window.LN_V3_WIZARD.flashMessage('数据加载模块还没有就绪。');
      return;
    }
    var startLoad = function (guard) {
      if (guard && guard.ok === false) {
        var conflictPatch = downstreamResetPatch();
        conflictPatch.ui = { completedSteps: [], loading: false, dataWaiting: false, lastMessage: guard.message || '分数和位次需要重新确认。' };
        conflictPatch.rank = { rank: rank, score: score, rawRank: rank, rawScore: score, effectiveRank: '', effectiveScore: '', mode: 'conflict', loadedRows: 0, chunkIds: [], chunkCount: 0, sample: [], inputConsistency: guard };
        conflictPatch.compute = { basePool: 0, filtered: 0, waitDataMs: 0, lastReason: 'v3-step1-input-conflict' };
        window.LN_V3_STORE.setState(conflictPatch, 'rank:input-conflict');
        if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.render();
        return;
      }
      window.LN_V3_STORE.setState({
        ui: { completedSteps: [], loading: true, dataWaiting: true, lastMessage: '正在加载位次附近数据…' },
        rank: { rank: rank, score: score, rawRank: rank, rawScore: score, effectiveRank: guard && guard.effectiveRank || rank, effectiveScore: guard && guard.effectiveScore || score, mode: rank ? 'rank' : 'score', inputConsistency: guard }
      }, 'rank:data-loading');
      window.LN_V3_LEGACY_DATA.loadForRankOrScore({ rank: rank, score: score }).then(function (result) {
        applyLoadResult(result, rankInput, scoreInput, shouldNext, guard || result.inputConsistency);
      }).catch(function (err) {
        window.LN_V3_STORE.setState({ ui: { loading: false, dataWaiting: false, lastMessage: '数据加载失败：' + (err && err.message ? err.message : err) } }, 'rank:data-load-failed');
        if (window.LN_V3_WIZARD) window.LN_V3_WIZARD.render();
      });
    };
    if (window.LN_V3_LEGACY_DATA.checkRankScoreConsistency) {
      window.LN_V3_LEGACY_DATA.checkRankScoreConsistency({ rank: rank, score: score }).then(startLoad).catch(function (err) {
        startLoad({ ok: false, status: 'check-failed', rawRank: rank, rawScore: score, message: err && err.message ? err.message : '分数和位次需要重新确认。' });
      });
    } else startLoad(null);
  }
  function bind(root) {
    var rankInput = root.querySelector('#v3RankInput');
    var scoreInput = root.querySelector('#v3ScoreInput');
    root.querySelector('[data-rank-load]').addEventListener('click', function () { loadData(root, rankInput, scoreInput, true); });
    root.querySelector('[data-rank-save-only]').addEventListener('click', function () { saveInputs(rankInput, scoreInput, '位次信息已保存，尚未加载分块数据。'); });
    root.querySelector('[data-rank-demo]').addEventListener('click', function () { rankInput.value = '56548'; scoreInput.value = '500'; loadData(root, rankInput, scoreInput, false); });
  }
  window.LN_V3_STEP_RANK = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
