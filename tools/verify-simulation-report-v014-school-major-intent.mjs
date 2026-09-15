import fs from 'node:fs';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const js=fs.readFileSync('ln-rank/js/simulation-report-v014-school-major-intent.js','utf8');
const css=fs.readFileSync('ln-rank/css/simulation-report-v014-school-major-intent.css','utf8');
const plan=fs.readFileSync('docs/plans/simulation-school-major-intent-v014.md','utf8');
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v014.json','utf8'));
for(const expected of ['simulation-report-v014-school-major-intent.css?v=014-school-major-intent','simulation-report-v014-school-major-intent.js?v=014-school-major-intent','simulation-report-v012-family-decision.js?v=012-family-decision','simulation-report-v010-history-layout.js?v=010-history-layout'])if(!html.includes(expected))throw new Error(`html missing ${expected}`);
for(const expected of ['loadSchoolNameResolver','createMajorCatalogResolver','/api/ai/major-history','schoolKeyword','actual','实际招生记录','不会自动','暂时无法在线核对','相近输入'])if(!js.includes(expected))throw new Error(`runtime missing ${expected}`);
for(const expected of ['.school-input-suggestions-v014','.major-input-suggestions','min-height:46px','max-height:280px'])if(!css.includes(expected))throw new Error(`css missing ${expected}`);
for(const expected of ['任意学校','实际招生记录','机械','网络','计算机','测空技术与仪器','不幻觉'])if(!plan.includes(expected))throw new Error(`plan missing ${expected}`);
if(manifest.version!=='simulation-workspace-v014')throw new Error('manifest version mismatch');
if(manifest.revision!=='r058-school-context-major-intent')throw new Error('manifest revision mismatch');
if(manifest.noFabrication!==true)throw new Error('noFabrication must be true');
console.log('simulation-report-v014-school-major-intent contract: PASS');
