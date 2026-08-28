#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
const samples = [
  { school: '辽宁石油化工大学', major: '油气储运工程', expect: /本校方向|背景|石油化工储运/ },
  { school: '沈阳工程学院', major: '电气工程及其自动化', expect: /本校方向|背景|能源电力/ },
  { school: '大连交通大学', major: '机械工程', expect: /本校方向|本校相关|轨道交通/ },
  { school: '沈阳农业大学', major: '机械设计制造及其自动化', expect: /方向提醒|农机/ },
  { school: '沈阳化工大学', major: '自动化', expect: /本校相关|方向提醒|化工/ },
  { school: '沈阳工业大学', major: '电气工程及其自动化', expect: /本校方向|装备|电机/ },
  { school: '辽宁科技大学', major: '自动化', expect: /本校相关|方向提醒|冶金/ },
  { school: '沈阳建筑大学', major: '土木工程', expect: /本校方向|建筑/ },
  { school: '沈阳药科大学', major: '药学', expect: /本校方向|药学/ },
  { school: '东北财经大学', major: '金融学', expect: /本校方向|财经/ },
];
const negativeSamples = [
  { school: '上海大学', major: '法学' },
  { school: '中国海洋大学', major: '法学' },
  { school: '华北电力大学', major: '电气工程及其自动化' },
  { school: '西南交通大学', major: '机械工程' },
];
function pathToFileURL(p){ let url = path.resolve(p).replaceAll('\\','/'); if (!url.startsWith('/')) url='/' + url; return new URL('file://' + url); }
function assert(condition, message){ if (!condition) failures.push(message); }
const { getLocalContextPresentation, safeGetLocalContextPresentation } = await import(pathToFileURL(path.join(lr, 'js/knowledge/local-context-resolver.js')).href + `?audit=${q}`);
const { matchLiaoningLocalStrongChain } = await import(pathToFileURL(path.join(lr, 'js/knowledge/liaoning-local-strong-chain.js')).href + `?audit=${q}`);
const { matchLiaoningMajorTrajectory } = await import(pathToFileURL(path.join(lr, 'js/knowledge/liaoning-major-trajectory-chain.js')).href + `?audit=${q}`);
for (const record of samples) {
  for (const surface of ['card','selectionItem','summary','report']) {
    try {
      const view = getLocalContextPresentation(record, surface);
      assert(view && view.matched, `${record.school} · ${record.major}: ${surface} no match`);
      if (surface === 'card') assert(!view.fullTextAllowed && Array.isArray(view.items) && view.items.length <= 1, `${record.school}: card density broken`);
      if (surface === 'selectionItem') assert(/再看/.test(view.text || ''), `${record.school}: selection chip missing 再看`);
    } catch (e) { failures.push(`${record.school} · ${record.major}: ${surface} throws ${e.message}`); }
  }
  const card = safeGetLocalContextPresentation(record, 'card');
  assert(card?.text && record.expect.test(card.text), `${record.school} · ${record.major}: unexpected card text ${card?.text || 'null'}`);
  assert(matchLiaoningLocalStrongChain(record) || matchLiaoningMajorTrajectory(record), `${record.school} · ${record.major}: raw match failed`);
}
for (const record of negativeSamples) {
  try {
    const strong = matchLiaoningLocalStrongChain(record);
    const traj = matchLiaoningMajorTrajectory(record);
    assert(!strong && !traj, `${record.school} · ${record.major}: false positive local context`);
  } catch (e) { failures.push(`${record.school}: negative sample throws ${e.message}`); }
}
const exact = safeGetLocalContextPresentation({ school: '沈阳农业大学', major: '自动化' }, 'card');
assert(exact?.text, '沈阳农业大学 · 自动化 should not throw and should match explicitly as its own rule');
const report = { version: assets.version, assetVersion: assets.assetVersion, runtimeSamples: samples.length, negativeSamples: negativeSamples.length, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `local-context-runtime-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
