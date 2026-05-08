const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else{console.log('OK:',msg)}}
const html=read('index.html');
const js=read('assets/app.v29475fix.js');
const css=read('assets/app.v29475fix.css');
ok(html.includes('app.v29475fix.css'),'index.html 引用 app.v29475fix.css');
ok(html.includes('app.v29475fix.js'),'index.html 引用 app.v29475fix.js');
ok(html.includes('V2.9.4.7.5.fix'),'入口标题包含 V2.9.4.7.5.fix');
ok(js.includes('V2.9.4.7.5.fix｜A/B/C 多候选方案盘修正版'),'JS 版本号正确');
ok(js.includes('box.classList.add(\'abc-board-v29475fix\')'),'renderPlanABC 添加 fix 方案盘 class');
ok(js.includes('function pickSchemeBucketsV29475()'),'存在 pickSchemeBucketsV29475');
ok(js.includes("return {A:pickBucketV29475('A',4),B:pickBucketV29475('B',4),C:pickBucketV29475('C',4)}"),'A/B/C 三路径独立取 4 个候选');
ok(!js.includes('const chosen=new Set();\n  return {A:pickBucketV29475(\'A\',4,chosen)'), '已移除全局 chosen 压缩单卡逻辑');
ok(js.includes('slice(0,4)'),'每列最多展示 4 个代表候选');
ok(js.includes('plan-mini-v29475'),'使用多候选小卡 plan-mini-v29475');
ok(js.includes('plan-col-v29475'),'使用方案列 plan-col-v29475');
ok(css.includes('abc-board-v29475fix'),'CSS 包含 fix 方案盘布局');
ok(css.includes('@media (max-width:920px)'),'CSS 包含 Pad/Android 单列适配');
ok(js.includes('hasCollegeSpecialPlanV29474'),'保留高校专项资格默认保护函数');
ok(js.includes('isCoopV29475') && js.includes('feeTypeLabelV29475'),'保留中外合作/收费类型标签逻辑');
if(process.exitCode){process.exit(process.exitCode)}
console.log('V2.9.4.7.5.fix release validation passed.');
