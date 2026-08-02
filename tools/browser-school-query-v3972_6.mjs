import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-school-query-v3969.mjs', import.meta.url);
const generatedPath = new URL('./.browser-school-query-v3972_6.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll('v3.9.69.0', 'v3.9.72.6')
  .replaceAll('app.v3969_0.js?v=3969_0', 'app.v3972_6.js?v=3972_6')
  .replaceAll('selection-workspace-orchestration-v3969_0', 'selection-workspace-orchestration-v3972_6')
  .replaceAll('browser-school-query-v3969', 'browser-school-query-v3972_6');
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
