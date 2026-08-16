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
    "function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),resolved=unique(resolvedSchoolNames||[],4),matches=source.match(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)||[],full=matches.map(v=>{let candidate=stripSchoolEntityLeadingAction(v,120);const parts=candidate.split(/(?:和|跟|与|、|以及)/),tail=parts[parts.length-1]||'';if(parts.length>1&&/[\\u4e00-\\u9fa5]{2,30}(?:高等专科学校|专科学校|大学|学院)$/.test(tail))candidate=tail;return candidate;}).filter(candidate=>candidate&&!resolved.some(name=>candidate!==name&&candidate.endsWith(name)));return unique([...resolved,...full],4);}",
    "function schoolNamesFromText(text,resolvedSchoolNames=[],matchedAliases=[]){const source=String(text||''),resolved=unique(resolvedSchoolNames||[],4),aliasSpans=schoolMentionSpans(source,[],matchedAliases),matches=[...source.matchAll(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)],full=matches.filter(match=>!aliasSpans.some(span=>Number(match.index)<span.end&&Number(match.index)+String(match[0]||'').length>span.start&&String(match[0]||'')!==source.slice(span.start,span.end))).map(match=>{let candidate=stripSchoolEntityLeadingAction(match[0],120);const parts=candidate.split(/(?:和|跟|与|、|以及)/),tail=parts[parts.length-1]||'';if(parts.length>1&&/[\\u4e00-\\u9fa5]{2,30}(?:高等专科学校|专科学校|大学|学院)$/.test(tail))candidate=tail;return candidate;}).filter(candidate=>candidate&&!resolved.some(name=>candidate!==name&&candidate.endsWith(name)));return unique([...resolved,...full],4);}"
  ],
  [
    "  if(!source||/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/.test(source))return[];",
    "  const semanticBoundary=schoolTopicBoundaryFromText(source),fullSchoolMatches=[...source.matchAll(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)],hasValidFullSchool=fullSchoolMatches.some(match=>semanticBoundary.index<0||Number(match.index)+String(match[0]||'').length<=semanticBoundary.index);\n  if(!source||hasValidFullSchool)return[];"
  ],
  [
    "    let foundTopic=false;\n    const collectionScope=collectionScopeFromText(candidate);\n    if(collectionScope.kind==='all_school_majors'&&collectionScope.index>0){foundTopic=true;pushCandidate(candidate.slice(0,collectionScope.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}",
    "    let foundTopic=false;\n    const semanticBoundary=schoolTopicBoundaryFromText(candidate);\n    if(semanticBoundary.index>0){foundTopic=true;pushCandidate(candidate.slice(0,semanticBoundary.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}"
  ],
  [
    "schoolNamesFromInput=directoryQuestion&&!resolvedSchoolNames.length?[]:schoolNamesFromText(source,resolvedSchoolNames)",
    "schoolNamesFromInput=directoryQuestion&&!resolvedSchoolNames.length?[]:schoolNamesFromText(source,resolvedSchoolNames,resolvedSchoolAliases)"
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
