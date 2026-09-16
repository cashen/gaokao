import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const runtime=fs.readFileSync('ln-rank/js/simulation-report-v017-responsive-input.js','utf8');
const legacy=fs.readFileSync('ln-rank/js/simulation-report-v007-workbench.js','utf8');
const pdf=fs.readFileSync('ln-rank/js/simulation-report-v016-pdf.js','utf8');
const pdfAndroid=fs.readFileSync('ln-rank/js/simulation-report-v016-pdf-android.js','utf8');
const worker=fs.readFileSync('ln-rank/js/simulation-school-search-worker-v001.js','utf8');
const css=fs.readFileSync('ln-rank/css/simulation-report-v017-responsive-input.css','utf8');
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v016.json','utf8'));
const browser=fs.readFileSync('tools/browser-simulation-workspace-v017-actions.mjs','utf8');
const pdfBrowser=fs.readFileSync('tools/browser-simulation-report-pdf-v001.mjs','utf8');
const pdfAndroidBrowser=fs.readFileSync('tools/browser-simulation-report-pdf-android-v002.mjs','utf8');
const performance=fs.readFileSync('tools/browser-simulation-workspace-v016-performance.mjs','utf8');
const releaseFooter=fs.readFileSync('shared/resources/release/release-footer.v3990_3.js','utf8');

assert.equal(manifest.version,'simulation-workspace-v016.57');
assert.equal(manifest.revision,'r147-android-pdf-delivery-hardening');
assert.equal(manifest.pageVersion,'v1.0');
assert.equal(manifest.pageVersionLabel,'模拟志愿 v1.0');
assert.equal(manifest.runtimeRevision,'v016.46-r136');
assert.equal(manifest.pdfRuntimeRevision,'v016.50-r140');
assert.equal(manifest.pdfAndroidRuntimeRevision,'v016.52-r147');
for(const src of [
  '/ln-rank/js/simulation-report-v016-pdf.js?v=v016.50-r140',
  '/ln-rank/js/simulation-report-v016-pdf-android.js?v=v016.52-r147',
  '/ln-rank/js/simulation-report-v016-history-reference-only.js?v=v016.50-r140',
  '/ln-rank/js/simulation-report-v016-legacy-render-guard.js?v=v016.50-r140',
  '/ln-rank/js/simulation-report-v017-responsive-input.js?v=v016.50-r140',
  '/shared/resources/release/release-footer.v3990_3.js?v=v3990_3&r=r145-simulation-footer'
]) assert.ok(html.includes(src),`html missing ${src}`);
assert.ok(html.includes('simulation-report-v007-workbench.js?v=v016.50-r140'));
assert.ok(!html.includes('/ln-rank/js/simulation-report-v015-human-workbench.js?v='));
assert.ok(runtime.includes("const RELEASE='v016.46-r136'"));
assert.ok(runtime.includes('function pickLowest('));
assert.ok(runtime.includes('function buildHistory('));
assert.ok(runtime.includes('bindCandidateActions'));
assert.ok(legacy.includes('no-strict-record'));
for(const expected of ['getMetadata','province','city','level','candidateView','loadSchoolCatalog','resolveUnifiedSchoolQuery','SEARCH_DEBOUNCE_MS','searchTimers','searchSequences','scheduleSearch','loadAdmissionDirectoryOnce','directoryCandidates','directoryExact']) assert.ok(worker.includes(expected),`worker missing ${expected}`);
assert.ok(worker.includes('admissionDirectoryPromise = null'));
assert.ok(worker.includes('catalogPromise = null'));
for(const expected of ['overflow:visible','pointer-events:auto','touch-action:manipulation','.suggestion-action']) assert.ok(css.includes(expected),`css missing ${expected}`);
for(const expected of ['390','768','1280','选这所','选这个','沈阳工业大学','沈阳化工大学','高分子','电气工程及其自动化','confirmedSchool','majorName','history.years']) assert.ok(browser.includes(expected),`browser gate missing ${expected}`);
for(const expected of ['input synchronous work exceeded 100ms','input p95 exceeded 60ms','rapid school typing','rapid-school-directory-requests','沈阳工业大学','自动化']) assert.ok(performance.includes(expected),`performance gate missing ${expected}`);
for(const expected of ['sim-pdf-page','sim-pdf-line','splitPages','createPageShell','rowsBottom','contentBottom','break-inside:avoid','历史分数/位次仅作参考','__GAOKAO_SIMULATION_PDF_V01650__']) assert.ok(pdf.includes(expected),`pdf runtime missing ${expected}`);
assert.ok(!pdf.includes('page.offsetHeight>usableBottom'));
assert.ok(!pdf.includes('· 需核验'));
assert.ok(!pdf.includes('有历史记录需要核对'));
for(const expected of ['[1,2,6,10,12,14]','30 volunteers should paginate','__GAOKAO_SIMULATION_PDF_V01650__','simulation-workspace-v016.51 PDF pagination']) assert.ok(pdfBrowser.includes(expected),`pdf browser gate missing ${expected}`);
for(const expected of ['const RELEASE=\'v016.52-r147\'','MOBILE_SCALE=1.25','window.location.assign(url)','output(\'blob\')','__GAOKAO_SIMULATION_PDF_ANDROID__']) assert.ok(pdfAndroid.includes(expected),`android pdf runtime missing ${expected}`);
for(const expected of ['userAgent','Android 14','requestedScale','saveCalls','simulation-workspace-v016.57 Android PDF delivery','late-loaded/replaced html2canvas']) assert.ok(pdfAndroidBrowser.includes(expected),`android pdf browser gate missing ${expected}`);
for(const expected of ["export const SIMULATION_PAGE_VERSION = 'v1.0'",'ensureSimulationPageVersion','data-simulation-page-version','模拟志愿 ${SIMULATION_PAGE_VERSION}']) assert.ok(releaseFooter.includes(expected),`release footer missing ${expected}`);
assert.ok(html.includes('/shared/resources/release/release-footer.v3990_3.js'), 'simulation page must mount the canonical release footer runtime');
console.log('simulation-workspace-v016.57 contract: PASS');
