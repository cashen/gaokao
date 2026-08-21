import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./audit-academic-background-v3968.mjs', import.meta.url);
const generatedPath = new URL('./.audit-academic-background-v3990_2.generated.mjs', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll("../shared/governance/resource-execution-contract.v3969_0.js", "../shared/governance/resource-execution-contract.v3990_2.js")
  .replaceAll("'v3.9.69.0'", "'v3.9.90.2'")
  .replaceAll("'v3969_0'", "'v3990_2'")
  .replaceAll("'resource-execution-v3969_0'", "'resource-execution-v3990_2'");

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
assert.match(all211Html, /data-all211-runtime="loading"/);
assert.match(all211Html, /all211-static-app\\.v3972_0\\.js/);
assert.match(all211Html, /all211-static\\.v3972_0\\.css/);
assert.match(all211Html, /release-presenter\\.v3972_0\\.js/);
assert.ok(!all211Html.includes('/api/academic-background'), '211 page must not call the dynamic background API');
const all211Runtime = read('ln-rank/js/academic-background/all211-static-app.v3972_0.js');
assert.match(all211Runtime, /211-static-index\\.v3972_0\\.json/);
assert.match(all211Runtime, /score2025/);
assert.match(all211Runtime, /score2024/);
assert.ok(!all211Runtime.includes('/api/academic-background'), '211 runtime must be static-only');
const all211Index = JSON.parse(read('ln-rank/data/211-static/211-static-index.v3972_0.json'));
assert.equal(all211Index.version, 'all-211-static-v3972_0');
assert.equal(all211Index.meta.completeEvaluation, true);
assert.equal(all211Index.meta.evaluatedRecordCount, all211Index.meta.admission211RecordCount);
assert.equal(all211Index.scoreBands.length, 8);`;
source = source.slice(0, pageBlockStart) + replacement + source.slice(pageBlockEnd);

const apiBlockStart = source.indexOf("for (const [path, scope] of [\n  ['functions/api/local-mainline.js', 'liaoning'],");
const apiBlockEnd = source.indexOf("\n\nconst service = read('functions/_lib/academic-background-api.js');", apiBlockStart);
if (apiBlockStart < 0 || apiBlockEnd < 0) throw new Error('academic background API audit block changed unexpectedly');
const apiReplacement = `const localApi = read('functions/api/local-mainline.js');
assert.match(localApi, /handleAcademicBackgroundRequest/);
assert.match(localApi, /'liaoning'/);
assert.ok(!localApi.includes('loadBackgroundMatchedRecords'), 'local API still owns business logic');
assert.ok(!localApi.includes('score2025'), 'local API still owns legacy score logic');

const all211Api = read('functions/api/211-mainline.js');
assert.match(all211Api, /handle211StaticCompatibility/);
assert.ok(!all211Api.includes('handleAcademicBackgroundRequest'), '211 legacy API must not enter dynamic background service');
assert.ok(!all211Api.includes('loadBackgroundMatchedRecords'), '211 legacy API must not scan admission records');

const unifiedApi = read('functions/api/academic-background.js');
assert.match(unifiedApi, /is211ScopeRequest/);
assert.match(unifiedApi, /handle211StaticCompatibility/);
assert.match(unifiedApi, /handleAcademicBackgroundRequest/);

const compat211 = read('functions/_lib/211-static-compat-response.js');
assert.match(compat211, /migratedToStatic: true/);
assert.match(compat211, /scannedCount: 0/);
assert.match(compat211, /matchedCount: 0/);
assert.ok(!compat211.includes('loadAllRecords'), '211 compatibility response must not load admission records');`;
source = source.slice(0, apiBlockStart) + apiReplacement + source.slice(apiBlockEnd);

fs.writeFileSync(generatedPath, source);
try {
  await import(`${pathToFileURL(generatedPath.pathname).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}

