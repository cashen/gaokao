(function () {
  'use strict';
  function num(v) { var x = Number(v || 0); return Number.isFinite(x) ? x : 0; }
  function ids(list) { return (list || []).map(function (item) { return typeof item === 'string' ? item : item.id; }).filter(Boolean); }
  function build(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var rank = state.rank || {};
    var family = state.family || {};
    var child = state.childPreference || {};
    var childPreview = child.preview || {};
    var band = window.LN_V3_SCORE_BAND_STRATEGY ? window.LN_V3_SCORE_BAND_STRATEGY.resolve(state) : { id: '500_549', label: '500–549 家庭底线主导段', level: 'family_bottomline' };
    var region = window.LN_V3_REGION_PREFERENCE ? window.LN_V3_REGION_PREFERENCE.analyze(family) : { mode: family.regionMode || 'none', level: 'open', label: '地域未分析' };
    var groupIds = ids(child.selectedGroups || []);
    var majorNames = (child.selectedMajors || []).map(function (m) { return m.name || ''; }).filter(Boolean);
    var studentProfile = window.LN_V3_STUDENT_PROFILE ? window.LN_V3_STUDENT_PROFILE.normalized(state.studentProfile || {}) : (state.studentProfile || {});
    var majorProfile = window.LN_V3_MAJOR_PROFILE ? window.LN_V3_MAJOR_PROFILE.profileSelection(state) : (childPreview.majorProfile || null);
    var basePool = num(rank.loadedRows);
    var familyRows = num(childPreview.familyFilteredRows || (family.preview && family.preview.filteredPreview) || (state.compute && state.compute.filtered) || rank.loadedRows);
    var matchedRows = num(childPreview.matchedRows);
    var manualOnly = !!child.manualOnly;
    var effectiveRows = manualOnly && matchedRows > 0 ? num(childPreview.effectiveFilteredRows || matchedRows) : familyRows;
    var bigPool = !!((family.preview && family.preview.bigPool) || (childPreview && childPreview.bigPool) || familyRows > 5000);
    var hasInterest = groupIds.length > 0 || majorNames.length > 0 || child.mode === 'selected';
    return {
      rank: rank,
      score: num(rank.score),
      rankNo: num(rank.rank),
      band: band,
      region: region,
      family: family,
      child: child,
      studentProfile: studentProfile,
      majorProfile: majorProfile,
      groupIds: groupIds,
      selectedMajors: majorNames,
      basePool: basePool,
      familyRows: familyRows,
      matchedRows: matchedRows,
      manualOnly: manualOnly,
      effectiveRows: effectiveRows,
      bigPool: bigPool,
      hasInterest: hasInterest,
      childMode: child.mode || 'unset',
      compute: state.compute || {},
      scenario: state.scenario || {}
    };
  }
  function fake(opts) {
    opts = opts || {};
    var groups = opts.groups || [];
    var majors = opts.majors || [];
    return build({
      rank: { score: String(opts.score || ''), rank: String(opts.rank || ''), loadedRows: opts.basePool || 7934 },
      family: { regionMode: opts.regionMode || 'none', provinces: opts.provinces || [], budget: opts.budget || 'normal', feeType: opts.feeType || 'all', rejects: opts.rejects || [], preview: { filteredPreview: opts.familyRows || 1597, bigPool: !!opts.bigPool } },
      studentProfile: opts.studentProfile || {},
      childPreference: { mode: opts.mode || (groups.length ? 'selected' : 'unknown'), selectedGroups: groups.map(function (id) { return { id: id, name: id }; }), selectedMajors: majors.map(function (name) { return { name: name }; }), manualOnly: !!opts.manualOnly, preview: { familyFilteredRows: opts.familyRows || 1597, matchedRows: opts.matchedRows || 0, effectiveFilteredRows: opts.manualOnly ? (opts.matchedRows || 0) : (opts.familyRows || 1597), bigPool: !!opts.bigPool } },
      compute: { filtered: opts.familyRows || 1597 },
      scenario: {}
    });
  }
  window.LN_V3_DECISION_CONTEXT = { build: build, fake: fake };
})();
