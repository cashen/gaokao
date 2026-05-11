(function () {
  'use strict';
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch];
    });
  }
  function selected(value, expected) { return value === expected ? ' selected' : ''; }
  function checked(list, value) { return Array.isArray(list) && list.indexOf(value) !== -1 ? ' checked' : ''; }
  function splitProvinces(raw) { return String(raw || '').split(/[、,，\s]+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function previewHtml(state) {
    var preview = (state.family || {}).preview;
    var rankLoaded = Number((state.rank || {}).loadedRows || 0) > 0;
    if (!rankLoaded) {
      return '<div class="notice-box">先完成第 1 步位次数据加载。家庭底线会在已加载分段上做预览，不直接触发旧 compute。</div>';
    }
    if (!preview || !preview.ok) {
      return '<div class="notice-box">已加载 ' + Number(state.rank.loadedRows || 0) + ' 条位次附近记录。设置底线后，可先看一次预览缩小效果。</div>';
    }
    var warn = preview.bigPool ? '<div class="family-bigpool-hint">候选仍然偏多。后面建议继续收窄地域、预算，或在专业偏好里开启“只看真实命中兴趣方向”。</div>' : '';
    var hard = preview.unmatchedKept === 0 ? '<span class="family-pass">hard 地域预览未保留异常外省样本</span>' : '<span class="family-warn">hard 地域仍有异常保留：' + preview.unmatchedKept + '</span>';
    return [
      '<div class="family-preview">',
      '<div class="family-preview-grid">',
      '<div><span>loadedRows</span><strong>', Number(preview.basePool || 0), '</strong></div>',
      '<div><span>底线预览后</span><strong>', Number(preview.filteredPreview || 0), '</strong></div>',
      '<div><span>地域排除</span><strong>', Number((preview.removed || {}).region || 0), '</strong></div>',
      '<div><span>高收费排除</span><strong>', Number((preview.removed || {}).highFee || 0), '</strong></div>',
      '</div>',
      '<p>', esc(preview.summary || ''), '</p>',
      '<div class="family-hard-status">', hard, '</div>',
      warn,
      '</div>'
    ].join('');
  }
  function sampleHtml(state) {
    var preview = (state.family || {}).preview;
    var sample = preview && Array.isArray(preview.sampleKept) ? preview.sampleKept : [];
    if (!sample.length) return '<div class="placeholder-item">保存家庭底线后，这里会显示底线预览后的前几条样例。</div>';
    return sample.map(function (item) {
      return '<div class="rank-sample-item"><strong>' + esc(item.school) + '</strong><span>' + esc(item.major) + '</span><em>' + esc(item.score2025) + '分 / ' + esc(item.rank2025) + '位</em></div>';
    }).join('');
  }
  function html(state) {
    var family = state.family || {};
    var rejects = family.rejects || [];
    return [
      '<section class="step-card" data-step-view="family">',
      '<div class="step-hero"><div class="v3-kicker">第 2 步</div><h2>先定家庭底线</h2><p>这一步不是选最好的，而是先排除家里明显不能接受的。先把范围缩下来，后面孩子兴趣和场景才更好用。</p></div>',
      '<div class="step-body">',
      '<div class="step-section">',
      '<h3>地域底线</h3><p>普通家长最容易在这里迷失。建议先明确：是全国都可，还是只看辽宁。</p>',
      '<div class="family-quick-row">',
      '<button type="button" class="family-chip" data-family-quick="liaoning-hard">只看辽宁</button>',
      '<button type="button" class="family-chip" data-family-quick="northeast-soft">优先东北</button>',
      '<button type="button" class="family-chip" data-family-quick="nationwide">全国都可</button>',
      '</div>',
      '<div class="v3-form-grid">',
      '<div class="v3-field"><label for="v3RegionMode">地域模式</label><select id="v3RegionMode" class="v3-select"><option value="none"', selected(family.regionMode, 'none'), '>全国都可</option><option value="soft"', selected(family.regionMode, 'soft'), '>优先考虑</option><option value="hard"', selected(family.regionMode, 'hard'), '>只看指定地区</option></select></div>',
      '<div class="v3-field"><label for="v3Provinces">省份 / 区域</label><input id="v3Provinces" class="v3-input" placeholder="例如：辽宁，或 辽宁、吉林、黑龙江" value="', esc((family.provinces || []).join('、')), '"></div>',
      '</div>',
      '<p class="step-help">选择“只看指定地区”时，v3 会按 hard 规则预览，不保留无法匹配到目标地区的外省样本。</p>',
      '</div>',
      '<div class="step-section">',
      '<h3>预算与不能接受项</h3><p>这里不是判断学校好坏，只是先排除家庭明显不能承担的成本。</p>',
      '<div class="family-quick-row">',
      '<button type="button" class="family-chip" data-family-quick="normal-reject-high">普通家庭，排除高收费</button>',
      '<button type="button" class="family-chip" data-family-quick="budget-flex">预算可弹性</button>',
      '</div>',
      '<div class="v3-form-grid">',
      '<div class="v3-field"><label for="v3Budget">预算</label><select id="v3Budget" class="v3-select"><option value="normal"', selected(family.budget, 'normal'), '>普通家庭</option><option value="flex"', selected(family.budget, 'flex'), '>预算可弹性</option><option value="strict"', selected(family.budget, 'strict'), '>预算严格</option></select></div>',
      '<div class="v3-field"><label for="v3FeeType">学费</label><select id="v3FeeType" class="v3-select"><option value="all"', selected(family.feeType, 'all'), '>先都看</option><option value="rejectHigh"', selected(family.feeType, 'rejectHigh'), '>排除高收费</option></select></div>',
      '</div>',
      '<label class="family-check"><input type="checkbox" id="v3RejectHigh" value="高收费"', checked(rejects, '高收费'), '> 不看高收费 / 中外合作 / 明显高成本方向</label>',
      '<label class="family-check"><input type="checkbox" id="v3RejectPrivate" value="民办独立"', checked(rejects, '民办独立'), '> 暂不看民办、独立学院或性质待核验学校</label>',
      '</div>',
      '<div class="step-section">',
      '<h3>底线预览</h3>', previewHtml(state),
      '<div class="rank-sample-list family-sample-list">', sampleHtml(state), '</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-family-save>保存底线并继续</button><button type="button" class="v3-btn secondary" data-family-preview>只预览，不继续</button></div>',
      '<p class="step-help">alpha3 只做 Step2 状态和预览，不触发旧 compute 主链路；正式 A/B/C 仍在后续版本接入。</p>',
      '</div>',
      '</div></section>'
    ].join('');
  }
  function readFamily(root) {
    var rejects = [];
    if (root.querySelector('#v3RejectHigh') && root.querySelector('#v3RejectHigh').checked) rejects.push('高收费');
    if (root.querySelector('#v3RejectPrivate') && root.querySelector('#v3RejectPrivate').checked) rejects.push('民办独立');
    var feeType = root.querySelector('#v3FeeType').value;
    if (feeType === 'rejectHigh' && rejects.indexOf('高收费') === -1) rejects.push('高收费');
    return {
      regionMode: root.querySelector('#v3RegionMode').value,
      provinces: splitProvinces(root.querySelector('#v3Provinces').value),
      budget: root.querySelector('#v3Budget').value,
      feeType: feeType,
      rejects: rejects
    };
  }
  function save(root, shouldNext) {
    var family = readFamily(root);
    var preview = window.LN_V3_FAMILY_FILTER ? window.LN_V3_FAMILY_FILTER.preview(family) : null;
    family.preview = preview;
    family.summary = preview && preview.summary ? preview.summary : '家庭底线已保存。';
    window.LN_V3_STORE.setState({
      family: family,
      compute: {
        basePool: preview ? preview.basePool : 0,
        filtered: preview ? preview.filteredPreview : 0,
        lastReason: 'v3-step2-family-preview'
      },
      ui: {
        bigPool: !!(preview && preview.bigPool),
        lastMessage: preview && preview.summary ? preview.summary : '家庭底线已保存。'
      }
    }, shouldNext ? 'family:save-next' : 'family:preview');
    if (shouldNext) {
      window.LN_V3_STORE.markComplete('family', 'family:complete');
      window.LN_V3_ROUTER.go('child', 'family:next');
    } else if (window.LN_V3_WIZARD) {
      window.LN_V3_WIZARD.render();
    }
  }
  function setQuick(root, type) {
    if (type === 'liaoning-hard') {
      root.querySelector('#v3RegionMode').value = 'hard';
      root.querySelector('#v3Provinces').value = '辽宁';
    } else if (type === 'northeast-soft') {
      root.querySelector('#v3RegionMode').value = 'soft';
      root.querySelector('#v3Provinces').value = '辽宁、吉林、黑龙江';
    } else if (type === 'nationwide') {
      root.querySelector('#v3RegionMode').value = 'none';
      root.querySelector('#v3Provinces').value = '';
    } else if (type === 'normal-reject-high') {
      root.querySelector('#v3Budget').value = 'normal';
      root.querySelector('#v3FeeType').value = 'rejectHigh';
      root.querySelector('#v3RejectHigh').checked = true;
    } else if (type === 'budget-flex') {
      root.querySelector('#v3Budget').value = 'flex';
      root.querySelector('#v3FeeType').value = 'all';
      root.querySelector('#v3RejectHigh').checked = false;
    }
    save(root, false);
  }
  function bind(root) {
    root.querySelector('[data-family-save]').addEventListener('click', function () { save(root, true); });
    root.querySelector('[data-family-preview]').addEventListener('click', function () { save(root, false); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-family-quick]'), function (btn) {
      btn.addEventListener('click', function () { setQuick(root, btn.getAttribute('data-family-quick')); });
    });
  }
  window.LN_V3_STEP_FAMILY = { render: function (root, state) { root.innerHTML = html(state); bind(root); } };
})();
