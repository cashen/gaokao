import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3990_0.js';
import {
  MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
  createMajorBandsPaginationSnapshotGuard
} from '../ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_0.js';

const targetBase = String(process.env.TARGET_BASE || '').replace(/\/$/, '');
const pagesBase = String(process.env.PAGES_BASE || targetBase || CONTRACT.pagesBase).replace(/\/$/, '');
const customBase = String(process.env.CUSTOM_BASE || process.env.PAGES_BASE || targetBase || CONTRACT.customBase).replace(/\/$/, '');
const attempts = Math.max(1, Number(process.env.PRODUCTION_RESOURCE_ATTEMPTS || 42));
const waitMs = Math.max(0, Number(process.env.PRODUCTION_RESOURCE_WAIT_MS || 20000));
const evidencePath = process.env.PRODUCTION_PAGINATION_SNAPSHOT_EVIDENCE
  || '/tmp/v3990-0-production-pagination-snapshot-guard.json';
const releaseSha = String(process.env.RELEASE_SHA || 'manual');
const guardPath = CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard;
const manifestPath = CONTRACT.requiredStaticResources.activeManifest;
const runtimePath = CONTRACT.requiredStaticResources.selectionRuntime;
const runtimeCachePath = CONTRACT.requiredStaticResources.runtimeCache;
const selfCheckRuntimePath = CONTRACT.requiredStaticResources.selfCheckRuntime;
const manifestGuardPath = `${guardPath}?v=3990_0`;

function includesAll(text, markers) {
  return markers.every(marker => text.includes(marker));
}

async function request(base, resourcePath, attempt) {
  const separator = resourcePath.includes('?') ? '&' : '?';
  const url = `${base}${resourcePath}${separator}pagination-snapshot-check=${encodeURIComponent(`${releaseSha}-${attempt}-${Date.now()}`)}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Accept: '*/*'
      },
      signal: AbortSignal.timeout(35000)
    });
    return Object.freeze({
      url,
      status: response.status,
      headers: Object.freeze(Object.fromEntries(response.headers.entries())),
      text: await response.text()
    });
  } catch (error) {
    return Object.freeze({
      url,
      status: 0,
      text: '',
      error: String(error?.message || error)
    });
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

function verifySourceStateMachine() {
  const guard = createMajorBandsPaginationSnapshotGuard({ maxEntries: 12 });
  const initial = guard.rewrite(new URL('https://contract.local/api/major-bands?candidateScore=579&rangePreset=standard&region=all&limit=40'));
  if (initial.url.searchParams.has('snapshot')) throw new Error('source guard sent a stale initial snapshot');
  const initialInspection = guard.inspect(initial.url, {
    ok: true,
    bands: {
      upper: { pagination: { snapshot: 'source-upper-a' } },
      near: { pagination: { snapshot: 'source-near-a' } },
      steady: { pagination: { snapshot: 'source-steady-a' } }
    }
  });
  if (!initialInspection.ok || guard.getState().size !== 3) {
    throw new Error('source guard did not retain the three initial snapshots');
  }
  const next = guard.rewrite(new URL('https://contract.local/api/major-bands?candidateScore=579&rangePreset=standard&region=all&band=near&offset=40&limit=40'));
  if (next.url.searchParams.get('snapshot') !== 'source-near-a') {
    throw new Error('source guard omitted the expected next-page snapshot');
  }
  const mismatch = guard.inspect(next.url, {
    ok: true,
    bands: { near: { pagination: { snapshot: 'source-near-b' } } }
  });
  if (mismatch.ok || mismatch.code !== 'pagination_snapshot_mismatch') {
    throw new Error('source guard accepted a different snapshot');
  }
  for (let index = 0; index < 20; index += 1) {
    guard.inspect(new URL(`https://contract.local/api/major-bands?candidateScore=${400 + index}&rangePreset=standard`), {
      ok: true,
      bands: {
        upper: { pagination: { snapshot: `source-u-${index}` } },
        near: { pagination: { snapshot: `source-n-${index}` } },
        steady: { pagination: { snapshot: `source-s-${index}` } }
      }
    });
  }
  const state = guard.getState();
  if (!state.bounded || state.size > 12) throw new Error(`source guard retention exceeded budget: ${state.size}`);
  return Object.freeze({
    version: state.version,
    size: state.size,
    maxEntries: state.maxEntries,
    bounded: state.bounded,
    mismatchRejected: true
  });
}

function validateResponse(failures, label, response, markers) {
  if (response.status !== 200) {
    failures.push(`${label} HTTP ${response.status}${response.error ? `: ${response.error}` : ''}`);
    return;
  }
  if (!includesAll(response.text, markers)) failures.push(`${label} content mismatch`);
}

async function verifyBase(label, base, attempt, options = {}) {
  const [guard, manifest, runtime, runtimeCache, selfCheckRuntime] = await Promise.all([
    request(base, guardPath, attempt),
    request(base, manifestPath, attempt),
    request(base, runtimePath, attempt),
    request(base, runtimeCachePath, attempt),
    request(base, selfCheckRuntimePath, attempt)
  ]);
  const failures = [];
  validateResponse(failures, `${label} pagination snapshot guard`, guard, [
    `MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION = '${MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION}'`,
    'const maxEntries = Math.max(3, Math.floor(Number(options.maxEntries) || 12))',
    "url.searchParams.set('snapshot', expectedSnapshot)",
    "code: 'pagination_snapshot_mismatch'",
    'bounded: snapshots.size <= maxEntries'
  ]);
  validateResponse(failures, `${label} selection runtime snapshot owner`, runtime, [
    'pagination-snapshot-guard.v3990_0.js?v=3990_0',
    '__GAOKAO_MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD__',
    'majorBandsPaginationSnapshotGuard.rewrite(url)',
    'majorBandsPaginationSnapshotGuard.inspect(snapshotContext.url, payload)',
    "owner: '/ln-rank/js/app-runtime.v3990_0.js'",
    "status: 409"
  ]);
  validateResponse(failures, `${label} runtime cache snapshot registration`, runtimeCache, [
    guardPath,
    'majorBandsBrowserSnapshotGuardBounded: true',
    'majorBandsBrowserSnapshotMismatchRejectedBeforeMerge: true'
  ]);
  validateResponse(failures, `${label} self-check snapshot coverage`, selfCheckRuntime, [
    MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
    'verifyPaginationSnapshotGuard()',
    'snapshot 保留超预算'
  ]);

  let parsedManifest = null;
  let manifestBoundary = Object.freeze({
    mode: 'open',
    status: manifest.status,
    verified: manifest.status === 200
  });
  if (manifest.status !== 200) {
    const challengePolicyEnabled = CONTRACT.policies.customHtmlChallengeBoundarySeparate === true;
    const strictChallenge = options.allowCloudflareChallenge === true
      && challengePolicyEnabled
      && isCloudflareManagedChallenge(manifest);
    if (strictChallenge) {
      manifestBoundary = Object.freeze({
        mode: 'cloudflare-managed-challenge',
        status: manifest.status,
        cfMitigated: manifest.headers?.['cf-mitigated'] || '',
        server: manifest.headers?.server || '',
        contentType: manifest.headers?.['content-type'] || '',
        challengePolicyEnabled,
        verified: true
      });
    } else {
      failures.push(`${label} active manifest HTTP ${manifest.status}${manifest.error ? `: ${manifest.error}` : ''}`);
    }
  } else {
    try {
      parsedManifest = JSON.parse(manifest.text);
      if (parsedManifest.currentGenerationInternalModules?.majorBandsPaginationSnapshotGuard !== manifestGuardPath) {
        failures.push(`${label} active manifest snapshot path mismatch`);
      }
      if (parsedManifest.policies?.currentInternalModulesDeclared !== true) {
        failures.push(`${label} active manifest internal-module policy missing`);
      }
      if (parsedManifest.policies?.majorBandsBrowserSnapshotGuardBounded !== true) {
        failures.push(`${label} active manifest bounded policy missing`);
      }
      if (parsedManifest.policies?.majorBandsBrowserSnapshotMismatchRejectedBeforeMerge !== true) {
        failures.push(`${label} active manifest mismatch policy missing`);
      }
    } catch (error) {
      failures.push(`${label} active manifest invalid JSON: ${error.message}`);
    }
  }

  return Object.freeze({
    label,
    base,
    ok: failures.length === 0,
    statuses: Object.freeze({
      guard: guard.status,
      manifest: manifest.status,
      runtime: runtime.status,
      runtimeCache: runtimeCache.status,
      selfCheckRuntime: selfCheckRuntime.status
    }),
    manifestGuardPath: parsedManifest?.currentGenerationInternalModules?.majorBandsPaginationSnapshotGuard || '',
    manifestBoundary,
    failures: Object.freeze(failures)
  });
}

const sourceStateMachine = verifySourceStateMachine();
let finalResult = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const [pages, custom] = await Promise.all([
    verifyBase('pages', pagesBase, attempt),
    verifyBase('custom', customBase, attempt, { allowCloudflareChallenge: true })
  ]);
  const failures = [...pages.failures, ...custom.failures];
  finalResult = Object.freeze({
    ok: failures.length === 0,
    attempt,
    version: MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
    guardPath,
    manifestGuardPath,
    sourceStateMachine,
    pages,
    custom,
    failures: Object.freeze(failures)
  });
  fs.writeFileSync(evidencePath, JSON.stringify(finalResult, null, 2));
  console.log(JSON.stringify(finalResult));
  if (finalResult.ok) break;
  if (attempt < attempts && waitMs > 0) await delay(waitMs);
}

if (!finalResult?.ok) {
  throw new Error(`production pagination snapshot guard verification failed: ${finalResult?.failures?.join('; ') || 'unknown failure'}`);
}
