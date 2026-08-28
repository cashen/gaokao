import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const page = read('tongxue/index.html');
const changelog = read('tongxue/changelog.html');
const release = read('shared/resources/release/current-release.js');
const runtime = read('tongxue/app/tongxue-runtime-v159-r3968.js');
const controller = read('tongxue/app/tongxue-runtime-controller-v159.js');

for (const source of [page, changelog]) {
  assert.ok(source.includes('data-release="v3.9.90.2"'), 'Tongxue page release marker drift');
  assert.ok(source.includes('data-site-runtime-generation="v3990_2"'), 'Tongxue runtime generation marker drift');
  assert.ok(source.includes('data-tongxue-capability-version="tongxue-runtime-v159-r3968"'), 'Tongxue capability marker drift');
  assert.ok(!source.includes('v3.9.68.0'), 'Tongxue page still exposes stale full-site release');
}

assert.ok(page.includes('能力版本 v1.5.9 · 全站发布 v3.9.90.2'), 'Tongxue index footer must expose capability and site release');
assert.ok(changelog.includes('<span class="badge">当前全站发布</span><h2>v3.9.90.2</h2>'), 'Tongxue changelog must lead with current site release');
assert.ok(changelog.includes('<span class="badge">当前 Tongxue 能力版本</span><h2>v1.5.9</h2>'), 'Tongxue changelog must preserve explicit capability version');
assert.ok(changelog.includes('当前全站发布：<span data-current-release>v3.9.90.2</span>'), 'Tongxue changelog footer release drift');
assert.ok(release.includes("version: 'v3.9.90.2'"), 'canonical release drift');
assert.ok(release.includes("siteRuntimeGeneration: 'v3990_2'"), 'canonical generation drift');
assert.ok(release.includes("tongxueRuntimeVersion: 'tongxue-runtime-v159-r3968'"), 'Tongxue runtime owner drift');
assert.ok(runtime.includes("const EXPECTED_BUILD = 'tongxue-v159-single-runtime-owner-20260726'"), 'stable Tongxue build owner changed unexpectedly');
assert.ok(controller.includes("const RUNTIME_VERSION = 'tongxue-runtime-v159'"), 'Tongxue runtime capability identity drift');

console.log('tongxue-release-identity-v002: PASS');
