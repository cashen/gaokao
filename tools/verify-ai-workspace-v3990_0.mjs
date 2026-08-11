import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAiWorkspace,
  applyAiWorkspaceEvent,
  buildAiResultDelta,
  compactAiWorkspaceForServer,
  AI_WORKSPACE_CONTRACT_VERSION
} from '../shared/ai/ai-workspace-contract.v3990_0.js';
import { deterministicIntent } from '../functions/_lib/ai/intent-interpreter.js';
import { listOfficialAiEvidence, auditExistingKbOfficialSources } from '../functions/_lib/ai/evidence-registry.js';
import { runSelectionReview } from '../functions/_lib/ai/selection-review.js';
import { runRankLookup, resolveRegionExecution } from '../functions/_lib/ai/tool-registry.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import { aiProviderConfig } from '../functions/_lib/ai/provider-router.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function testIntentBoundaries() {
  const empty = createAiWorkspace();
  const hard = deterministicIntent('吉林不去了', empty);
  assert.equal(hard.type, 'hard_constraint');
  assert.deepEqual(hard.regionExcludeKeys, ['jilin']);
  assert.equal(hard.requiresConfirmation, true, 'exclude-only hard constraint must require confirmation');

  const soft = deterministicIntent('最好留在辽宁，离家近一点', empty);
  assert.equal(soft.type, 'soft_preference');
  assert.deepEqual(soft.regionIncludeKeys, ['ln']);
  assert.equal(soft.regionExcludeKeys.length, 0);

  const question = deterministicIntent('计算机是不是太卷？', empty);
  assert.equal(question.type, 'question');
  assert.equal(question.regionIncludeKeys.length, 0);
  assert.equal(question.regionExcludeKeys.length, 0);

  const comparison = deterministicIntent('东北石油大学和沈阳工业大学有什么差别？', empty);
  assert.equal(comparison.type, 'comparison');
  assert.equal(comparison.schoolNames.length, 2);

  const simulation = deterministicIntent('如果也接受电气呢？', empty);
  assert.equal(simulation.type, 'simulation');
}

function testTaskGraphAndNoSilentShrink() {
  let workspace = createAiWorkspace();
  const mainIntent = deterministicIntent('580分，想看看计算机方向', workspace);
  workspace = applyAiWorkspaceEvent(workspace, { type: 'intent_committed', payload: { intent: mainIntent, taskAction: 'create_main' } });
  const mainTaskId = workspace.mainTaskId;
  assert.ok(mainTaskId);

  const branchIntent = deterministicIntent('也看看电气呢？', workspace);
  assert.equal(branchIntent.type, 'branch');
  workspace = applyAiWorkspaceEvent(workspace, { type: 'intent_committed', payload: { intent: branchIntent, taskAction: 'branch' } });
  assert.equal(workspace.mainTaskId, mainTaskId, 'branch must never overwrite main task');
  assert.equal(workspace.tasks.length, 2);
  assert.equal(workspace.tasks[0].parentTaskId, mainTaskId);

  const softIntent = deterministicIntent('最好辽宁省内', workspace);
  workspace = applyAiWorkspaceEvent(workspace, { type: 'intent_committed', payload: { intent: softIntent, taskAction: 'update_main' } });
  assert.equal(workspace.hardConstraints.some(item => item.key === 'regionInclude'), false, 'soft preference must not become hard filter');
  assert.equal(workspace.softPreferences.some(item => item.key === 'regionInclude'), true);

  const regionExecution = resolveRegionExecution({ type: 'soft_preference', regionIncludeKeys: [], regionExcludeKeys: [] }, workspace);
  assert.deepEqual(regionExecution.includeKeys, ['all'], 'soft region preference must not shrink deterministic candidate set');
}

function testDelta() {
  const previous = { candidates: { counts: { upper: 1, near: 2, steady: 1, total: 4 }, records: [{ id: 'a' }, { id: 'b' }] } };
  const next = { candidates: { counts: { upper: 1, near: 3, steady: 1, total: 5 }, records: [{ id: 'b' }, { id: 'c' }] } };
  const delta = buildAiResultDelta(previous, next);
  assert.equal(delta.changed, true);
  assert.deepEqual(delta.addedPreviewIds, ['c']);
  assert.deepEqual(delta.removedPreviewIds, ['a']);
  assert.deepEqual(delta.countChanges.near, { before: 2, after: 3, delta: 1 });
}

function testSelectionReview() {
  const empty = runSelectionReview(null);
  assert.equal(empty.importRequired, true);

  const review = runSelectionReview({
    version: 'test',
    items: [
      { school: '甲大学', major: '计算机科学与技术', bandKey: 'upper', rank2026: 15000, displayLocation: '沈阳', tuition: '5200' },
      { school: '乙大学', major: '计算机科学与技术', bandKey: 'upper', rank2026: 17000, displayLocation: '沈阳', tuition: '' },
      { school: '丙大学', major: '软件工程', bandKey: 'near', rank2026: 19000, displayLocation: '沈阳', tuition: '5200' },
      { school: '丁大学', major: '电子信息工程', bandKey: 'steady', rank2026: 24000, displayLocation: '大连', tuition: '' }
    ]
  });
  assert.equal(review.ok, true);
  assert.equal(review.total, 4);
  assert.equal(review.counts.upper, 2);
  assert.ok(review.findings.some(item => item.key === 'missing-tuition'));
}

function testCompactPayloadBudget() {
  const hugeText = '说明'.repeat(500);
  const workspace = createAiWorkspace({
    selectionSnapshot: {
      version: 'stress',
      items: Array.from({ length: 112 }, (_, index) => ({
        id: `selection-${index}`,
        school: `测试大学${index}`,
        major: `计算机科学与技术${index}`,
        score2026: 580,
        rank2026: 20000 + index,
        bandKey: index % 3 === 0 ? 'upper' : index % 3 === 1 ? 'near' : 'steady',
        displayLocation: '沈阳',
        natureLabel: '公办普通',
        tuition: '5200元/年',
        userNote: hugeText
      }))
    },
    lastResult: {
      identity: hugeText,
      candidates: {
        counts: { upper: 1000, near: 2000, steady: 3000, total: 6000 },
        records: Array.from({ length: 48 }, (_, index) => ({ id: `candidate-${index}`, school: hugeText, major: hugeText, payload: hugeText }))
      }
    },
    pendingChecks: Array.from({ length: 80 }, (_, index) => ({ key: `k${index}`, level: 'review', text: hugeText }))
  });
  const compact = compactAiWorkspaceForServer(workspace);
  const bytes = Buffer.byteLength(JSON.stringify({ workspace: compact, input: '继续审查方案' }), 'utf8');
  assert.ok(bytes < 96 * 1024, `compact workspace payload must stay under 96KB, got ${bytes}`);
  assert.equal(compact.lastResult.candidates.records[0].school, undefined, 'previous full candidate record must not be resent');
  assert.equal(compact.selectionSnapshot.items[0].userNote, undefined, 'selection notes must stay local and never be sent to the AI turn API');
  assert.equal(compact.selectionSnapshot.items[0].natureLabel, undefined, 'unused selection fields must stay local');
}

function testOfficialEvidenceBoundary() {
  const evidence = listOfficialAiEvidence();
  assert.ok(evidence.length >= 5);
  const allowed = ['moe.gov.cn', 'ln.gov.cn', 'chsi.com.cn', 'nhc.gov.cn', 'moj.gov.cn', 'neea.edu.cn'];
  for (const item of evidence) {
    const host = new URL(item.sourceUrl).hostname;
    assert.ok(allowed.some(suffix => host === suffix || host.endsWith(`.${suffix}`)), `non-official host exposed: ${host}`);
  }
  const audit = auditExistingKbOfficialSources();
  assert.ok(Array.isArray(audit.rejected));
  assert.ok(audit.rejected.some(item => item.sourceUrl.includes('education.news.cn')) || audit.rejected.some(item => item.sourceUrl.startsWith('user_uploaded_pdf:')), 'legacy non-whitelisted A source should not be silently exposed');
}

function testRankTruthAndProviderFallback() {
  const rank = runRankLookup(600);
  assert.equal(rank.ok, true);
  assert.equal(rank.rankEnd, 14235);
  assert.ok(rank.source.sourceUrl.startsWith('https://jyt.ln.gov.cn/'));

  const provider = aiProviderConfig({});
  assert.equal(provider.primary, 'workers-ai');
  assert.equal(provider.workersModelConfigured, false, 'no deprecated default model should be forced');
}

async function testTurnWithoutAiBinding() {
  const workspace = createAiWorkspace();
  const result = await orchestrateAiTurn({ request: new Request('https://example.invalid/api/ai/turn'), env: {} }, {
    workspace: compactAiWorkspaceForServer(workspace),
    input: '600分位次是多少'
  });
  assert.equal(result.ok, true);
  assert.equal(result.result.rank.rankEnd, 14235);
  assert.equal(result.provider.source, 'deterministic');
  assert.ok(result.blocks.some(block => block.type === 'fact_summary'));

  const imported = applyAiWorkspaceEvent(workspace, {
    type: 'selection_snapshot_imported',
    payload: { snapshot: { version: 'test', items: [{ school: '甲大学', major: '计算机', bandKey: 'near', rank2026: 20000 }] } }
  });
  const review = await orchestrateAiTurn({ request: new Request('https://example.invalid/api/ai/turn'), env: {} }, {
    workspace: compactAiWorkspaceForServer(imported),
    input: '我已经选了一些专业，帮我看看方案还缺什么'
  });
  assert.equal(review.ok, true);
  assert.equal(review.result.selectionReview.total, 1);
  assert.ok(review.blocks.some(block => block.type === 'selection_review'));
}

function testSourceGuards() {
  const app = read('aiplus/app.v3990_0.js');
  assert.ok(app.includes("const SELECTION_POOL_KEY = 'lnRank.selectionPool.lnPhysics.2026.v3951'"));
  assert.equal(new RegExp(`localStorage\\.setItem\\(\\s*SELECTION_POOL_KEY`).test(app), false, 'AI must never write ln-rank selection pool automatically');

  const orchestrator = read('functions/_lib/ai/turn-orchestrator.js');
  assert.equal(orchestrator.includes('env.AI.run'), false, 'business orchestrator must not bind directly to one model provider');

  const toolRegistry = read('functions/_lib/ai/tool-registry.js');
  assert.ok(toolRegistry.includes("import { onRequest as majorBandsOnRequest } from '../../api/major-bands.js'"), 'AI must reuse major-bands function owner directly');
  assert.equal(toolRegistry.includes("fetch('/api/major-bands"), false, 'AI must not HTTP self-call major-bands');

  const html = read('aiplus/index.html');
  assert.ok(html.includes('data-release="v3.9.90.0"'));
  assert.ok(html.includes('data-site-runtime-generation="v3990_0"'));
  assert.ok(html.includes('/aiplus/app.v3990_0.js?v=3990_0'));
}

async function main() {
  testIntentBoundaries();
  testTaskGraphAndNoSilentShrink();
  testDelta();
  testSelectionReview();
  testCompactPayloadBudget();
  testOfficialEvidenceBoundary();
  testRankTruthAndProviderFallback();
  await testTurnWithoutAiBinding();
  testSourceGuards();
  console.log(JSON.stringify({
    ok: true,
    contract: AI_WORKSPACE_CONTRACT_VERSION,
    checks: [
      'hard-soft-intent-boundary', 'branch-main-integrity', 'no-silent-shrink', 'result-delta', 'selection-review',
      'compact-payload-under-96kb', 'selection-notes-stay-local', 'official-evidence-host-whitelist', 'rank-600=14235',
      'provider-fallback', 'turn-without-ai-binding', 'source-guards'
    ]
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});