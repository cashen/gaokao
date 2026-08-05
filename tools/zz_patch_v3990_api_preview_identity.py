from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, got {count}")
    return text.replace(old, new, 1)


workflow_path = Path('.github/workflows/verify-production-api-health-v3971.yml')
workflow = workflow_path.read_text(encoding='utf-8')
workflow = replace_once(
    workflow,
    """      - name: Verify v3.9.90.0 Cloudflare Preview and Worker journey
        if: github.event_name == 'pull_request'
        run: |
          set -euo pipefail
          test -n \"${PREVIEW_BASE:-}\"
          ready=0
""",
    """      - name: Verify v3.9.90.0 Cloudflare Preview and Worker journey
        if: github.event_name == 'pull_request'
        env:
          CANDIDATE_SHA: ${{ github.event.pull_request.head.sha }}
          EXPECTED_DEPLOYMENT_BRANCH: ${{ github.head_ref }}
        run: |
          set -euo pipefail
          test -n \"${PREVIEW_BASE:-}\"
          test -n \"${CANDIDATE_SHA:-}\"
          test \"$(git rev-parse HEAD)\" = \"$CANDIDATE_SHA\"
          ready=0
""",
    'Preview head identity environment'
)
if workflow.count('candidate=${GITHUB_SHA}-${attempt}') != 3:
    raise SystemExit(f"Preview cache-buster anchor count={workflow.count('candidate=${GITHUB_SHA}-${attempt}')}")
workflow = workflow.replace('candidate=${GITHUB_SHA}-${attempt}', 'candidate=${CANDIDATE_SHA}-${attempt}')
workflow = replace_once(
    workflow,
    """          RELEASE_SHA=\"$GITHUB_SHA\" \\
          PRODUCTION_RESOURCE_ATTEMPTS='1' \\
""",
    """          RELEASE_SHA=\"$CANDIDATE_SHA\" \\
          EXPECTED_DEPLOYMENT_BRANCH=\"$EXPECTED_DEPLOYMENT_BRANCH\" \\
          VERIFY_DEPLOYMENT_IDENTITY='true' \\
          PRODUCTION_RESOURCE_ATTEMPTS='1' \\
""",
    'Preview verifier exact head identity'
)
workflow = replace_once(
    workflow,
    """          RELEASE_SHA: ${{ github.sha }}
          PRODUCTION_RESOURCE_ATTEMPTS: '45'
""",
    """          RELEASE_SHA: ${{ github.sha }}
          EXPECTED_DEPLOYMENT_BRANCH: main
          VERIFY_DEPLOYMENT_IDENTITY: 'true'
          PRODUCTION_RESOURCE_ATTEMPTS: '45'
""",
    'main production identity environment'
)
Path('tools/zz_generated_verify-production-api-health-v3971.yml').write_text(workflow, encoding='utf-8')


audit_path = Path('tools/audit-production-resource-verification-v3990_0.mjs')
audit = audit_path.read_text(encoding='utf-8')
anchor = "const productionReleaseWorkflow = fs.readFileSync('.github/workflows/verify-production-release-v3970.yml', 'utf8');"
block = """const productionApiWorkflow = fs.readFileSync('.github/workflows/verify-production-api-health-v3971.yml', 'utf8');
for (const marker of [
  'ref: ${{ github.event.pull_request.head.sha || github.sha }}',
  'CANDIDATE_SHA: ${{ github.event.pull_request.head.sha }}',
  'EXPECTED_DEPLOYMENT_BRANCH: ${{ github.head_ref }}',
  'candidate=${CANDIDATE_SHA}-${attempt}',
  'RELEASE_SHA="$CANDIDATE_SHA"',
  'EXPECTED_DEPLOYMENT_BRANCH="$EXPECTED_DEPLOYMENT_BRANCH"',
  "VERIFY_DEPLOYMENT_IDENTITY='true'",
  'EXPECTED_DEPLOYMENT_BRANCH: main',
  "VERIFY_DEPLOYMENT_IDENTITY: 'true'"
]) assert.ok(productionApiWorkflow.includes(marker), `production API workflow missing ${marker}`);
assert.ok(!productionApiWorkflow.includes('candidate=${GITHUB_SHA}-${attempt}'), 'production API Preview still uses merge-ref cache identity');
assert.ok(!productionApiWorkflow.includes('RELEASE_SHA="$GITHUB_SHA"'), 'production API Preview still verifies merge-ref SHA');

const productionReleaseWorkflow = fs.readFileSync('.github/workflows/verify-production-release-v3970.yml', 'utf8');"""
audit = replace_once(audit, anchor, block, 'production API Preview identity audit')
audit_path.write_text(audit, encoding='utf-8')
