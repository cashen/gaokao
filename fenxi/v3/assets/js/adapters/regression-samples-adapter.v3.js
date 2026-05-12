(function () {
  'use strict';
  var SAMPLES = [
    { id: 'high_platform_electric', name: '650+ 高分平台型｜电气兴趣不降格为电网', score: 650, rank: 9000, regionMode: 'none', provinces: [], groups: ['electric_energy'], expected: 'platform', expectPlan: 'high-platform' },
    { id: 'school_major_balance_cs', name: '610 学校专业平衡型｜计算机热门方向', score: 610, rank: 26000, regionMode: 'soft', provinces: ['辽宁','吉林','黑龙江'], groups: ['computer_ai'], expected: 'major', expectPlan: 'major-balance' },
    { id: 'province_compare_unknown', name: '560 省内优先型｜兴趣不明先稳范围', score: 560, rank: 42000, regionMode: 'hard', provinces: ['辽宁'], groups: [], mode: 'unknown', expected: 'province_public', expectPlan: 'province-public' },
    { id: 'liaoning_electric_500', name: '500 辽宁电气型｜家庭路径压住单一电网叙事', score: 500, rank: 56548, regionMode: 'hard', provinces: ['辽宁'], groups: ['electric_energy'], majors: ['电气工程及其自动化'], manualOnly: true, familyRows: 1597, matchedRows: 116, expected: 'province_public', expectPlan: 'interest-in-b' },
    { id: 'low_guarantee_electric', name: '470 低分保底型｜电气兴趣不带偏', score: 470, rank: 85000, regionMode: 'hard', provinces: ['辽宁'], groups: ['electric_energy'], familyRows: 900, matchedRows: 40, expected: 'guarantee', expectPlan: 'guarantee-first' },
    { id: 'edge_undergraduate_unknown', name: '405 本科边缘型｜先看机会和成本', score: 405, rank: 118000, regionMode: 'soft', provinces: ['辽宁'], groups: [], mode: 'unknown', familyRows: 1600, matchedRows: 0, expected: 'guarantee', expectPlan: 'edge-guarantee' },
    { id: 'soft_region_broad', name: '500 东北地域偏好型｜宽口径不是放弃', score: 500, rank: 56548, regionMode: 'soft', provinces: ['辽宁','吉林','黑龙江'], groups: [], mode: 'unknown', familyRows: 6200, bigPool: true, matchedRows: 0, expected: 'broad', expectPlan: 'soft-region' },
    { id: 'animal_medicine_500', name: '500 动物医学/农学路径｜详细卡片承接兴趣', score: 500, rank: 56548, regionMode: 'hard', provinces: ['辽宁'], groups: ['agri_animal_food'], familyRows: 1597, matchedRows: 60, expected: 'province_public', expectPlan: 'animal-card' },
    { id: 'medicine_health_590', name: '590 医学健康路径｜长周期进入专业/深造复核', score: 590, rank: 31000, regionMode: 'none', provinces: [], groups: ['medicine_health'], familyRows: 2300, matchedRows: 120, expectedAny: ['major','exam','platform'], expectPlan: 'medical-review' },
    { id: 'budget_limited_500', name: '500 预算受限型｜成本复核必须出现', score: 500, rank: 56548, regionMode: 'hard', provinces: ['辽宁'], groups: [], mode: 'unknown', familyRows: 1505, rejects: ['高收费'], expectedAny: ['province_public','broad'], expectPlan: 'cost-review' },
    { id: 'hotword_misread_cs_470', name: '470 计算机热门词误读型｜先防成本和误认', score: 470, rank: 85000, regionMode: 'soft', provinces: ['辽宁'], groups: ['computer_ai'], studentProfile: { source: 'parent_observe', learning: 'science', load: 'sensitive', path: 'work_first', understanding: 'hot_words' }, familyRows: 1800, matchedRows: 90, expectedAny: ['guarantee','cost_risk'], expectPlan: 'misread-review' },
    { id: 'open_no_interest_625', name: '625+ 无兴趣开放型｜平台/宽口径优先比较', score: 635, rank: 15000, regionMode: 'none', provinces: [], groups: [], mode: 'unknown', familyRows: 2800, matchedRows: 0, expectedAny: ['platform','broad'], expectPlan: 'high-open' }
  ];
  function fakeState(sample) {
    var groups = sample.groups || [];
    var majors = sample.majors || [];
    var familyRows = sample.familyRows || 1597;
    var matchedRows = sample.matchedRows || 0;
    return {
      rank: { score: String(sample.score || ''), rank: String(sample.rank || ''), loadedRows: sample.basePool || 7934 },
      family: { regionMode: sample.regionMode || 'none', provinces: sample.provinces || [], budget: sample.budget || 'normal', feeType: sample.feeType || 'all', rejects: sample.rejects || [], preview: { filteredPreview: familyRows, bigPool: !!sample.bigPool } },
      studentProfile: sample.studentProfile || { source: 'parent_observe', learning: 'science', load: 'normal', path: 'undecided', understanding: 'basic' },
      childPreference: { mode: sample.mode || (groups.length ? 'selected' : 'unknown'), selectedGroups: groups.map(function (id) { return { id: id, name: id }; }), selectedMajors: majors.map(function (name) { return { name: name }; }), manualOnly: !!sample.manualOnly, preview: { familyFilteredRows: familyRows, matchedRows: matchedRows, effectiveFilteredRows: sample.manualOnly ? matchedRows : familyRows, bigPool: !!sample.bigPool } },
      scenario: {}, compute: { filtered: familyRows }
    };
  }
  function checkScenario(sample, preview) {
    if (!preview || !preview.recommended) return false;
    if (sample.expected) return preview.recommended === sample.expected;
    if (sample.expectedAny) return sample.expectedAny.indexOf(preview.recommended) !== -1;
    return true;
  }
  function run() {
    if (!window.LN_V3_SCENARIO_ADAPTER || !window.LN_V3_PLANS_ADAPTER) return { ok: false, reason: 'missing-adapters', samples: [] };
    var out = SAMPLES.map(function (sample) {
      var state = fakeState(sample);
      var preview = window.LN_V3_SCENARIO_ADAPTER.recommend(state);
      var pass = checkScenario(sample, preview);
      return {
        id: sample.id,
        name: sample.name,
        score: sample.score,
        expected: sample.expected || (sample.expectedAny || []).join('/'),
        recommended: preview && preview.recommended,
        scoreBand: preview && preview.scoreBand && preview.scoreBand.id,
        region: preview && preview.regionPreference && preview.regionPreference.mode,
        pass: pass,
        notes: (preview && preview.reasons || []).slice(0, 3)
      };
    });
    var passCount = out.filter(function (item) { return item.pass; }).length;
    var critical = out.filter(function (item) { return ['high_platform_electric','liaoning_electric_500','low_guarantee_electric','soft_region_broad','hotword_misread_cs_470'].indexOf(item.id) !== -1; });
    return {
      ok: passCount === out.length && critical.every(function (item) { return item.pass; }),
      stage: 'beta9-real-sample-regression',
      total: out.length,
      pass: passCount,
      fail: out.length - passCount,
      criticalPass: critical.every(function (item) { return item.pass; }),
      samples: out,
      summary: '多路径真实样本回归：' + passCount + '/' + out.length + ' 通过。'
    };
  }
  function staticPlan() {
    return {
      stage: 'beta9-real-path-regression',
      sampleCount: SAMPLES.length,
      sampleIds: SAMPLES.map(function (s) { return s.id; }),
      coverage: ['650+高分平台', '610学校专业平衡', '560省内优先', '500辽宁电气', '470低分保底', '405本科边缘', '地域soft', '动物医学/农学', '医学健康', '预算受限', '热门词误读'],
      safety: 'beta9 只增强一键总检里的多路径真实样本回归，不改变家庭路径、A/B/C、候选生成、证据等级和导出报告。'
    };
  }
  window.LN_V3_REGRESSION_SAMPLES = { staticPlan: staticPlan, run: run, samples: SAMPLES.slice() };
})();
