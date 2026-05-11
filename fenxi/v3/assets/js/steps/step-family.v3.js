(function () {
  'use strict';
  function selected(value, expected) { return value === expected ? ' selected' : ''; }
  function html(state) {
    var family = state.family;
    return [
      '<section class="step-card" data-step-view="family">',
      '<div class="step-hero"><div class="v3-kicker">第 2 步</div><h2>先定家庭底线</h2><p>这一步不是选最好的，而是先排除家里明显不能接受的。</p></div>',
      '<div class="step-body">',
      '<div class="step-section">',
      '<h3>地域与预算</h3>',
      '<div class="v3-form-grid">',
      '<div class="v3-field"><label for="v3RegionMode">地域模式</label><select id="v3RegionMode" class="v3-select"><option value="none"', selected(family.regionMode, 'none'), '>全国都可</option><option value="soft"', selected(family.regionMode, 'soft'), '>优先考虑</option><option value="hard"', selected(family.regionMode, 'hard'), '>只看指定地区</option></select></div>',
      '<div class="v3-field"><label for="v3Provinces">省份</label><input id="v3Provinces" class="v3-input" placeholder="例如：辽宁" value="', (family.provinces || []).join('、'), '"></div>',
      '<div class="v3-field"><label for="v3Budget">预算</label><select id="v3Budget" class="v3-select"><option value="normal"', selected(family.budget, 'normal'), '>普通家庭</option><option value="flex"', selected(family.budget, 'flex'), '>预算可弹性</option><option value="strict"', selected(family.budget, 'strict'), '>预算严格</option></select></div>',
      '<div class="v3-field"><label for="v3FeeType">学费</label><select id="v3FeeType" class="v3-select"><option value="all"', selected(family.feeType, 'all'), '>先都看</option><option value="rejectHigh"', selected(family.feeType, 'rejectHigh'), '>排除高收费</option></select></div>',
      '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-family-save>保存并继续</button></div>',
      '</div>',
      '</div></section>'
    ].join('');
  }
  function bind(root) {
    root.querySelector('[data-family-save]').addEventListener('click', function () {
      var provincesRaw = root.querySelector('#v3Provinces').value.trim();
      var provinces = provincesRaw ? provincesRaw.split(/[、,，\s]+/).filter(Boolean) : [];
      var rejects = root.querySelector('#v3FeeType').value === 'rejectHigh' ? ['高收费'] : [];
      window.LN_V3_STORE.setState({
        family: {
          regionMode: root.querySelector('#v3RegionMode').value,
          provinces: provinces,
          budget: root.querySelector('#v3Budget').value,
          feeType: root.querySelector('#v3FeeType').value,
          rejects: rejects
        },
        ui: { lastMessage: '家庭底线已保存。' }
      }, 'family:save');
      window.LN_V3_STORE.markComplete('family', 'family:complete');
      window.LN_V3_ROUTER.go('child', 'family:next');
    });
  }
  window.LN_V3_STEP_FAMILY = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
