import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimePath = path.join(root, 'ln-rank/js/ux/family-home.v3990_3.js');
const homePath = path.join(root, 'index.html');

const runtime = fs.readFileSync(runtimePath, 'utf8');
const home = fs.readFileSync(homePath, 'utf8');

const checks = [
  [runtime.includes("HOME_EXPERIENCE_REVISION = 'r035-home-experience-refinement'"), 'r035 experience revision is declared'],
  [runtime.includes("HOME_RUNTIME_VERSION = 'family-home-runtime-v3990_3-r035'"), 'runtime version is bumped to r035'],
  [runtime.includes("document.title = '辽宁高考｜2027专业初选与模拟志愿'"), 'browser title uses parent-facing vocabulary'],
  [runtime.includes("setPrimary(status.nextActionHref, pendingCount ? '继续整理' : '打开志愿整理')"), 'returning-state primary action uses natural wording'],
  [!runtime.includes('home-journey'), 'no duplicate hero journey is injected'],
  [home.includes('data-tool-group="mainline"'), 'mainline tool group exists in homepage markup'],
  [home.includes('data-home-simulation-entry="true"'), 'simulation volunteer remains in the mainline cards'],
  [home.includes('href="/ln-rank/simulation-report.html"'), 'simulation volunteer target remains stable'],
  [runtime.includes('.time-cell:first-child{grid-column:span 3'), 'countdown keeps day-first desktop hierarchy'],
  [runtime.includes('.time-cell:first-child{grid-column:1/-1'), 'countdown keeps day-first mobile hierarchy'],
  [runtime.includes('@media(max-width:620px)'), 'mobile refinement contract remains present']
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error('r035 homepage contract failed:');
  for (const [, label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log(`r035 homepage contract passed (${checks.length} checks).`);
