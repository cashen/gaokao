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

const pageBlockStart = source.indexOf("for (const [path, scope] of [\n  ['ln-rank/local-mainline.html', 'liaoning'],");
const pageBlockEnd = source.indexOf("\n\nconst browser = read('ln-rank/js/academic-background/academic-background-app.v3968_0.js');", pageBlockStart);
if (pageBlockStart < 0 || pageBlockEnd < 0) throw new Error('academic background page audit block changed unexpectedly');
const replacement = `const localHtml = read('ln-rank/local-mainline.html');
assert.match(localHtml, /data-ui-page="background"/);
assert.match(localHtml, /local-strength-app\\.v3971_2\\.js/);
assert.match(localHtml, /local-strength\\.v3971_2\\.css/);
assert.match(localHtml, /release-presenter\\.v3971_2\\.js/);
assert.ok(!localHtml.includes('/api/local-strength'), 'LocalStrength page must not call a production full-scan API');
const localRuntime = read('ln-rank/js/local-strength/local-strength-app.v3971_2.js');
assert.match(localRuntime, /local-strength-index\\.v3971_2\\.json/);
assert.match(localRuntime, /score2025/);
assert.match(localRuntime, /score2024/);
assert.ok(!localRuntime.includes('/api/local-strength'), 'LocalStrength runtime must be static-only');
const localIndex = JSON.parse(read('ln-rank/data/local-strength/local-strength-index.v3971_2.json'));
assert.equal(localIndex.providerVersion, ACADEMIC_BACKGROUND_PROVIDER_VERSION);
assert.equal(localIndex.meta.completeEvaluation, true);
assert.equal(localIndex.meta.evaluatedRecordCount, localIndex.meta.localAdmissionRecordCount);

const all211Html = read('ln-rank/211-mainline.html');
assert.match(all211Html, /data-background-scope="211"/);
assert.match(all211Html, /academic-background-app\\.v3968_0\\.js/);
assert.match(all211Html, /academic-background\\.v3968_0\\.css/);
assert.match(all211Html, /release-presenter\\.v3968_0\\.js/);
assert.match(all211Html, /2025.*2024/);
assert.ok(!/211-mainline-app\\.v3951_0/.test(all211Html), '211 page still loads legacy runtime');`;
source = source.slice(0, pageBlockStart) + replacement + source.slice(pageBlockEnd);

fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
