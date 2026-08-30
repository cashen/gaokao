const base = String(process.env.AI_MODEL_PROBE_BASE || '').trim().replace(/\/+$/, '');
const expectedRelease = String(process.env.AI_MODEL_PROBE_EXPECTED_RELEASE || 'v3.9.90.3').trim();
const expectedProvider = String(process.env.AI_MODEL_PROBE_EXPECTED_PROVIDER || 'workers-ai').trim();
const expectedModel = String(process.env.AI_MODEL_PROBE_EXPECTED_MODEL || '@cf/zai-org/glm-4.7-flash').trim();
const attempts = Math.max(1, Math.min(30, Number(process.env.AI_MODEL_PROBE_ATTEMPTS || 1)));
const waitMs = Math.max(0, Math.min(30000, Number(process.env.AI_MODEL_PROBE_WAIT_MS || 0)));
const required = !['0', 'false', 'no', 'diagnostic'].includes(String(process.env.AI_MODEL_PROBE_REQUIRED || 'true').toLowerCase());
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

if (!base) throw new Error('AI_MODEL_PROBE_BASE is required');

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function sanitizeFailures(value) {
  return (Array.isArray(value) ? value : []).slice(0, 4).map(item => ({
    provider: clean(item?.provider, 80),
    model: clean(item?.model, 180),
    code: clean(item?.code, 100),
    error: clean(item?.error, 500)
  }));
}

async function readJson(response) {
  const text = await response.text();
  try {
    return { payload: JSON.parse(text), text: text.slice(0, 1000) };
  } catch {
    return { payload: null, text: text.slice(0, 1000) };
  }
}

let lastEvidence = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const nonce = `${Date.now()}-${attempt}`;
  let healthStatus = 0;
  let probeStatus = 0;
  let health = null;
  let probe = null;
  let transportError = '';

  try {
    const healthResponse = await fetch(`${base}/api/ai/health?live-model-probe=${nonce}`, {
      headers: { accept: 'application/json', 'cache-control': 'no-cache' }
    });
    healthStatus = healthResponse.status;
    health = (await readJson(healthResponse)).payload;

    const probeResponse = await fetch(`${base}/api/ai/model-probe?live-model-probe=${nonce}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'cache-control': 'no-cache'
      },
      body: '{}'
    });
    probeStatus = probeResponse.status;
    probe = (await readJson(probeResponse)).payload;
  } catch (error) {
    transportError = clean(error?.message || error, 500);
  }

  const provider = health?.provider || {};
  const configured = probe?.configured || {};
  const actual = probe?.actual || {};
  const evidence = {
    phase: 'live-ai-model-probe',
    attempt,
    base,
    required,
    transportError,
    healthStatus,
    probeStatus,
    release: clean(health?.release || probe?.release, 80),
    deployment: {
      commitSha: clean(health?.deployment?.commitSha, 80),
      branch: clean(health?.deployment?.branch, 180),
      url: clean(health?.deployment?.url, 500)
    },
    health: {
      primary: clean(provider.primary, 80),
      primaryModel: clean(provider.primaryModel, 180),
      workersAiBound: Boolean(provider.workersAiBound),
      workersModelConfigured: Boolean(provider.workersModelConfigured),
      workersModelRequested: clean(provider.workersModelRequested, 180),
      workersModelMigrated: Boolean(provider.workersModelMigrated),
      workersModelMigratedFrom: clean(provider.workersModelMigratedFrom, 180),
      externalConfigured: Boolean(provider.externalConfigured)
    },
    configured: {
      primary: clean(configured.primary, 80),
      primaryModel: clean(configured.primaryModel, 180),
      fallback: clean(configured.fallback, 80),
      fallbackModel: clean(configured.fallbackModel, 180)
    },
    actual: {
      provider: clean(actual.provider, 80),
      model: clean(actual.model, 180),
      latencyMs: Number(actual.latencyMs || 0),
      fallbackUsed: Boolean(actual.fallbackUsed)
    },
    match: probe?.match || null,
    failures: sanitizeFailures(probe?.failures),
    note: clean(probe?.note, 500)
  };

  evidence.ok = Boolean(
    healthStatus === 200 &&
    probeStatus === 200 &&
    health?.ok === true &&
    probe?.ok === true &&
    evidence.release === expectedRelease &&
    evidence.health.primary === expectedProvider &&
    evidence.health.primaryModel === expectedModel &&
    evidence.health.workersAiBound === true &&
    evidence.health.workersModelConfigured === true &&
    evidence.configured.primary === expectedProvider &&
    evidence.configured.primaryModel === expectedModel &&
    evidence.actual.provider === expectedProvider &&
    evidence.actual.model === expectedModel &&
    evidence.actual.fallbackUsed === false &&
    probe?.match?.primaryMatched === true
  );

  lastEvidence = evidence;
  console.log(JSON.stringify(evidence, null, 2));
  if (evidence.ok) process.exit(0);
  if (attempt < attempts) await sleep(waitMs);
}

if (!required) {
  console.log(JSON.stringify({ ok: true, diagnosticOnly: true, observed: lastEvidence }, null, 2));
  process.exit(0);
}

const failure = lastEvidence?.failures?.[0];
throw new Error(
  `live Workers AI probe failed: ${failure?.code || lastEvidence?.probeStatus || 'unknown'} ${failure?.error || lastEvidence?.note || lastEvidence?.transportError || ''}`.trim()
);
