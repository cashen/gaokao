import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOARD_DEFINITIONS,
  PROVINCES,
  matchesBoardFilter
} from "./lib.mjs";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const dataDir = path.join(rootDir, "public", "data");

const [mapData, companyData] = await Promise.all([
  fs.readFile(path.join(dataDir, "china.json"), "utf8").then(JSON.parse),
  fs
    .readFile(path.join(dataDir, "companies.compact.json"), "utf8")
    .then(JSON.parse)
]);

assert.equal(mapData.type, "FeatureCollection");
assert.equal(mapData.features.length, 35, "地图应包含34个省级地区及南海诸岛");
assert.equal(mapData.UTF8Encoding, false, "地图坐标应在构建时完成解码");

const mapNames = new Set(
  mapData.features.map((feature) => feature?.properties?.name)
);
for (const province of PROVINCES) {
  assert.ok(mapNames.has(province), `地图缺少 ${province}`);
}
assert.ok(mapNames.has("南海诸岛"), "地图缺少南海诸岛");

function assertFiniteCoordinates(value, featureName) {
  if (Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)) {
    const [longitude, latitude] = value;
    assert.ok(
      longitude >= 70 && longitude <= 140,
      `${featureName} 经度异常：${longitude}`
    );
    assert.ok(
      latitude >= 0 && latitude <= 60,
      `${featureName} 纬度异常：${latitude}`
    );
    return;
  }
  assert.ok(Array.isArray(value), `${featureName} 坐标结构异常`);
  for (const child of value) {
    assertFiniteCoordinates(child, featureName);
  }
}

for (const feature of mapData.features) {
  assertFiniteCoordinates(
    feature.geometry.coordinates,
    feature.properties?.name ?? "未知地区"
  );
}

assert.ok(
  companyData.companies.length >= 4_500,
  `全国上市公司数量异常：${companyData.companies.length}`
);

const codes = new Set();
const boardCounts = Object.fromEntries(
  Object.keys(BOARD_DEFINITIONS).map((key) => [key, 0])
);
const provinceCounts = Object.fromEntries(
  PROVINCES.map((province) => [province, 0])
);

for (const company of companyData.companies) {
  assert.equal(company.length, 7, `企业数据字段数量异常：${company[0]}`);
  const [code, name, province, board, industry, direction, exchange] = company;

  assert.match(code, /^\d{6}$/, `证券代码异常：${code}`);
  assert.ok(!codes.has(code), `证券代码重复：${code}`);
  assert.ok(name, `证券简称为空：${code}`);
  assert.ok(PROVINCES.includes(province), `省份无法映射：${code} ${province}`);
  assert.ok(BOARD_DEFINITIONS[board], `板块无法识别：${code} ${board}`);
  assert.ok(industry, `行业为空：${code}`);
  assert.ok(direction, `主要方向为空：${code}`);
  assert.ok(exchange, `交易所为空：${code}`);

  codes.add(code);
  boardCounts[board] += 1;
  provinceCounts[province] += 1;
}

assert.deepEqual(boardCounts, companyData.summary.boardCounts);
assert.deepEqual(provinceCounts, companyData.summary.provinceCounts);
assert.equal(
  Object.values(boardCounts).reduce((sum, value) => sum + value, 0),
  companyData.companies.length
);

for (const province of ["辽宁", "北京", "上海", "江苏", "浙江", "广东"]) {
  assert.ok(provinceCounts[province] > 0, `${province} 不应为0`);
}

for (const filter of ["all", "main", "sme", "star", "chinext", "bse"]) {
  const count = companyData.companies.filter((company) =>
    matchesBoardFilter(company[3], filter)
  ).length;
  assert.ok(count > 0, `${filter} 筛选结果不应为0`);
}

const topProvinces = Object.entries(provinceCounts)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 10);

process.stdout.write(
  `${JSON.stringify(
    {
      companyCount: companyData.companies.length,
      mapFeatureCount: mapData.features.length,
      boardCounts,
      topProvinces,
      snapshotDate: companyData.meta.snapshotDate
    },
    null,
    2
  )}\n`
);
