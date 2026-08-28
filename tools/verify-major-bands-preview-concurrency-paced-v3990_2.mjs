import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./verify-major-bands-preview-concurrency-v3990_2.mjs', import.meta.url);
const generatedPath = new URL('./.verify-major-bands-preview-concurrency-paced-v3990_2.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');

source = source.replace(
  "const expectedAllBandsEdgeCacheVersion = 'major-bands-all-bands-edge-cache-canonical-v3990_2';",
  "const expectedAllBandsEdgeCacheVersion = 'major-bands-all-bands-edge-cache-canonical-v3990_2';\nconst paginationPaceMs = base.startsWith('https://') ? Math.max(40, Number(process.env.PAGINATION_PACE_MS || 120)) : 0;\nconst postConcurrencyRecoveryMs = base.startsWith('https://') ? Math.max(500, Number(process.env.POST_CONCURRENCY_RECOVERY_MS || 2000)) : 0;"
);
source = source.replace(
  "const responseDetail = result.error || result.payload?.message || result.bodyPrefix || '';",
  "const responseDetail = result.error || result.payload?.message || result.bodyPrefix || (result.payload ? JSON.stringify(result.payload).slice(0, 240) : '');"
);
source = source.replace(
  "    requests += 1;\n    const group = result.payload.bands[scenario.band];",
  "    requests += 1;\n    if (paginationPaceMs) await new Promise(resolve => setTimeout(resolve, paginationPaceMs));\n    const group = result.payload.bands[scenario.band];"
);
source = source.replace(
  "const pagination = [];\nfor (const scenario of paginationScenarios) pagination.push(await exhaustPagination(scenario));",
  "if (postConcurrencyRecoveryMs) await new Promise(resolve => setTimeout(resolve, postConcurrencyRecoveryMs));\nconst pagination = [];\nfor (const scenario of paginationScenarios) pagination.push(await exhaustPagination(scenario));"
);
source = source.replace(
  "  pagination,\n  totalRequests,",
  "  pagination,\n  paginationPaceMs,\n  postConcurrencyRecoveryMs,\n  totalRequests,"
);

for (const marker of ['paginationPaceMs', 'postConcurrencyRecoveryMs', 'JSON.stringify(result.payload).slice(0, 240)']) {
  if (!source.includes(marker)) throw new Error(`Preview pacing adaptation missing: ${marker}`);
}

fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
