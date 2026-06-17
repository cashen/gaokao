#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
const mod = await import(pathToFileURL(path.join(lr, 'js/knowledge/local-background-hint.js')).href);
function fail(name, ok, detail='') { if (!ok) failures.push(`${name}${detail ? ': ' + detail : ''}`); }
function hint(record){ return mod.getLocalBackgroundHint(record); }
const sh = hint({school:'沈阳航空航天大学', province:'辽宁', city:'沈阳', major:'航空智能制造技术'});
fail('沈航航空智能制造技术 has human hint', sh.visible === true, JSON.stringify(sh));
fail('沈航航空智能制造技术 is related not over-strong', sh.label === '本校相关' && sh.direction === '航空制造', JSON.stringify(sh));
fail('沈航航空智能制造技术 has review points', Array.isArray(sh.reviewPoints) && sh.reviewPoints.includes('培养学院'), JSON.stringify(sh));
const sugon = hint({school:'沈阳航空航天大学', province:'辽宁', city:'沈阳', major:'飞行器制造工程'});
fail('沈航飞行器制造工程 remains primary', sugon.visible === true && sugon.label === '本校方向', JSON.stringify(sugon));
const sygy = hint({school:'沈阳工业大学', province:'辽宁', city:'沈阳', major:'电气工程及其自动化'});
fail('沈阳工业大学电气 has background', sygy.visible === true && /本校/.test(sygy.label), JSON.stringify(sygy));
const outside = hint({school:'上海大学', province:'上海', city:'上海', major:'自动化'});
fail('外省学校不显示省内背景', outside.visible === false, JSON.stringify(outside));
const qhd = hint({school:'东北大学秦皇岛分校', province:'河北', city:'秦皇岛', major:'自动化'});
fail('东北大学秦皇岛不套用辽宁省内背景', qhd.visible === false, JSON.stringify(qhd));
const noEvidence = hint({school:'辽宁师范大学', province:'辽宁', city:'大连', major:'汉语言文学'});
fail('无明确专业证据不强行显示', noEvidence.visible === false, JSON.stringify(noEvidence));
const report = { version: assets.version, assetVersion: assets.assetVersion, samples: { sh, sugon, sygy, outside, qhd, noEvidence }, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `local-background-hint-layer-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
