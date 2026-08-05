from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, got {count}")
    return text.replace(old, new, 1)


baseline_path = Path("tools/verify-production-baseline-v3971.mjs")
baseline = baseline_path.read_text(encoding="utf-8")
baseline = replace_once(
    baseline,
    """const CURRENT_PRODUCTION_RELEASE = 'v3.9.72.6';
const ALLOWED_RELEASES = new Set(['v3.9.71.2', LEGACY_PRODUCTION_RELEASE, PREVIOUS_PRODUCTION_RELEASE, CURRENT_PRODUCTION_RELEASE]);
const BOUNDED_HEALTH_RELEASES = new Set([PREVIOUS_PRODUCTION_RELEASE, CURRENT_PRODUCTION_RELEASE]);""",
    """const CURRENT_PRODUCTION_RELEASE = 'v3.9.72.6';
const CURRENT_V3990_RELEASE = 'v3.9.90.0';
const ALLOWED_RELEASES = new Set(['v3.9.71.2', LEGACY_PRODUCTION_RELEASE, PREVIOUS_PRODUCTION_RELEASE, CURRENT_PRODUCTION_RELEASE, CURRENT_V3990_RELEASE]);
const BOUNDED_HEALTH_RELEASES = new Set([PREVIOUS_PRODUCTION_RELEASE, CURRENT_PRODUCTION_RELEASE, CURRENT_V3990_RELEASE]);""",
    "v3990 allowed baseline",
)
baseline = replace_once(
    baseline,
    "function assertResponse(result) {",
    """function isCloudflareManagedChallenge(result) {
  const headers = result?.headers || {};
  const body = String(result?.text || '').toLowerCase();
  return Number(result?.status) === 403
    && String(headers['cf-mitigated'] || '').toLowerCase() === 'challenge'
    && String(headers.server || '').toLowerCase().includes('cloudflare')
    && String(headers['content-type'] || '').toLowerCase().includes('text/html')
    && (body.includes('<title>just a moment') || body.includes('challenges.cloudflare.com'));
}

function assertResponse(result) {""",
    "strict baseline challenge helper",
)
baseline = replace_once(
    baseline,
    """  } else if (String(customRelease.headers['cf-mitigated'] || '').toLowerCase() === 'challenge') {
    customDomain = 'managed-challenge';""",
    """  } else if (isCloudflareManagedChallenge(customRelease)) {
    customDomain = 'managed-challenge';""",
    "strict custom baseline challenge",
)
baseline_path.write_text(baseline, encoding="utf-8")

audit_path = Path("tools/audit-production-resource-verification-v3990_0.mjs")
audit = audit_path.read_text(encoding="utf-8")
audit = replace_once(
    audit,
    """const snapshotVerifier = fs.readFileSync('tools/verify-production-pagination-snapshot-guard-v3990_0.mjs', 'utf8');""",
    """const baselineVerifier = fs.readFileSync('tools/verify-production-baseline-v3971.mjs', 'utf8');
for (const marker of [
  "CURRENT_V3990_RELEASE = 'v3.9.90.0'",
  'ALLOWED_RELEASES',
  'BOUNDED_HEALTH_RELEASES',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  "customDomain = 'managed-challenge'"
]) assert.ok(baselineVerifier.includes(marker), `production baseline verifier missing ${marker}`);

const snapshotVerifier = fs.readFileSync('tools/verify-production-pagination-snapshot-guard-v3990_0.mjs', 'utf8');""",
    "baseline audit markers",
)
audit_path.write_text(audit, encoding="utf-8")
