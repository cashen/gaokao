import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION,
  listMajorBackgroundSchools,
  normalizeBackgroundIdentityText,
  queryAcademicBackgroundContext,
  resolveSchoolMajorBackgroundContext,
  validateAcademicBackgroundContextSnapshot
} from '../shared/resources/background/academic-background-context.v001.js';
import {
  buildAcademicBackgroundHref,
  buildMajorPathFromAcademicBackgroundHref,
  sanitizeAcademicBackgroundReturnTarget
} from '../shared/resources/background/academic-background-navigation.v002.js?v=002_0&r=r028-android-links';
import { majorBackgroundFromSnapshot, schoolBackgroundFromSnapshot } from '../functions/_lib/ai/background-resource-adapter.js';
import { deterministicCommand } from '../functions/_lib/ai/command-interpreter.js';
import { claimsFromAcademicBackground, validateClaimSet } from '../functions/_lib/ai/claim-evidence.js';

const ROOT = process.cwd();
const read = path => fs.readFileSync(`${ROOT}/${path}`, 'utf8');
const json = path => JSON.parse(read(path));
const snapshot = json('ln-rank/data/background-context/background-context-index.v001.json');
const audit = json('ln-rank/data/background-context/background-context-audit.v001.json');

assert.equal(snapshot.version, ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION);
assert.equal(validateAcademicBackgroundContextSnapshot(snapshot), true, 'derived context snapshot contract invalid');
assert(snapshot.records.length > 0, 'derived context snapshot is empty');
assert(snapshot.meta.scopeCounts.liaoning > 0 && snapshot.meta.scopeCounts['211'] > 0, 'both evidence scopes are required');
assert(snapshot.records.every(item => item.score2026 === undefined && item.rank2026 === undefined), 'background index must not own admissions score/rank');
assert(fs.statSync(`${ROOT}/ln-rank/data/background-context/background-context-index.v001.json`).size < 900_000, 'background context resource budget exceeded');
assert(Object.values(audit.assertions || {}).every(Boolean), 'background context build audit has a false assertion');
const evidence211 = snapshot.records.filter(item => item.scope === '211').flatMap(item => item.evidence || []);
assert(evidence211.length > 0 && evidence211.every(item => /^https:\/\//.test(item.sourceUrl || '')), '211 evidence must retain an official https provenance URL');

// Unfiltered discovery must be non-empty; exact school-major remains exact.
const allContext = queryAcademicBackgroundContext(snapshot, { scope: 'auto', regionKeys: ['all'], limit: 500 });
assert.equal(allContext.ok, true);
assert(allContext.records.length > 0, 'unfiltered unified background discovery collapsed to empty');

const byPair = new Map();
for (const record of snapshot.records) {
  const key = `${normalizeBackgroundIdentityText(record.schoolIdentity || record.school)}|${record.canonicalMajor?.code || ''}`;
  const item = byPair.get(key) || { school: record.schoolIdentity || record.school, major: record.canonicalMajor, scopes: new Set(), records: [] };
  item.scopes.add(record.scope);
  item.records.push(record);
  byPair.set(key, item);
}
const dual = [...byPair.values()].find(item => item.scopes.has('liaoning') && item.scopes.has('211'));
assert(dual, 'expected at least one real Liaoning school-major pair with both evidence scopes');
const dualContext = resolveSchoolMajorBackgroundContext(snapshot, {
  school: dual.school,
  majorCode: dual.major.code,
  majorName: dual.major.name,
  scope: 'auto'
});
assert.equal(dualContext.matched, true);
assert.deepEqual(new Set(dualContext.scopesMatched), new Set(['liaoning', '211']));
assert(dualContext.matches.every(item => item.canonicalMajor.code === dual.major.code), 'exact school-major context widened to another canonical major');

// Dedupe is by evidence/source identity, not by evidence scope count.
const syntheticEvidence = Object.freeze({ evidenceId: 'E-SAME', sourceId: 'S-SAME', evidenceType: 'verified-background', disciplineCode: 'X', disciplineName: '测试学科', grade: '', evidenceYear: '2026', detail: '同一证据', sourceUrl: 'https://example.edu.cn/evidence' });
const syntheticSource = Object.freeze({ sourceId: 'S-SAME', title: '同一官方来源', url: 'https://example.edu.cn/evidence', year: '2026', authority: '测试教育机构' });
const synthetic = {
  version: ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION,
  meta: { executionRole: 'derived-evidence-index-only', scopeCounts: { liaoning: 1, '211': 1 } },
  records: ['liaoning', '211'].map(scope => ({
    scope, school: '测试大学', schoolIdentity: '测试大学', canonicalMajor: { code: '080601', name: '电气工程及其自动化' },
    province: '辽宁', city: '沈阳', displayLocation: '辽宁 · 沈阳', directions: ['电气工程'], admissionMajors: ['电气工程及其自动化'],
    evidence: [syntheticEvidence], sources: [syntheticSource]
  }))
};
const syntheticContext = resolveSchoolMajorBackgroundContext(synthetic, { school: '测试大学', majorCode: '080601', scope: 'auto' });
assert.equal(syntheticContext.matches.length, 2, 'two evidence scopes should remain visible as two views');
assert.equal(syntheticContext.evidence.length, 1, 'identical evidence must dedupe across scopes');
assert.equal(syntheticContext.sources.length, 1, 'identical source must dedupe across scopes');
assert.deepEqual(new Set(syntheticContext.evidence[0].scopes), new Set(['liaoning', '211']));

// A broad spoken major may collapse only inside one known school when the related canonical result is unique.
const uniqueShorthand = schoolBackgroundFromSnapshot(synthetic, '测试大学', { scope: 'auto', major: '电气' });
assert.equal(uniqueShorthand.items.length, 1, 'unique school-scoped shorthand did not resolve to the only canonical major');
assert.equal(uniqueShorthand.items[0].canonicalMajor.code, '080601');
assert.equal(uniqueShorthand.exact?.matched, true);
const ambiguousSynthetic = {
  version: ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION,
  meta: { executionRole: 'derived-evidence-index-only', scopeCounts: { liaoning: 2, '211': 1 } },
  records: [
    { scope: 'liaoning', school: '歧义大学', schoolIdentity: '歧义大学', canonicalMajor: { code: '080601', name: '电气工程及其自动化' }, province: '辽宁', city: '沈阳', displayLocation: '辽宁 · 沈阳', directions: ['电气工程'], admissionMajors: ['电气工程及其自动化'], evidence: [syntheticEvidence], sources: [syntheticSource] },
    { scope: 'liaoning', school: '歧义大学', schoolIdentity: '歧义大学', canonicalMajor: { code: '080604T', name: '电气工程与智能控制' }, province: '辽宁', city: '沈阳', displayLocation: '辽宁 · 沈阳', directions: ['电气工程'], admissionMajors: ['电气工程与智能控制'], evidence: [{ ...syntheticEvidence, evidenceId: 'E-SECOND', detail: '第二个电气相关专业' }], sources: [syntheticSource] },
    { scope: '211', school: '占位大学', schoolIdentity: '占位大学', canonicalMajor: { code: '080601', name: '电气工程及其自动化' }, province: '辽宁', city: '沈阳', displayLocation: '辽宁 · 沈阳', directions: ['电气工程'], admissionMajors: ['电气工程及其自动化'], evidence: [syntheticEvidence], sources: [syntheticSource] }
  ]
};
const ambiguousShorthand = schoolBackgroundFromSnapshot(ambiguousSynthetic, '歧义大学', { scope: 'liaoning', major: '电气' });
assert.equal(ambiguousShorthand.items.length, 0, 'ambiguous school-scoped shorthand silently selected one canonical major');
assert.equal(ambiguousShorthand.exact?.matched, false);
assert.equal(ambiguousShorthand.exact?.code, 'background_major_ambiguous');
assert.equal(ambiguousShorthand.exact?.ambiguousCanonicalMajors?.length, 2);

// Explicit 211 must fail closed on a pair that exists only in Liaoning background; never fall back to local evidence.
const schools211 = new Set(snapshot.records.filter(item => item.scope === '211').map(item => normalizeBackgroundIdentityText(item.schoolIdentity || item.school)));
const localOnly = snapshot.records.find(item => item.scope === 'liaoning' && !schools211.has(normalizeBackgroundIdentityText(item.schoolIdentity || item.school)));
assert(localOnly, 'need a real local-only school for explicit 211 fail-closed proof');
const explicit211Miss = resolveSchoolMajorBackgroundContext(snapshot, {
  school: localOnly.schoolIdentity || localOnly.school,
  majorCode: localOnly.canonicalMajor.code,
  scope: '211'
});
assert.equal(explicit211Miss.matched, false, 'explicit 211 scope silently fell back to Liaoning evidence');

// Broad human major language may discover exact canonical rows, but the returned list is not evidence-ranked.
const broadElectrical = listMajorBackgroundSchools(snapshot, { majorName: '电气', scope: 'auto', regionKeys: ['all'], limit: 200 });
assert.equal(broadElectrical.ok, true);
assert(broadElectrical.items.length > 1, 'broad electrical background discovery lost recall');
assert(broadElectrical.items.every(item => item.canonicalMajor?.code && item.canonicalMajor?.name), 'broad discovery returned a non-canonical major row');
const stableOrder = broadElectrical.items.map(item => `${item.school}|${item.canonicalMajor.code}`);
assert.deepEqual(stableOrder, [...stableOrder].sort((a, b) => a.localeCompare(b, 'zh-CN')), 'background school list is being implicitly ranked by evidence volume');

// AIPLuS major-background presentation keeps the established grouped schools[] contract while reading the unified owner.
const projectedElectrical = majorBackgroundFromSnapshot(snapshot, '电气', { scope: 'liaoning', regionKeys: ['ln'] });
assert(projectedElectrical.items.length > 0, 'AI major-background projection collapsed to empty');
assert(projectedElectrical.items.every(item => Array.isArray(item.schools)), 'AI major-background projection lost grouped school objects');
const projectedSchools = projectedElectrical.items.flatMap(item => item.schools || []);
assert(projectedSchools.length > 0, 'AI major-background projection has no school objects');
assert(projectedSchools.every(item => item.school && Array.isArray(item.admissionMajors)), 'AI grouped school projection lost queryable-major mapping');
assert.equal(projectedElectrical.schoolCount, new Set(projectedSchools.map(item => normalizeBackgroundIdentityText(item.school))).size, 'AI grouped school count drifted from schools[] projection');

// Navigation carries identity/return context only and remains same-origin fail-closed.
const detailHref = buildAcademicBackgroundHref({ scope: '211', majorCode: dual.major.code, canonicalName: dual.major.name, school: dual.school, returnTo: `/major-path/?majorCode=${dual.major.code}` });
const detailUrl = new URL(detailHref, 'https://gaokao.powers.org.cn');
assert.equal(detailUrl.pathname, '/ln-rank/211-mainline');
assert.equal(detailUrl.searchParams.get('view'), 'school');
assert.equal(detailUrl.searchParams.get('majorCode'), dual.major.code);
assert.equal(detailUrl.searchParams.get('school'), dual.school);
assert.equal(sanitizeAcademicBackgroundReturnTarget('https://evil.example/major-path/'), '/major-path/');
const backToMajor = new URL(buildMajorPathFromAcademicBackgroundHref({ majorCode: dual.major.code, canonicalName: dual.major.name, school: dual.school, returnTo: detailHref }), 'https://gaokao.powers.org.cn');
assert.equal(backToMajor.pathname, '/major-path/');
assert.equal(backToMajor.searchParams.get('sourceSurface'), 'academic-background');
assert.equal(backToMajor.searchParams.get('school'), dual.school);

// One semantic slot owns background scope. It is evidence scope, never a second candidate filter/task family.
const liaoningCommand = deterministicCommand('辽宁省内哪些学校电气有底子', {});
assert.equal(liaoningCommand.agentTask, 'major_background');
assert.equal(liaoningCommand.backgroundScope, 'liaoning');
assert.equal(liaoningCommand.backgroundScopeExplicit, true);
assert(!Object.prototype.hasOwnProperty.call(liaoningCommand.changeSet || {}, 'backgroundScope'), 'background scope leaked into candidate view patch');
const all211Command = deterministicCommand('211里哪些学校通信工程有背景', {});
assert.equal(all211Command.agentTask, 'major_background');
assert.equal(all211Command.backgroundScope, '211');
assert.equal(all211Command.backgroundScopeExplicit, true);
const schoolMajorCommand = deterministicCommand('东北大学自动化有什么背景', {}, ['东北大学'], ['东北大学']);
assert.equal(schoolMajorCommand.agentTask, 'school_background');
assert.equal(schoolMajorCommand.backgroundScope, 'auto');
assert.equal(schoolMajorCommand.focus.school, '东北大学');
assert.equal(schoolMajorCommand.focus.major, '自动化');
const platformClaimLanguage = deterministicCommand('东北大学是211，所以自动化肯定比沈工大电气好吗', {}, ['东北大学', '沈阳工业大学'], ['东北大学', '沈工大']);
assert.equal(platformClaimLanguage.backgroundScope, 'auto', '211 school identity incorrectly activated 211 professional evidence scope');
assert.equal(platformClaimLanguage.backgroundScopeExplicit, false);
const remembered = deterministicCommand('211里哪些学校通信工程有背景', { examContext: { score: 580 }, agentContext: { focus: {} }, activeView: { score: 580, majorKeywords: [], regionKeys: ['all'], schoolNames: [], bottomLineMode: 'all' } });
assert.equal(remembered.agentTask, 'major_background');
assert.notEqual(remembered.scoreUsage, 'active', 'remembered score silently activated admissions execution for pure background question');

// Typed background claims are exact school-major claims carrying evidence scope and stable provenance IDs.
const one211 = snapshot.records.find(item => item.scope === '211' && (item.evidence || []).some(evidence => /^https:\/\//.test(evidence.sourceUrl || '')));
assert(one211);
const backgroundForClaim = {
  ok: true,
  school: one211.schoolIdentity || one211.school,
  major: one211.canonicalMajor.name,
  scope: '211',
  boundary: one211.boundary,
  items: [{
    school: one211.schoolIdentity || one211.school,
    canonicalMajor: one211.canonicalMajor,
    scopesMatched: ['211'],
    evidence: one211.evidence,
    sources: one211.sources,
    boundary: one211.boundary
  }]
};
const claims = claimsFromAcademicBackground(backgroundForClaim);
assert(claims.length > 0, '211 school-major evidence did not produce typed claims');
assert.equal(validateClaimSet(claims), true);
assert(claims.every(claim => claim.subjectType === 'school_major' && claim.sourceScope === 'school_major'));
assert(claims.every(claim => claim.evidenceScope === '211'));
assert(claims.every(claim => claim.evidenceId && claim.sourceId && /^https:\/\//.test(claim.source?.sourceUrl || '')));
assert(claims.every(claim => claim.subject.includes(one211.schoolIdentity || one211.school) && claim.subject.includes(one211.canonicalMajor.name)));

// Entrypoints and owners: files existing is insufficient; active HTML/runtime must actually load/call them.
const majorHtml = read('major-path/index.html');
const majorApp = read('major-path/app.v004.js');
const localHtml = read('ln-rank/local-mainline.html');
const all211Html = read('ln-rank/211-mainline.html');
const directAdapter = read('ln-rank/js/academic-background/background-context-direct.v001.js');
const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
assert(majorHtml.includes('/major-path/background-context.v001.css?v=001_0'));
assert(majorApp.includes("from './background-context.v001.js'"));
assert(majorApp.includes('mountMajorPathBackgroundContext({ shell, major, focus, sourceContext'));
assert(localHtml.includes('/ln-rank/js/academic-background/background-context-direct.v001.js?v=001_0'));
assert(all211Html.includes('/ln-rank/js/academic-background/background-context-direct.v001.js?v=001_0'));
assert(directAdapter.includes('buildMajorPathFromAcademicBackgroundHref'));
assert(directAdapter.includes("document.querySelectorAll('.ls-record')") && directAdapter.includes("document.querySelectorAll('.a211-card')"));
assert(!directAdapter.includes('MutationObserver'), 'background handoff adapter introduced another observer owner');
assert(handoff.includes("card.querySelector('.school')?.textContent"), 'score-mode major-path handoff still drops school identity');

// AIPLuS reuses existing task/tool/Decision Research owners; no 211-specific agent and no background bonus in platform ordering.
const kernel = read('functions/_lib/ai/agent-task-kernel.js');
const adapter = read('functions/_lib/ai/background-resource-adapter.js');
const toolRegistry = read('functions/_lib/ai/tool-registry.js');
const decision = read('functions/_lib/ai/decision-research-runtime.js');
const orchestrator = read('functions/_lib/ai/turn-orchestrator.js');
const workbench = read('aiplus/selection-workbench.v005.js');
assert(!/211_background|liaoning_background|local_background/.test(kernel), 'a second background task family was introduced');
assert(!adapter.includes('/ln-rank/data/local-strength/local-strength-index.v3971_2.json'), 'AIPLuS still directly owns the old local-only background resource');
assert(adapter.includes('background_major_ambiguous'), 'school-scoped broad major ambiguity is not fail-closed');
assert(toolRegistry.includes("scope='auto'"), 'existing background tools did not become scope-aware');
assert(orchestrator.includes("scope:command.backgroundScope||'auto'"), 'turn owner is not propagating the semantic evidence scope');
assert(decision.includes("item.kind==='background_evidence'"), 'existing Decision Research background_evidence step disappeared');
assert(decision.includes('claimsFromAcademicBackground(item.result)'), 'Decision Research forked instead of reusing typed background claims');
const platformBlock = workbench.match(/function platformScore\(item = \{\}\) \{[\s\S]*?\n\}/)?.[0] || '';
const evidenceBlock = workbench.match(/function pathEvidenceScore\(item = \{\}\) \{[\s\S]*?\n\}/)?.[0] || '';
assert(platformBlock.includes('item.is985') && platformBlock.includes('item.is211') && platformBlock.includes('item.isPublicSchool'));
assert(!/localStrength|localStrong|background/i.test(platformBlock), 'school-major background still acts as a hidden platform bonus');
assert(/localStrength|localStrong/.test(evidenceBlock), 'background evidence was removed from evidence coverage instead of only from platform scoring');

console.log(JSON.stringify({
  ok: true,
  version: 'unified-background-context-verifier-v0.01',
  derived: {
    records: snapshot.records.length,
    schools: snapshot.meta.schoolCount,
    canonicalMajors: snapshot.meta.canonicalMajorCount,
    scopes: snapshot.meta.scopeCounts,
    unresolvedCanonical: snapshot.meta.unresolvedCanonicalCount
  },
  dualScopeSample: { school: dual.school, major: dual.major, evidence: dualContext.evidence.length, sources: dualContext.sources.length },
  broadElectrical: { rows: broadElectrical.items.length, schools: broadElectrical.schoolCount },
  semantic: {
    liaoning: { task: liaoningCommand.agentTask, scope: liaoningCommand.backgroundScope },
    all211: { task: all211Command.agentTask, scope: all211Command.backgroundScope },
    schoolMajor: { task: schoolMajorCommand.agentTask, scope: schoolMajorCommand.backgroundScope }
  },
  shorthand: {
    unique: uniqueShorthand.items[0]?.canonicalMajor,
    ambiguous: ambiguousShorthand.exact?.ambiguousCanonicalMajors?.map(item => item.code)
  },
  claims: claims.length
}, null, 2));
