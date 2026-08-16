import fs from 'node:fs';

const path='functions/_lib/ai/command-interpreter.js';
let source=fs.readFileSync(path,'utf8');
function replaceOnce(before,after){const count=source.split(before).length-1;if(count!==1)throw new Error(`command-interpreter: expected one match, got ${count}: ${before.slice(0,120)}`);source=source.replace(before,after);}

replaceOnce(
  "import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText} from './human-query-frame.js';",
  "import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';"
);
replaceOnce(
  "    let foundTopic=false;\n    const collectionScope=collectionScopeFromText(candidate);\n    if(collectionScope.kind==='all_school_majors'&&collectionScope.index>0){foundTopic=true;pushCandidate(candidate.slice(0,collectionScope.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}",
  "    let foundTopic=false;\n    const semanticBoundary=schoolTopicBoundaryFromText(candidate);\n    if(semanticBoundary.index>0){foundTopic=true;pushCandidate(candidate.slice(0,semanticBoundary.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}"
);
fs.writeFileSync(path,source);
console.log('school semantic topic patch applied');
