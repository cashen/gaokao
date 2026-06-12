#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();const failures=[];for(const rel of ['fenxi','functions/fenxi','functions/_middleware.js']){if(fs.existsSync(path.join(root,rel)))failures.push(`forbidden ${rel}`)}
const lr=path.join(root,'ln-rank');const oldEntries=fs.readdirSync(path.join(lr,'js')).filter(n=>/^(app|selection-pool|major-trend-render|self-check)\.v(39(2[0-9]|30|31))/.test(n));
if(oldEntries.length)failures.push(`old active-version entries remain: ${oldEntries.slice(0,6).join(',')}`);
const report={version:'v3.9.33',failures,status:failures.length?'fail':'pass'};fs.writeFileSync(path.join(lr,'release-package-scope-audit.v3933.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
