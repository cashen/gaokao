import fs from 'node:fs';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v014-school-major-intent.js', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v014-school-major-intent.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v014.json', 'utf8'));
const plan = fs.readFileSync('docs/plans/simulation-school-major-intent-v014.md', 'utf8');
for (const expected of ['simulation-report-v014-school-major-intent.css?v=014-school-major-intent','simulation-report-v014-school-major-intent.js?v=014-school-major-intent','simulation-report-v012-family-decision.js?v=012-family-decision','simulation-report-v010-history-layout.js?v=010-history-layout']) if (!html.includes(expected)) throw new Error(`html missing ${expected}`);
for (const expected of ['createMajorCatalogResolver','normalizeMajorCode','loadSchoolNameResolver','/api/ai/major-history','schoolKeyword','schoolGroundedCandidates','typoSchoolCandidates','broadTerms','不会把全国专业目录候选冒充成该校招生事实','event.stopImmediatePropagation','persistCard']) if (!js.includes(expected)) throw new Error(`runtime missing ${expected}`);
for (const expected of ['.major-input-suggestions','.major-suggestion','.school-input-suggestions-v014','min-height:46px']) if (!css.includes(expected)) throw new Error(`css missing ${expected}`);
for (const expected of ['任意学校','实际招生记录','测空技术与仪器','计算机','不幻觉']) if (!plan.includes(expected)) throw new Error(`plan missing ${expected}`);
if (!String(manifest.version).startsWith('simulation-workspace-v014.')) throw new Error(`manifest family mismatch: ${manifest.version}`);
if (!String(manifest.revision).startsWith('r0')) throw new Error(`manifest revision mismatch: ${manifest.revision}`);
console.log('simulation-report-v013 compatibility contract on current v014 runtime: PASS');
