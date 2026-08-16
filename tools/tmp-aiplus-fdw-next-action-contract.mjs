import fs from 'node:fs';

function replaceOnce(path,oldText,newText,label){
  const source=fs.readFileSync(path,'utf8');
  const count=source.split(oldText).length-1;
  if(count!==1)throw new Error(`${label}: expected 1 occurrence, got ${count}`);
  fs.writeFileSync(path,source.replace(oldText,newText));
}

replaceOnce(
  'tools/verify-ai-workspace-v3990_1.mjs',
  "assert.ok(html.includes('把学校、专业和分数问题问清楚'));assert.ok(html.includes('先给你能用的结论，再展开依据。'));",
  "assert.ok(html.includes('把孩子的选择一步一步定下来'));assert.ok(html.includes('只记住你明确表达过的取舍'));assert.ok(html.includes('id=\"decisionProgressList\"'));assert.ok(!html.includes('id=\"healthBar\"'));assert.ok(!html.includes('id=\"probeModel\"'));",
  'legacy family-advisor hero contract'
);

const marker="eq(actions.filter(item=>item.primary===true).length,1,'exactly one strong primary next action is required');";
const extra=`

// Global decision progress must not hijack an explicitly scoped atomic research node.
const localSchoolActions=nextActionsForTurn({task:'school_history',school:'沈阳工业大学',score:580,result:{history:{ok:true,records:[]}},workspace:createAiWorkspace({examContext:{score:580}})});
eq(localSchoolActions.map(item=>item.label),['看哪些专业更有积累','回到学校整体介绍','看校园环境与同学体验'],'school-history followups remain owned by the local research task');
no(localSchoolActions.some(item=>String(item.id||'').startsWith('progress-')),'global progress must not displace local school research');

// A partial non-composite query must repair the current evidence gap before advancing the journey.
const partialActions=nextActionsForTurn({task:'candidate_refinement',score:578,result:{partial:true,candidates:{ok:true,counts:{total:8}}},workspace:createAiWorkspace({examContext:{score:578}})});
eq(partialActions[0]?.id,'retry-failed','partial result must make retry the primary next action');
eq(partialActions[0]?.primary,true,'partial retry must be the one strong CTA');
no(partialActions.some(item=>String(item.id||'').startsWith('progress-')),'partial evidence cannot be skipped by a global progress CTA');

// Current matching rank evidence can advance the pure progress projection before the browser commits it; stale rank evidence cannot.
const matchingRankProgress=deriveDecisionProgress(createAiWorkspace({examContext:{score:600},lastResult:{rank:{ok:true,score:600,rankEnd:14235}}}));
eq(matchingRankProgress.stages[0].state,'ready','matching current rank evidence should satisfy score-position projection');
const staleRankProgress=deriveDecisionProgress(createAiWorkspace({examContext:{score:600},lastResult:{rank:{ok:true,score:599,rankEnd:15000}}}));
eq(staleRankProgress.stages[0].state,'exploring','rank evidence for another score must never be reused');
`;
replaceOnce(
  'tools/verify-aiplus-family-decision-workbench-v003.mjs',
  marker,
  marker+extra,
  'FDW next-action ownership contract'
);

console.log('FDW verifier contract patcher completed');
