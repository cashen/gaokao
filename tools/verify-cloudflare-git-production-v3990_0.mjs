import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const repository = process.env.GITHUB_REPOSITORY;
const releaseSha = process.env.GITHUB_SHA || process.env.RELEASE_SHA;
const githubToken = process.env.GITHUB_TOKEN;
const githubApi = process.env.GITHUB_API_URL || 'https://api.github.com';
const pagesBase = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const customBase = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const projectName = process.env.CF_PROJECT_NAME || 'gaokao';
const markerPath = '/shared/resources/release/cloudflare-git-deployment.v3990_0.json';
const markerFile = markerPath.replace(/^\//, '');
const attempts = Number(process.env.CLOUDFLARE_GIT_DEPLOYMENT_ATTEMPTS || 45);
const waitMs = Number(process.env.CLOUDFLARE_GIT_DEPLOYMENT_WAIT_MS || 10000);
const evidencePath = process.env.CLOUDFLARE_GIT_DEPLOYMENT_EVIDENCE || '/tmp/cloudflare-pages-v3990-0-git-deployment.json';
const expected = JSON.parse(fs.readFileSync(markerFile, 'utf8'));

assert.ok(repository, 'GITHUB_REPOSITORY is required');
assert.match(releaseSha || '', /^[0-9a-f]{40}$/i, 'exact 40-character release SHA is required');
assert.ok(githubToken, 'GITHUB_TOKEN is required');
assert.equal(expected.version, 'cloudflare-pages-git-production-identity-v3990_0');
assert.equal(expected.release, 'v3.9.90.0');
assert.equal(expected.generation, 'v3990_0');
assert.equal(expected.project, projectName);
assert.equal(expected.productionBranch, 'main');
assert.equal(expected.pagesBase, pagesBase);
assert.equal(expected.customBase, customBase);
assert.equal(expected.deploymentMode, 'cloudflare-pages-git-integration');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const headers = {
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${githubToken}`,
  'x-github-api-version': '2022-11-28',
  'user-agent': 'gaokao-v3990-cloudflare-git-verifier'
};

async function githubJson(path) {
  const response = await fetch(`${githubApi}${path}`, { headers });
  const body = await response.text();
  assert.equal(response.status, 200, `GitHub API ${path} returned ${response.status}: ${body.slice(0, 500)}`);
  return JSON.parse(body);
}

async function fetchText(base, path, cacheKey) {
  const url = new URL(path, `${base.replace(/\/$/, '')}/`);
  url.searchParams.set('deploy', cacheKey);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': 'gaokao-v3990-cloudflare-git-verifier'
    }
  });
  return {
    url: url.href,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  };
}

function isCloudflareManagedChallenge(result) {
  const server = String(result.headers.server || '').toLowerCase();
  const mitigated = String(result.headers['cf-mitigated'] || '').toLowerCase();
  const contentType = String(result.headers['content-type'] || '').toLowerCase();
  const body = String(result.body || '').toLowerCase();
  return result.status === 403
    && mitigated === 'challenge'
    && server.includes('cloudflare')
    && contentType.includes('text/html')
    && body.includes('cf-chl-')
    && (body.includes('just a moment') || body.includes('challenge-platform'));
}

function parseMarker(result, label) {
  assert.equal(result.status, 200, `${label} marker returned ${result.status}`);
  const parsed = JSON.parse(result.body);
  assert.deepEqual(parsed, expected, `${label} marker does not match source deployment contract`);
  return {
    url: result.url,
    status: result.status,
    sha256: sha256(result.body),
    etag: result.headers.etag || null,
    cfRay: result.headers['cf-ray'] || null
  };
}

const mainRef = await githubJson(`/repos/${repository}/git/ref/heads/main`);
assert.equal(mainRef.object?.sha, releaseSha, 'main no longer points to the release SHA');
const branches = await githubJson(`/repos/${repository}/commits/${releaseSha}/branches-where-head`);
assert.ok(branches.some(branch => branch.name === 'main'), 'release SHA is not the head of main');
assert.deepEqual(branches.map(branch => branch.name).sort(), ['main'], 'release SHA is simultaneously a non-main branch head');

let cloudflareCheck = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const payload = await githubJson(`/repos/${repository}/commits/${releaseSha}/check-runs?per_page=100`);
  const candidates = (payload.check_runs || []).filter(check =>
    check.name === 'Cloudflare Pages'
    && check.head_sha === releaseSha
    && check.app?.slug === 'cloudflare-workers-and-pages'
  );
  cloudflareCheck = candidates.find(check => check.status === 'completed' && check.conclusion === 'success') || null;
  const failed = candidates.find(check => check.status === 'completed' && !['success', 'neutral', 'skipped'].includes(check.conclusion));
  if (failed && !cloudflareCheck) {
    throw new Error(`Cloudflare Pages exact-SHA check failed with conclusion ${failed.conclusion}`);
  }
  if (cloudflareCheck) break;
  if (attempt === attempts) throw new Error(`Cloudflare Pages exact-SHA success check not found after ${attempts} attempts`);
  console.log(JSON.stringify({ phase: 'wait-cloudflare-check', attempt, releaseSha }));
  await sleep(waitMs);
}

const summary = String(cloudflareCheck.output?.summary || '');
const shortSha = releaseSha.slice(0, 7);
assert.equal(cloudflareCheck.output?.title, 'Deployed successfully');
assert.ok(summary.includes(`<code>${shortSha}</code>`), 'Cloudflare check summary does not identify the exact release SHA');
assert.ok(String(cloudflareCheck.details_url || '').includes(`/pages/view/${projectName}/`), 'Cloudflare check does not target the expected Pages project');
assert.match(String(cloudflareCheck.external_id || ''), /^[0-9a-f-]{36}$/i, 'Cloudflare deployment ID is missing');
const deploymentPrefix = cloudflareCheck.external_id.slice(0, 8).toLowerCase();
const urls = [...summary.matchAll(/https:\/\/([a-z0-9-]+)\.gaokao-4y9\.pages\.dev/gi)].map(match => match[0]);
const immutableBase = urls.find(url => new URL(url).hostname.split('.')[0].toLowerCase() === deploymentPrefix);
assert.ok(immutableBase, 'Cloudflare check summary does not expose the immutable deployment URL');

const immutableResult = await fetchText(immutableBase, markerPath, releaseSha);
const immutableEvidence = parseMarker(immutableResult, 'immutable deployment');

let pagesEvidence = null;
let customEvidence = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const pagesResult = await fetchText(pagesBase, markerPath, releaseSha);
  try {
    pagesEvidence = parseMarker(pagesResult, 'production pages.dev');
  } catch (error) {
    if (attempt === attempts) throw error;
    console.log(JSON.stringify({ phase: 'wait-production-pages', attempt, status: pagesResult.status }));
    await sleep(waitMs);
    continue;
  }
  assert.equal(pagesEvidence.sha256, immutableEvidence.sha256, 'production pages.dev marker differs from immutable exact-SHA deployment');

  const customResult = await fetchText(customBase, markerPath, releaseSha);
  if (customResult.status === 200) {
    customEvidence = parseMarker(customResult, 'custom production domain');
    assert.equal(customEvidence.sha256, immutableEvidence.sha256, 'custom production marker differs from immutable exact-SHA deployment');
  } else if (isCloudflareManagedChallenge(customResult)) {
    customEvidence = {
      url: customResult.url,
      status: customResult.status,
      mode: 'cloudflare-managed-challenge',
      cfMitigated: customResult.headers['cf-mitigated'],
      cfRay: customResult.headers['cf-ray'] || null
    };
  } else {
    if (attempt === attempts) throw new Error(`custom production marker returned unrecognized ${customResult.status}`);
    console.log(JSON.stringify({ phase: 'wait-custom-production', attempt, status: customResult.status }));
    await sleep(waitMs);
    continue;
  }
  break;
}

const evidence = {
  ok: true,
  contract: expected.version,
  release: expected.release,
  generation: expected.generation,
  repository,
  releaseSha,
  mainRef: mainRef.object.sha,
  branchHeads: branches.map(branch => branch.name),
  cloudflareCheck: {
    id: cloudflareCheck.id,
    externalId: cloudflareCheck.external_id,
    app: cloudflareCheck.app.slug,
    name: cloudflareCheck.name,
    conclusion: cloudflareCheck.conclusion,
    detailsUrl: cloudflareCheck.details_url,
    completedAt: cloudflareCheck.completed_at
  },
  immutableDeployment: immutableEvidence,
  productionPages: pagesEvidence,
  customProduction: customEvidence
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence));
