import fs from 'node:fs';

function patchFile(path,changes){
  let source=fs.readFileSync(path,'utf8');
  for(const [before,after] of changes){
    const count=source.split(before).length-1;
    if(count!==1)throw new Error(`${path}: expected one match, got ${count}: ${before.slice(0,120)}`);
    source=source.replace(before,after);
  }
  fs.writeFileSync(path,source);
}

patchFile('functions/_lib/ai/command-interpreter.js',[
  [
    "import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText} from './human-query-frame.js';",
    "import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';"
  ],
  [
    "    let foundTopic=false;\n    const collectionScope=collectionScopeFromText(candidate);\n    if(collectionScope.kind==='all_school_majors'&&collectionScope.index>0){foundTopic=true;pushCandidate(candidate.slice(0,collectionScope.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}",
    "    let foundTopic=false;\n    const semanticBoundary=schoolTopicBoundaryFromText(candidate);\n    if(semanticBoundary.index>0){foundTopic=true;pushCandidate(candidate.slice(0,semanticBoundary.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}"
  ]
]);

patchFile('functions/_lib/ai/agent-task-kernel.js',[
  [
    "import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText} from './human-query-frame.js';",
    "import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';"
  ],
  [
    "  const scoreConstraint=scoreConstraintFromText(source);\n  if(looksEducationKnowledgeQuestion",
    "  const scoreConstraint=scoreConstraintFromText(source),schoolTopic=schoolTopicBoundaryFromText(source);\n  if(looksEducationKnowledgeQuestion"
  ],
  [
    "  if(school&&looksHistoryCorrection(source))return explicitMajors.length?'school_major_history':'school_history';\n  if((looksBackground(source)||/有背景/.test(source))&&looksFit(source)",
    "  if(school&&looksHistoryCorrection(source))return explicitMajors.length?'school_major_history':'school_history';\n  if(schools.length&&schoolTopic.kind==='school_background'&&!looksFit(source))return'school_background';\n  if((looksBackground(source)||/有背景/.test(source))&&looksFit(source)"
  ]
]);

console.log('school semantic topic patch applied to entity and task owners');
