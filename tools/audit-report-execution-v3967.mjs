import assert from 'node:assert/strict';
import { buildFeishuReport } from '../functions/_lib/feishu-report-builder.js';
import { buildSelectionPoolFeishuReport } from '../functions/_lib/feishu-selection-pool-report-builder.js';

function year(year, score, rankStart, rankEnd) {
  return { year, score, rank: rankEnd, suppliedRank: rankEnd, rankStart, rankEnd, rankForGap: rankEnd, sameCount: rankEnd-rankStart+1, evidenceState:'matched', validationStatus:'matched', rankSource:'official-score-rank-table', sourceName:`${year}年辽宁省普通高校招生考试成绩统计表（物理学科类）`, comparable:true };
}
const historyEvidence={
  version:'ln-physics-history-evidence-v3967_0', region:'ln', subject:'physics', primaryYear:2026,
  years:{2026:year(2026,600,13929,14235),2025:year(2025,600,13272,13601),2024:year(2024,600,14353,14612)},
  comparison:{policy:'rank-first-score-secondary',populationPolicy:'undergraduate-control-line-cumulative',comparableYears:[2026,2025,2024],canCompareThreeYears:true,scoreOnlyCannotCreateTrend:true,conflictCannotCreateTrend:true}
};
const record={id:'neu|auto',school:'东北大学',major:'自动化类',score2026:600,rank2026:14235,historyEvidence,scoreDelta:0,scoreDelta2026:0,rankGap:0,rankGap2026:0,band:'near',bandKey:'near',statusLabel:'历史位次接近',position:'主体讨论',matchLabel:'精准匹配',displayLocation:'辽宁 · 沈阳',natureLabel:'公办',schoolTags:['985','211'],flags:[],reviewPoints:[],standardMajor:{code:'0808',name:'自动化类'},codes:{},specialProject:{hasSpecialProject:false}};
const current=buildFeishuReport({candidateScore:600,rangePreset:'standard',filters:{region:'all',schoolKeyword:'',majorKeyword:'自动化',bottomLineMode:'all'},selectedBand:{key:'near',title:'主要参考',rangeText:'约第13,929—17,794位'},selectedRecords:[record],counts:{upper:0,near:1,steady:0},keywordQuery:{rawKeywords:['自动化']},matchSummary:{exact:1,related:0,industry:0,project:0},dataScope:'辽宁2026物理类'});
assert.match(current.markdown,/历史对照附录/);
assert.match(current.markdown,/2025：600分｜约第13,272—13,601位/);
assert.match(current.markdown,/2024：600分｜约第14,353—14,612位/);
assert.ok(!current.markdown.includes('位次待核验'));
const selection=buildSelectionPoolFeishuReport({candidateScore:600,reportType:'selectionPool',items:[record],analysis:null,reportContext:{}});
assert.match(selection.markdown,/历史对照附录/);
assert.match(selection.markdown,/2025：600分｜约第13,272—13,601位/);
assert.match(selection.markdown,/2024：600分｜约第14,353—14,612位/);
assert.ok(!selection.markdown.includes('2025：600分｜位次待核验'));
assert.equal(current.yearCaliberVersion,'ln-physics-report-years-v3966_0');
assert.equal(selection.yearCaliberVersion,'ln-physics-report-years-v3966_0');
console.log(JSON.stringify({ok:true,contract:'report-execution-v3967_0',currentRecords:current.recordsCount,selectionRecords:selection.recordsCount},null,2));
