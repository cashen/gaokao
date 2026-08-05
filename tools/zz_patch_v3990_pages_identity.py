from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, got {count}")
    return text.replace(old, new, 1)


verifier_path = Path('tools/verify-production-resource-graph-v3990_0.mjs')
verifier = verifier_path.read_text(encoding='utf-8')
verifier = replace_once(
    verifier,
    "const releaseSha = String(process.env.RELEASE_SHA || 'manual');",
    "const releaseSha = String(process.env.RELEASE_SHA || 'manual').trim().toLowerCase();\nconst expectedDeploymentBranch = String(process.env.EXPECTED_DEPLOYMENT_BRANCH || '').trim();",
    'deployment identity environment'
)
verifier = replace_once(
    verifier,
    """function parseApi(response, label, failures) {
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

async function verifyMajorBandsPagination""",
    """function parseApi(response, label, failures) {
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

function validatePagesDeploymentIdentity(response) {
  const failures = [];
  const payload = parseApi(response, 'pages deployment identity', failures);
  const evidence = {
    status: response.status,
    version: '',
    source: '',
    release: '',
    generation: '',
    commitSha: '',
    branch: '',
    deploymentUrl: '',
    expectedCommitSha: releaseSha,
    expectedBranch: expectedDeploymentBranch,
    verified: false
  };
  if (!payload) return { failures, evidence };

  evidence.version = String(payload.version || '');
  evidence.source = String(payload.source || '');
  evidence.release = String(payload.release || '');
  evidence.generation = String(payload.generation || '');
  evidence.commitSha = String(payload.commitSha || '').trim().toLowerCase();
  evidence.branch = String(payload.branch || '').trim();
  evidence.deploymentUrl = String(payload.deploymentUrl || '').trim();

  if (payload.ok !== true || payload.identityAvailable !== true) failures.push('pages deployment identity unavailable');
  if (evidence.version !== 'pages-deployment-identity-v3990_0') failures.push('pages deployment identity version mismatch');
  if (evidence.source !== 'cloudflare-pages-runtime-environment') failures.push('pages deployment identity source mismatch');
  if (evidence.release !== expected.release) failures.push('pages deployment identity release mismatch');
  if (evidence.generation !== expected.generation) failures.push('pages deployment identity generation mismatch');
  if (!/^[0-9a-f]{40}$/.test(evidence.commitSha)) failures.push('pages deployment identity commit SHA invalid');
  if (releaseSha !== 'manual' && evidence.commitSha !== releaseSha) {
    failures.push(`pages deployment commit ${evidence.commitSha || 'missing'} != expected ${releaseSha}`);
  }
  if (expectedDeploymentBranch && evidence.branch !== expectedDeploymentBranch) {
    failures.push(`pages deployment branch ${evidence.branch || 'missing'} != expected ${expectedDeploymentBranch}`);
  }
  if (!/^https:\/\//.test(evidence.deploymentUrl)) failures.push('pages deployment URL invalid');
  evidence.verified = failures.length === 0;
  return { failures, evidence };
}

async function verifyMajorBandsPagination""",
    'deployment identity validator'
)
verifier = replace_once(
    verifier,
    """  const [pages, custom, retiredResponses, runtimeHealth] = await Promise.all([
    fetchStaticSet(pagesBase, attempt),
    fetchStaticSet(customBase, attempt),
    Promise.all(CONTRACT.retiredResources.map(async resourcePath => [resourcePath, await request(pagesBase, resourcePath, attempt)])),
    verifyRuntimeHealth
      ? request(pagesBase, CONTRACT.dynamicResources.runtimeHealth, attempt)
      : Promise.resolve({ status: 200, text: `${expected.release} ${expected.generation}`, headers: {} })
  ]);
  pages.retired = Object.fromEntries(retiredResponses);
  pages.runtimeHealth = runtimeHealth;""",
    """  const [pages, custom, retiredResponses, runtimeHealth, deploymentIdentityResponse] = await Promise.all([
    fetchStaticSet(pagesBase, attempt),
    fetchStaticSet(customBase, attempt),
    Promise.all(CONTRACT.retiredResources.map(async resourcePath => [resourcePath, await request(pagesBase, resourcePath, attempt)])),
    verifyRuntimeHealth
      ? request(pagesBase, CONTRACT.dynamicResources.runtimeHealth, attempt)
      : Promise.resolve({ status: 200, text: `${expected.release} ${expected.generation}`, headers: {} }),
    request(pagesBase, CONTRACT.dynamicResources.deploymentIdentity, attempt)
  ]);
  pages.retired = Object.fromEntries(retiredResponses);
  pages.runtimeHealth = runtimeHealth;
  pages.deploymentIdentity = deploymentIdentityResponse;
  const deploymentIdentity = validatePagesDeploymentIdentity(deploymentIdentityResponse);""",
    'fetch deployment identity'
)
verifier = replace_once(
    verifier,
    """  const staticFailures = [
    ...validatePages(pages),
    ...validateStaticSet('custom', custom, { includeHtml: false }),
    ...customStaticBoundary.failures
  ];""",
    """  const staticFailures = [
    ...validatePages(pages),
    ...deploymentIdentity.failures,
    ...validateStaticSet('custom', custom, { includeHtml: false }),
    ...customStaticBoundary.failures
  ];""",
    'deployment identity failures'
)
verifier = replace_once(
    verifier,
    """  return { ok: failures.length === 0, attempt, expected, pages, custom, customBoundary, pagesMajorBands, customMajorBands, failures };""",
    """  return { ok: failures.length === 0, attempt, expected, pages, custom, deploymentIdentity: deploymentIdentity.evidence, customBoundary, pagesMajorBands, customMajorBands, failures };""",
    'deployment identity result'
)
verifier = replace_once(
    verifier,
    """      ['runtimeHealth', finalResult.pages.runtimeHealth.status],
      ['retired', Object.fromEntries(Object.entries(finalResult.pages.retired).map(([resourcePath, response]) => [resourcePath, response.status]))]
    ]),
    custom:""",
    """      ['runtimeHealth', finalResult.pages.runtimeHealth.status],
      ['deploymentIdentity', finalResult.pages.deploymentIdentity.status],
      ['retired', Object.fromEntries(Object.entries(finalResult.pages.retired).map(([resourcePath, response]) => [resourcePath, response.status]))]
    ]),
    deploymentIdentity: finalResult.deploymentIdentity,
    custom:""",
    'deployment identity evidence summary'
)
verifier_path.write_text(verifier, encoding='utf-8')


audit_path = Path('tools/audit-production-resource-verification-v3990_0.mjs')
audit = audit_path.read_text(encoding='utf-8')
audit = replace_once(
    audit,
    "assert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');",
    "assert.equal(CONTRACT.dynamicResources.deploymentIdentity, '/api/pages-deployment-identity');\nassert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');",
    'deployment identity contract audit'
)
audit = replace_once(
    audit,
    """  'audit-site-runtime-generation-v3990_0.mjs',
  'wrangler@4.28.1 pages deploy .',
  '--commit-hash="$GITHUB_SHA"',
  'verify-production-resource-graph-v3990_0.mjs',""",
    """  'audit-site-runtime-generation-v3990_0.mjs',
  'functions/api/pages-deployment-identity.js',
  'Resolve Cloudflare deployment mode',
  "echo 'mode=wrangler'",
  "echo 'mode=git-integration'",
  "steps.deployment-mode.outputs.mode == 'wrangler'",
  "steps.deployment-mode.outputs.mode == 'git-integration'",
  'wrangler@4.28.1 pages deploy .',
  '--commit-hash="$GITHUB_SHA"',
  'EXPECTED_DEPLOYMENT_BRANCH: main',
  'verify-production-resource-graph-v3990_0.mjs',""",
    'dual deployment workflow markers'
)
audit = replace_once(
    audit,
    """  'cloudflare-pages-v3972-3-production'
]) assert.ok(!deployWorkflow.includes(forbidden), `main deploy workflow retains retired contract: ${forbidden}`);""",
    """  'cloudflare-pages-v3972-3-production',
  'Missing CLOUDFLARE_API_TOKEN or CF_API_TOKEN repository secret.',
  'Missing CLOUDFLARE_ACCOUNT_ID or CF_ACCOUNT_ID repository secret.'
]) assert.ok(!deployWorkflow.includes(forbidden), `main deploy workflow retains retired contract: ${forbidden}`);""",
    'retired credential hard failure'
)
audit = replace_once(
    audit,
    """  "pagesMajorBands = await verifyMajorBandsBase('pages'"
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);""",
    """  "pagesMajorBands = await verifyMajorBandsBase('pages'",
  'validatePagesDeploymentIdentity',
  'pages-deployment-identity-v3990_0',
  'cloudflare-pages-runtime-environment',
  'EXPECTED_DEPLOYMENT_BRANCH',
  'pages deployment commit',
  'deploymentIdentity: finalResult.deploymentIdentity'
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);""",
    'deployment verifier audit markers'
)
endpoint_anchor = "const baselineVerifier = fs.readFileSync('tools/verify-production-baseline-v3971.mjs', 'utf8');"
endpoint_block = """const deploymentIdentityApi = fs.readFileSync('functions/api/pages-deployment-identity.js', 'utf8');
for (const marker of [
  "PAGES_DEPLOYMENT_IDENTITY_VERSION = 'pages-deployment-identity-v3990_0'",
  'CF_PAGES_COMMIT_SHA',
  'CF_PAGES_BRANCH',
  'CF_PAGES_URL',
  "source: 'cloudflare-pages-runtime-environment'",
  'identityAvailable ? 200 : 503',
  "'cache-control': 'no-store'"
]) assert.ok(deploymentIdentityApi.includes(marker), `Pages deployment identity API missing ${marker}`);

const baselineVerifier = fs.readFileSync('tools/verify-production-baseline-v3971.mjs', 'utf8');"""
audit = replace_once(audit, endpoint_anchor, endpoint_block, 'deployment identity source audit')
audit_path.write_text(audit, encoding='utf-8')
