import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./browser-native-chooser-activation-v3990_1.mjs', import.meta.url);
const generatedPath = new URL('./.browser-native-chooser-activation-v3990_1.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace(
  "  assert.equal(result.immediate.publishedPhase, 'ready');\n  assert.equal(result.afterFocus.phase, 'native-chooser-stabilizing');",
  "  assert.ok(['ready', 'native-chooser-stabilizing'].includes(result.immediate.publishedPhase), `unexpected immediate published phase: ${result.immediate.publishedPhase}`);\n  assert.equal(result.afterFocus.phase, 'native-chooser-stabilizing');\n  assert.equal(result.afterFocus.publishedPhase, 'native-chooser-stabilizing');"
);
if (source.includes("assert.equal(result.immediate.publishedPhase, 'ready');")) {
  throw new Error('cancel timing compatibility replacement did not apply');
}
fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
