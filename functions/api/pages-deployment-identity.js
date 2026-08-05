import { LN_RANK_RELEASE_CONTRACT } from '../_lib/release-contract.js';

export const PAGES_DEPLOYMENT_IDENTITY_VERSION = 'pages-deployment-identity-v3990_0';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  }

  const env = context.env || {};
  const commitSha = String(env.CF_PAGES_COMMIT_SHA || '').trim().toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || '').trim();
  const deploymentUrl = String(env.CF_PAGES_URL || '').trim();
  const identityAvailable = /^[0-9a-f]{40}$/.test(commitSha)
    && Boolean(branch)
    && /^https:\/\//.test(deploymentUrl);

  return json({
    ok: identityAvailable,
    version: PAGES_DEPLOYMENT_IDENTITY_VERSION,
    source: 'cloudflare-pages-runtime-environment',
    release: LN_RANK_RELEASE_CONTRACT.display,
    generation: LN_RANK_RELEASE_CONTRACT.siteRuntimeGeneration,
    assetVersion: LN_RANK_RELEASE_CONTRACT.assetVersion,
    commitSha,
    branch,
    deploymentUrl,
    identityAvailable
  }, identityAvailable ? 200 : 503);
}
