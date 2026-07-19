import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  createSchoolNameResolver,
  extractSchoolNames
} from '../school-name-resolver.js';

const payload = JSON.parse(await readFile('fenxi/data/school_nature.json', 'utf8'));
const names = extractSchoolNames(payload);
const resolver = createSchoolNameResolver(names);

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
checkAmbiguous('科大', '通用简称科大');
checkAmbiguous('工大', '通用简称工大');
checkAmbiguous('师大', '通用简称师大');
checkDifferent('辽宁科技大学', '辽宁科技学院');
checkDifferent('辽宁工业大学', '辽宁工程技术大学');

if (resolver.count < 500) {
  failures.push(`全站高校名单数量异常：${resolver.count}`);
}

const requiredNames = ['辽宁科技大学', '辽宁科技学院', '吉林大学', '大连理工大学', '北京航空航天大学'];
for (const name of requiredNames) {
  if (!resolver.names.includes(name)) failures.push(`高校名单缺少：${name}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  count: resolver.count,
  checks,
  failures
};
await mkdir('/tmp/tongxue-live-artifact', { recursive: true });
await writeFile('/tmp/tongxue-live-artifact/school-name-resolver-results.json', JSON.stringify(report, null, 2));
console.log(`SCHOOL_RESOLVER_RESULTS ${JSON.stringify(report)}`);
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
