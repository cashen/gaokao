import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const summarySchools = splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']);
const reviewFallbackSchools = splitEnv('EXPECTED_REVIEW_FALLBACK_SCHOOLS', ['辽宁大学', '辽宁科技大学']);
const artifactDir = '/tmp/tongxue-live-artifact';
await mkdir(artifactDir, { recursive: true });

await cp('functions/api/tongxue-summary.js', '/tmp/tongxue-summary.mjs');
const { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);
const nativeFetch = globalThis.fetch.bind(globalThis);
const failures = [];
const functionResults = [];

for (const school of summarySchools) {
  const row = await invokeFunction(school, 1);
  functionResults.push(row);
  const passed = row.status === 200
    && row.ok
    && row.mode === 'ai_summary'
    && row.version === 'v1.1.0'
    && row.summaryLength >= 40
    && row.reviewCount === 0;
  if (!passed) failures.push(`AI 摘要模式失败：${school} -> ${JSON.stringify(row)}`);
}

for (const school of reviewFallbackSchools) {
  const firstPage = await invokeFunction(school, 1);
  functionResults.push(firstPage);

  const reviewsPassed = firstPage.status === 200
    && firstPage.ok
    && firstPage.mode === 'recent_reviews'
    && firstPage.version === 'v1.1.0'
    && firstPage.summaryLength === 0
    && firstPage.reviewCount >= 1
    && firstPage.reviewCount <= 6
    && firstPage.reviews.every(isValidReview)
    && isNewestFirst(firstPage.reviews)
    && Number(firstPage.pagination?.total || 0) >= firstPage.reviewCount;

  if (!reviewsPassed) failures.push(`近期评论模式失败：${school} -> ${JSON.stringify(firstPage)}`);

  if (firstPage.pagination?.hasMore) {
    const secondPage = await invokeFunction(school, Number(firstPage.pagination.page || 1) + 1);
    functionResults.push(secondPage);
    const firstIds = new Set(firstPage.reviews.map((item) => String(item.id)));
    const pagePassed = secondPage.status === 200
      && secondPage.ok
      && secondPage.mode === 'recent_reviews'
      && secondPage.reviewCount >= 1
      && secondPage.reviews.every(isValidReview)
      && isNewestFirst(secondPage.reviews)
      && secondPage.reviews.every((item) => !firstIds.has(String(item.id)));
    if (!pagePassed) failures.push(`近期评论翻页失败：${school} -> ${JSON.stringify(secondPage)}`);
  }
}

const mockResults = await runMockCases();
if (!mockResults.noContentPassed) failures.push(`无摘要且无评论状态失败：${JSON.stringify(mockResults.noContent)}`);
if (!mockResults.sanitizationPassed) failures.push(`评论清洗/XSS 测试失败：${JSON.stringify(mockResults.sanitization)}`);

globalThis.fetch = nativeFetch;

const html = await readFile('tongxue.html', 'utf8');
const htmlChecks = {
  version110: html.includes("const PAGE_VERSION='v1.1.0'") && html.includes('同学你好 v1.1.0'),
  noDefaultSchool: !/<input[^>]*id=["']school["'][^>]*value=["'][^"']+/i.test(html),
  hasReviewCards: html.includes('review-grid') && html.includes('review-card') && html.includes('renderReviewsResult'),
  hasLoadMore: html.includes('loadMoreReviews') && html.includes('加载更多近期评论'),
  hasNoContentState: html.includes('renderNoContent') && html.includes('该校暂时没有可展示的公开评论'),
  escapesReviewContent: html.includes('escapeHtml(content)'),
  noBrowserJina: !html.includes('r.jina.ai') && !html.includes('JINA_API_KEY'),
  noObjectArtifacts: !html.includes('[object Object]')
};
const failedHtmlChecks = Object.entries(htmlChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (failedHtmlChecks.length) failures.push(`页面检查失败：${failedHtmlChecks.join(', ')}`);

const report = {
  generatedAt: new Date().toISOString(),
  summarySchools,
  reviewFallbackSchools,
  failures,
  htmlChecks,
  mockResults,
  functionResults
};
await writeFile(path.join(artifactDir, 'tongxue-live-results.json'), JSON.stringify(report, null, 2));

for (const row of functionResults) console.log(`FUNCTION_RESULT ${JSON.stringify(row)}`);
console.log(`MOCK_RESULTS ${JSON.stringify(mockResults)}`);
console.log(`HTML_CHECKS ${JSON.stringify(htmlChecks)}`);
console.log(`VERIFICATION_SUMMARY ${JSON.stringify({ failures })}`);
if (failures.length) process.exitCode = 1;

async function invokeFunction(school, page) {
  const request = new Request(`https://verification.invalid/api/tongxue-summary?school=${encodeURIComponent(school)}&page=${page}`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  let response;
  let payload = {};
  let thrown = '';
  try {
    response = await onRequest({ request, env: {} });
    const raw = await response.text();
    try { payload = JSON.parse(raw); }
    catch { payload = { raw: compact(raw).slice(0, 800) }; }
  } catch (error) {
    thrown = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error);
  }

  const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
  return {
    school,
    requestedPage: page,
    status: response?.status ?? null,
    ok: Boolean(payload?.ok),
    mode: payload?.mode || null,
    error: payload?.error || null,
    message: payload?.message || null,
    version: payload?.version || null,
    schoolId: payload?.schoolMeta?.id ?? null,
    canonicalName: payload?.school || payload?.schoolMeta?.name || null,
    summaryLength: typeof payload?.summary === 'string' ? payload.summary.length : 0,
    summaryPreview: typeof payload?.summary === 'string' ? compact(payload.summary).slice(0, 300) : '',
    reviewCount: reviews.length,
    reviews: reviews.map((review) => ({
      id: review.id,
      content: compact(review.content).slice(0, 260),
      authorLabel: review.authorLabel,
      createdAt: review.createdAt,
      campus: review.campus,
      isVerified: review.isVerified,
      isQuestion: review.isQuestion,
      likes: review.likes,
      replies: review.replies,
      rating: review.rating,
      sourceUrl: review.sourceUrl
    })),
    pagination: payload?.reviewPagination || null,
    transport: payload?.transport || null,
    diagnostics: payload?.diagnostics || null,
    thrown
  };
}

async function runMockCases() {
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const pathname = decodeURIComponent(url.pathname);

    if (/\/api\/schools\/测试无内容大学$/.test(pathname)) {
      return jsonResponse({ id: 900, name: '测试无内容大学', slug: '测试无内容大学', review_count: 0 });
    }
    if (/\/api\/schools\/测试清洗大学$/.test(pathname)) {
      return jsonResponse({ id: 901, name: '测试清洗大学', slug: '测试清洗大学', review_count: 1 });
    }
    if (/\/api\/schools\/(900|901)\/ai-summary$/.test(pathname)) {
      return jsonResponse({ summary: null });
    }
    if (/\/api\/reviews\/school\/900$/.test(pathname)) {
      return jsonResponse({ total: 0, page: 1, pageSize: 6, totalPages: 0, data: [] });
    }
    if (/\/api\/reviews\/school\/901$/.test(pathname)) {
      return jsonResponse({
        total: 1,
        page: 1,
        pageSize: 6,
        totalPages: 1,
        data: [{
          id: 1,
          content: '<script>alert(1)</script>真实评论内容',
          display_name: '<b>匿名用户</b>',
          is_anonymous: 1,
          is_verified: 1,
          created_at: '2026-07-18 12:30:00',
          campus_name: '<i>主校区</i>',
          like_count: 2,
          reply_count: 1,
          rating: { dormitory: 4, cafeteria: 3, faculty: 4, environment: 4, culture: 3, employment: 4, safety: 5 }
        }]
      });
    }
    return jsonResponse({ error: 'mock_not_found', pathname }, 404);
  };

  const noContent = await invokeFunction('测试无内容大学', 1);
  const sanitization = await invokeFunction('测试清洗大学', 1);
  const sanitizedReview = sanitization.reviews[0] || {};

  return {
    noContent,
    sanitization,
    noContentPassed: noContent.status === 200
      && noContent.ok
      && noContent.mode === 'no_content'
      && noContent.reviewCount === 0,
    sanitizationPassed: sanitization.status === 200
      && sanitization.ok
      && sanitization.mode === 'recent_reviews'
      && sanitization.reviewCount === 1
      && sanitizedReview.content === '真实评论内容'
      && sanitizedReview.authorLabel === '匿名用户'
      && sanitizedReview.campus === '主校区'
      && !sanitizedReview.content.includes('<script>')
      && Number(sanitizedReview.rating?.overall) >= 0
      && Number(sanitizedReview.rating?.overall) <= 5
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function isValidReview(review) {
  return review
    && String(review.content || '').trim().length >= 2
    && !/<script|<style|javascript:/i.test(String(review.content || ''))
    && String(review.authorLabel || '').trim().length >= 1
    && String(review.sourceUrl || '').startsWith('https://srgaoxiao.com/school/')
    && (!review.rating || (Number(review.rating.overall) >= 0 && Number(review.rating.overall) <= 5));
}

function isNewestFirst(reviews) {
  const times = reviews.map((review) => new Date(review.createdAt || 0).getTime());
  if (times.some((time) => Number.isNaN(time))) return false;
  return times.every((time, index) => index === 0 || times[index - 1] >= time);
}

function splitEnv(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : fallback;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
