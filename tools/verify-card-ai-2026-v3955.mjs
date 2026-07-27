import assert from 'node:assert/strict';
import fs from 'node:fs';

import { YEAR_CALIBER_KB } from '../functions/_lib/kb/year-caliber-kb.generated.js';
import { buildCardDiagnoseMessages } from '../functions/_lib/ai-card-prompt.js';
import { buildCardRuleSnapshot, buildRuleOnlyDiagnosis } from '../functions/_lib/ai-card-rules.js';
import { normalizeDiagnosis } from '../functions/_lib/ai-card-output-schema.js';
import { buildHistoryScore } from '../functions/_lib/history-score-engine.js';
import { onRequest } from '../functions/api/card-diagnose.js';

const record = {
  id: 'demo-2026',
  dataYear: 2026,
  school: '辽宁大学',
  major: '计算机科学与技术',
  statusLabel: '稍高目标',
  position: '稍高目标',
  scoreDelta: 9,
  score2026: 589,
  rank2026: 18420,
  score2025: 584,
  rank2025: 19300,
  score2024: 590,
  rank2024: 18850,
  natureLabel: '公办',
  schoolTags: ['双一流']
};

assert.equal(YEAR_CALIBER_KB.activeDataYear, 2026);
assert.equal(YEAR_CALIBER_KB.rankTableYear, 2026);
assert.equal(YEAR_CALIBER_KB.audienceYear, 2027);
assert.deepEqual(YEAR_CALIBER_KB.lines, {
  specialControlLine: 508,
  undergraduateLine: 344,
  vocationalLine: 150
});
assert.match(YEAR_CALIBER_KB.aiCopy, /辽宁2026物理类专业最低投档分、同分位次区间和一分一段为主事实/);
assert.match(YEAR_CALIBER_KB.aiCopy, /2025、2024只作严格同口径历史对照/);
assert.match(YEAR_CALIBER_KB.aiCopy, /位次冲突、仅有分数或没有同口径记录的年份不得参与趋势/);
assert.match(YEAR_CALIBER_KB.aiCopy, /2027招生计划/);

const snapshot = buildCardRuleSnapshot(record, 580);
assert.equal(snapshot.activeDataYear, 2026);
assert.equal(snapshot.audienceYear, 2027);
assert.ok(snapshot.basis.some(line => line.includes('2026最低投档：589分 / 约第18,420位')));
assert.ok(snapshot.basis.some(line => line.includes('历史对照') && line.includes('2025')));
assert.ok(snapshot.checks.every(line => !line.includes('核验2026招生计划')));
assert.ok(snapshot.checks.some(line => line.includes('核验2027招生计划')));

const fallback = buildRuleOnlyDiagnosis(record, 580);
assert.ok(fallback.basis.some(line => line.includes('2026最低投档')));
assert.ok(fallback.checks.some(line => line.includes('2027招生计划')));
assert.ok(fallback.checks.every(line => !line.includes('核验2026招生计划')));
assert.ok(fallback.disclaimer.includes('2026最低投档记录'));
assert.ok(fallback.disclaimer.includes('2027录取预测'));

const modelNormalized = normalizeDiagnosis({
  summary: '录取概率90%，稳上',
  basis: ['2025最低：584分 / 19300位', '学校很强，肯定能上'],
  checks: ['核验2026招生计划是否变化', '核验校区和收费'],
  realityReminder: '计算机方向需要持续学习。',
  parentNote: '综合考虑，选择适合自己的。',
  riskTags: ['持续学习']
}, record, 580);
assert.ok(!modelNormalized.summary.includes('录取概率'));
assert.ok(!modelNormalized.summary.includes('稳上'));
assert.ok(modelNormalized.basis.some(line => line.includes('2026最低投档')));
assert.ok(modelNormalized.basis.some(line => line.includes('历史对照')));
assert.ok(modelNormalized.checks.every(line => !line.includes('核验2026招生计划')));
assert.ok(modelNormalized.checks.some(line => line.includes('核验2027招生计划')));

const messages = buildCardDiagnoseMessages({ record, candidateScore: 580, knowledgeContext: null });
assert.equal(messages.length, 2);
const payload = JSON.parse(messages[1].content);
assert.equal(payload.dataCaliber.activeDataYear, 2026);
assert.equal(payload.dataCaliber.audienceYear, 2027);
assert.equal(payload.card.score2026, '589');
assert.equal(payload.card.rank2026, '18420');
assert.equal(payload.card.historyEvidence.years['2025'].score, 584);
assert.equal(payload.card.historyEvidence.years['2025'].rankEnd, 19300);
assert.equal(payload.card.historyEvidence.years['2024'].score, 590);
assert.ok(!Object.prototype.hasOwnProperty.call(payload.card, 'score2025'));
assert.ok(!Object.prototype.hasOwnProperty.call(payload.card, 'rank2025'));
assert.match(payload.task, /2026专业最低投档分和位次为主事实/);
assert.ok(payload.outputRules.some(line => line.includes('checks中的年份必须面向2027正式填报')));

const history = buildHistoryScore({
  score2026: 589,
  rank2026: 18420,
  score2025: 584,
  rank2025: 19300,
  score2024: 590,
  rank2024: 18850
});
assert.ok(history.rankTrendText.includes('最低投档'));
assert.ok(!history.rankTrendText.includes('录取位置'));
assert.ok(!history.rankTrendLabel.includes('录取所需位次'));

const request = new Request('https://example.test/api/card-diagnose', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ record, candidateScore: 580 })
});
const response = await onRequest({ request, env: {} });
assert.equal(response.status, 200);
const result = await response.json();
assert.equal(result.ok, true);
assert.equal(result.source, 'rules-only');
assert.equal(result.caliber.activeDataYear, 2026);
assert.equal(result.caliber.audienceYear, 2027);
assert.equal(result.caliber.primaryFact, '2026专业最低投档分和位次');
assert.ok(result.diagnosis.basis.some(line => line.includes('2026最低投档')));
assert.ok(result.diagnosis.checks.every(line => !line.includes('核验2026招生计划')));

const controller = fs.readFileSync('ln-rank/js/feature/diagnose/controller.js', 'utf8');
assert.ok(controller.includes('score2026:'));
assert.ok(controller.includes('rank2026:'));
assert.ok(controller.includes('candidate:'));
assert.ok(controller.includes("api.js?v=3955_0"));

const promptSource = fs.readFileSync('functions/_lib/ai-card-prompt.js', 'utf8');
const ruleSource = fs.readFileSync('functions/_lib/ai-card-rules.js', 'utf8');
const schemaSource = fs.readFileSync('functions/_lib/ai-card-output-schema.js', 'utf8');
const caliberSource = fs.readFileSync('functions/_lib/kb/year-caliber-kb.generated.js', 'utf8');
assert.ok(promptSource.includes('不得继续要求核验2026招生计划'), 'prompt must explicitly reject the old check year');
assert.ok(!ruleSource.includes("'核验2026招生计划"), 'rule output must not contain a 2026-plan check');
assert.ok(schemaSource.includes('.replace(/核验2026年?招生计划/g'), 'schema must normalize legacy model output to 2027');
assert.ok(!ruleSource.includes('`2025最低：'));
assert.ok(schemaSource.includes("'2026最低投档'"));
assert.ok(caliberSource.includes('2026063013492555300'));
assert.ok(caliberSource.includes('2026063014014729932'));

console.log('CARD_AI_2026_V3955_OK');
