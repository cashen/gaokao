import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_6.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3972_6.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';

const strip = value => String(value || '').split('?')[0].replace(/^\//, '');
const exists = value => fs.existsSync(path.resolve(strip(value)));
const pageRouteKeys = new Set(['homePage', 'selectionPage', 'familyPlanPage']);
const stablePageRouteKeys = new Set(['tongxuePage', 'localStrengthPage', 'all211Page']);

assert.equal(SITE_RUNTIME_CONTRACT.version, 'site-runtime-coherence-v3972_6');
assert.equal(SITE_RUNTIME_CONTRACT.generation, 'v3972_6');
assert.equal(SITE_RUNTIME_CONTRACT.queryVersion, '3972_6');
assert.equal(SITE_RUNTIME_CONTRACT.releaseVersion, 'v3.9.72.6');
assert.equal(SITE_RUNTIME_CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.version, 'runtime-cache-coherence-v3972_6');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.assetVersion, SITE_RUNTIME_CONTRACT.generation);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.siteRuntimeContractVersion, SITE_RUNTIME_CONTRACT.version);

const currentKeys = Object.entries(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications)
  .filter(([, value]) => value === 'current-generation')
  .map(([key]) => key)
  .sort();
const stableKeys = Object.entries(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications)
  .filter(([, value]) => value === 'declared-stable-dependency')
  .map(([key]) => key)
  .sort();
const expectedCurrentKeys = [
  'familyPlanBootstrap', 'familyPlanEntry', 'familyPlanPage', 'familyPlanRuntime',
  'familyShell', 'homePage', 'homeRuntime', 'interactionRuntime', 'interactionStyles',
  'releaseCenter', 'releasePresenter', 'resourceExecution', 'runtimeCache',
  'selectionBootstrap', 'selectionPage', 'selectionRuntime', 'selectionWorkspace'
].sort();
const expectedStableKeys = ['familyPlanEntryStyles', 'familyShellStyles'].sort();
assert.deepEqual(currentKeys, expectedCurrentKeys, 'current generation entrypoint ownership drift');
assert.deepEqual(stableKeys, expectedStableKeys, 'declared stable active entrypoint ownership drift');

for (const key of currentKeys) {
  const value = SITE_RUNTIME_CONTRACT.activeEntrypoints[key];
  if (String(value).startsWith('/')) assert.ok(exists(value), `current entrypoint missing: ${key} -> ${value}`);
  if (!pageRouteKeys.has(key)) assert.ok(String(value).includes('3972_6'), `current entrypoint is not v3972_6: ${key} -> ${value}`);
}
for (const key of stableKeys) {
  const value = SITE_RUNTIME_CONTRACT.activeEntrypoints[key];
  if (String(value).startsWith('/')) assert.ok(exists(value), `stable active entrypoint missing: ${key} -> ${value}`);
  assert.ok(
    SITE_RUNTIME_CONTRACT.stableDependencies.some(item => strip(item) === strip(value)),
    `stable active module undeclared: ${key} -> ${value}`
  );
}
for (const [key, value] of Object.entries(SITE_RUNTIME_CONTRACT.stablePageEntrypoints)) {
  if (String(value).startsWith('/')) assert.ok(exists(value), `stable page resource missing: ${key} -> ${value}`);
  if (!stablePageRouteKeys.has(key)) {
    assert.ok(
      SITE_RUNTIME_CONTRACT.stableDependencies.some(item => strip(item) === strip(value)),
      `stable page resource undeclared: ${key} -> ${value}`
    );
  }
}
assert.deepEqual(SITE_RUNTIME_CONTRACT.preservedBusinessResources, {
  tongxue: 'tongxue-runtime-v159-r3968',
  localStrength: 'local-strength-static-v3971_2',
  all211: 'all-211-static-v3972_0',
  majorBands: 'major-bands-static-v3972_2'
});

assert.equal(SITE_RUNTIME_CONTRACT.owners.interaction, '/shared/ui/interaction/interaction-transaction.v3972_6.js');
assert.equal(SITE_RUNTIME_CONTRACT.owners.nativeChooserActivation, SITE_RUNTIME_CONTRACT.owners.interaction);
assert.ok(SITE_RUNTIME_CONTRACT.policies.nativeChooserPreActivationDomMutationForbidden);
assert.ok(SITE_RUNTIME_CONTRACT.policies.nativeChooserSinglePhysicalEventFamily);
assert.ok(SITE_RUNTIME_CONTRACT.policies.nativeChooserTailGuardAfterOutcomeOnly);
assert.ok(SITE_RUNTIME_CONTRACT.policies.nativeChooserFocusReturnBounded);
assert.ok(SITE_RUNTIME_CONTRACT.policies.deviceSpecificBusinessBranchForbidden);

const interaction = fs.readFileSync('shared/ui/interaction/interaction-transaction.v3972_6.js', 'utf8');
for (const marker of [
  "const VERSION = 'interaction-transaction-v3972_6'",
  "const HAS_POINTER_EVENTS = typeof globalThis.PointerEvent === 'function'",
  "state.activationTimer = globalThis.setTimeout(() => commitNativeActivation(sequence), 0)",
  "preActivationDomMutationPolicy: 'forbidden'",
  'tailGuardStartsAfterOutcome: true',
  'bindPhysicalEvents()'
]) assert.ok(interaction.includes(marker), `interaction runtime missing ${marker}`);
for (const forbidden of [
  'navigator.userAgent',
  'Alook',
  'setNavigationAvailability(',
  'action.disabled =',
  'container.inert =',
  "document.addEventListener('pointerdown', rememberPhysicalStart, true);\n  document.addEventListener('mousedown'"
]) assert.ok(!interaction.includes(forbidden), `interaction runtime contains forbidden activation coupling: ${forbidden}`);

const interactionCss = fs.readFileSync('shared/ui/interaction/interaction-transaction.v3972_6.css', 'utf8');
assert.ok(!interactionCss.includes('pointer-events: none'), 'interaction CSS removes hit testing during chooser lifecycle');
assert.ok(!interactionCss.includes('[inert]'), 'interaction CSS relies on inert during chooser lifecycle');

const app = fs.readFileSync('ln-rank/js/app.v3972_6.js', 'utf8');
const runtime = fs.readFileSync('ln-rank/js/app-runtime.v3972_6.js', 'utf8');
const workspace = fs.readFileSync('ln-rank/js/workspace/selection-workspace-orchestrator.v3972_6.js', 'utf8');
for (const [label, source] of [['app', app], ['runtime', runtime], ['workspace', workspace]]) {
  assert.ok(source.includes('v3972_6'), `${label} does not use current generation`);
}
assert.ok(runtime.includes("const INTERACTION_VERSION = 'interaction-transaction-v3972_6'"));
assert.ok(workspace.includes("const INTERACTION_VERSION = 'interaction-transaction-v3972_6'"));

const manifest = JSON.parse(fs.readFileSync('ln-rank/site-active-generation.v3972_6.json', 'utf8'));
assert.equal(manifest.releaseVersion, CURRENT_RELEASE.display);
assert.equal(manifest.generation, SITE_RUNTIME_CONTRACT.generation);
assert.equal(manifest.queryVersion, SITE_RUNTIME_CONTRACT.queryVersion);
assert.equal(manifest.interactionContract.version, CURRENT_RELEASE.interactionVersion);
assert.equal(manifest.interactionContract.activationVersion, CURRENT_RELEASE.nativeChooserActivationVersion);
assert.equal(manifest.interactionContract.preActivationDomMutation, 'forbidden');
assert.equal(manifest.interactionContract.userAgentBranch, 'forbidden');

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation: SITE_RUNTIME_CONTRACT.generation,
  currentEntrypoints: currentKeys.length,
  stableActiveEntrypoints: stableKeys.length,
  stablePageResources: Object.keys(SITE_RUNTIME_CONTRACT.stablePageEntrypoints).length,
  physicalEventOwnership: 'single-family',
  preActivationDomMutation: 'forbidden'
}, null, 2));
