// Browserless layout invariant placeholder for environments without screenshot support.
// The release gate records that report/diagnosis CSS contains mobile overflow guards.
import fs from 'node:fs';
const css = fs.readFileSync('ln-rank/css/dist/ln-rank-main.v3934_1.css','utf8');
const required=['overflow-wrap: anywhere','max-width: 980px','min-height: 44px','@media (max-width: 640px)'];
const missing=required.filter(x=>!css.includes(x));
if(missing.length){ console.error(JSON.stringify({ok:false, missing},null,2)); process.exit(1); }
console.log(JSON.stringify({ok:true, mode:'browserless-layout-invariant', screenshotSmoke:'not-executed'},null,2));
