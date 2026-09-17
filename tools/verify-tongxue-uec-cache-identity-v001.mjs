import assert from 'node:assert/strict';
import fs from 'node:fs';

// Contract revision v0.02: the public result-view module is a compatibility/decorator
// entry point; result-view-core remains the single business-rendering owner.
const html = fs.readFileSync('tongxue/index.html', 'utf8');
const headers = fs.readFileSync('_headers', 'utf8');
const controller = fs.readFileSync('tongxue/app/tongxue-runtime-controller-v159.js', 'utf8');
const resultView = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-v159.js', 'utf8');
const resultViewCore = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-core-v159.js', 'utf8');
const wrapper = fs.readFileSync('tongxue/app/tongxue-runtime-v159-r3968.js', 'utf8');

const CONTROLLER_SPECIFIER = '/tongxue/app/tongxue-runtime-controller-v159.js?v=159';
const CONTROLLER_IDENTITY = '/tongxue/app/tongxue-runtime-controller-v159.js?v=159-startup001';
const CONTROLLER_CACHE_IDENTITY = `${CONTROLLER_IDENTITY}&r=r036-major-history-rank-lazy`;
const RESULT_VIEW_SPECIFIER = '/tongxue/app/tongxue-runtime-result-view-v159.js?v=159';
const RESULT_VIEW_IDENTITY = '/tongxue/app/tongxue-runtime-result-view-v159.js?v=159-flow006&r=r052-tongxue-school-social-labels';

const importMapMatch = html.match(/<script type="importmap">([^<]+)<\/script>/);
assert.ok(importMapMatch, 'Tongxue import map missing');
const importMap = JSON.parse(importMapMatch[1]);
assert.equal(importMap.imports?.[CONTROLLER_SPECIFIER], CONTROLLER_CACHE_IDENTITY, 'controller immutable identity/cache revision is not wired');
assert.equal(importMap.imports?.[RESULT_VIEW_SPECIFIER], RESULT_VIEW_IDENTITY, 'result view immutable identity is not cache-busted');

assert.ok(html.includes('tongxue-runtime-v159-r3968.js?v=3968_0'), 'stable Tongxue wrapper changed unexpectedly');
assert.ok(wrapper.includes("./tongxue-runtime-controller-v159.js?v=159"), 'stable wrapper import contract drifted');
assert.ok(controller.includes("./tongxue-runtime-result-view-v159.js?v=159"), 'controller result-view import contract drifted');
assert.ok(controller.includes("./tongxue-runtime-search-view-v159.js?v=159-startup001"), 'controller search-view immutable identity missing');
assert.ok(controller.includes("state.voiceScope = 'major'"), 'controller lost major voice scope transition');
assert.ok(controller.includes('performMajorExperienceQuery'), 'controller lost major direct-query owner');

// v159 result-view is intentionally a compatibility/decorator entry point.
// The actual school/major review rendering contract lives in result-view-core.
assert.ok(resultView.includes('createBaseResultView'), 'result view compatibility entry lost');
assert.ok(resultView.includes('createTongxueResultView'), 'result view compatibility factory lost');
assert.ok(resultViewCore.includes('data-student-voice-scope="major"'), 'result-view core lost major voice rendering');
assert.ok(resultViewCore.includes("const PAGE_VERSION = 'v1.5.9-uec01-evidence02'"), 'result-view core evidence capability marker missing');
assert.ok(resultViewCore.includes('先看这两件事'), 'result-view core human summary heading missing');
assert.ok(resultViewCore.includes('这些概括从哪来？'), 'result-view core human evidence explanation missing');
assert.ok(!resultViewCore.includes('AI总结'), 'result-view core must not expose AI implementation label');
assert.ok(!resultViewCore.includes('provenance'), 'result-view core must not expose provenance jargon');

for (const pathname of [
  '/tongxue/app/tongxue-runtime-controller-v159.js',
  '/tongxue/app/tongxue-runtime-result-view-v159.js'
]) {
  const escaped = pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(headers, new RegExp(`${escaped}\\n\\s+Cache-Control: public, max-age=31536000, immutable`), `${pathname} must remain explicitly immutable`);
}

assert.notEqual(CONTROLLER_SPECIFIER, CONTROLLER_IDENTITY);
assert.notEqual(RESULT_VIEW_SPECIFIER, RESULT_VIEW_IDENTITY);

console.log(JSON.stringify({
  ok: true,
  contract: 'tongxue-uec-immutable-cache-identity-v0.02',
  stableWrapper: 'tongxue-runtime-v159-r3968',
  controllerIdentity: CONTROLLER_IDENTITY,
  resultViewIdentity: RESULT_VIEW_IDENTITY,
  compatibilityEntry: true,
  coreBusinessOwner: true,
  humanCopy: true,
  ownerCount: 1
}, null, 2));
