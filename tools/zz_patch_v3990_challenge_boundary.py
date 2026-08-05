from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, got {count}")
    return text.replace(old, new, 1)


verifier_path = Path("tools/verify-production-resource-graph-v3990_0.mjs")
verifier = verifier_path.read_text(encoding="utf-8")
verifier = replace_once(
    verifier,
    "function require200(failures, label, response, markers = []) {",
    """function isCloudflareManagedChallenge(response) {
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

function require200(failures, label, response, markers = []) {""",
    "challenge helpers",
)
old_run = """  const staticFailures = [
    ...validatePages(pages),
    ...validateStaticSet('custom', custom, { includeHtml: false })
  ];
  const [pagesMajorBands, customMajorBands] = verifyMajorBands && staticFailures.length === 0
    ? await Promise.all([
        verifyMajorBandsBase('pages', pagesBase, attempt),
        verifyMajorBandsBase('custom', customBase, attempt)
      ])
    : [
        { failures: [], skipped: true, reason: verifyMajorBands ? 'static-graph-not-ready' : 'disabled', pagination: {} },
        { failures: [], skipped: true, reason: verifyMajorBands ? 'static-graph-not-ready' : 'disabled', pagination: {} }
      ];
  const failures = [
    ...staticFailures,
    ...pagesMajorBands.failures,
    ...customMajorBands.failures
  ];
  return { ok: failures.length === 0, attempt, expected, pages, custom, pagesMajorBands, customMajorBands, failures };"""
new_run = """  const customStaticBoundary = validateCustomChallengeBoundary(custom);
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

  const failures = [
    ...staticFailures,
    ...pagesMajorBands.failures,
    ...customMajorBands.failures
  ];
  const customBoundary = {
    static: customStaticBoundary,
    dynamic: customDynamicBoundary
  };
  return { ok: failures.length === 0, attempt, expected, pages, custom, customBoundary, pagesMajorBands, customMajorBands, failures };"""
verifier = replace_once(verifier, old_run, new_run, "run attempt challenge boundary")
verifier = replace_once(
    verifier,
    """    majorBands: {
      pages: finalResult.pagesMajorBands,
      custom: finalResult.customMajorBands
    },""",
    """    customBoundary: finalResult.customBoundary,
    majorBands: {
      pages: finalResult.pagesMajorBands,
      custom: finalResult.customMajorBands
    },""",
    "challenge evidence summary",
)
verifier_path.write_text(verifier, encoding="utf-8")

audit_path = Path("tools/audit-production-resource-verification-v3990_0.mjs")
audit = audit_path.read_text(encoding="utf-8")
audit = replace_once(
    audit,
    """  'rank_unavailable_empty'
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);""",
    """  'rank_unavailable_empty',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  'customHtmlChallengeBoundarySeparate',
  'custom API challenge not corroborated by HTML challenge boundary',
  'custom-domain-cloudflare-managed-challenge',
  "pagesMajorBands = await verifyMajorBandsBase('pages'"
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);""",
    "production audit challenge markers",
)
audit_path.write_text(audit, encoding="utf-8")
