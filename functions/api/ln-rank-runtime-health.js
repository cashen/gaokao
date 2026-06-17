import { loadManifest } from '../_lib/fenxi-manifest.js';
import { getLocalMainlineMeta, getSchoolSummaries, getMajorSummaries } from '../_lib/local-mainline-kb.js';
import { LN_RANK_RELEASE_CONTRACT } from '../_lib/release-contract.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function check(name, fn, critical = true) {
  const started = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, critical, elapsedMs: Date.now() - started, detail };
  } catch (error) {
    return { name, ok: false, critical, elapsedMs: Date.now() - started, message: error?.message || String(error) };
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  const env = context.env || {};
  const checks = [];
  checks.push(await check('functions-route', async () => ({ message: 'Pages Functions 已命中 /api/ln-rank-runtime-health。' })));
  checks.push(await check('fenxi-manifest', async () => {
    const manifest = await loadManifest(context.request, env);
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    return {
      version: manifest.version || '',
      totalRecords: manifest.totalRecords || '',
      chunkCount: chunks.length,
      firstChunk: chunks[0]?.file || chunks[0]?.path || ''
    };
  }));
  checks.push(await check('local-mainline-kb', async () => {
    const meta = getLocalMainlineMeta();
    return {
      schools: getSchoolSummaries().length,
      majors: getMajorSummaries().length,
      evidenceVersion: meta?.version || ''
    };
  }, false));
  checks.push(await check('env-hints', async () => ({
    hasFenxiBase: Boolean(env.FENXI_DATA_BASE),
    hasSessionSecret: Boolean(env.LN_SESSION_SECRET || env.ACCESS_COOKIE_SECRET || env.FENXI_SESSION_SECRET),
    note: 'FENXI_DATA_BASE 为空时默认读取同域 /fenxi/data。'
  }), false));

  const failedCritical = checks.filter(x => x.critical && !x.ok);
  const failed = checks.filter(x => !x.ok);
  return json({
    ok: failedCritical.length === 0,
    status: failedCritical.length ? 'fail' : failed.length ? 'warn' : 'pass',
    version: LN_RANK_RELEASE_CONTRACT.display,
    assetVersion: LN_RANK_RELEASE_CONTRACT.assetVersion,
    release: LN_RANK_RELEASE_CONTRACT.release,
    route: '/api/ln-rank-runtime-health',
    diagnosis: failedCritical.length
      ? '运行时关键链路没有通过。若本接口返回 JSON，说明 functions 已部署；请继续看失败项。若本接口返回 HTML/503，优先检查 Cloudflare Pages 项目根目录是否包含 functions/。'
      : '运行时关键链路已返回 JSON。若 /api/major-bands 仍失败，继续检查专业池接口耗时、manifest/chunks 路径和数据源响应。',
    checks
  }, 200);
}
