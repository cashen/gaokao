import assert from 'node:assert/strict';
import { onRequest } from '../../functions/_lib/student-voice-source.js';

const originalFetch = globalThis.fetch;
const calls = [];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers:{ 'content-type':'application/json; charset=utf-8' }
  });
}

const reviews = [
  { id:101, content:'电气专业实验和课程设计比较多，大三开始项目明显增加。', nickname:'实验同学', created_at:'2026-05-02 10:00:00', like_count:5, reply_count:1 },
  { id:102, content:'宿舍条件一般，不过食堂选择多，校园生活整体还算方便。', nickname:'生活同学', created_at:'2026-05-05 10:00:00' },
  { id:103, content:'就业方向比较明确，实习和校招需要自己主动准备。', nickname:'就业同学', created_at:'2026-05-10 10:00:00', like_count:8 },
  { id:104, content:'考研的人不少，老师会提醒专业课复习和方向选择。', nickname:'考研同学', created_at:'2026-05-12 10:00:00' },
  { id:105, content:'课多作业也多，大三的学习强度比较明显。', nickname:'课业同学', created_at:'2026-05-15 10:00:00' },
  { id:106, content:'挺好的。', nickname:'短评同学', created_at:'2026-05-16 10:00:00' }
];

try {
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    calls.push(url.toString());

    if (url.pathname.includes('/api/schools/') && url.pathname.endsWith('/ai-summary')) {
      const schoolId = url.pathname.split('/').at(-2);
      if (schoolId === '27032') {
        return jsonResponse({ data:{ summary:'学生评论中常提到课程实验、住宿生活、就业准备和考研氛围。不同学生体验存在差异，建议结合原始评论逐条核对。' } });
      }
      return jsonResponse({ data:{ summary:'' } });
    }

    if (url.pathname.includes('/api/reviews/school/')) {
      return jsonResponse({
        data:{
          data:reviews,
          page:1,
          pageSize:6,
          total:6,
          totalPages:1
        }
      });
    }

    if (url.pathname.startsWith('/api/schools/')) {
      const school = decodeURIComponent(url.pathname.split('/').at(-1));
      const withSummary = school === '沈阳建筑大学';
      return jsonResponse({ data:{
        id:withSummary ? 27032 : 99001,
        name:school,
        slug:school,
        province:'辽宁省',
        city:'沈阳市',
        type:'普通本科',
        review_count:6
      } });
    }

    throw new Error(`unexpected fetch ${url}`);
  };

  const summaryResponse = await onRequest({
    request:new Request('https://gaokao.test/api/tongxue-summary?scope=school&school=%E6%B2%88%E9%98%B3%E5%BB%BA%E7%AD%91%E5%A4%A7%E5%AD%A6&page=1')
  });
  assert.equal(summaryResponse.status, 200);
  const summaryBody = await summaryResponse.json();
  assert.equal(summaryBody.mode, 'ai_summary');
  assert.match(summaryBody.summary, /课程实验/);
  assert.ok(Array.isArray(summaryBody.studentEvidence));
  assert.ok(summaryBody.studentEvidence.length >= 3 && summaryBody.studentEvidence.length <= 5);
  assert.ok(summaryBody.studentEvidence.every((item) => item.content && item.reason && item.categoryLabel));
  assert.ok(summaryBody.studentEvidence.every((item) => item.evidenceScope === 'school'));
  assert.ok(summaryBody.studentEvidence.every((item) => item.schoolSourceId === 27032));
  assert.ok(summaryBody.studentEvidence.every((item) => item.sourceUrl));
  assert.ok(summaryBody.studentEvidence.some((item) => item.category === 'employment'));
  assert.ok(summaryBody.studentEvidence.some((item) => item.category === 'workload'));
  assert.equal(summaryBody.evidence.sourceSummary, true);
  assert.equal(summaryBody.evidence.matchCount, summaryBody.studentEvidence.length);
  assert.ok(calls.some((url) => url.includes('/api/reviews/school/27032')), 'summary path must still fetch real reviews');

  calls.length = 0;
  const noSummaryResponse = await onRequest({
    request:new Request('https://gaokao.test/api/tongxue-summary?scope=school&school=%E6%97%A0%E6%91%98%E8%A6%81%E5%A4%A7%E5%AD%A6&page=1')
  });
  assert.equal(noSummaryResponse.status, 200);
  const noSummaryBody = await noSummaryResponse.json();
  assert.equal(noSummaryBody.mode, 'recent_reviews');
  assert.equal(noSummaryBody.summary, null);
  assert.ok(noSummaryBody.reviews.length >= 3);
  assert.ok(noSummaryBody.reviews.every((item) => item.evidenceScope === 'school'));
  assert.ok(calls.some((url) => url.includes('/api/reviews/school/99001')), 'no-summary path must expose raw reviews');

  const unsupported = await onRequest({
    request:new Request('https://gaokao.test/api/tongxue-summary?scope=school_major&school=%E6%B2%88%E9%98%B3%E5%BB%BA%E7%AD%91%E5%A4%A7%E5%AD%A6&majorCode=080601&major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B%E5%8F%8A%E5%85%B6%E8%87%AA%E5%8A%A8%E5%8C%96')
  });
  assert.equal(unsupported.status, 422);
  const unsupportedBody = await unsupported.json();
  assert.equal(unsupportedBody.error, 'school_major_source_binding_unavailable');

  console.log(JSON.stringify({
    ok:true,
    summaryEvidenceCount:summaryBody.studentEvidence.length,
    summaryEvidenceCategories:summaryBody.studentEvidence.map((item) => item.category),
    noSummaryRawCount:noSummaryBody.reviews.length,
    schoolMajorFailClosed:true
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
