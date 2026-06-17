#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
function fail(name, ok, detail='') { if (!ok) failures.push(`${name}${detail ? ': ' + detail : ''}`); }
const render = fs.readFileSync(path.join(lr, 'js/feature/major-pool/render.js'), 'utf8');
const idxMajorCode = render.indexOf('${renderMajorCode(record)}');
const idxLocal = render.indexOf('${renderLocalContextInline(record)}');
const idxReview = render.indexOf('${renderReviewPoints(record)}');
const idxLink = render.indexOf('${localMainlineLink(record)}');
fail('card imports unified local background resolver', render.includes('getLocalBackgroundHint'), 'render.js should use unified resolver');
fail('background hint after major code', idxMajorCode >= 0 && idxLocal > idxMajorCode, `${idxMajorCode} -> ${idxLocal}`);
fail('background hint before review details', idxLocal >= 0 && idxReview > idxLocal, `${idxLocal} -> ${idxReview}`);
fail('省内背景 action uses same resolver', idxLink >= 0 && render.slice(render.indexOf('function localMainlineLink'), idxLink + 80).includes('getLocalBackgroundHint'), 'localMainlineLink should use getLocalBackgroundHint');
fail('分数位置 title present', render.includes('分数位置：只是当前查看分组'), 'status badge must explain it is not admission confidence');
fail('duplicate flags block removed', (render.match(/record\.flags\) && record\.flags\.length/g) || []).length <= 2, 'flags block should not duplicate visible rows');
const report = { version: assets.version, assetVersion: assets.assetVersion, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `local-background-card-order-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
