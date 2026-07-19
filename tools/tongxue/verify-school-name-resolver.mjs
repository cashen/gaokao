import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import {
  createSchoolNameResolver,
  extractSchoolNames,
  loadSchoolCatalog
} from '../../tongxue/data/school-name-resolver.js';

const payload = JSON.parse(await readFile('tongxue/data/school-name-index.generated.json', 'utf8'));
const searchPayload = JSON.parse(await readFile('tongxue/data/school-search-index.20260617.json', 'utf8'));
let catalogFetchCount = 0;
const catalog = await loadSchoolCatalog('/tongxue/data/school-search-index.20260617.json', async () => {
  catalogFetchCount += 1;
  return new Response(JSON.stringify(searchPayload), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
});
const resolver = catalog.resolver;
const fullResolver = createSchoolNameResolver(extractSchoolNames(payload));
const failures = [];
const checks = [];

checkResolved('辽宁科技大学', '辽宁科技大学', '正式校名');
checkResolved('辽科大', '辽宁科技大学', '简称辽科大');
checkResolved('辽宁科大', '辽宁科技大学', '简称辽宁科大');
checkResolved('吉大', '吉林大学', '简称吉大');
checkResolved('大工', '大连理工大学', '简称大工');
checkResolved('东财', '东北财经大学', '简称东财');
checkResolved('北航', '北京航空航天大学', '简称北航');
checkResolved('大连理功大学', '大连理工大学', '轻微错别字');
checkResolved('辽 宁 科 技 大 学', '辽宁科技大学', '空格标准化');
checkResolved('中国矿业大学北京', '中国矿业大学（北京）', '括号标准化');
checkAmbiguous('科大', '通用简称科大');
checkAmbiguous('工大', '通用简称工大');
checkAmbiguous('师大', '通用简称师大');
checkDifferent('辽宁科技大学', '辽宁科技学院');
checkDifferent('辽宁工业大学', '辽宁工程技术大学');

if (resolver.count !== 2952) failures.push(`精简高校数量应为 2952，实际为 ${resolver.count}`);
if (fullResolver.count !== resolver.count) failures.push('完整名单与精简索引数量不一致');
if (catalogFetchCount !== 1) failures.push(`高校目录应只请求一次，实际 ${catalogFetchCount} 次`);
if (searchPayload?.count !== 2952 || searchPayload?.schools?.length !== 2952) failures.push('精简索引数量异常');
if (payload?.scope?.undergraduateInstitutions !== 1412) failures.push('本科院校数量不是 1412');
if (payload?.scope?.higherVocationalInstitutions !== 1540) failures.push('高职（专科）院校数量不是 1540');
if (payload?.asOfDate !== '2026-06-17' || searchPayload?.asOfDate !== '2026-06-17') failures.push('名单日期异常');
if (!String(payload?.source?.xlsUrl || '').includes('W020260618307096078684.xls')) failures.push('官方 XLS 来源地址异常');

const requiredNames = ['辽宁科技大学', '辽宁科技学院', '吉林大学', '大连理工大学', '北京航空航天大学'];
for (const name of requiredNames) {
  if (!resolver.names.includes(name)) failures.push(`高校名单缺少：${name}`);
  const metadata = resolver.getMetadata(name);
  if (!metadata?.location || !metadata?.level) failures.push(`${name} 缺少搜索元数据`);
}

const fullBytes = (await stat('tongxue/data/school-name-index.generated.json')).size;
const searchBytes = (await stat('tongxue/data/school-search-index.20260617.json')).size;
if (searchBytes >= fullBytes * 0.5) failures.push(`精简索引体积未减少 50%：${searchBytes}/${fullBytes}`);

const performanceQueries = ['辽科大', '科大', '大连理功大学', '辽宁科技', '北京工业大学', '中国矿业大学北京'];
const performanceResults = [];
for (const query of performanceQueries) {
  resolver.search(query, { limit: 8 });
  const samples = [];
  for (let index = 0; index < 200; index += 1) {
    const started = globalThis.performance.now();
    resolver.search(query, { limit: 8 });
    samples.push(globalThis.performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.floor(samples.length * 0.95)];
  performanceResults.push({ query, p95Ms: Number(p95.toFixed(3)) });
  if (p95 > 16) failures.push(`${query} 搜索 P95 超过 16ms：${p95.toFixed(3)}ms`);
}

const report = {
  generatedAt: new Date().toISOString(),
  source: payload.source,
  asOfDate: payload.asOfDate,
  count: resolver.count,
  catalogFetchCount,
  fullBytes,
  searchBytes,
  reduction: Number((1 - searchBytes / fullBytes).toFixed(4)),
  performance: performanceResults,
  checks,
  failures
};
await mkdir('/tmp/tongxue-live-artifact', { recursive: true });
await writeFile('/tmp/tongxue-live-artifact/school-name-resolver-results.json', JSON.stringify(report, null, 2));
await writeFile('/tmp/tongxue-live-artifact/school-name-index.generated.json', JSON.stringify(payload, null, 2) + '\n');
await writeFile('/tmp/tongxue-live-artifact/school-search-index.20260617.json', JSON.stringify(searchPayload));
console.log(`SCHOOL_RESOLVER_RESULTS ${JSON.stringify({ count: report.count, catalogFetchCount, fullBytes, searchBytes, performance: performanceResults, failures })}`);
if (failures.length) process.exitCode = 1;

function checkResolved(input, expected, label) {
  const result = resolver.resolve(input, { limit: 10 });
  const passed = result.status === 'resolved' && result.resolvedName === expected;
  checks.push({ label, input, expected, result, passed });
  if (!passed) failures.push(`${label}失败：${input} -> ${JSON.stringify(result)}`);
}
function checkAmbiguous(input, label) {
  const result = resolver.resolve(input, { limit: 10 });
  const passed = result.status === 'ambiguous' && result.candidates.length >= 2;
  checks.push({ label, input, result, passed });
  if (!passed) failures.push(`${label}不应自动选择：${JSON.stringify(result)}`);
}
function checkDifferent(first, second) {
  const firstResult = resolver.resolve(first);
  const secondResult = resolver.resolve(second);
  const passed = firstResult.resolvedName === first && secondResult.resolvedName === second && firstResult.resolvedName !== secondResult.resolvedName;
  checks.push({ label: '相似学校防误判', first, second, firstResult, secondResult, passed });
  if (!passed) failures.push(`相似学校误判：${first} / ${second}`);
}
