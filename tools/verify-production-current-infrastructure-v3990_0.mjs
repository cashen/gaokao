import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3990_0.js';

const pagesBase = String(process.env.PAGES_BASE || CONTRACT.pagesBase).replace(/\/$/, '');
const customBase = String(process.env.CUSTOM_BASE || CONTRACT.customBase).replace(/\/$/, '');
const attempts = Math.max(1, Number(process.env.PRODUCTION_RESOURCE_ATTEMPTS || 42));
const waitMs = Math.max(0, Number(process.env.PRODUCTION_RESOURCE_WAIT_MS || 20000));
const releaseSha = String(process.env.RELEASE_SHA || 'manual');
const evidencePath = process.env.PRODUCTION_INFRASTRUCTURE_EVIDENCE || '/tmp/v3990-0-production-current-infrastructure.json';

const resources = Object.freeze({
  homePage: CONTRACT.requiredStaticResources.homePage,
  homeRuntime: CONTRACT.requiredStaticResources.homeRuntime,
  familyShell: CONTRACT.requiredStaticResources.familyShell,
  familyPlanEntry: CONTRACT.requiredStaticResources.familyPlanEntry,
  selectionPage: CONTRACT.requiredStaticResources.selectionPage,
  selectionRuntime: CONTRACT.requiredStaticResources.selectionRuntime,
  familyPlanPage: CONTRACT.requiredStaticResources.familyPlanPage,
  familyPlanBootstrap: CONTRACT.requiredStaticResources.familyPlanBootstrap,
  familyPlanRuntime: CONTRACT.requiredStaticResources.familyPlanRuntime,
  selfCheck: CONTRACT.requiredStaticResources.selfCheck
});

const markers = Object.freeze({
  homePage: [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'family-home.v3990_0.js?v=3990_0'
  ],
  homeRuntime: [
    "HOME_RUNTIME_VERSION = 'family-home-runtime-v3990_0'",
    'release-presenter.v3990_0.js?v=3990_0',
    'family-shell.v3990_0.js?v=3990_0'
  ],
  familyShell: [
    "current-release.js?v=3990_0",
    "family-plan-entry.v3990_0.js?v=3990_0",
    "FAMILY_SHELL_VERSION = 'family-shell-v3990_0'"
  ],
  familyPlanEntry: [
    "FAMILY_PLAN_ENTRY_VERSION = 'family-plan-entry-v3990_0'",
    "generation: 'v3990_0'"
  ],
  selectionPage: [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'app.v3990_0.js?v=3990_0'
  ],
  selectionRuntime: [
    'family-shell.v3990_0.js?v=3990_0',
    "const INTERACTION_VERSION = 'interaction-transaction-v3990_0'"
  ],
  familyPlanPage: [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'selection-pool.v3990_0.js?v=3990_0'
  ],
  familyPlanBootstrap: [
    'release-presenter.v3990_0.js?v=3990_0',
    'family-shell.v3990_0.js?v=3990_0',
    'selection-pool-runtime.v3990_0.js?v=3990_0'
  ],
  familyPlanRuntime: [
    "version: 'selection-pool-runtime-v3990_0'",
    'site-runtime-contract.v3990_0.js?v=3990_0'
  ],
  selfCheck: [
    'data-release="v3.9.90.0"',
    'family-shell.v3990_0.js?v=3990_0'
  ]
});

const forbidden = Object.freeze({
  homePage: ['family-home.v3972_5.js?v=3972_5'],
  homeRuntime: ['current-release.js?v=3972_5', 'family-shell.v3972_5.js?v=3972_5'],
  familyShell: ['current-release.js?v=3972_5', 'family-plan-entry.v3972_5.js?v=3972_5'],
  selectionRuntime: ['family-shell.v3972_5.js?v=3972_5'],
  familyPlanPage: ['selection-pool.v3972_5.js?v=3972_5'],
  familyPlanBootstrap: ['current-release.js?v=3972_5', 'selection-pool-runtime.v3972_5.js?v=3972_5']
});

async function request(base, resourcePath, attempt) {
  const separator = resourcePath.includes('?') ? '&' : '?';
  const url = `${base}${resourcePath}${separator}current-infrastructure=${encodeURIComponent(`${releaseSha}-${attempt}-${Date.now()}`)}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: AbortSignal.timeout(35000)
    });
    return { url, status: response.status, text: await response.text() };
  } catch (error) {
    return { url, status: 0, text: '', error: String(error?.message || error) };
  }
}

async function verifyBase(label, base, attempt) {
  const entries = await Promise.all(Object.entries(resources).map(async ([key, resourcePath]) => [key, await request(base, resourcePath, attempt)]));
  const responses = Object.fromEntries(entries);
  const failures = [];
  for (const [key, response] of Object.entries(responses)) {
    if (response.status !== 200) {
      failures.push(`${label} ${key} HTTP ${response.status}`);
      continue;
    }
    for (const marker of markers[key] || []) {
      if (!response.text.includes(marker)) failures.push(`${label} ${key} missing ${marker}`);
    }
    for (const stale of forbidden[key] || []) {
      if (response.text.includes(stale)) failures.push(`${label} ${key} still mounts ${stale}`);
    }
  }
  return { responses, failures };
}

let final = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const [pages, custom] = await Promise.all([
    verifyBase('pages', pagesBase, attempt),
    verifyBase('custom', customBase, attempt)
  ]);
  final = {
    ok: pages.failures.length === 0 && custom.failures.length === 0,
    attempt,
    release: CONTRACT.releaseVersion,
    generation: CONTRACT.generation,
    homeRuntime: CONTRACT.homeRuntimeVersion,
    familyAction: CONTRACT.familyActionVersion,
    pages: Object.fromEntries(Object.entries(pages.responses).map(([key, value]) => [key, value.status])),
    custom: Object.fromEntries(Object.entries(custom.responses).map(([key, value]) => [key, value.status])),
    failures: [...pages.failures, ...custom.failures]
  };
  fs.writeFileSync(evidencePath, JSON.stringify(final, null, 2));
  console.log(JSON.stringify(final));
  if (final.ok) break;
  if (attempt < attempts && waitMs > 0) await delay(waitMs);
}

if (!final?.ok) throw new Error(`current infrastructure production verification failed: ${final?.failures?.join('; ') || 'unknown'}`);

