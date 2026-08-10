from pathlib import Path

p = Path('tools/verify-production-resource-graph-v3990_0.mjs')
t = p.read_text()

anchor = "const customBase = String(process.env.CUSTOM_BASE || CONTRACT.customBase).replace(/\\/$/, '');\n"
addition = "const sameOriginSurface = pagesBase === customBase;\n"
if t.count(anchor) != 1:
    raise SystemExit('base anchor changed')
t = t.replace(anchor, anchor + addition)

old = """    pagesMajorBands = await verifyMajorBandsBase('pages', pagesBase, attempt);
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
"""

new = """    pagesMajorBands = await verifyMajorBandsBase('pages', pagesBase, attempt);
    if (sameOriginSurface) {
      customDynamicBoundary = {
        mode: 'same-origin-as-pages',
        status: pagesMajorBands.health,
        verified: pagesMajorBands.failures.length === 0
      };
      customMajorBands = {
        ...pagesMajorBands,
        failures: [],
        reusedFrom: 'pages-same-origin'
      };
    } else {
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
"""

if t.count(old) != 1:
    raise SystemExit('major-bands dual-surface anchor changed')
t = t.replace(old, new)
p.write_text(t)
