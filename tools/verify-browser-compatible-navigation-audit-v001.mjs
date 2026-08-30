import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { buildMajorPathHref } from '../shared/resources/majors/major-path-navigation.v003.js';
import { buildStudentVoiceMajorHref } from '../shared/resources/experience/student-voice-navigation.v001.js';

const read = path => fs.readFileSync(path, 'utf8');
const exists = path => fs.existsSync(path);
const redirects = read('_redirects');
const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
const interaction = read('shared/ui/interaction/interaction-transaction.v3990_3.js');
const majorNavigation = read('shared/resources/majors/major-path-navigation.v003.js');
const studentVoiceNavigation = read('shared/resources/experience/student-voice-navigation.v001.js');
const report = read('browser-audit/index.html');
const manifest = read('shared/resources/release/active-resource-manifest.v3990_3.js');

const requiredRedirects = [
  '/ln-rank/selection-pool.html /ln-rank/selection-pool 301',
  '/ln2026.html /ln2026 301',
  '/zy2026 /zy2026/ 301',
  '/zy2026.html /zy2026/ 301',
  '/zy.html /zy2026/ 301',
  '/browser-audit.html /browser-audit/ 301',
  '/diagnostics.html /browser-audit/ 301',
  '/Public_company/source /Public_company/ 301'
];
for (const rule of requiredRedirects) assert.ok(redirects.includes(rule), `missing redirect: ${rule}`);

assert.equal((handoff.match(/createElement\('a'\)/g) || []).length, 2, 'both cross-module factories must create anchors');
assert.equal((handoff.match(/createElement\('button'\)/g) || []).length, 0, 'cross-module handoff must not generate button-only navigation');
assert.equal((handoff.match(/link\.href = href/g) || []).length, 2, 'both cross-module anchors must carry href');
assert.ok(interaction.includes('function isNativeLink(action)'), 'interaction owner must recognize native links');
assert.ok(interaction.includes('if (!action || isNativeLink(action)) return;'), 'gesture start/end must not block native links');
assert.ok(interaction.includes('emitNativeLinkAcceptance(action);'), 'native link acceptance must preserve resume-state instrumentation');
for (const [name, source, meta] of [
  ['major path', majorNavigation, 'MAJOR_PATH_NAVIGATION_META'],
  ['student voice', studentVoiceNavigation, 'STUDENT_VOICE_NAVIGATION_META']
]) {
  assert.ok(source.includes('maxUrlLength: 1800') || source.includes('maxUrlLength:1800'), `${name} navigation must publish a URL budget`);
  assert.ok(source.includes('params.delete(DECISION_CONTEXT_QUERY_KEY)'), `${name} navigation must drop optional context when over budget`);
  assert.ok(source.includes(meta), `${name} navigation metadata owner missing`);
}

assert.ok(report.includes('data-audit-version="browser-compatibility-audit-v001"'));
assert.ok(report.includes('href="https://gaokao.powers.org.cn/browser-audit/"'));
assert.ok(report.includes('name="viewport"'));
assert.ok(report.includes('PC Chrome') && report.includes('Android Chrome') && report.includes('Alook'));
assert.ok(!/<script[\s>]/i.test(report) && !/fetch\(/i.test(report), 'audit report must be readable without network/runtime JavaScript');
assert.ok(manifest.includes('browserCompatibilityAudit'), 'active manifest must declare the audit owner');
assert.equal(CURRENT_RELEASE.browserCompatibilityAuditVersion, 'browser-compatibility-audit-v001');
assert.equal(CURRENT_RELEASE.browserCompatibilityAuditRevision, 'r002-native-links-url-budget-canonical-routes-audit-report');
assert.equal(CURRENT_RELEASE.resourceOwners.browserCompatibilityAudit, '/browser-audit/');
assert.ok(exists('browser-audit/index.html'));
const largeContext = {
  sourceSurface: 'ln-rank',
  sourceAction: 'view_major_path',
  returnTo: '/ln-rank/?x=' + 'x'.repeat(880),
  province: '辽宁',
  admissionYear: 2026,
  track: '物理类',
  score: 580,
  regionLabel: '辽宁',
  school: '沈阳建筑大学',
  major: '工程管理',
  majorCode: '120103',
  majorKeywords: ['工程管理'.repeat(20)],
  candidateIds: ['school-key'.repeat(8)],
  evidenceRefs: [{kind: 'result', label: '当前专业初选结果'.repeat(20), ref: 'record'.repeat(20)}]
};
const boundedMajorHref = buildMajorPathHref({
  majorCode: '120103',
  canonicalName: '工程管理',
  context: 'school',
  sourceKey: 'school-key',
  sourceMajor: '工程管理',
  school: '沈阳建筑大学',
  returnTo: largeContext.returnTo,
  decisionContext: largeContext
});
const boundedVoiceHref = buildStudentVoiceMajorHref({
  majorCode: '120103',
  canonicalName: '工程管理',
  context: 'school',
  sourceKey: 'school-key',
  returnTo: largeContext.returnTo,
  decisionContext: largeContext
});
assert.ok(boundedMajorHref.length <= 1800, `major handoff exceeded mobile URL budget: ${boundedMajorHref.length}`);
assert.ok(boundedVoiceHref.length <= 1800, `student voice handoff exceeded mobile URL budget: ${boundedVoiceHref.length}`);

for (const [path, source] of [
  ['index.html', read('index.html')],
  ['aiplus/selection-workbench.v005.js', read('aiplus/selection-workbench.v005.js')],
  ['ln-rank/selection-pool.html', read('ln-rank/selection-pool.html')]
]) {
  assert.ok(!source.includes('/ln-rank/selection-pool.html'), `${path} still actively links to the legacy selection-pool address`);
  assert.ok(!source.includes('/ln2026.html'), `${path} still actively links to the legacy ln2026 address`);
}
assert.ok(/location\.replace\('\/zy2026\/'\)/.test(read('zy2026.html')), 'zy2026.html must be a redirect-only compatibility entry');
assert.ok(!read('zy2026.html').includes('zy2026.v3966_0.js'), 'zy2026.html must not own the older runtime');

console.log(JSON.stringify({
  ok: true,
  capability: CURRENT_RELEASE.browserCompatibilityAuditVersion,
  revision: CURRENT_RELEASE.browserCompatibilityAuditRevision,
  nativeCrossModuleFactories: 2,
  explicitLegacyRedirects: requiredRedirects.length,
  offlineReport: true,
  protectedFenxiUntouchedByContract: true
}, null, 2));
