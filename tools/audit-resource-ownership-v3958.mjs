import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

const { CURRENT_RELEASE } = await import(pathToFileURL(path.join(root, 'shared/resources/release/current-release.js')));
const { LN_RANK_RELEASE_CONTRACT, RELEASE_CONTRACT } = await import(pathToFileURL(path.join(root, 'functions/_lib/release-contract.js')));
const { FEISHU_REPORT_CONTRACT } = await import(pathToFileURL(path.join(root, 'shared/resources/reports/feishu-report-contract.js')));
const { LN_RANK_VERSION } = await import(pathToFileURL(path.join(root, 'ln-rank/js/domain/version-contract.js')));

for (const [name, value] of Object.entries({
  functions: LN_RANK_RELEASE_CONTRACT.display,
  functionsAlias: RELEASE_CONTRACT.display,
  feishu: FEISHU_REPORT_CONTRACT.releaseVersion,
  browser: LN_RANK_VERSION.display
})) check(value === CURRENT_RELEASE.display, `${name} 版本未读取 current-release：${value}`);
check(LN_RANK_RELEASE_CONTRACT === RELEASE_CONTRACT, 'release-contract 双导出没有指向同一个对象');
check(FEISHU_REPORT_CONTRACT.assetVersion === CURRENT_RELEASE.assetVersion, '飞书资源版本未同步');

for (const rel of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
  const payload = json(rel);
  check(payload.version === CURRENT_RELEASE.display, `${rel} version 未同步`);
  check(payload.assetVersion === CURRENT_RELEASE.assetVersion, `${rel} assetVersion 未同步`);
}

const entityCompat150 = read('tongxue/data/school-entities-v150.js');
const entityCompat130 = read('tongxue/data/school-entities-v130.js');
check(entityCompat150.includes("shared/resources/schools/school-identity-center.js"), 'Tongxue v150 未使用共享学校身份中心');
check(entityCompat130.includes("shared/resources/schools/school-identity-center.js"), 'Tongxue v130 未使用共享学校身份中心');
check(!/E\('dlut-panjin'/.test(entityCompat150), 'Tongxue v150 仍独立维护学校实体数据');
check(!/E\('dlut-panjin'/.test(entityCompat130), 'Tongxue v130 仍独立维护学校实体数据');
check(read('shared/resources/schools/school-resource-center.js').includes("from './school-identity-center.js'"), '共享学校资源中心未直接使用共享身份中心');

for (const rel of [
  'tools/schools/build-school-profile-center-v3957.py',
  'tools/tongxue/build-school-region-index-v150.py',
  'tools/tongxue/build-moe-2026-school-index.py'
]) {
  const source = read(rel);
  check(source.includes('school_resource_bundle'), `${rel} 未调用统一学校构建内核`);
  check(!source.includes('EXPECTED_COUNT = 2952'), `${rel} 仍独立维护学校总数`);
  check(!source.includes('PROVINCE_HEADER ='), `${rel} 仍独立维护教育部XLS解析规则`);
}
const workflow = read('.github/workflows/verify-ln-2026-final.yml');
check(workflow.includes('tools/schools/school_resource_bundle.py'), '主发布CI未一次性构建学校资源包');
check(!workflow.includes('python3 tools/schools/build-school-profile-center-v3957.py --xls'), '主发布CI仍调用单独学校资料构建器');

check(read('functions/_lib/school-geo-db.js').includes("shared/resources/geo/china-region-catalog.js"), '旧地域回退库未调用共享地域规则');
check(read('functions/_lib/location-normalizer.js').includes('getLiaoningAreaLabel'), '位置标准化仍独立计算辽宁地域');
check(read('functions/_lib/bottomline-policy.js').includes('resolveSchoolProfile'), '学校性质底线未优先读取共享学校资料');

for (const rel of [
  'functions/_lib/kb/catalog-accessor.js',
  'functions/_lib/standard-major-mapper.js',
  'ln-rank/js/knowledge/major-understanding-resolver.js'
]) check(read(rel).includes('major-catalog-contract.js'), `${rel} 未调用共享专业目录解析合同`);

const browserCatalog = await import(pathToFileURL(path.join(root, 'ln-rank/kb/major-understanding/major-catalog-2026.generated.js')));
const serverCatalog = await import(pathToFileURL(path.join(root, 'functions/_lib/kb/standard-major-catalog-2026-full.generated.js')));
const browserRows = browserCatalog.MAJOR_CATALOG_2026 || [];
const serverRows = serverCatalog.STANDARD_MAJOR_CATALOG_2026_FULL || [];
check(browserRows.length === 883, `浏览器专业目录应为883条，实际${browserRows.length}`);
check(serverRows.length === 883, `Functions专业目录应为883条，实际${serverRows.length}`);
const browserByCode = new Map(browserRows.map(row => [String(row.code), String(row.name)]));
const serverByCode = new Map(serverRows.map(row => [String(row.code), String(row.name)]));
for (const [code, name] of browserByCode) check(serverByCode.get(code) === name, `专业目录派生格式漂移：${code} ${name} / ${serverByCode.get(code) || '缺失'}`);

const { createMajorCatalogResolver } = await import(pathToFileURL(path.join(root, 'shared/resources/majors/major-catalog-contract.js')));
const resolver = createMajorCatalogResolver(serverRows, serverCatalog.STANDARD_MAJOR_CATEGORIES_2026_FULL || []);
for (const [input, code] of [['计算机科学与技术','080901'],['机械设计制造及其自动化(中外合作办学)','080202'],['080801','080801']]) {
  const resolved = resolver.resolve(input);
  check(resolved?.kind === 'major' && resolved.item.code === code, `共享专业解析失败：${input} -> ${resolved?.item?.code || '未匹配'}`);
}

if (errors.length) {
  console.error('RESOURCE_OWNERSHIP_AUDIT_FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  assetVersion: CURRENT_RELEASE.assetVersion,
  schoolIdentityOwner: CURRENT_RELEASE.resourceOwners.schoolIdentity,
  majorResolverVersion: resolver.contract.version,
  majorCount: resolver.count
}, null, 2));
