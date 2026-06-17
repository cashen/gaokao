import fs from 'node:fs';
const file = fs.readFileSync('functions/api/211-mainline.js','utf8');
const forbidden = ['fenxi-manifest','fenxi-normalizer','FENXI_DATA_BASE','/fenxi/data','loadAllRecords'];
const hits = forbidden.filter(x => file.includes(x));
const passed = hits.length === 0;
console.log(JSON.stringify({ audit: 'audit-no-fenxi-runtime-dependency', version: 'v3.9.33.14', passed, checked: 'functions/api/211-mainline.js', forbiddenHits: hits }, null, 2));
if (!passed) process.exit(1);
