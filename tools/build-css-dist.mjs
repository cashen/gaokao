#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const assetVersion = process.argv[3] || '3921_6';
const pages = [
  ['index.html', `css/dist/ln-rank-main.v${assetVersion}.css`],
  ['selection-pool.html', `css/dist/ln-rank-selection.v${assetVersion}.css`],
  ['major-trend-2025.html', `css/dist/ln-rank-trend.v${assetVersion}.css`],
  ['self-check.html', `css/dist/ln-rank-self-check.v${assetVersion}.css`]
];
const distDir = path.join(projectRoot, 'css', 'dist');
fs.mkdirSync(distDir, { recursive: true });
const report = { assetVersion: `v${assetVersion}`, generatedAt: new Date().toISOString(), pages: [] };
const linkRe = /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi;
for (const [htmlName, distRel] of pages) {
  const htmlPath = path.join(projectRoot, htmlName);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sources = [];
  for (const match of html.matchAll(linkRe)) {
    const href = match[1];
    if (href.includes('/css/dist/') || href.includes('css/dist/')) continue;
    const rel = href.replace(/^\.\//, '').split('?')[0];
    if (!rel.startsWith('css/') || !rel.endsWith('.css')) continue;
    const abs = path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) throw new Error(`${htmlName}: missing CSS ${rel}`);
    sources.push(rel);
  }
  if (!sources.length) throw new Error(`${htmlName}: no source CSS links found`);
  const chunks = [];
  for (const rel of sources) {
    const abs = path.join(projectRoot, rel);
    chunks.push(`\n/* =========================================================\n   SOURCE: ${rel}\n   ========================================================= */\n`);
    chunks.push(fs.readFileSync(abs, 'utf8').replace(/\s*$/,'') + '\n');
  }
  const outPath = path.join(projectRoot, distRel);
  fs.writeFileSync(outPath, chunks.join('\n'), 'utf8');
  report.pages.push({ html: htmlName, dist: distRel, sourceCount: sources.length, sources, bytes: fs.statSync(outPath).size });
}
fs.writeFileSync(path.join(projectRoot, `css-dist-report.v${assetVersion}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
