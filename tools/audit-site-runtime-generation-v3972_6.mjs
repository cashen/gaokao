import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_6.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3972_6.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';

const strip = value => String(value || '').split('?')[0].replace(/^\//, '');
const exists = value => fs.existsSync(path.resolve(strip(value)));

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
  .map(([key]) => key);
const stableKeys = Object.entries(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications)
  .filter(([, value]) => value === 'declared-stable-dependency')
  .map(([key]) => key);
assert.ok(currentKeys.length >= 8, 'current generation entrypoints incomplete');
assert.ok(stableKeys.length >= 5, 'declared stable active entrypoints incomplete');

for (const key of currentKeys) {
  const value = SITE_RUNTIME_CONTRACT.activeEntrypoints[key];
  if (String(value).startsWith('/')) assert.ok(exists(value), `current entrypoint missing: ${key} -> ${value}`);
  if (!['homePage', 'selectionPage', 'familyPlanPage'].includes(key)) {
    assert.ok(String(value).includes('3972_6'), `current entrypoint is not v3972_6: ${key} -> ${value}`);
  }
}
for (const key of stableKeys) {
  const value = SITE_RUNTIME_CONTRACT.activeEntrypoints[key];
  if (String(value).startsWith('/')) assert.ok(exists(value), `stable active entrypoint missing: ${key} -> ${value}`);
  assert.ok(SITE_RUNTIME_CONTRACT.stableDependencies.some(item => strip(item) === strip(value)), `stable active entrypoint undeclared: ${key} -> ${value}`);
}

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
  physicalEventOwnership: 'single-family',
  preActivationDomMutation: 'forbidden'
}, null, 2));
