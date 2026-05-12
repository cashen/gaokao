(function () {
  'use strict';
  function check(name, condition, detail) { return { ok: !!condition, name: name, detail: detail || '' }; }
  function run() {
    var results = [];
    var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
    results.push(check('Step5 渲染模块存在', !!window.LN_V3_STEP_PLANS));
    results.push(check('plans-adapter 存在', !!window.LN_V3_PLANS_ADAPTER));
    if (!window.LN_V3_PLANS_ADAPTER) return results;
    var preview = window.LN_V3_PLANS_ADAPTER.preview(state);
    results.push(check('Step5 方案预览可生成', !!(preview && preview.ok), JSON.stringify({ reason: preview && preview.reason, effectiveRows: preview && preview.effectiveRows, counts: preview && preview.counts })));
    results.push(check('Step5 A/B/C 结构存在', !!(preview && preview.plans && preview.plans.A && preview.plans.B && preview.plans.C), JSON.stringify(preview && preview.counts || {})));
    results.push(check('Step5 A方案有样例', !!(preview && preview.plans && preview.plans.A && preview.plans.A.sample && preview.plans.A.sample.length > 0), JSON.stringify((preview && preview.plans && preview.plans.A && preview.plans.A.sample || []).slice(0, 2))));
    results.push(check('Step5 B方案有样例', !!(preview && preview.plans && preview.plans.B && preview.plans.B.sample && preview.plans.B.sample.length > 0), JSON.stringify((preview && preview.plans && preview.plans.B && preview.plans.B.sample || []).slice(0, 2))));
    results.push(check('Step5 C方案有样例', !!(preview && preview.plans && preview.plans.C && preview.plans.C.sample && preview.plans.C.sample.length > 0), JSON.stringify((preview && preview.plans && preview.plans.C && preview.plans.C.sample || []).slice(0, 2))));
    results.push(check('Step5 B方案说明已生成', !!(preview && preview.plans && preview.plans.B && preview.plans.B.tone), preview && preview.plans && preview.plans.B && preview.plans.B.tone || ''));
    var applied = window.LN_V3_PLANS_ADAPTER.apply('debug-step-plans');
    var after = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
    results.push(check('Step5 方案写入 store', !!(after.plans && after.plans.preview && after.plans.preview.ok), JSON.stringify(after.plans && after.plans.preview && after.plans.preview.counts || {})));
    results.push(check('Step5 compute 记录有效池', Number(((after.compute || {}).filtered) || 0) === Number((applied || {}).effectiveRows || 0), JSON.stringify({ compute: after.compute, effectiveRows: applied && applied.effectiveRows })));
    return results;
  }
  window.LN_V3_DEBUG_STEP_PLANS = { run: run };
})();
