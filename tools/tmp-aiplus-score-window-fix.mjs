import fs from 'node:fs';

const path='functions/_lib/ai/tool-registry.js';
let source=fs.readFileSync(path,'utf8');
function replaceOnce(before,after){const count=source.split(before).length-1;if(count!==1)throw new Error(`${path}: expected one match, got ${count}: ${before.slice(0,120)}`);source=source.replace(before,after);}

replaceOnce(
  "import {scoreWithinConstraint} from './human-query-frame.js';",
  "import {isScoreWindow,scoreWithinConstraint} from './human-query-frame.js';"
);
replaceOnce(
  "region=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all'),min=Number(scoreConstraint?.min),max=Number(scoreConstraint?.max);",
  "region=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all'),windowed=isScoreWindow(scoreConstraint),min=windowed&&scoreConstraint?.min!==null&&scoreConstraint?.min!==undefined&&Number.isFinite(Number(scoreConstraint.min))?Number(scoreConstraint.min):null,max=windowed&&scoreConstraint?.max!==null&&scoreConstraint?.max!==undefined&&Number.isFinite(Number(scoreConstraint.max))?Number(scoreConstraint.max):null;"
);
replaceOnce(
  "if(Number.isFinite(min))url.searchParams.set('minScore',String(Math.round(min)));if(Number.isFinite(max))url.searchParams.set('maxScore',String(Math.round(max)));",
  "if(min!==null)url.searchParams.set('minScore',String(Math.round(min)));if(max!==null)url.searchParams.set('maxScore',String(Math.round(max)));"
);
replaceOnce(
  "const hasScoreConstraint=Number.isFinite(Number(scoreConstraint?.min))||Number.isFinite(Number(scoreConstraint?.max));",
  "const hasScoreConstraint=isScoreWindow(scoreConstraint);"
);
fs.writeFileSync(path,source);
console.log('score-window semantic presence fix applied');
