from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, got {count}")
    return text.replace(old, new, 1)


verifier_path = Path('tools/verify-production-pagination-snapshot-guard-v3990_0.mjs')
verifier = verifier_path.read_text(encoding='utf-8')
verifier = replace_once(
    verifier,
    """    return Object.freeze({
      url,
      status: response.status,
      text: await response.text()
    });""",
    """    return Object.freeze({
      url,
      status: response.status,
      headers: Object.freeze(Object.fromEntries(response.headers.entries())),
      text: await response.text()
    });""",
    'capture response headers'
)
verifier = replace_once(
    verifier,
    """function verifySourceStateMachine() {""",
    """function isCloudflareManagedChallenge(response) {
  const headers = response?.headers || {};
  const body = String(response?.text || '').toLowerCase();
  return Number(response?.status) === 403
    && String(headers['cf-mitigated'] || '').toLowerCase() === 'challenge'
    && String(headers.server || '').toLowerCase().includes('cloudflare')
    && String(headers['content-type'] || '').toLowerCase().includes('text/html')
    && (body.includes('<title>just a moment') || body.includes('challenges.cloudflare.com'));
}

function verifySourceStateMachine() {""",
    'strict challenge helper'
)
verifier = replace_once(
    verifier,
    """async function verifyBase(label, base, attempt) {""",
    """async function verifyBase(label, base, attempt, options = {}) {""",
    'verify base options'
)
old_manifest = """  let parsedManifest = null;
  if (manifest.status !== 200) {
    failures.push(`${label} active manifest HTTP ${manifest.status}${manifest.error ? `: ${manifest.error}` : ''}`);
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

  return Object.freeze({"""
new_manifest = """  let parsedManifest = null;
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

  return Object.freeze({"""
verifier = replace_once(verifier, old_manifest, new_manifest, 'manifest challenge boundary')
verifier = replace_once(
    verifier,
    """    manifestGuardPath: parsedManifest?.currentGenerationInternalModules?.majorBandsPaginationSnapshotGuard || '',
    failures: Object.freeze(failures)""",
    """    manifestGuardPath: parsedManifest?.currentGenerationInternalModules?.majorBandsPaginationSnapshotGuard || '',
    manifestBoundary,
    failures: Object.freeze(failures)""",
    'manifest boundary evidence'
)
verifier = replace_once(
    verifier,
    """    verifyBase('pages', pagesBase, attempt),
    verifyBase('custom', customBase, attempt)""",
    """    verifyBase('pages', pagesBase, attempt),
    verifyBase('custom', customBase, attempt, { allowCloudflareChallenge: true })""",
    'custom challenge option'
)
verifier_path.write_text(verifier, encoding='utf-8')

audit_path = Path('tools/audit-production-resource-verification-v3990_0.mjs')
audit = audit_path.read_text(encoding='utf-8')
audit = replace_once(
    audit,
    """  'source guard retention exceeded budget'
]) assert.ok(snapshotVerifier.includes(marker), `pagination snapshot production verifier missing ${marker}`);""",
    """  'source guard retention exceeded budget',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  'customHtmlChallengeBoundarySeparate',
  "mode: 'cloudflare-managed-challenge'",
  'allowCloudflareChallenge: true',
  'manifestBoundary'
]) assert.ok(snapshotVerifier.includes(marker), `pagination snapshot production verifier missing ${marker}`);""",
    'snapshot challenge audit markers'
)
audit_path.write_text(audit, encoding='utf-8')
