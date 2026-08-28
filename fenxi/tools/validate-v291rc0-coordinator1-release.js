const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const root = path.resolve(__dirname, '..');
let pass=0, fail=0;
function ok(name, cond){ if(cond){ console.log('✓ '+name); pass++; } else { console.error('✗ '+name); fail++; } }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
console.log('V2.91RC0.coordinator1 release validation');
const version = read('VERSION.txt');
const index = read('index.html');
const debugHtml = read('debug.html');
const selftest = read('assets/debug-selftest.v2983fix12.js');
ok('VERSION.txt 版本正确', /V2\.91RC0\.coordinator1/.test(version) && /291rc0-coordinator1-20260513/.test(version));
ok('index 页面版本正确', /V2\.91RC0\.coordinator1/.test(index) && /291rc0-coordinator1-20260513/.test(index));
ok('index 全局版本变量正确', /__LN_TOOL_VERSION='V2\.91RC0\.coordinator1'/.test(index) && /__LN_TOOL_STAMP='291rc0-coordinator1-20260513'/.test(index));
ok('rules bundle 保留', /LN_RULES_BUNDLE_OPT = true/.test(index) && /291rc0-rules-core1-20260513/.test(index));
ok('ui bundle 保留', /LN_UI_BUNDLE_OPT = true/.test(index) && /291rc0-ui-core1-20260513/.test(index));
ok('coordinator 开关存在', /LN_APP_COORDINATOR_OPT = true/.test(index) && /LN_APP_COORDINATOR_VERSION = '291rc0-coordinator1-20260513'/.test(index));
ok('coordinator 脚本被加载', /assets\/app-coordinator\.v291rc0coord1\.js/.test(index));
ok('coordinator 在 interact 前加载', index.indexOf('assets/app-coordinator.v291rc0coord1.js') > -1 && index.indexOf('assets/app-coordinator.v291rc0coord1.js') < index.indexOf('assets/interact-stability.v29rc1.js'));
ok('debug 自测缓存戳正确', /debug-selftest\.v2983fix12\.js\?v=291rc0-coordinator1-20260513/.test(debugHtml));
ok('debug selftest 版本默认值正确', /V2\.91RC0\.coordinator1/.test(selftest) && /291rc0-coordinator1-20260513/.test(selftest));
ok('debug selftest 包含 coordinator 检查', /coordinator1 协调层门面加载与导出检查/.test(selftest));
ok('coordinator 文件存在', exists('assets/app-coordinator.v291rc0coord1.js'));
const coord = read('assets/app-coordinator.v291rc0coord1.js');
ok('coordinator 版本标记正确', /291rc0-coordinator1-20260513/.test(coord) && /LN_APP_COORDINATOR/.test(coord));
ok('coordinator 不包装 applyFilters', !/window\.applyFilters\s*=[^=]/.test(coord));
ok('coordinator 不包装 renderCards', !/window\.renderCards\s*=[^=]/.test(coord));
['assets/compute-pipeline.v2983.js','assets/plan-engine.v297fix2.js','assets/filter-engine.v298fix1.js','assets/render.v2981.js','assets/app.v2981.js','assets/app.v2983.js'].forEach(f=>ok(`${f} 保持存在`, exists(f)));
['assets/safeperf.v29rc1.js','assets/interact-stability.v29rc1.js','assets/interact-dedupe.v29rc2.js'].forEach(f=>ok(`${f} 保持存在`, exists(f)));
ok('无 fenxi/v3 目录', !exists('v3'));
['docs/V2.91RC0.coordinator1_更新说明.md','docs/V2.91RC0.coordinator1_验证清单.md','docs/V2.91RC0.ui-core1_更新说明.md','docs/V2.91RC0.rules-core1_更新说明.md','docs/JS_CORE_DEPENDENCY_MAP.md','docs/BASELINE.md'].forEach(f=>ok(`${f} 存在`, exists(f)));
// JS syntax check
const assetDir=path.join(root,'assets');
const jsFiles=fs.readdirSync(assetDir).filter(f=>f.endsWith('.js'));
let jsOk=0;
for(const f of jsFiles){ try{ execFileSync('node',['--check',path.join(assetDir,f)],{stdio:'pipe'}); jsOk++; }catch(e){ console.error('JS syntax failed: '+f); fail++; } }
ok('assets JS 语法检查通过', jsOk===jsFiles.length);
// JSON parse check
function walk(dir, out=[]){ for(const ent of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,ent.name); if(ent.isDirectory()) walk(p,out); else if(ent.name.endsWith('.json')) out.push(p); } return out; }
let jsonOk=0; for(const f of walk(path.join(root,'data'))){ try{ JSON.parse(fs.readFileSync(f,'utf8')); jsonOk++; }catch(e){ console.error('JSON parse failed: '+f); fail++; } }
ok('data JSON 可解析', jsonOk===walk(path.join(root,'data')).length);
const manifest=JSON.parse(read('data/manifest.json'));
let chunkSum=0; for(const c of manifest.chunks||[]){ const file=String(c.file||''); const rel=file.startsWith('data/chunks/')?file:('data/chunks/'+file); const obj=JSON.parse(read(rel)); const arr=Array.isArray(obj)?obj:(Array.isArray(obj.records)?obj.records:[]); chunkSum+=arr.length; }
ok('manifest totalRecords 与分块条数一致', Number(manifest.totalRecords)===chunkSum);
console.log(`\nV2.91RC0.coordinator1 validate: ${pass}/${pass+fail} passed`);
if(fail){ process.exit(1); }
