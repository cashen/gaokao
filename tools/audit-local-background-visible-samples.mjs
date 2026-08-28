#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const { getLocalBackgroundHint } = await import(pathToFileURL(path.join(lr, 'js/knowledge/local-background-hint.js')).href);
const samples = [
  ['沈阳航空航天大学','航空智能制造技术', true, '本校相关'],
  ['沈阳航空航天大学','飞行器制造工程', true, '本校方向'],
  ['沈阳工业大学','电气工程及其自动化', true, null],
  ['大连交通大学','车辆工程', true, null],
  ['辽宁石油化工大学','油气储运工程', true, null],
  ['沈阳药科大学','药学', true, null],
  ['东北大学秦皇岛分校','自动化', false, null],
  ['上海大学','自动化', false, null]
];
const failures = [];
const results = [];
for (const [school, major, expectedVisible, expectedLabel] of samples) {
  const record = { school, major, province: /上海/.test(school) ? '上海' : /秦皇岛/.test(school) ? '河北' : '辽宁' };
  const res = getLocalBackgroundHint(record);
  results.push({ school, major, result: res });
  if (Boolean(res.visible) !== expectedVisible) failures.push(`${school}|${major}: visible ${res.visible} != ${expectedVisible}`);
  if (expectedLabel && res.label !== expectedLabel) failures.push(`${school}|${major}: label ${res.label} != ${expectedLabel}`);
}
const report = { version: assets.version, assetVersion: assets.assetVersion, results, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `local-background-visible-samples-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
