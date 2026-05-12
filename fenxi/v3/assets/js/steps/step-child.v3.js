(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]; });
  }
  function selectedGroupIds(state) {
    return (state.childPreference.selectedGroups || []).map(function (item) { return item.id; });
  }
  function selectedMajorNames(state) {
    return (state.childPreference.selectedMajors || []).map(function (item) { return item.name; });
  }
  function summaryFor(child) {
    if (child.mode === 'unknown') return '暂不确定，先按家庭底线和稳妥路径推荐。后面仍然可以回来补选兴趣。';
    if (!child.selectedGroups || !child.selectedGroups.length) return '还没有选择专业方向。可以先选 1—3 个方向，也可以听系统推荐。';
    return '孩子偏' + child.selectedGroups.map(function (item) { return item.name; }).join('、') + '方向，B方案会优先兼顾兴趣与稳妥。';
  }
  function buildWeights(groups, majors, manualOnly) {
    var weights = {};
    groups.forEach(function (group, index) {
      var base = Number(group.weight || 0.7);
      weights[group.id] = Math.max(0.55, Number((base - index * 0.04).toFixed(2)));
    });
    majors.forEach(function (major) { weights['major:' + major.name] = manualOnly ? 1 : 0.96; });
    return weights;
  }
  function syncPreview(draft) {
    if (!window.LN_V3_CHILD_INTEREST || !window.LN_V3_CHILD_INTEREST.previewForState) return null;
    var preview = window.LN_V3_CHILD_INTEREST.previewForState(draft);
    draft.childPreference.preview = preview;
    if (preview) {
      draft.compute.basePool = Number(preview.familyFilteredRows || draft.compute.basePool || 0);
      draft.compute.filtered = Number(preview.effectiveFilteredRows || preview.familyFilteredRows || 0);
      draft.compute.lastReason = 'v3-step3-child-interest-preview';
      draft.ui.bigPool = !!preview.bigPool;
      if (preview.reason !== 'no-family-records') draft.ui.lastMessage = preview.summary || draft.childPreference.summary;
    }
    return preview;
  }
  function writeChildPreference(patch, reason) {
    window.LN_V3_STORE.update(function (draft) {
      draft.childPreference = Object.assign({}, draft.childPreference, patch);
      draft.childPreference.summary = summaryFor(draft.childPreference);
      draft.childPreference.weights = buildWeights(draft.childPreference.selectedGroups || [], draft.childPreference.selectedMajors || [], draft.childPreference.manualOnly);
      draft.ui.lastMessage = draft.childPreference.summary;
      syncPreview(draft);
    }, reason);
  }
  function toggleGroup(groupId) {
    var store = window.LN_V3_STORE;
    var state = store.getState();
    var child = state.childPreference;
    var ids = selectedGroupIds(state);
    var group = window.LN_V3_CHILD_GROUPS.find(groupId);
    if (!group) return;
    if (ids.indexOf(groupId) !== -1) {
      writeChildPreference({
        mode: 'selected',
        selectedGroups: child.selectedGroups.filter(function (item) { return item.id !== groupId; }),
        selectedMajors: child.selectedMajors.filter(function (major) { return major.groupId !== groupId; })
      }, 'child:removeGroup');
      return;
    }
    if (ids.length >= window.LN_V3_CHILD_GROUPS.maxGroups) {
      store.setState({ ui: { lastMessage: '先选最想看的 3 个方向就行。选太多，系统反而不好判断重点。' } }, 'child:maxGroups');
      window.LN_V3_WIZARD.render();
      return;
    }
    var selected = child.selectedGroups.concat([{ id: group.id, name: group.name, weight: group.weight, source: 'card' }]);
    writeChildPreference({ mode: 'selected', selectedGroups: selected }, 'child:addGroup');
  }
  function toggleMajor(groupId, majorName) {
    var state = window.LN_V3_STORE.getState();
    var group = window.LN_V3_CHILD_GROUPS.find(groupId);
    if (!group) return;
    var majors = state.childPreference.selectedMajors || [];
    var exists = majors.some(function (item) { return item.name === majorName && item.groupId === groupId; });
    var groups = state.childPreference.selectedGroups || [];
    if (!groups.some(function (item) { return item.id === groupId; })) {
      if (groups.length >= window.LN_V3_CHILD_GROUPS.maxGroups) {
        window.LN_V3_STORE.setState({ ui: { lastMessage: '先选最想看的 3 个方向就行。选太多，系统反而不好判断重点。' } }, 'child:maxGroupsMajor');
        window.LN_V3_WIZARD.render();
        return;
      }
      groups = groups.concat([{ id: group.id, name: group.name, weight: group.weight, source: 'expanded' }]);
    }
    if (exists) majors = majors.filter(function (item) { return !(item.name === majorName && item.groupId === groupId); });
    else majors = majors.concat([{ name: majorName, groupId: groupId, codeHint: '', weight: 1, source: 'expanded' }]);
    writeChildPreference({ mode: 'selected', selectedGroups: groups, selectedMajors: majors }, 'child:toggleMajor');
  }
  function setUnknown() {
    writeChildPreference({ mode: 'unknown', selectedGroups: [], selectedMajors: [], manualOnly: false, preview: null }, 'child:unknown');
  }
  function toggleManualOnly() {
    var state = window.LN_V3_STORE.getState();
    writeChildPreference({ manualOnly: !state.childPreference.manualOnly }, 'child:manualOnly');
  }
  function metric(label, value, hint) {
    return '<div class="child-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong>' + (hint ? '<em>' + escapeHtml(hint) + '</em>' : '') + '</div>';
  }
  function sampleHtml(preview) {
    var sample = preview && Array.isArray(preview.sampleMatched) ? preview.sampleMatched : [];
    if (!sample.length) return '<div class="placeholder-item">选兴趣后，这里会显示当前底线池里直接命中的样例。</div>';
    return sample.map(function (item) {
      return '<div class="rank-sample-item"><strong>' + escapeHtml(item.school) + '</strong><span>' + escapeHtml(item.major) + '</span><em>' + escapeHtml(item.score2025) + '分 / ' + escapeHtml(item.rank2025) + '位 · ' + escapeHtml(item.matchReason) + '</em></div>';
    }).join('');
  }
  function previewHtml(state) {
    var preview = (state.childPreference || {}).preview;
    var familyRows = Number(((state.family || {}).preview || {}).filteredPreview || 0);
    var loadedRows = Number((state.rank || {}).loadedRows || 0);
    if (!loadedRows) {
      return '<div class="child-link-panel"><strong>兴趣联动预览</strong><p>先完成第 1 步位次输入，系统才知道从哪个分段里看孩子兴趣。</p></div>';
    }
    if (!familyRows) familyRows = Number((state.rank || {}).loadedRows || 0);
    if (!preview || !preview.ok) {
      return '<div class="child-link-panel"><strong>兴趣联动预览</strong><div class="child-metric-grid">' + metric('位次数据', loadedRows + ' 条') + metric('当前底线池', familyRows + ' 条') + metric('兴趣命中', '待选择') + '</div><p>选择 1—3 个方向后，系统会先在当前底线池里做命中预览，不会立刻触发旧 compute 主链路。</p></div>';
    }
    var noHit = preview.noMatchGroups && preview.noMatchGroups.length ? '<div class="child-warning">当前底线内暂未命中：' + escapeHtml(preview.noMatchGroups.join('、')) + '。可以后面放宽底线再看。</div>' : '';
    var manual = preview.manualOnly ? '<div class="child-realhit-on">已开启真实命中：后续候选将从 ' + Number(preview.familyFilteredRows || 0) + ' 条收窄到 ' + Number(preview.effectiveFilteredRows || 0) + ' 条。</div>' : '<div class="child-realhit-off">默认不硬排除：兴趣先影响提醒和 B 方案权重，候选池仍保留其它合适机会。</div>';
    return [
      '<div class="child-link-panel">',
      '<strong>兴趣联动预览</strong>',
      '<div class="child-metric-grid">',
      metric('位次数据', loadedRows + ' 条'),
      metric('当前底线池', Number(preview.familyFilteredRows || familyRows) + ' 条'),
      metric('兴趣命中', Number(preview.matchedRows || 0) + ' 条'),
      metric('后续有效池', Number(preview.effectiveFilteredRows || 0) + ' 条', preview.manualOnly ? '真实命中' : '默认保留'),
      '</div>',
      '<p>', escapeHtml(preview.summary || ''), '</p>', manual, noHit,
      '<div class="rank-sample-list child-match-sample">', sampleHtml(preview), '</div>',
      '</div>'
    ].join('');
  }

  function selectHtml(field, label, value) {
    var adapter = window.LN_V3_STUDENT_PROFILE;
    var opts = adapter && adapter.optionsFor ? adapter.optionsFor(field) : [];
    return '<label class="profile-select"><span>' + escapeHtml(label) + '</span><select data-profile-field="' + escapeHtml(field) + '">' + opts.map(function (item) {
      return '<option value="' + escapeHtml(item[0]) + '"' + (item[0] === value ? ' selected' : '') + '>' + escapeHtml(item[1]) + '</option>';
    }).join('') + '</select></label>';
  }
  function profilePanelHtml(state) {
    var profile = (state && state.studentProfile) || {};
    var summary = profile.summary || (window.LN_V3_STUDENT_PROFILE ? window.LN_V3_STUDENT_PROFILE.summarize(profile) : '学生画像未补充。');
    var tags = Array.isArray(profile.tags) ? profile.tags : [];
    return [
      '<div class="student-profile-panel">',
      '<div class="profile-panel-head"><strong>孩子学习适配画像（可选）</strong><span>只调整提醒顺序，不按性别或画像排除专业</span></div>',
      '<div class="profile-select-grid">',
      selectHtml('source', '信息来源', profile.source || 'unconfirmed'),
      selectHtml('learning', '学习倾向', profile.learning || 'unclear'),
      selectHtml('load', '强度承受', profile.load || 'unknown'),
      selectHtml('path', '路径偏好', profile.path || 'unknown'),
      selectHtml('understanding', '专业理解', profile.understanding || 'unclear'),
      '</div>',
      '<p class="profile-summary">', escapeHtml(summary), '</p>',
      tags.length ? '<div class="profile-tag-row">' + tags.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '',
      '</div>'
    ].join('');
  }
  function majorProfileHtml(state) {
    var preview = ((state || {}).childPreference || {}).preview || {};
    var profile = preview.majorProfile || (window.LN_V3_MAJOR_PROFILE && window.LN_V3_MAJOR_PROFILE.profileSelection ? window.LN_V3_MAJOR_PROFILE.profileSelection(state) : null);
    if (!profile || (!profile.selectedGroupCount && !profile.selectedMajorCount && !(profile.profileNotices || []).length)) {
      return '<div class="major-profile-panel"><strong>专业画像与复核提醒</strong><p>选择兴趣方向后，系统会提示“正主/相近/需复核”的差异；这不是硬筛选，是给后面详细卡片准备证据链。</p></div>';
    }
    var groups = (profile.groupProfiles || []).map(function (g) {
      return '<div class="major-profile-card"><strong>' + escapeHtml(g.label || g.id) + '</strong><p>' + escapeHtml(g.path || '') + '</p><em>' + escapeHtml((g.risks || []).slice(0, 3).join('｜')) + '</em></div>';
    }).join('');
    var misread = (profile.misreadRules || []).map(function (m) {
      return '<li><strong>' + escapeHtml(m.major || '') + '</strong>：' + escapeHtml(m.message || '') + '<span>' + escapeHtml(m.evidence || '模型判断') + '</span></li>';
    }).join('');
    var notices = (profile.profileNotices || []).map(function (n) { return '<li>' + escapeHtml(n) + '<span>画像提醒</span></li>'; }).join('');
    return [
      '<div class="major-profile-panel">',
      '<strong>专业画像与复核提醒</strong>',
      '<p>', escapeHtml(profile.summary || '专业画像只用于解释和复核，不作为硬筛选。'), '</p>',
      profile.tags && profile.tags.length ? '<div class="profile-tag-row">' + profile.tags.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '',
      groups ? '<div class="major-profile-grid">' + groups + '</div>' : '',
      (misread || notices) ? '<ul class="major-review-list">' + misread + notices + '</ul>' : '',
      '<div class="child-realhit-off">专业画像和学生画像的权重低于家庭路径；它们只改变提醒、排序解释和详细卡片复核，不做硬排除。</div>',
      '</div>'
    ].join('');
  }

  function html(state) {
    var child = state.childPreference;
    var ids = selectedGroupIds(state);
    var selectedMajors = selectedMajorNames(state);
    var tags = (child.selectedGroups || []).concat((child.selectedMajors || []).map(function (major) { return { id: 'major:' + major.name, name: major.name }; }));
    return [
      '<section class="step-card" data-step-view="child">',
      '<div class="step-hero"><div class="v3-kicker">第 3 步 · 重点模块</div><h2>孩子对什么专业方向感兴趣？（可选，可多选）</h2><p>这一步不是让孩子现在就定专业，只是让系统少猜一点。不确定也没关系，可以先听系统推荐。</p></div>',
      '<div class="step-body">',
      '<div class="child-summary-bar">',
      '<strong>已选兴趣</strong>',
      window.LN_V3_SELECTED_TAGS.render(tags, { onRemove: true }),
      '<div>', escapeHtml(child.summary || summaryFor(child)), '</div>',
      '<div class="child-warning" id="childWarning">', escapeHtml(state.ui.lastMessage && state.ui.lastMessage.indexOf('3 个方向') !== -1 ? state.ui.lastMessage : ''), '</div>',
      '</div>',
      previewHtml(state),
      profilePanelHtml(state),
      majorProfileHtml(state),
      '<div class="child-search-wrap"><label class="v3-sr-only" for="childMajorSearch">搜索专业</label><input id="childMajorSearch" class="v3-input" placeholder="搜索专业名称，比如：电气、动物医学、计算机、法学"><div id="childSearchResults"></div></div>',
      '<div class="major-grid" id="majorGrid">',
      window.LN_V3_CHILD_GROUPS.all.map(function (group) {
        var isSelected = ids.indexOf(group.id) !== -1;
        return [
          '<article class="major-card', isSelected ? ' is-selected' : '', '" data-group-card="', escapeHtml(group.id), '">',
          '<h3>', escapeHtml(group.name), '</h3>',
          '<p>', escapeHtml(group.desc), '</p>',
          '<div class="major-examples">代表专业：', escapeHtml(group.examples.slice(0, 3).join('、')), '</div>',
          '<p>', escapeHtml(group.fit), '</p>',
          '<div class="major-card-actions"><button type="button" class="', isSelected ? '' : 'primary', '" data-toggle-group="', escapeHtml(group.id), '">', isSelected ? '已选择，点此取消' : '选择这个方向', '</button><button type="button" data-expand-group="', escapeHtml(group.id), '">展开具体专业</button></div>',
          '</article>'
        ].join('');
      }).join(''),
      '</div>',
      '<div id="majorDetailRoot"></div>',
      '<div class="manual-toggle"><strong>只看真实命中兴趣方向</strong><p>默认只影响排序和提醒；开启后，后续候选会收窄到和孩子兴趣直接相关的专业。</p><button type="button" data-manual-only>', child.manualOnly ? '已开启，点击关闭' : '开启真实命中', '</button></div>',
      '<div class="unknown-choice"><div><strong>暂不确定 / 听系统推荐</strong><span>孩子现在说不清楚也正常，系统可以先按位次、家庭底线和稳妥路径给出方案。</span></div><button type="button" data-child-unknown>先听系统推荐</button></div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-child-save>确认这些兴趣方向，继续看场景</button><button type="button" class="v3-btn secondary" data-child-reset>重新选择</button></div>',
      '</div></section>'
    ].join('');
  }
  function renderDetail(root, groupId) {
    var group = window.LN_V3_CHILD_GROUPS.find(groupId);
    if (!group) return;
    var state = window.LN_V3_STORE.getState();
    var selected = selectedMajorNames(state);
    var detail = root.querySelector('#majorDetailRoot');
    detail.innerHTML = [
      '<div class="major-detail" data-detail-group="', escapeHtml(group.id), '">',
      '<h3>', escapeHtml(group.name), ' · 具体专业</h3>',
      '<div class="major-chip-list">',
      group.examples.map(function (major) {
        var on = selected.indexOf(major) !== -1;
        return '<button type="button" class="major-chip' + (on ? ' is-selected' : '') + '" data-toggle-major="' + escapeHtml(group.id) + '" data-major-name="' + escapeHtml(major) + '">' + escapeHtml(major) + '</button>';
      }).join(''),
      '</div></div>'
    ].join('');
    detail.querySelectorAll('[data-toggle-major]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleMajor(btn.getAttribute('data-toggle-major'), btn.getAttribute('data-major-name'));
        window.LN_V3_WIZARD.render();
      });
    });
  }
  function bind(root) {
    root.querySelectorAll('[data-toggle-group]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleGroup(btn.getAttribute('data-toggle-group')); window.LN_V3_WIZARD.render(); });
    });
    root.querySelectorAll('[data-expand-group]').forEach(function (btn) {
      btn.addEventListener('click', function () { renderDetail(root, btn.getAttribute('data-expand-group')); });
    });
    root.querySelectorAll('[data-remove-tag]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-remove-tag');
        if (id.indexOf('major:') === 0) {
          var name = id.replace('major:', '');
          window.LN_V3_STORE.update(function (draft) {
            draft.childPreference.selectedMajors = (draft.childPreference.selectedMajors || []).filter(function (major) { return major.name !== name; });
            draft.childPreference.summary = summaryFor(draft.childPreference);
            draft.childPreference.weights = buildWeights(draft.childPreference.selectedGroups || [], draft.childPreference.selectedMajors || [], draft.childPreference.manualOnly);
            draft.ui.lastMessage = draft.childPreference.summary;
            syncPreview(draft);
          }, 'child:removeMajorTag');
        } else {
          toggleGroup(id);
        }
        window.LN_V3_WIZARD.render();
      });
    });
    root.querySelectorAll('[data-profile-field]').forEach(function (el) {
      el.addEventListener('change', function () {
        var field = el.getAttribute('data-profile-field');
        var patch = {}; patch[field] = el.value;
        var next = window.LN_V3_STUDENT_PROFILE && window.LN_V3_STUDENT_PROFILE.normalized ? window.LN_V3_STUDENT_PROFILE.normalized(Object.assign({}, window.LN_V3_STORE.getState().studentProfile || {}, patch)) : patch;
        window.LN_V3_STORE.update(function (draft) {
          draft.studentProfile = next;
          draft.ui.lastMessage = next.summary || '学生画像已更新。';
          syncPreview(draft);
        }, 'studentProfile:update:' + field);
        window.LN_V3_WIZARD.render();
      });
    });
    var search = root.querySelector('#childMajorSearch');
    var results = root.querySelector('#childSearchResults');
    search.addEventListener('input', function () {
      results.innerHTML = window.LN_V3_CHILD_SEARCH.renderResults(search.value);
      results.querySelectorAll('[data-search-pick]').forEach(function (btn) {
        btn.addEventListener('click', function () { toggleGroup(btn.getAttribute('data-search-pick')); window.LN_V3_WIZARD.render(); });
      });
    });
    root.querySelector('[data-child-unknown]').addEventListener('click', function () { setUnknown(); window.LN_V3_WIZARD.render(); });
    root.querySelector('[data-manual-only]').addEventListener('click', function () { toggleManualOnly(); window.LN_V3_WIZARD.render(); });
    root.querySelector('[data-child-reset]').addEventListener('click', function () {
      writeChildPreference({ mode: 'unset', selectedGroups: [], selectedMajors: [], manualOnly: false, preview: null }, 'child:reset');
      window.LN_V3_WIZARD.render();
    });
    root.querySelector('[data-child-save]').addEventListener('click', function () {
      var state = window.LN_V3_STORE.getState();
      if (state.childPreference.mode === 'unset') setUnknown();
      window.LN_V3_STORE.markComplete('child', 'child:complete');
      window.LN_V3_ROUTER.go('scenario', 'child:next');
    });
  }
  window.LN_V3_STEP_CHILD = { render: function (root, state) { root.innerHTML = html(state); bind(root); }, _test: { toggleGroup: toggleGroup, toggleMajor: toggleMajor, setUnknown: setUnknown, toggleManualOnly: toggleManualOnly } };
})();
