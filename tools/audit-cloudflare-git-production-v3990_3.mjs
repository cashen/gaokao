import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/deploy-cloudflare-pages-main.yml', 'utf8');
const legacyVerifier = fs.readFileSync('tools/verify-cloudflare-git-production-v3990_0.mjs', 'utf8');
const marker = JSON.parse(fs.readFileSync('shared/resources/release/cloudflare-git-deployment.v3990_3.json', 'utf8'));

assert.equal(marker.version, 'cloudflare-pages-git-production-identity-v3990_3');
assert.equal(marker.release, 'v3.9.90.3');
assert.equal(marker.generation, 'v3990_3');
assert.equal(marker.project, 'gaokao');
assert.equal(marker.productionBranch, 'main');
assert.equal(marker.deploymentMode, 'cloudflare-pages-git-integration');
assert.equal(marker.verification, 'exact-github-sha-check-plus-immutable-preview-and-production-artifact-equivalence');

for (const required of [
  'checks: read',
  'cloudflare-git-deployment.v3990_3.json',
  'audit-cloudflare-git-production-v3990_3.mjs',
  'Wait for exact Cloudflare Git production deployment',
  'GITHUB_TOKEN: ${{ github.token }}',
  'CLOUDFLARE_GIT_DEPLOYMENT_ATTEMPTS',
  'CLOUDFLARE_GIT_DEPLOYMENT_EVIDENCE',
  'git fetch --no-tags --depth=1 origin main:refs/remotes/origin/main',
  'git rev-parse refs/remotes/origin/main',
  'verify-production-resource-graph-v3990_3.mjs',
  'verify-production-baseline-v3971.mjs',
  "s/v3\\.9\\.90\\.0/v3.9.90.3/g",
  's/v3990_0/v3990_3/g',
  's/3990_0/3990_3/g'
]) assert.ok(workflow.includes(required), `Cloudflare Git workflow missing ${required}`);

for (const forbidden of [
  'git rev-parse origin/main',
  'secrets.CLOUDFLARE_API_TOKEN',
  'secrets.CF_API_TOKEN',
  'secrets.CLOUDFLARE_ACCOUNT_ID',
  'secrets.CF_ACCOUNT_ID',
  'npx --yes wrangler',
  'cloudflare/wrangler-action',
  'Resolve and verify Cloudflare deployment credentials'
]) assert.ok(!workflow.includes(forbidden), `Cloudflare Git workflow retains invalid or executable direct-upload contract: ${forbidden}`);

for (const retiredSignature of ['wrangler@4.28.1 pages deploy .', '--commit-hash="$GITHUB_SHA"']) {
  const line = workflow.split('\n').find(candidate => candidate.includes(retiredSignature));
  assert.ok(line, `legacy audit retirement signature missing: ${retiredSignature}`);
  assert.ok(line.trimStart().startsWith('#'), `retired direct-upload signature became executable: ${retiredSignature}`);
}

for (const required of [
  "check.app?.slug === 'cloudflare-workers-and-pages'",
  "check.name === 'Cloudflare Pages'",
  'check.head_sha === releaseSha',
  "check.conclusion === 'success'",
  "branches.map(branch => branch.name).sort(), ['main']",
  'mainRef.object?.sha, releaseSha',
  'cloudflareCheck.external_id.slice(0, 8)',
  'immutable deployment URL',
  'production pages.dev marker differs from immutable exact-SHA deployment',
  'custom production marker differs from immutable exact-SHA deployment',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  'CLOUDFLARE_GIT_DEPLOYMENT_EVIDENCE'
]) assert.ok(legacyVerifier.includes(required), `Cloudflare Git verifier algorithm missing ${required}`);

for (const forbidden of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','wrangler pages deploy',"conclusion === 'neutral'","conclusion === 'skipped'"])
  assert.ok(!legacyVerifier.includes(forbidden), `Cloudflare Git verifier permits weak deployment identity: ${forbidden}`);

console.log(JSON.stringify({
  ok: true,
  version: marker.version,
  deploymentMode: marker.deploymentMode,
  productionBranch: marker.productionBranch,
  verifierOwnership: 'single-maintained-v3990_0-algorithm-runtime-mapped-to-v3990_3',
  exactShaCheckRequired: true,
  immutableDeploymentRequired: true,
  productionArtifactEquivalenceRequired: true,
  directUploadSecretsRequired: false
}, null, 2));
