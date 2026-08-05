from pathlib import Path

source = Path('tools/verify-major-bands-preview-concurrency-v3990_0.mjs')
target = Path('/tmp/v3990-preview-503-diagnostic.mjs')
text = source.read_text(encoding='utf-8')
old = """    const result = await requestScenario({ ...scenario, path }, `page-${scenario.name}-${offset}-${Date.now()}`);
    validateResult(result);"""
new = """    let result = await requestScenario({ ...scenario, path }, `page-${scenario.name}-${offset}-${Date.now()}`);
    if (result.status !== 200) {
      console.error(JSON.stringify({ phase: 'pagination-initial-failure', scenario: scenario.name, offset, status: result.status, cloudflare1102: result.cloudflare1102, bodyPrefix: result.bodyPrefix || '', message: result.payload?.message || '', elapsedMs: result.elapsedMs }));
      for (const retryDelayMs of [1000, 2000, 4000]) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        result = await requestScenario({ ...scenario, path }, `page-retry-${scenario.name}-${offset}-${retryDelayMs}-${Date.now()}`);
        console.error(JSON.stringify({ phase: 'pagination-retry', scenario: scenario.name, offset, retryDelayMs, status: result.status, cloudflare1102: result.cloudflare1102, bodyPrefix: result.bodyPrefix || '', message: result.payload?.message || '', elapsedMs: result.elapsedMs }));
        if (result.status === 200 || result.cloudflare1102) break;
      }
    }
    validateResult(result);"""
if text.count(old) != 1:
    raise SystemExit(f'diagnostic anchor count={text.count(old)}')
target.write_text(text.replace(old, new, 1), encoding='utf-8')
