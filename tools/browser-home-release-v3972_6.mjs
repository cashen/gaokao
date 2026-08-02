import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-home-release-v3970.mjs', import.meta.url);
const generatedPath = new URL('./.browser-home-release-v3972_6.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll("assert.equal(state.bodyRelease, 'v3.9.72.5'", "assert.equal(state.bodyRelease, 'v3.9.72.6'")
  .replaceAll("assert.equal(state.htmlRelease, 'v3.9.72.5'", "assert.equal(state.htmlRelease, 'v3.9.72.6'")
  .replaceAll("assert.equal(state.bodyGeneration, 'v3972_5'", "assert.equal(state.bodyGeneration, 'v3972_6'")
  .replaceAll("assert.equal(state.htmlGeneration, 'v3972_5'", "assert.equal(state.htmlGeneration, 'v3972_6'")
  .replaceAll("assert.equal(state.visibleRelease, 'v3.9.72.5'", "assert.equal(state.visibleRelease, 'v3.9.72.6'")
  .replaceAll("assert.equal(state.runtime?.generation, 'v3972_5'", "assert.equal(state.runtime?.generation, 'v3972_6'")
  .replaceAll("assert.equal(state.runtime?.release, 'v3.9.72.5'", "assert.equal(state.runtime?.release, 'v3.9.72.6'")
  .replaceAll("assert.equal(state.shell?.generation, 'v3972_5'", "assert.equal(state.shell?.generation, 'v3972_6'")
  .replace("console.log(JSON.stringify({ ok: true, release: 'v3.9.72.5', generation: 'v3972_5'", "console.log(JSON.stringify({ ok: true, release: 'v3.9.72.6', generation: 'v3972_6'");

for (const required of [
  "assert.equal(state.bodyRelease, 'v3.9.72.6'",
  "assert.equal(state.bodyGeneration, 'v3972_6'",
  "assert.equal(state.runtime?.version, 'family-home-runtime-v3972_5'",
  "assert.equal(state.shell?.version, 'family-shell-v3972_5'"
]) {
  if (!source.includes(required)) throw new Error(`homepage compatibility mapping missing: ${required}`);
}
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
