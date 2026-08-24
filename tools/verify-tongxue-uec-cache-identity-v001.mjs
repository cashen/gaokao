import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('tongxue/index.html', 'utf8');
const headers = fs.readFileSync('_headers', 'utf8');
const controller = fs.readFileSync('tongxue/app/tongxue-runtime-controller-v159.js', 'utf8');
const resultView = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-v159.js', 'utf8');
const wrapper = fs.readFileSync('tongxue/app/tongxue-runtime-v159-r3968.js', 'utf8');

const CONTROLLER_SPECIFIER = '/tongxue/app/tongxue-runtime-controller-v159.js?v=159';
const CONTROLLER_IDENTITY = '/tongxue/app/tongxue-runtime-controller-v159.js?v=159-fuzzy001';
const RESULT_VIEW_SPECIFIER = '/tongxue/app/tongxue-runtime-result-view-v159.js?v=159';
const RESULT_VIEW_IDENTITY = '/tongxue/app/tongxue-runtime-result-view-v159.js?v=159-flow004';

const importMapMatch = html.match(/<script type="importmap">([^<]+)<\/script>/);
assert.ok(importMapMatch, 'Tongxue import map missing');
const importMap = JSON.parse(importMapMatch[1]);
assert.equal(importMap.imports?.[CONTROLLER_SPECIFIER], CONTROLLER_IDENTITY, 'controller immutable identity is not cache-busted');
assert.equal(importMap.imports?.[RESULT_VIEW_SPECIFIER], RESULT_VIEW_IDENTITY, 'result view immutable identity is not cache-busted');

assert.ok(html.includes('tongxue-runtime-v159-r3968.js?v=3968_0'), 'stable Tongxue wrapper changed unexpectedly');
assert.ok(wrapper.includes("./tongxue-runtime-controller-v159.js?v=159"), 'stable wrapper import contract drifted');
assert.ok(controller.includes("./tongxue-runtime-result-view-v159.js?v=159"), 'controller result-view import contract drifted');
assert.ok(controller.includes("./tongxue-runtime-search-view-v159.js?v=159-fuzzy001"), 'controller search-view fuzzy identity missing');
assert.ok(controller.includes("state.voiceScope = 'major'"), 'controller lost major voice scope transition');
assert.ok(controller.includes('performMajorExperienceQuery'), 'controller lost major direct-query owner');
assert.ok(resultView.includes("data-student-voice-scope=\"major\""), 'result view lost major voice rendering');
assert.ok(resultView.includes("PAGE_VERSION = 'v1.5.9-uec01-evidence02'"), 'result view evidence capability marker missing');
assert.ok(resultView.includes('大家主要在说什么'), 'result view human summary heading missing');
assert.ok(resultView.includes('这些概括从哪来？'), 'result view human evidence explanation missing');
assert.ok(!resultView.includes('AI总结'), 'result view must not expose AI implementation label');
assert.ok(!resultView.includes('provenance'), 'result view must not expose provenance jargon');

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
  contract: 'tongxue-uec-immutable-cache-identity-v0.01',
  stableWrapper: 'tongxue-runtime-v159-r3968',
  controllerIdentity: CONTROLLER_IDENTITY,
  resultViewIdentity: RESULT_VIEW_IDENTITY,
  humanCopy: true,
  ownerCount: 1
}, null, 2));
