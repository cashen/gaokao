import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const requiredStylePath = new URL('../ln-rank/css/score-converter.v3990_2.css', import.meta.url);
if (!fs.existsSync(requiredStylePath)) {
  throw new Error('score converter active stylesheet is missing: ln-rank/css/score-converter.v3990_2.css');
}
const requiredStyle = fs.readFileSync(requiredStylePath, 'utf8');
if (!requiredStyle.includes('.score-converter-shell') || !requiredStyle.includes('.score-converter-year-grid')) {
  throw new Error('score converter active stylesheet is incomplete');
}

const sourcePath = new URL('./audit-score-equivalence-v3990_0.mjs', import.meta.url);
const generatedPath = new URL('./.audit-score-equivalence-v3990_2.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll('v3.9.90.0', 'v3.9.90.2')
  .replaceAll('v3990_0', 'v3990_2')
  .replaceAll('3990_0', '3990_2')
  .replaceAll('v3990.0', 'v3990.2')
  .replaceAll('3990.0', '3990.2')
  .replaceAll('v3990-0', 'v3990-2');
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
