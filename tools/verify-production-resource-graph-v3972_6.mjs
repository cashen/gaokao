import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3972_6.js';

const pagesBase = String(process.env.PAGES_BASE || CONTRACT.pagesBase).replace(/\/$/, '');
const customBase = String(process.env.CUSTOM_BASE || CONTRACT.customBase).replace(/\/$/, '');
const attempts = Math.max(1, Number(process.env.PRODUCTION_RESOURCE_ATTEMPTS || 42));
const waitMs = Math.max(0, Number(process.env.PRODUCTION_RESOURCE_WAIT_MS || 20000));
const verifyRuntimeHealth = String(process.env.VERIFY_RUNTIME_HEALTH || 'true') !== 'false';
const evidencePath = process.env.PRODUCTION_RESOURCE_EVIDENCE || '/tmp/v3972-6-production-resource-graph.json';
const releaseSha = String(process.env.RELEASE_SHA || 'manual');

const expected = Object.freeze({
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  query: CURRENT_RELEASE.asset,
  resourceGraph: CURRENT_RELEASE.sharedResourceGraphVersion,
  uiRegistry: CURRENT_RELEASE.uiResourceRegistryVersion,
  cssGraph: CURRENT_RELEASE.cssResourceGraphVersion,
  dataGraph: CURRENT_RELEASE.dataResourceGraphVersion,
  interaction: CURRENT_RELEASE.interactionVersion,
  nativeChooserActivation: CURRENT_RELEASE.nativeChooserActivationVersion,
  verification: CONTRACT.version
});

function includesAll(text, markers) {
  return markers.every(marker => text.includes(marker));
}

async function request(base, resourcePath, attempt) {
  const separator = resourcePath.includes('?') ? '&' : '?';
  const url = `${base}${resourcePath}${separator}production-resource-check=${encodeURIComponent(`${releaseSha}-${attempt}-${Date.now()}`)}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Accept: resourcePath.includes('/api/') ? 'application/json' : '*/*'
      },
      signal: AbortSignal.timeout(35000)
    });
    return Object.freeze({
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text: await response.text()
    });
  } catch (error) {
    return Object.freeze({ url, status: 0, headers: {}, text: '', error: String(error?.message || error) });
  }
}

function require200(failures, label, response, markers = []) {
  if (response.status !== 200 || !includesAll(response.text, markers)) {
    failures.push(`${label} mismatch (${response.status})`);
  }
}

function validateStaticSet(label, responses, { includeHtml = false } = {}) {
  const failures = [];
  require200(failures, `${label} release`, responses.release, [
    `display: '${expected.release}'`,
    `asset: '${expected.query}'`,
    `siteRuntimeGeneration: '${expected.generation}'`,
    `sharedResourceGraphVersion: '${expected.resourceGraph}'`,
    `uiResourceRegistryVersion: '${expected.uiRegistry}'`,
    `interactionVersion: '${expected.interaction}'`,
    `nativeChooserActivationVersion: '${expected.nativeChooserActivation}'`
  ]);
  require200(failures, `${label} site runtime contract`, responses.siteRuntimeContract, [
    `version: 'site-runtime-coherence-v3972_6'`,
    'nativeChooserPreActivationDomMutationForbidden: true',
    'nativeChooserSinglePhysicalEventFamily: true',
    'nativeChooserTailGuardAfterOutcomeOnly: true'
  ]);
  require200(failures, `${label} runtime cache`, responses.runtimeCache, [
    `version: 'runtime-cache-coherence-v3972_6'`,
    'nativeChooserPreActivationDomMutationForbidden: true'
  ]);
  require200(failures, `${label} resource registry`, responses.resourceRegistry, [
    'SHARED_RESOURCE_GRAPH_VERSION',
    'nativeChooserActivationOwner',
    "preActivationPolicy: 'memory-only-no-dom-disabled-inert-or-pointer-events-mutation'"
  ]);
  require200(failures, `${label} UI registry`, responses.uiRegistry, [
    `UI_RESOURCE_REGISTRY_VERSION = '${expected.uiRegistry}'`,
    `UI_CSS_RESOURCE_GRAPH_VERSION = '${expected.cssGraph}'`,
    'nativeChooserActivationOwner',
    'preActivationDomMutationForbidden: true'
  ]);
  require200(failures, `${label} execution contract`, responses.executionContract, [
    `RESOURCE_EXECUTION_VERSION = 'resource-execution-v3972_6'`,
    `activationContractVersion: '${expected.nativeChooserActivation}'`
  ]);
  require200(failures, `${label} production contract`, responses.productionContract, [
    `version: '${expected.verification}'`,
    `statusContext: 'production/resource-graph-v3972.6'`
  ]);
  require200(failures, `${label} interaction runtime`, responses.interactionRuntime, [
    `const VERSION = '${expected.interaction}'`,
    "preActivationDomMutationPolicy: 'forbidden'",
    'tailGuardStartsAfterOutcome: true',
    'bindPhysicalEvents()'
  ]);
  if (responses.interactionRuntime.text.includes('navigator.userAgent') || responses.interactionRuntime.text.includes('Alook')) {
    failures.push(`${label} interaction runtime contains browser-name branch`);
  }
  require200(failures, `${label} interaction styles`, responses.interactionStyles, [
    'native chooser activation integrity',
    '#region',
    'touch-action: auto'
  ]);
  if (responses.interactionStyles.text.includes('pointer-events: none')) {
    failures.push(`${label} interaction styles disable hit testing`);
  }
  require200(failures, `${label} selection bootstrap`, responses.selectionBootstrap, [
    `const RUNTIME_VERSION = 'resource-execution-v3972_6'`,
    `app-runtime.v3972_6.js?v=3972_6`
  ]);
  require200(failures, `${label} selection runtime`, responses.selectionRuntime, [
    `const INTERACTION_VERSION = '${expected.interaction}'`,
    'native chooser pre-activation DOM mutation policy missing'
  ]);
  require200(failures, `${label} selection workspace`, responses.selectionWorkspace, [
    `const VERSION = 'selection-workspace-orchestration-v3972_6'`,
    `const INTERACTION_VERSION = '${expected.interaction}'`
  ]);
  if (includeHtml) {
    require200(failures, `${label} selection page`, responses.selectionPage, [
      `data-release="${expected.release}"`,
      `data-site-runtime-generation="${expected.generation}"`,
      `data-ui-interaction-version="${expected.interaction}"`,
      'interaction-transaction.v3972_6.js?v=3972_6',
      'app.v3972_6.js?v=3972_6'
    ]);
    require200(failures, `${label} self-check`, responses.selfCheck, [
      `data-release="${expected.release}"`,
      `data-site-runtime-generation="${expected.generation}"`,
      'self-check.v3972_6.js?v=3972_6'
    ]);
    require200(failures, `${label} self-check runtime`, responses.selfCheckRuntime, [
      'SHARED_RESOURCE_GRAPH_VERSION',
      'UI_RESOURCE_REGISTRY_VERSION',
      'nativeChooserActivationVersion'
    ]);
  }
  return failures;
}

function validatePages(responses) {
  const failures = validateStaticSet('pages', responses, { includeHtml: true });
  if (responses.activeManifest.status !== 200) {
    failures.push(`pages active manifest missing (${responses.activeManifest.status})`);
  } else {
    try {
      const manifest = JSON.parse(responses.activeManifest.text);
      if (manifest.releaseVersion !== expected.release) failures.push('pages manifest release mismatch');
      if (manifest.generation !== expected.generation) failures.push('pages manifest generation mismatch');
      if (manifest.queryVersion !== expected.query) failures.push('pages manifest query mismatch');
      if (manifest.resourceGraph?.version !== expected.resourceGraph) failures.push('pages manifest resource graph mismatch');
      if (manifest.resourceGraph?.uiRegistry !== '/shared/ui/ui-resource-registry.v3972_6.js') failures.push('pages manifest UI owner mismatch');
      if (manifest.resourceGraph?.cssVersion !== expected.cssGraph) failures.push('pages manifest CSS graph mismatch');
      if (manifest.resourceGraph?.dataVersion !== expected.dataGraph) failures.push('pages manifest data graph mismatch');
      if (manifest.resourceGraph?.productionVerificationVersion !== expected.verification) failures.push('pages manifest production verification version mismatch');
      if (manifest.resourceGraph?.productionVerificationOwner !== '/shared/governance/production-resource-verification-contract.v3972_6.js') failures.push('pages manifest production verification owner mismatch');
      if (manifest.interactionContract?.activationVersion !== expected.nativeChooserActivation) failures.push('pages native chooser activation mismatch');
      if (manifest.interactionContract?.preActivationDomMutation !== 'forbidden') failures.push('pages pre-activation policy mismatch');
    } catch (error) {
      failures.push(`pages manifest invalid JSON: ${error.message}`);
    }
  }
  for (const [resourcePath, response] of Object.entries(responses.retired)) {
    if (response.status !== 404) failures.push(`retired resource still published: ${resourcePath} (${response.status})`);
  }
  if (verifyRuntimeHealth) {
    if (responses.runtimeHealth.status !== 200 || !includesAll(responses.runtimeHealth.text, [expected.release, expected.generation])) {
      failures.push(`pages runtime health mismatch (${responses.runtimeHealth.status})`);
    }
  }
  return failures;
}

async function fetchStaticSet(base, attempt) {
  const entries = Object.entries(CONTRACT.requiredStaticResources);
  const values = await Promise.all(entries.map(async ([key, resourcePath]) => [key, await request(base, resourcePath, attempt)]));
  return Object.fromEntries(values);
}

async function runAttempt(attempt) {
  const [pages, custom, retiredResponses, runtimeHealth] = await Promise.all([
    fetchStaticSet(pagesBase, attempt),
    fetchStaticSet(customBase, attempt),
    Promise.all(CONTRACT.retiredResources.map(async resourcePath => [resourcePath, await request(pagesBase, resourcePath, attempt)])),
    verifyRuntimeHealth
      ? request(pagesBase, CONTRACT.dynamicResources.runtimeHealth, attempt)
      : Promise.resolve({ status: 200, text: `${expected.release} ${expected.generation}`, headers: {} })
  ]);
  pages.retired = Object.fromEntries(retiredResponses);
  pages.runtimeHealth = runtimeHealth;
  const failures = [
    ...validatePages(pages),
    ...validateStaticSet('custom', custom, { includeHtml: false })
  ];
  return { ok: failures.length === 0, attempt, expected, pages, custom, failures };
}

let finalResult = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  finalResult = await runAttempt(attempt);
  const summary = {
    ok: finalResult.ok,
    attempt,
    expected,
    pages: Object.fromEntries([
      ...Object.entries(CONTRACT.requiredStaticResources).map(([key]) => [key, finalResult.pages[key]?.status]),
      ['runtimeHealth', finalResult.pages.runtimeHealth.status],
      ['retired', Object.fromEntries(Object.entries(finalResult.pages.retired).map(([resourcePath, response]) => [resourcePath, response.status]))]
    ]),
    custom: Object.fromEntries(Object.entries(CONTRACT.requiredStaticResources).map(([key]) => [key, finalResult.custom[key]?.status])),
    failures: finalResult.failures
  };
  fs.writeFileSync(evidencePath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (finalResult.ok) break;
  if (attempt < attempts && waitMs > 0) await delay(waitMs);
}

if (!finalResult?.ok) {
  throw new Error(`production resource graph verification failed: ${finalResult?.failures?.join('; ') || 'unknown failure'}`);
}
