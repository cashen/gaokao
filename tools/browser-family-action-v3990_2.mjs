import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-family-action-v3970.mjs', import.meta.url);
const generatedPath = new URL('./.browser-family-action-v3990_2.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replaceAll('v3.9.72.5', 'v3.9.90.2');
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}

