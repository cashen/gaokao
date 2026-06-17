#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1;}else console.log('OK:',msg);}
const index=read('fenxi/index.html');
const version=read('fenxi/VERSION.txt');
const compute=read('fenxi/assets/compute-pipeline.v2983.js');
const debug=read('fenxi/assets/debug-runtime.v2983.js');
const app=read('fenxi/assets/app.v2983.js');
const dbgHtml=read('fenxi/debug.html');
const data=read('fenxi/assets/data-engine.v297fix2.js');
ok(version.includes('V2.9.8.3.fix1'),'VERSION is V2.9.8.3.fix1');
ok(index.includes("const VERSION='2983fix1-20260511'"),'index cache bust is 2983fix1');
ok(index.includes('V2.9.8.3.fix1'),'visible title includes fix1');
ok(app.includes('v2983fix1'),'body class v2983fix1 added');
ok(app.includes("version:'V2.9.8.3.fix1'"),'app version fix1');
ok(compute.includes('interestPreFilter'),'scorePool has interest pre-filter');
ok(compute.includes('scorePoolBreakdown'),'scorePool deep breakdown exists');
ok(compute.includes('cacheStats'),'cache stats debug exists');
ok(compute.includes("computePipeline:'v2983fix1'"),'compute debug flag fix1');
ok(debug.includes('details:{}'),'debug details bucket exists');
ok(debug.includes('function detail'),'debug detail function exists');
ok(debug.includes('resources:'),'debug resource summary exists');
ok(debug.includes('oldDomFallbackUsed'),'debug legacy fallback field exists');
ok(dbgHtml.includes('复制深度报告'),'debug page has copy deep report');
ok(dbgHtml.includes('深度细分'),'debug page prints deep details');
ok(data.includes("dataLoad:"),'data load timing detail exists');
if(process.exitCode){process.exit(process.exitCode);}else console.log('All V2.9.8.3.fix1 checks passed.');
