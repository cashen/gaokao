import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { onRequest } from '../../functions/api/tongxue-summary.js';

const schools = splitEnv('STUDENT_VOICE_LIVE_SCHOOLS', ['沈阳建筑大学', '辽宁科技大学']);
const artifactDir = '/tmp/tongxue-live-artifact';
await mkdir(artifactDir, { recursive:true });

const results = [];
for (const school of schools) {
  const url = new URL('https://verification.invalid/api/tongxue-summary');
  url.searchParams.set('scope', 'school');
  url.searchParams.set('school', school);
  url.searchParams.set('page', '1');
  url.searchParams.set('refresh', '1');
  const startedAt = Date.now();
  const response = await onRequest({
    request:new Request(url, { method:'GET', headers:{ accept:'application/json' } }),
    env:{}
  });
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); }
  catch { throw new Error(`大学生声音 live smoke 返回非 JSON：${school} -> ${raw.slice(0, 300)}`); }

  const row = {
    school,
    status:response.status,
    ok:Boolean(payload?.ok),
    mode:String(payload?.mode || ''),
    error:String(payload?.error || ''),
    version:String(payload?.version || ''),
    headerVersion:String(response.headers.get('x-tongxue-version') || ''),
    sourceGatewayVersion:String(payload?.sourceGatewayVersion || ''),
    summaryLength:typeof payload?.summary === 'string' ? payload.summary.length : 0,
    studentEvidenceCount:Array.isArray(payload?.studentEvidence) ? payload.studentEvidence.length : 0,
    reviewCount:Array.isArray(payload?.reviews) ? payload.reviews.length : 0,
    schoolSourceId:payload?.schoolMeta?.id ?? null,
    elapsedMs:Date.now() - startedAt
  };

  assert.ok(response.status < 500, `大学生声音 live smoke 发生 5xx：${school} -> ${JSON.stringify(row)}`);
  assert.equal(row.version, 'v1.4.1', `接口版本漂移：${school}`);
  assert.equal(row.headerVersion, 'v1.4.1', `接口 header 版本漂移：${school}`);

  if (response.status === 200) {
    assert.equal(payload.ok, true, `200 响应必须 ok=true：${school}`);
    assert.ok(['ai_summary','recent_reviews','no_content','topic_reviews','topic_no_content','topic_not_found_within_budget'].includes(payload.mode), `未知内容模式：${school} -> ${payload.mode}`);
    assert.equal(payload.scope, 'school', `school scope 丢失：${school}`);

    if (payload.mode === 'ai_summary') {
      assert.ok(row.summaryLength >= 20, `AI 摘要过短：${school}`);
      assert.ok(Array.isArray(payload.studentEvidence), `AI 摘要必须携带 studentEvidence 数组：${school}`);
      assert.ok(payload.studentEvidence.length <= 5, `代表性学生证据超过 5 条：${school}`);
      assert.equal(payload.evidence?.sourceSummary, true, `AI 摘要 evidence.sourceSummary 丢失：${school}`);
      for (const evidence of payload.studentEvidence) validateStudentEvidence(evidence, school);
    }

    if (payload.mode === 'recent_reviews' || payload.mode === 'topic_reviews') {
      assert.ok(Array.isArray(payload.reviews) && payload.reviews.length >= 1, `评论模式没有真实评论：${school}`);
      for (const review of payload.reviews) validateReview(review, school);
    }

    if (payload.mode === 'no_content') {
      assert.equal(Array.isArray(payload.reviews) ? payload.reviews.length : 0, 0, `no_content 不应伪造评论：${school}`);
    }
  } else {
    assert.equal(response.status, 404, `非 200 只允许可解释的 404：${school} -> ${JSON.stringify(row)}`);
    assert.ok(['entity_source_not_found','school_not_found'].includes(payload.error), `404 原因不可解释：${school} -> ${payload.error}`);
  }

  results.push(row);
}

await writeFile(`${artifactDir}/student-voice-live-smoke.json`, JSON.stringify({ ok:true, results }, null, 2));
console.log(JSON.stringify({ ok:true, contract:'student-voice-live-smoke-v0.02', results }, null, 2));

function validateStudentEvidence(evidence, school) {
  assert.ok(evidence && typeof evidence === 'object', `studentEvidence 非对象：${school}`);
  assert.ok(String(evidence.content || '').trim().length >= 2, `studentEvidence 内容为空：${school}`);
  assert.ok(String(evidence.reason || '').trim().length >= 2, `studentEvidence 选择原因为空：${school}`);
  assert.ok(String(evidence.categoryLabel || '').trim().length >= 2, `studentEvidence 分类为空：${school}`);
  assert.equal(evidence.evidenceScope, 'school', `studentEvidence scope 串线：${school}`);
  assert.ok(evidence.schoolSourceId !== undefined && evidence.schoolSourceId !== null, `studentEvidence 学校来源 ID 丢失：${school}`);
  assert.ok(/^https:\/\//.test(String(evidence.sourceUrl || '')), `studentEvidence 来源 URL 丢失：${school}`);
}

function validateReview(review, school) {
  assert.ok(review && typeof review === 'object', `评论非对象：${school}`);
  assert.ok(String(review.content || '').trim().length >= 2, `评论内容为空：${school}`);
  assert.equal(review.evidenceScope, 'school', `评论 scope 串线：${school}`);
  assert.ok(review.schoolSourceId !== undefined && review.schoolSourceId !== null, `评论学校来源 ID 丢失：${school}`);
  assert.ok(/^https:\/\//.test(String(review.sourceUrl || '')), `评论来源 URL 丢失：${school}`);
}

function splitEnv(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : fallback;
}
