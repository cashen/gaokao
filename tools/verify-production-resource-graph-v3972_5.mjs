import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3972_5.js';

const pagesBase = String(process.env.PAGES_BASE || CONTRACT.pagesBase).replace(/\/$/, '');
const customBase = String(process.env.CUSTOM_BASE || CONTRACT.customBase).replace(/\/$/, '');
const attempts = Math.max(1, Number(process.env.PRODUCTION_RESOURCE_ATTEMPTS || 42));
const waitMs = Math.max(0, Number(process.env.PRODUCTION_RESOURCE_WAIT_MS || 20000));
const verifyRuntimeHealth = String(process.env.VERIFY_RUNTIME_HEALTH || 'true') !== 'false';
const evidencePath = process.env.PRODUCTION_RESOURCE_EVIDENCE || '/tmp/v3972-5-production-resource-graph.json';
const releaseSha = String(process.env.RELEASE_SHA || 'manual');

const expected = Object.freeze({
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  resourceGraph: CURRENT_RELEASE.sharedResourceGraphVersion,
  uiRegistry: CURRENT_RELEASE.uiResourceRegistryVersion,
  cssGraph: CURRENT_RELEASE.cssResourceGraphVersion,
  dataGraph: CURRENT_RELEASE.dataResourceGraphVersion,
  verification: CONTRACT.version
});

function includesAll(text, markers) {
  return markers.every(marker => text.includes(marker));
}

async function request(base, path, attempt) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${base}${path}${separator}production-resource-check=${encodeURIComponent(`${releaseSha}-${attempt}-${Date.now()}`)}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Accept: path.includes('/api/') ? 'application/json' : '*/*'
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

function validateStaticSet(label, responses) {
  const failures = [];
  const release = responses.release;
  if (release.status !== 200 || !includesAll(release.text, [
    `display: '${expected.release}'`,
    `siteRuntimeGeneration: '${expected.generation}'`,
    `sharedResourceGraphVersion: '${expected.resourceGraph}'`,
    `uiResourceRegistryVersion: '${expected.uiRegistry}'`,
    `cssResourceGraphVersion: '${expected.cssGraph}'`,
    `dataResourceGraphVersion: '${expected.dataGraph}'`
  ])) failures.push(`${label} release contract mismatch (${release.status})`);

  const registry = responses.resourceRegistry;
  if (registry.status !== 200 || !includesAll(registry.text, [
    'SHARED_RESOURCE_GRAPH_VERSION',
    'DATA_RESOURCE_GRAPH_VERSION',
    "CURRENT_RELEASE.resourceOwners.uiResourceRegistry",
    "policy: 'single-current-ui-registry-explicit-active-and-stable-css-owners'"
  ])) failures.push(`${label} resource registry mismatch (${registry.status})`);

  const ui = responses.uiRegistry;
  if (ui.status !== 200 || !includesAll(ui.text, [
    `UI_RESOURCE_REGISTRY_VERSION = '${expected.uiRegistry}'`,
    `UI_CSS_RESOURCE_GRAPH_VERSION = '${expected.cssGraph}'`,
    'UI_ACTIVE_RESOURCE_REGISTRY',
    'UI_STABLE_RESOURCE_REGISTRY',
    'UI_COMPONENT_REGISTRY'
  ])) failures.push(`${label} UI registry mismatch (${ui.status})`);

  return failures;
}

function validatePages(responses) {
  const failures = validateStaticSet('pages', responses);
  if (responses.manifest.status !== 200) {
    failures.push(`pages active manifest missing (${responses.manifest.status})`);
  } else {
    try {
      const manifest = JSON.parse(responses.manifest.text);
      if (manifest.releaseVersion !== expected.release) failures.push('pages manifest release mismatch');
      if (manifest.generation !== expected.generation) failures.push('pages manifest generation mismatch');
      if (manifest.resourceGraph?.version !== expected.resourceGraph) failures.push('pages manifest resource graph mismatch');
      if (manifest.resourceGraph?.uiRegistry !== '/shared/ui/ui-resource-registry.v3972_5.js') failures.push('pages manifest UI owner mismatch');
      if (manifest.resourceGraph?.cssVersion !== expected.cssGraph) failures.push('pages manifest CSS graph mismatch');
      if (manifest.resourceGraph?.dataVersion !== expected.dataGraph) failures.push('pages manifest data graph mismatch');
      if (manifest.resourceGraph?.productionVerificationVersion !== expected.verification) failures.push('pages manifest production verification version mismatch');
      if (manifest.resourceGraph?.productionVerificationOwner !== '/shared/governance/production-resource-verification-contract.v3972_5.js') failures.push('pages manifest production verification owner mismatch');
    } catch (error) {
      failures.push(`pages manifest invalid JSON: ${error.message}`);
    }
  }

  if (responses.selfCheck.status !== 200 || !includesAll(responses.selfCheck.text, [
    'data-release="v3.9.72.5"',
    'data-site-runtime-generation="v3972_5"',
    'self-check.v3972_5.js?v=3972_5'
  ])) failures.push(`pages self-check mismatch (${responses.selfCheck.status})`);

  if (responses.selfCheckRuntime.status !== 200 || !includesAll(responses.selfCheckRuntime.text, [
    'SHARED_RESOURCE_GRAPH_VERSION',
    'UI_RESOURCE_REGISTRY_VERSION',
    'ALGORITHM_RESOURCE_REGISTRY'
  ])) failures.push(`pages self-check runtime mismatch (${responses.selfCheckRuntime.status})`);

  for (const [path, response] of Object.entries(responses.retired)) {
    if (response.status !== 404) failures.push(`retired resource still published: ${path} (${response.status})`);
  }

  if (verifyRuntimeHealth) {
    if (responses.runtimeHealth.status !== 200 || !includesAll(responses.runtimeHealth.text, [expected.release, expected.generation])) {
      failures.push(`pages runtime health mismatch (${responses.runtimeHealth.status})`);
    }
  }
  return failures;
}

async function fetchStaticSet(base, attempt) {
  const resources = CONTRACT.requiredStaticResources;
  const [release, resourceRegistry, uiRegistry, manifest, selfCheck, selfCheckRuntime] = await Promise.all([
    request(base, resources.release, attempt),
    request(base, resources.resourceRegistry, attempt),
    request(base, resources.uiRegistry, attempt),
    request(base, resources.activeManifest, attempt),
    request(base, resources.selfCheck, attempt),
    request(base, resources.selfCheckRuntime, attempt)
  ]);
  return { release, resourceRegistry, uiRegistry, manifest, selfCheck, selfCheckRuntime };
}

async function runAttempt(attempt) {
  const [pages, custom, retiredResponses, runtimeHealth] = await Promise.all([
    fetchStaticSet(pagesBase, attempt),
    fetchStaticSet(customBase, attempt),
    Promise.all(CONTRACT.retiredResources.map(async path => [path, await request(pagesBase, path, attempt)])),
    verifyRuntimeHealth ? request(pagesBase, CONTRACT.dynamicResources.runtimeHealth, attempt) : Promise.resolve({ status: 200, text: `${expected.release} ${expected.generation}`, headers: {} })
  ]);
  pages.retired = Object.fromEntries(retiredResponses);
  pages.runtimeHealth = runtimeHealth;

  const failures = [
    ...validatePages(pages),
    ...validateStaticSet('custom', custom)
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
    pages: {
      release: finalResult.pages.release.status,
      resourceRegistry: finalResult.pages.resourceRegistry.status,
      uiRegistry: finalResult.pages.uiRegistry.status,
      manifest: finalResult.pages.manifest.status,
      selfCheck: finalResult.pages.selfCheck.status,
      selfCheckRuntime: finalResult.pages.selfCheckRuntime.status,
      runtimeHealth: finalResult.pages.runtimeHealth.status,
      retired: Object.fromEntries(Object.entries(finalResult.pages.retired).map(([path, response]) => [path, response.status]))
    },
    custom: {
      release: finalResult.custom.release.status,
      resourceRegistry: finalResult.custom.resourceRegistry.status,
      uiRegistry: finalResult.custom.uiRegistry.status
    },
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
