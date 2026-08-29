import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./verify-production-pagination-snapshot-guard-v3990_0.mjs', import.meta.url);
const generatedPath = new URL('./.verify-production-pagination-snapshot-guard-v3990_3.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll('v3.9.90.0', 'v3.9.90.3')
  .replaceAll('v3990_0', 'v3990_3')
  .replaceAll('3990_0', '3990_3')
  .replaceAll('v3990.0', 'v3990.1')
  .replaceAll('3990.0', '3990.1')
  .replaceAll('v3990-0', 'v3990-1');
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
