import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-academic-background-v3968.mjs', import.meta.url);
const generatedPath = new URL('./.browser-academic-background-v3971.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace(
  '\n];\n\nfunction historyEvidence()',
  "\n].filter(testCase => testCase.scope === '211');\n\nfunction historyEvidence()"
);
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
