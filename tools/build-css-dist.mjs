#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
let assetVersion = process.argv[3];
if (!assetVersion) {
  const assets = JSON.parse(fs.readFileSync(path.join(projectRoot, 'active-assets.json'), 'utf8'));
  assetVersion = String(assets.assetVersion || '').replace(/^v/, '');
}
if (!assetVersion) throw new Error('missing assetVersion');
const manifestPath = path.join(projectRoot, 'css', 'css-bundle-sources.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const bundles = manifest.bundles || {};
const outputs = {
  main: `css/dist/ln-rank-main.v${assetVersion}.css`,
  selection: `css/dist/ln-rank-selection.v${assetVersion}.css`,
  trend: `css/dist/ln-rank-trend.v${assetVersion}.css`,
  selfCheck: `css/dist/ln-rank-self-check.v${assetVersion}.css`,
  localMainline: `css/dist/local-mainline.v${assetVersion}.css`,
  main211: `css/dist/211-mainline.v${assetVersion}.css`
};
const distDir = path.join(projectRoot, 'css', 'dist');
fs.mkdirSync(distDir, { recursive: true });
const report = { assetVersion: `v${assetVersion}`, generatedAt: new Date().toISOString(), source: 'css/css-bundle-sources.json', pages: [] };
for (const [bundleName, sources] of Object.entries(bundles)) {
  if (!outputs[bundleName]) throw new Error(`unknown CSS bundle ${bundleName}`);
  if (!Array.isArray(sources) || !sources.length) throw new Error(`${bundleName}: empty source list`);
  const chunks=[];
  for (const rel of sources) {
    if (!String(rel).startsWith('css/') || !String(rel).endsWith('.css')) throw new Error(`${bundleName}: invalid source ${rel}`);
    const abs=path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) throw new Error(`${bundleName}: missing source CSS ${rel}`);
    chunks.push(`\n/* =========================================================\n   SOURCE: ${rel}\n   ========================================================= */\n`);
    chunks.push(fs.readFileSync(abs,'utf8').replace(/\s*$/,'')+'\n');
  }
  const outRel = outputs[bundleName];
  const outPath = path.join(projectRoot, outRel);
  fs.writeFileSync(outPath, chunks.join('\n'), 'utf8');
  const bytes = fs.statSync(outPath).size;
  const minimum = (manifest.minimums && manifest.minimums[bundleName]) || {};
  if (minimum.sourceCount && sources.length < minimum.sourceCount) throw new Error(`${bundleName}: sourceCount ${sources.length} < ${minimum.sourceCount}`);
  if (minimum.bytes && bytes < minimum.bytes) throw new Error(`${bundleName}: bytes ${bytes} < ${minimum.bytes}`);
  const css = fs.readFileSync(outPath,'utf8');
  const required = (manifest.requiredSelectors && manifest.requiredSelectors[bundleName]) || [];
  const missing = required.filter(sel => !css.includes(sel));
  if (missing.length) throw new Error(`${bundleName}: missing required selectors ${missing.join(', ')}`);
  report.pages.push({ bundle: bundleName, dist: outRel, sourceCount: sources.length, sources, bytes, requiredSelectors: required });
}
fs.writeFileSync(path.join(projectRoot, `css-dist-report.v${assetVersion}.json`), JSON.stringify(report,null,2), 'utf8');
console.log(JSON.stringify(report,null,2));
