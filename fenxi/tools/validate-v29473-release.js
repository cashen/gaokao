const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function assert(cond,msg){if(!cond){throw new Error(msg)}}
const html = read('index.html');
const js = read('assets/app.v29473.js');
const css = read('assets/app.v29473.css');
const readme = read('README.md');
const version = read('VERSION.txt');
assert(html.includes('V2.9.4.7.3｜高报师工作流与A/B/C方案版'),'index.html 标题未升级到 V2.9.4.7.3');
assert(html.includes('./assets/app.v29473.js'),'index.html 未引用 app.v29473.js');
assert(html.includes('./assets/app.v29473.css'),'index.html 未引用 app.v29473.css');
assert(html.includes('conflictDiagnosisV29473'),'index.html 缺少高报师诊断容器');
['conditionSnapshotV29473','buildFunnelV29473','diagnoseV29473','renderDiagnosisV29473','pickSchemeRowsV29473','planCardV29473','function renderPlanABC'].forEach(k=>assert(js.includes(k),'app.v29473.js 缺少核心函数：'+k));
['diagnosis-v29473','plan-cards-v29473','plan-card-v29473','funnel-grid-v29473','strength-grid-v29473'].forEach(k=>assert(css.includes(k),'app.v29473.css 缺少样式：'+k));
assert(readme.includes('18 项产品与前端变更'),'README 未写明变更数量');
assert(version.includes('V2.9.4.7.3'),'VERSION 未升级');
assert(fs.existsSync(path.join(root,'docs/V2.9.4.7.3_升级说明.md')),'缺少升级说明');
assert(fs.existsSync(path.join(root,'docs/V2.9.4.7.3_测试报告.md')),'缺少测试报告');
console.log('V2.9.4.7.3 release validation passed.');
