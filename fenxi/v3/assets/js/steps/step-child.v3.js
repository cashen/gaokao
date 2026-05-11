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
  function writeChildPreference(patch, reason) {
    window.LN_V3_STORE.update(function (draft) {
      draft.childPreference = Object.assign({}, draft.childPreference, patch);
      draft.childPreference.summary = summaryFor(draft.childPreference);
      draft.childPreference.weights = buildWeights(draft.childPreference.selectedGroups || [], draft.childPreference.selectedMajors || [], draft.childPreference.manualOnly);
      draft.ui.lastMessage = draft.childPreference.summary;
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
    writeChildPreference({ mode: 'unknown', selectedGroups: [], selectedMajors: [], manualOnly: false }, 'child:unknown');
  }
  function toggleManualOnly() {
    var state = window.LN_V3_STORE.getState();
    writeChildPreference({ manualOnly: !state.childPreference.manualOnly }, 'child:manualOnly');
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
          }, 'child:removeMajorTag');
        } else {
          toggleGroup(id);
        }
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
      writeChildPreference({ mode: 'unset', selectedGroups: [], selectedMajors: [], manualOnly: false }, 'child:reset');
      window.LN_V3_WIZARD.render();
    });
    root.querySelector('[data-child-save]').addEventListener('click', function () {
      var state = window.LN_V3_STORE.getState();
      if (state.childPreference.mode === 'unset') setUnknown();
      window.LN_V3_STORE.markComplete('child', 'child:complete');
      window.LN_V3_ROUTER.go('scenario', 'child:next');
    });
  }
  window.LN_V3_STEP_CHILD = { render: function (root, state) { root.innerHTML = html(state); bind(root); }, _test: { toggleGroup: toggleGroup, toggleMajor: toggleMajor, setUnknown: setUnknown } };
})();
