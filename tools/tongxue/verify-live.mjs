import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const summarySchools = splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']);
const reviewFallbackSchools = splitEnv('EXPECTED_REVIEW_FALLBACK_SCHOOLS', ['辽宁大学', '辽宁科技大学']);
const artifactDir = '/tmp/tongxue-live-artifact';
await mkdir(artifactDir, { recursive: true });

const entitySource=await readFile('tongxue/data/school-entities-v130.js','utf8');
const summaryBase=await readFile('functions/_lib/tongxue-summary-base-v112.js','utf8');
const summaryWrapper=(await readFile('functions/api/tongxue-summary.js','utf8')).replace("'../_lib/tongxue-summary-base-v112.js'","'./tongxue-summary-base-v112.mjs'").replace("'../../tongxue/data/school-entities-v130.js'","'./school-entities-v130.mjs'");
await writeFile('/tmp/school-entities-v130.mjs',entitySource);
await writeFile('/tmp/tongxue-summary-base-v112.mjs',summaryBase);
await writeFile('/tmp/tongxue-summary.mjs',summaryWrapper);
const { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);
const nativeFetch = globalThis.fetch.bind(globalThis);
const nativeCaches = globalThis.caches;
const failures = [];
const functionResults = [];

for (const school of summarySchools) {
  const row = await invokeFunction(school, 1);
  functionResults.push(row);
  const summaryPassed = row.status === 200
    && row.ok
    && row.mode === 'ai_summary'
    && row.version === 'v1.3.0'
    && row.summaryLength >= 40
    && row.reviewCount === 0
    && row.serverTiming.includes('total;dur=');
  const reviewsPassed = row.status === 200
    && row.ok
    && row.mode === 'recent_reviews'
    && row.version === 'v1.3.0'
    && row.summaryLength === 0
    && row.reviewCount >= 1
    && row.reviewCount <= 6
    && row.reviews.every(isValidReview)
    && isNewestFirst(row.reviews)
    && Number(row.pagination?.total || 0) >= row.reviewCount
    && row.serverTiming.includes('total;dur=');
  if (!summaryPassed && !reviewsPassed) failures.push(`公开内容模式失败：${school} -> ${JSON.stringify(row)}`);
}

for (const school of reviewFallbackSchools) {
  const firstPage = await invokeFunction(school, 1);
  functionResults.push(firstPage);
  const reviewsPassed = firstPage.status === 200
    && firstPage.ok
    && firstPage.mode === 'recent_reviews'
    && firstPage.version === 'v1.3.0'
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
if (!mockResults.summaryRequestCountPassed) failures.push(`摘要请求数异常：${JSON.stringify(mockResults.summaryRequestCount)}`);
if (!mockResults.reviewRequestCountPassed) failures.push(`评论回退请求数异常：${JSON.stringify(mockResults.reviewRequestCount)}`);
if (!mockResults.summaryFailureReviewFallbackPassed) failures.push(`摘要故障未降级到真实评论：${JSON.stringify(mockResults.summaryFailureReviewFallback)}`);
if (!mockResults.summaryFailureEmptyReviewsPassed) failures.push(`摘要故障下错误宣称无内容：${JSON.stringify(mockResults.summaryFailureEmptyReviews)}`);
if (!mockResults.fallbackPassed) failures.push(`备用域回退失败：${JSON.stringify(mockResults.fallback)}`);
if (!mockResults.edgeCachePassed) failures.push(`边缘缓存测试失败：${JSON.stringify(mockResults.edgeCache)}`);

globalThis.fetch = nativeFetch;
if (nativeCaches === undefined) delete globalThis.caches;
else globalThis.caches = nativeCaches;

const html = await readFile('tongxue/index.html', 'utf8');
const runtime = await readFile('tongxue/app/tongxue-performance-v112.js', 'utf8');
const runtime113 = await readFile('tongxue/app/tongxue-performance-v113.js', 'utf8');
const shareRuntime = await readFile('tongxue/share/tongxue-share-v113.js', 'utf8');
const copyLock = [
  '输入学校名，看看公开评价里常提到的校园生活、学习氛围和就业感受。',
  '简称和轻微错别字也能识别。',
  '查看学校体验',
  '来源站整理的主要观点',
  '近期公开评论',
  '来源站当前未提供 AI 摘要',
  '来源站暂时没有可展示内容',
  '这不代表学校没有学生评价',
  '数据来源与技术信息',
  '技术诊断（供排查）'
];
const htmlChecks = {
  version113: html.includes('同学你好 v1.1.3') && runtime.includes("const PAGE_VERSION='v1.1.2'") && runtime113.includes("pageVersion: 'v1.1.3'"),
  noDefaultSchool: !/<input[^>]*id=["']school["'][^>]*value=["'][^"']+/i.test(html),
  copyLocked: copyLock.every((text) => html.includes(text) || runtime.includes(text)),
  externalRuntime: html.includes('<script type="module" src="/tongxue-performance-v113.js"></script>') && runtime113.includes('/tongxue-performance-v112.js?v=113') && !html.includes('<script type="module">'),
  hasShareWorkflow: shareRuntime.includes('生成分享图') && shareRuntime.includes('navigator.share') && shareRuntime.includes('完整评论长图'),
  oneCatalogLoad: runtime.includes('loadSchoolCatalog') && !runtime.includes('loadSchoolMetadata') && !runtime.includes('school-name-index.generated.json'),
  hasAbortAndSessionCache: runtime.includes('AbortController') && runtime.includes('experienceCache') && runtime.includes('inflightExperience'),
  incrementalReviews: runtime.includes('appendReviewCards') && runtime.includes("grid.append(template.content)") && !runtime.includes('renderActiveReviews();announce'),
  lazyReviewLayout: html.includes('content-visibility:auto') && html.includes('contain-intrinsic-size:320px'),
  browserAllowsCache: runtime.includes("cache:'default'") && !runtime.includes("cache:'no-store'"),
  hasAccessibilitySupport: runtime.includes('aria-activedescendant') && html.includes('liveStatus') && html.includes('prefers-reduced-motion'),
  usesRealButtonsForRetry: runtime.includes('class="action-button"') && !runtime.includes('href="#" data-retry'),
  escapesReviewContent: runtime.includes('escapeHtml(content)'),
  noBrowserJina: !runtime.includes('r.jina.ai') && !runtime.includes('JINA_API_KEY'),
  noObjectArtifacts: !runtime.includes('[object Object]')
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

async function invokeFunction(school, page, { refresh = false } = {}) {
  const url = new URL('https://verification.invalid/api/tongxue-summary');
  url.searchParams.set('school', school);
  url.searchParams.set('page', String(page));
  if (refresh) url.searchParams.set('refresh', '1');
  const request = new Request(url, { method: 'GET', headers: { accept: 'application/json' } });
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
    cacheStatus: response?.headers.get('x-tongxue-cache') || '',
    serverTiming: response?.headers.get('server-timing') || '',
    thrown
  };
}

async function runMockCases() {
  const cases = {};

  let fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试无内容大学$/.test(pathname)) return jsonResponse({ id:900, name:'测试无内容大学', slug:'测试无内容大学', review_count:0 });
    if (/\/api\/schools\/900\/ai-summary$/.test(pathname)) return jsonResponse({ summary:null });
    if (/\/api\/reviews\/school\/900$/.test(pathname)) return jsonResponse({ total:0, page:1, pageSize:6, totalPages:0, data:[] });
    return jsonResponse({ error:'mock_not_found', pathname }, 404);
  };
  cases.noContent = await invokeFunction('测试无内容大学', 1, { refresh:true });
  cases.noContentFetchCount = fetchCount;

  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试清洗大学$/.test(pathname)) return jsonResponse({ id:901, name:'测试清洗大学', slug:'测试清洗大学', review_count:1 });
    if (/\/api\/schools\/901\/ai-summary$/.test(pathname)) return jsonResponse({ summary:null });
    if (/\/api\/reviews\/school\/901$/.test(pathname)) return jsonResponse({ total:1, page:1, pageSize:6, totalPages:1, data:[{ id:1, content:'<script>alert(1)</script>真实评论内容', display_name:'<b>匿名用户</b>', is_anonymous:1, is_verified:1, created_at:'2026-07-18 12:30:00', campus_name:'<i>主校区</i>', like_count:2, reply_count:1, rating:{ dormitory:4, cafeteria:3, faculty:4, environment:4, culture:3, employment:4, safety:5 } }] });
    return jsonResponse({ error:'mock_not_found', pathname }, 404);
  };
  cases.sanitization = await invokeFunction('测试清洗大学', 1, { refresh:true });
  cases.sanitizationFetchCount = fetchCount;

  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试摘要大学$/.test(pathname)) return jsonResponse({ id:902, name:'测试摘要大学', slug:'测试摘要大学', review_count:10 });
    if (/\/api\/schools\/902\/ai-summary$/.test(pathname)) return jsonResponse({ summary:'测试摘要大学的公开评论形成了足够长的摘要内容，用于确认正常链路只需要学校详情和摘要两次来源请求。' });
    return jsonResponse({}, 404);
  };
  cases.summaryRequestCount = await invokeFunction('测试摘要大学', 1, { refresh:true });
  cases.summaryRequestCount.fetchCount = fetchCount;

  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试评论大学$/.test(pathname)) return jsonResponse({ id:903, name:'测试评论大学', slug:'测试评论大学', review_count:1 });
    if (/\/api\/schools\/903\/ai-summary$/.test(pathname)) return jsonResponse({ summary:null });
    if (/\/api\/reviews\/school\/903$/.test(pathname)) return jsonResponse({ total:1, page:1, pageSize:6, totalPages:1, data:[{ id:3, content:'这是用于验证三次请求评论回退路径的公开评论。', display_name:'匿名同学', is_anonymous:1, created_at:'2026-07-18 12:30:00' }] });
    return jsonResponse({}, 404);
  };
  cases.reviewRequestCount = await invokeFunction('测试评论大学', 1, { refresh:true });
  cases.reviewRequestCount.fetchCount = fetchCount;

  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试摘要故障评论大学$/.test(pathname)) return jsonResponse({ id:906, name:'测试摘要故障评论大学', slug:'测试摘要故障评论大学', review_count:1 });
    if (/\/api\/schools\/906\/ai-summary$/.test(pathname)) return new Response('upstream unavailable', { status:503, headers:{ 'content-type':'text/plain' } });
    if (/\/api\/reviews\/school\/906$/.test(pathname)) return jsonResponse({ total:1, page:1, pageSize:6, totalPages:1, data:[{ id:6, content:'摘要接口故障时仍应返回这条真实评论。', display_name:'匿名同学', is_anonymous:1, created_at:'2026-07-19 12:30:00' }] });
    return jsonResponse({}, 404);
  };
  cases.summaryFailureReviewFallback = await invokeFunction('测试摘要故障评论大学', 1, { refresh:true });
  cases.summaryFailureReviewFallback.fetchCount = fetchCount;

  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试摘要故障空评论大学$/.test(pathname)) return jsonResponse({ id:907, name:'测试摘要故障空评论大学', slug:'测试摘要故障空评论大学', review_count:0 });
    if (/\/api\/schools\/907\/ai-summary$/.test(pathname)) return new Response('upstream unavailable', { status:503, headers:{ 'content-type':'text/plain' } });
    if (/\/api\/reviews\/school\/907$/.test(pathname)) return jsonResponse({ total:0, page:1, pageSize:6, totalPages:0, data:[] });
    return jsonResponse({}, 404);
  };
  cases.summaryFailureEmptyReviews = await invokeFunction('测试摘要故障空评论大学', 1, { refresh:true });
  cases.summaryFailureEmptyReviews.fetchCount = fetchCount;

  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const url = new URL(typeof input === 'string' ? input : input.url);
    const pathname = decodeURIComponent(url.pathname);
    if (url.hostname === 'eo.srgaoxiao.com') return new Response('temporary unavailable', { status:503, headers:{ 'content-type':'text/plain' } });
    if (/\/api\/schools\/测试备用大学$/.test(pathname)) return jsonResponse({ id:904, name:'测试备用大学', slug:'测试备用大学', review_count:10 });
    if (/\/api\/schools\/904\/ai-summary$/.test(pathname)) return jsonResponse({ summary:'测试备用大学通过备用来源域成功返回足够长的摘要，用于验证主域异常时才会进行回退。' });
    return jsonResponse({}, 404);
  };
  cases.fallback = await invokeFunction('测试备用大学', 1, { refresh:true });
  cases.fallback.fetchCount = fetchCount;

  const memoryCache = createMemoryCache();
  globalThis.caches = { default:memoryCache };
  fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const pathname = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname);
    if (/\/api\/schools\/测试缓存大学$/.test(pathname)) return jsonResponse({ id:905, name:'测试缓存大学', slug:'测试缓存大学', review_count:10 });
    if (/\/api\/schools\/905\/ai-summary$/.test(pathname)) return jsonResponse({ summary:'测试缓存大学返回足够长的摘要，用于验证第二次相同查询直接命中边缘缓存且不再请求来源。' });
    return jsonResponse({}, 404);
  };
  const cacheFirst = await invokeFunction('测试缓存大学', 1);
  const cacheSecond = await invokeFunction('测试缓存大学', 1);
  cases.edgeCache = { first:cacheFirst, second:cacheSecond, fetchCount, stored:memoryCache.size() };

  const sanitizedReview = cases.sanitization.reviews[0] || {};
  return {
    ...cases,
    noContentPassed: cases.noContent.status === 200 && cases.noContent.ok && cases.noContent.mode === 'no_content' && cases.noContent.reviewCount === 0 && cases.noContentFetchCount === 3,
    sanitizationPassed: cases.sanitization.status === 200 && cases.sanitization.ok && cases.sanitization.mode === 'recent_reviews' && cases.sanitization.reviewCount === 1 && sanitizedReview.content === '真实评论内容' && sanitizedReview.authorLabel === '匿名用户' && sanitizedReview.campus === '主校区' && !sanitizedReview.content.includes('<script>') && Number(sanitizedReview.rating?.overall) >= 0 && Number(sanitizedReview.rating?.overall) <= 5,
    summaryRequestCountPassed: cases.summaryRequestCount.ok && cases.summaryRequestCount.mode === 'ai_summary' && cases.summaryRequestCount.fetchCount === 2,
    reviewRequestCountPassed: cases.reviewRequestCount.ok && cases.reviewRequestCount.mode === 'recent_reviews' && cases.reviewRequestCount.fetchCount === 3,
    summaryFailureReviewFallbackPassed: cases.summaryFailureReviewFallback.status === 200 && cases.summaryFailureReviewFallback.ok && cases.summaryFailureReviewFallback.mode === 'recent_reviews' && cases.summaryFailureReviewFallback.reviewCount === 1 && cases.summaryFailureReviewFallback.fetchCount === 3,
    summaryFailureEmptyReviewsPassed: cases.summaryFailureEmptyReviews.status === 502 && !cases.summaryFailureEmptyReviews.ok && cases.summaryFailureEmptyReviews.mode === 'source_unavailable' && cases.summaryFailureEmptyReviews.error === 'summary_api_unavailable' && cases.summaryFailureEmptyReviews.reviewCount === 0 && cases.summaryFailureEmptyReviews.fetchCount === 6,
    fallbackPassed: cases.fallback.ok && cases.fallback.mode === 'ai_summary' && cases.fallback.fetchCount === 3,
    edgeCachePassed: cacheFirst.ok && cacheFirst.cacheStatus === 'MISS' && cacheSecond.ok && cacheSecond.cacheStatus === 'HIT' && fetchCount === 2 && memoryCache.size() === 1
  };
}

function createMemoryCache() {
  const store = new Map();
  return {
    async match(request) {
      const response = store.get(request.url);
      return response ? response.clone() : undefined;
    },
    async put(request, response) {
      store.set(request.url, response.clone());
    },
    size() { return store.size; }
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers:{ 'content-type':'application/json; charset=utf-8' } });
}
function isValidReview(review) {
  return review && String(review.content || '').trim().length >= 2 && !/<script|<style|javascript:/i.test(String(review.content || '')) && String(review.authorLabel || '').trim().length >= 1 && String(review.sourceUrl || '').startsWith('https://srgaoxiao.com/school/') && (!review.rating || (Number(review.rating.overall) >= 0 && Number(review.rating.overall) <= 5));
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
function compact(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
