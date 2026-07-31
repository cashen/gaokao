import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-academic-background-v3968.mjs', import.meta.url);
const generatedPath = new URL('./.browser-academic-background-v3971.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
for (const name of ['local-pc-1440', 'local-pad-820', 'local-android-390']) {
  const pattern = new RegExp(`^  \\{ name: '${name}'.*\\n`, 'm');
  if (!pattern.test(source)) throw new Error(`missing legacy local browser case ${name}`);
  source = source.replace(pattern, '');
}
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
