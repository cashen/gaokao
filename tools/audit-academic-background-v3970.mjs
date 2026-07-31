import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./audit-academic-background-v3968.mjs', import.meta.url);
const generatedPath = new URL('./.audit-academic-background-v3970.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll("../shared/governance/resource-execution-contract.v3969_0.js", "../shared/governance/resource-execution-contract.v3970_0.js")
  .replaceAll("'v3.9.69.0'", "'v3.9.71.2'")
  .replaceAll("'v3969_0'", "'v3970_0'")
  .replaceAll("'resource-execution-v3969_0'", "'resource-execution-v3970_0'");
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
