import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
function read(p){ return fs.readFileSync(path.join(ROOT,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(ROOT,p)); }
function assert(ok,msg){ if(!ok) throw new Error(msg); }
function json(p){ return JSON.parse(read(p)); }

const meta = json('ln-rank/release-meta.json');
assert(meta.version === 'v3.9.13', 'release-meta version must be v3.9.13');
assert(meta.assetVersion === 'v3913', 'release-meta assetVersion must be v3913');
for (const [file, needle] of [
  ['ln-rank/index.html','版本：v3.9.13'],
  ['ln-rank/selection-pool.html','版本：v3.9.13'],
  ['ln-rank/self-check.html','v3.9.13'],
]) assert(read(file).includes(needle), `${file} visible version missing ${needle}`);
assert(read('ln-rank/index.html').includes('app.v3913.js'), 'index must use app.v3913.js');
assert(read('ln-rank/selection-pool.html').includes('selection-pool.v3913.js'), 'selection-pool must use selection-pool.v3913.js');
assert(read('ln-rank/major-trend-2025.html').includes('major-trend-render.v3913.js'), 'trend page must use major-trend-render.v3913.js');
assert(read('ln-rank/self-check.html').includes('self-check.v3913.js'), 'self-check must use self-check.v3913.js');
assert(exists('functions/_lib/fenxi-session.js'), 'functions/_lib/fenxi-session.js must exist for existing fenxi middleware dependency');

const analyze = spawnSync(process.execPath, ['tools/analyze-ln-rank-assets-v3913.mjs','--write'], { cwd: ROOT, encoding:'utf8' });
if (analyze.status !== 0) throw new Error(`asset analyzer failed:\n${analyze.stdout}\n${analyze.stderr}`);
const report = json('reports/ln-rank-asset-analysis-v3913.json');
assert(report.totals.missing === 0, `missing active assets: ${report.missing.join(', ')}`);
assert(report.totals.orphanJs === 0, `orphan JS should be 0 after prune, got ${report.totals.orphanJs}`);
assert(report.totals.orphanCss === 0, `orphan CSS should be 0 after prune, got ${report.totals.orphanCss}`);
assert(report.totals.activeJs === 50, `active JS count changed unexpectedly: ${report.totals.activeJs}`);
assert(report.totals.activeCss === 27, `active CSS count changed unexpectedly: ${report.totals.activeCss}`);

// Ensure package itself doesn't bring fenxi static/functions, but keeps fenxi-session helper.
assert(!exists('fenxi'), 'package must not contain /fenxi static directory');
assert(!exists('functions/fenxi'), 'package must not contain functions/fenxi directory');
assert(!exists('functions/_middleware.js'), 'package must not contain functions/_middleware.js');

console.log('v3.9.13 release check passed');
