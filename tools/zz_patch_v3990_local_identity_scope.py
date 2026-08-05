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
    "const verifyRuntimeHealth = String(process.env.VERIFY_RUNTIME_HEALTH || 'true') !== 'false';\nconst verifyMajorBands = String(process.env.VERIFY_MAJOR_BANDS || 'true') !== 'false';",
    "const verifyRuntimeHealth = String(process.env.VERIFY_RUNTIME_HEALTH || 'true') !== 'false';\nconst verifyDeploymentIdentity = String(process.env.VERIFY_DEPLOYMENT_IDENTITY || 'true') !== 'false';\nconst verifyMajorBands = String(process.env.VERIFY_MAJOR_BANDS || 'true') !== 'false';",
    'identity verification switch'
)
verifier = replace_once(
    verifier,
    """    request(pagesBase, CONTRACT.dynamicResources.deploymentIdentity, attempt)
  ]);
  pages.retired = Object.fromEntries(retiredResponses);
  pages.runtimeHealth = runtimeHealth;
  pages.deploymentIdentity = deploymentIdentityResponse;
  const deploymentIdentity = validatePagesDeploymentIdentity(deploymentIdentityResponse);""",
    """    verifyDeploymentIdentity
      ? request(pagesBase, CONTRACT.dynamicResources.deploymentIdentity, attempt)
      : Promise.resolve({ status: 200, headers: {}, text: '' })
  ]);
  pages.retired = Object.fromEntries(retiredResponses);
  pages.runtimeHealth = runtimeHealth;
  pages.deploymentIdentity = deploymentIdentityResponse;
  const deploymentIdentity = verifyDeploymentIdentity
    ? validatePagesDeploymentIdentity(deploymentIdentityResponse)
    : {
        failures: [],
        evidence: {
          status: 'skipped',
          version: 'pages-deployment-identity-v3990_0',
          source: 'disabled-for-local-source-graph',
          release: expected.release,
          generation: expected.generation,
          commitSha: '',
          branch: '',
          deploymentUrl: '',
          expectedCommitSha: releaseSha,
          expectedBranch: expectedDeploymentBranch,
          verified: true
        }
      };""",
    'local identity skip evidence'
)
verifier_path.write_text(verifier, encoding='utf-8')


audit_path = Path('tools/audit-production-resource-verification-v3990_0.mjs')
audit = audit_path.read_text(encoding='utf-8')
audit = replace_once(
    audit,
    """for (const forbidden of [
  '\"executionGateVersion\":\"major-bands-query-execution-gate-v3990_0\"',
  '\"maxConcurrentExecutions\":2',
  '\"crossRequestSemaphore\":true'
]) assert.ok(!workflow.includes(forbidden), `production workflow reads unpublished API field: ${forbidden}`);""",
    """for (const forbidden of [
  '\"executionGateVersion\":\"major-bands-query-execution-gate-v3990_0\"',
  '\"maxConcurrentExecutions\":2',
  '\"crossRequestSemaphore\":true'
]) assert.ok(!workflow.includes(forbidden), `production workflow reads unpublished API field: ${forbidden}`);
assert.equal((workflow.match(/VERIFY_DEPLOYMENT_IDENTITY: 'false'/g) || []).length, 1, 'local identity bypass must appear exactly once');
assert.ok(workflow.includes("VERIFY_DEPLOYMENT_IDENTITY: 'true'"), 'production identity verification must be explicit');
assert.ok(workflow.includes('EXPECTED_DEPLOYMENT_BRANCH: main'), 'production identity branch must be main');""",
    'workflow identity scope audit'
)
audit = replace_once(
    audit,
    """for (const forbidden of [
  'v3.9.72.5',""",
    """assert.ok(!deployWorkflow.includes("VERIFY_DEPLOYMENT_IDENTITY: 'false'"), 'main deploy workflow must not disable deployment identity');
for (const forbidden of [
  'v3.9.72.5',""",
    'deploy workflow identity bypass audit'
)
audit = replace_once(
    audit,
    """  'deploymentIdentity: finalResult.deploymentIdentity'
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);""",
    """  'deploymentIdentity: finalResult.deploymentIdentity',
  'VERIFY_DEPLOYMENT_IDENTITY',
  'disabled-for-local-source-graph'
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);""",
    'identity scope verifier markers'
)
audit_path.write_text(audit, encoding='utf-8')
