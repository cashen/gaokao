(function () {
  'use strict';
  function html(state) {
    return [
      '<section class="step-card" data-step-view="rank">',
      '<div class="step-hero"><div class="v3-kicker">第 1 步</div><h2>先输入孩子的大概分数或位次</h2><p>先不用想学校和专业。系统先根据位次，把可能范围缩出来。</p></div>',
      '<div class="step-body">',
      '<div class="step-section">',
      '<h3>位次 / 分数</h3><p>alpha1 先保存输入状态，后续接入 fix12 分块数据加载。</p>',
      '<div class="v3-form-grid">',
      '<div class="v3-field"><label for="v3RankInput">位次</label><input id="v3RankInput" class="v3-input" inputmode="numeric" placeholder="例如 56548" value="', state.rank.rank || '', '"></div>',
      '<div class="v3-field"><label for="v3ScoreInput">分数</label><input id="v3ScoreInput" class="v3-input" inputmode="numeric" placeholder="例如 500" value="', state.rank.score || '', '"></div>',
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-rank-save>保存并继续</button><button type="button" class="v3-btn secondary" data-rank-demo>填入测试样例</button></div>',
      '</div>',
      '<div class="notice-box">当前 loadedRows：', Number(state.rank.loadedRows || 0), '。v3 alpha1 不主动改旧主业务，只搭新壳。</div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    var rankInput = root.querySelector('#v3RankInput');
    var scoreInput = root.querySelector('#v3ScoreInput');
    function save(next) {
      window.LN_V3_STORE.setState({ rank: { rank: rankInput.value.trim(), score: scoreInput.value.trim(), mode: rankInput.value.trim() ? 'rank' : 'score' }, ui: { lastMessage: '位次信息已保存。' } }, 'rank:save');
      window.LN_V3_STORE.markComplete('rank', 'rank:complete');
      if (next) window.LN_V3_ROUTER.go('family', 'rank:next');
    }
    root.querySelector('[data-rank-save]').addEventListener('click', function () { save(true); });
    root.querySelector('[data-rank-demo]').addEventListener('click', function () { rankInput.value = '56548'; scoreInput.value = '500'; save(false); });
  }
  window.LN_V3_STEP_RANK = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
