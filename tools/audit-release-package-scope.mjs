#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();const failures=[];for(const rel of ['fenxi','functions/fenxi','functions/_middleware.js']){if(fs.existsSync(path.join(root,rel)))failures.push(`forbidden ${rel}`)}
const lr=path.join(root,'ln-rank');const allowed=new Set(['3932','3933','3933_1']);const oldEntries=fs.readdirSync(path.join(lr,'js')).filter(n=>/^(app|selection-pool|major-trend-render|self-check)\.v/.test(n)).filter(n=>{const v=n.match(/\.v([^.]*)\.js$/)?.[1];return v&&!allowed.has(v);});
if(oldEntries.length)failures.push(`old active-version entries remain: ${oldEntries.slice(0,6).join(',')}`);
const report={version:'v3.9.33.1',failures,status:failures.length?'fail':'pass'};fs.writeFileSync(path.join(lr,'release-package-scope-audit.v3933_1.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
