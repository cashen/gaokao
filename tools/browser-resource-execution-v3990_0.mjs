import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-resource-execution-v3969.mjs', import.meta.url);
const generatedPath = new URL('./.browser-resource-execution-v3990_0.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll('../shared/ui/component-registry.v3967_0.js', '../shared/ui/component-registry.v3970_0.js')
  .replaceAll('v3.9.69.0', 'v3.9.90.0')
  .replaceAll('selection-workspace-orchestration-v3969_0', 'selection-workspace-orchestration-v3990_0')
  .replaceAll('resource-execution-browser-v3967_0', 'resource-execution-browser-v3990_0');
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}

