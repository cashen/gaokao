import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3990_0.js';

const pagesBase = String(process.env.PAGES_BASE || CONTRACT.pagesBase).replace(/\/$/, '');
const customBase = String(process.env.CUSTOM_BASE || CONTRACT.customBase).replace(/\/$/, '');
const sameOriginSurface = pagesBase === customBase;
const attempts = Math.max(1, Number(process.env.PRODUCTION_RESOURCE_ATTEMPTS || 42));
const waitMs = Math.max(0, Number(process.env.PRODUCTION_RESOURCE_WAIT_MS || 20000));
const verifyRuntimeHealth = String(process.env.VERIFY_RUNTIME_HEALTH || 'true') !== 'false';
const verifyMajorBands = String(process.env.VERIFY_MAJOR_BANDS || 'true') !== 'false';
const evidencePath = process.env.PRODUCTION_RESOURCE_EVIDENCE || '/tmp/v3990-0-production-resource-graph.json';
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

function isCloudflareManagedChallenge(response) {
  const headers = response?.headers || {};
  const body = String(response?.text || '').toLowerCase();
  return Number(response?.status) === 403
    && String(headers['cf-mitigated'] || '').toLowerCase() === 'challenge'
    && String(headers.server || '').toLowerCase().includes('cloudflare')
    && String(headers['content-type'] || '').toLowerCase().includes('text/html')
    && (body.includes('<title>just a moment') || body.includes('challenges.cloudflare.com'));
}

function validateCustomChallengeBoundary(responses) {
  const failures = [];
  const challengedResources = [];
  for (const key of ['activeManifest', 'selectionPage', 'selfCheck']) {
    const response = responses[key];
    if (Number(response?.status) !== 403) continue;
    if (!isCloudflareManagedChallenge(response)) {
      failures.push(`custom ${key} returned unrecognized HTTP 403`);
      continue;
    }
    challengedResources.push(key);
  }
  return {
    mode: challengedResources.length ? 'cloudflare-managed-challenge' : 'open',
    challengedResources,
    challengePolicyEnabled: CONTRACT.policies.customHtmlChallengeBoundarySeparate === true,
    failures
  };
}

function require200(failures, label, response, markers = []) {
  if (response.status !== 200 || !includesAll(response.text, markers)) {
    failures.push(`${label} mismatch (${response.status})`);
  }
}

function parseApi(response, label, failures) {
  if (response.status !== 200) {
    failures.push(`${label} HTTP ${response.status}`);
    return null;
  }
  try {
    return JSON.parse(response.text);
  } catch (error) {
    failures.push(`${label} invalid JSON: ${error.message}`);
    return null;
  }
}

async function verifyMajorBandsPagination(label, base, resourcePath, attempt) {
  const failures = [];
  const seen = new Set();
  let offset = 0;
  let total = null;
  let snapshot = '';
  for (let pageNumber = 0; pageNumber < 240; pageNumber += 1) {
    const url = new URL(resourcePath, 'https://contract.local');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', '37');
    const response = await request(base, `${url.pathname}?${url.searchParams}`, attempt);
    const payload = parseApi(response, `${label} page ${pageNumber + 1}`, failures);
    if (!payload) break;
    if (!payload.ok) {
      failures.push(`${label} API ok=false: ${payload.message || 'unknown'}`);
      break;
    }
    if (payload.source?.queryKernelVersion !== 'major-bands-rank-query-kernel-v3990_0') {
      failures.push(`${label} query kernel mismatch`);
    }
    if (payload.source?.publicHttpSelfFanout !== false || payload.source?.bucketWorkerCount !== 0) {
      failures.push(`${label} public self-fanout contract mismatch`);
    }
    const band = url.searchParams.get('band');
    const group = payload.bands?.[band];
    if (!group) {
      failures.push(`${label} missing ${band} group`);
      break;
    }
    if (total == null) total = Number(group.count || 0);
    if (Number(group.count || 0) !== total) failures.push(`${label} count changed across pages`);
    const pageSnapshot = String(group.pagination?.snapshot || '');
    if (!snapshot) snapshot = pageSnapshot;
    if (!pageSnapshot || pageSnapshot !== snapshot) failures.push(`${label} snapshot changed across pages`);
    for (const record of group.records || []) {
      if (!record.id) failures.push(`${label} record missing id`);
      if (seen.has(record.id)) failures.push(`${label} duplicate id ${record.id}`);
      seen.add(record.id);
    }
    if (!group.pagination?.hasMore) {
      if (group.pagination?.nextOffset !== null) failures.push(`${label} terminal nextOffset must be null`);
      break;
    }
    const nextOffset = Number(group.pagination?.nextOffset);
    if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
      failures.push(`${label} nextOffset did not strictly increase`);
      break;
    }
    offset = nextOffset;
  }
  if (total == null || seen.size !== total) failures.push(`${label} paged ID union ${seen.size} != count ${total}`);
  return { failures, total, ids: seen.size, snapshot };
}

async function verifyMajorBandsBase(label, base, attempt) {
  const failures = [];
  const health = await request(base, CONTRACT.dynamicResources.majorBandsHealth, attempt);
  const healthPayload = parseApi(health, `${label} major-bands health`, failures);
  if (healthPayload && !healthPayload.ok) failures.push(`${label} major-bands health ok=false`);

  const cases = [
    ['standard', CONTRACT.dynamicResources.majorBandsStandard],
    ['wide', CONTRACT.dynamicResources.majorBandsWide],
    ['safe', CONTRACT.dynamicResources.majorBandsSafe]
  ];
  const pagination = {};
  for (const [name, resourcePath] of cases) {
    const result = await verifyMajorBandsPagination(`${label} ${name}`, base, resourcePath, attempt);
    pagination[name] = { total: result.total, ids: result.ids, snapshot: result.snapshot };
    failures.push(...result.failures);
  }

  const boundary = await request(base, CONTRACT.dynamicResources.majorBandsHighBoundary, attempt);
  const boundaryPayload = parseApi(boundary, `${label} high boundary`, failures);
  if (boundaryPayload) {
    if (!boundaryPayload.ok) failures.push(`${label} high boundary ok=false`);
    if (boundaryPayload.meta?.classificationMode !== 'rank_unavailable_empty') failures.push(`${label} high boundary classification mismatch`);
    if (Number(boundaryPayload.counts?.total || 0) !== 0) failures.push(`${label} high boundary must be empty`);
  }
  return { failures, health: health.status, boundary: boundary.status, pagination };
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
    `version: 'site-runtime-coherence-v3990_0'`,
    'nativeChooserPreActivationDomMutationForbidden: true',
    'nativeChooserSinglePhysicalEventFamily: true',
    'nativeChooserTailGuardAfterOutcomeOnly: true'
  ]);
  require200(failures, `${label} runtime cache`, responses.runtimeCache, [
    `version: 'runtime-cache-coherence-v3990_0'`,
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
    `RESOURCE_EXECUTION_VERSION = 'resource-execution-v3990_0'`,
    `activationContractVersion: '${expected.nativeChooserActivation}'`
  ]);
  require200(failures, `${label} production contract`, responses.productionContract, [
    `version: '${expected.verification}'`,
    `statusContext: 'production/resource-graph-v3990.0'`
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
    `const RUNTIME_VERSION = 'resource-execution-v3990_0'`,
    `app-runtime.v3990_0.js?v=3990_0`
  ]);
  require200(failures, `${label} selection runtime`, responses.selectionRuntime, [
    `const INTERACTION_VERSION = '${expected.interaction}'`,
    'native chooser pre-activation DOM mutation policy missing'
  ]);
  require200(failures, `${label} selection workspace`, responses.selectionWorkspace, [
    `const VERSION = 'selection-workspace-orchestration-v3990_0'`,
    `const INTERACTION_VERSION = '${expected.interaction}'`
  ]);
  if (includeHtml) {
    require200(failures, `${label} selection page`, responses.selectionPage, [
      `data-release="${expected.release}"`,
      `data-site-runtime-generation="${expected.generation}"`,
      `data-ui-interaction-version="${expected.interaction}"`,
      'interaction-transaction.v3990_0.js?v=3990_0',
      'app.v3990_0.js?v=3990_0'
    ]);
    require200(failures, `${label} self-check`, responses.selfCheck, [
      `data-release="${expected.release}"`,
      `data-site-runtime-generation="${expected.generation}"`,
      'self-check.v3990_0.js?v=3990_0'
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
      if (manifest.resourceGraph?.uiRegistry !== '/shared/ui/ui-resource-registry.v3990_0.js') failures.push('pages manifest UI owner mismatch');
      if (manifest.resourceGraph?.cssVersion !== expected.cssGraph) failures.push('pages manifest CSS graph mismatch');
      if (manifest.resourceGraph?.dataVersion !== expected.dataGraph) failures.push('pages manifest data graph mismatch');
      if (manifest.resourceGraph?.productionVerificationVersion !== expected.verification) failures.push('pages manifest production verification version mismatch');
      if (manifest.resourceGraph?.productionVerificationOwner !== '/shared/governance/production-resource-verification-contract.v3990_0.js') failures.push('pages manifest production verification owner mismatch');
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
  const customStaticBoundary = validateCustomChallengeBoundary(custom);
  const staticFailures = [
    ...validatePages(pages),
    ...validateStaticSet('custom', custom, { includeHtml: false }),
    ...customStaticBoundary.failures
  ];

  let pagesMajorBands = { failures: [], skipped: true, reason: verifyMajorBands ? 'static-graph-not-ready' : 'disabled', pagination: {} };
  let customMajorBands = { failures: [], skipped: true, reason: verifyMajorBands ? 'static-graph-not-ready' : 'disabled', pagination: {} };
  let customDynamicBoundary = {
    mode: verifyMajorBands ? 'static-graph-not-ready' : 'disabled',
    status: null,
    verified: false
  };

  if (verifyMajorBands && staticFailures.length === 0) {
    pagesMajorBands = await verifyMajorBandsBase('pages', pagesBase, attempt);
    if (sameOriginSurface) {
      customDynamicBoundary = {
        mode: 'same-origin-as-pages',
        status: pagesMajorBands.health,
        verified: pagesMajorBands.failures.length === 0
      };
      customMajorBands = {
        ...pagesMajorBands,
        failures: [],
        reusedFrom: 'pages-same-origin'
      };
    } else {
      const customHealthProbe = await request(customBase, CONTRACT.dynamicResources.majorBandsHealth, attempt);
      if (isCloudflareManagedChallenge(customHealthProbe)) {
        const boundaryCorroborated = customStaticBoundary.mode === 'cloudflare-managed-challenge'
          && customStaticBoundary.challengePolicyEnabled;
        customDynamicBoundary = {
          mode: 'cloudflare-managed-challenge',
          status: customHealthProbe.status,
          cfMitigated: customHealthProbe.headers?.['cf-mitigated'] || '',
          server: customHealthProbe.headers?.server || '',
          contentType: customHealthProbe.headers?.['content-type'] || '',
          verified: boundaryCorroborated
        };
        customMajorBands = boundaryCorroborated
          ? {
              failures: [],
              skipped: true,
              reason: 'custom-domain-cloudflare-managed-challenge',
              health: customHealthProbe.status,
              boundary: customHealthProbe.status,
              pagination: {}
            }
          : {
              failures: ['custom API challenge not corroborated by HTML challenge boundary'],
              skipped: true,
              reason: 'unverified-custom-domain-challenge',
              health: customHealthProbe.status,
              boundary: customHealthProbe.status,
              pagination: {}
            };
      } else {
        customDynamicBoundary = {
          mode: 'direct-api-verification',
          status: customHealthProbe.status,
          verified: true
        };
        customMajorBands = await verifyMajorBandsBase('custom', customBase, attempt);
      }
    }
  }

  const failures = [
    ...staticFailures,
    ...pagesMajorBands.failures,
    ...customMajorBands.failures
  ];
  const customBoundary = {
    static: customStaticBoundary,
    dynamic: customDynamicBoundary
  };
  return { ok: failures.length === 0, attempt, expected, pages, custom, customBoundary, pagesMajorBands, customMajorBands, failures };
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
    customBoundary: finalResult.customBoundary,
    majorBands: {
      pages: finalResult.pagesMajorBands,
      custom: finalResult.customMajorBands
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
