#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
let assetVersion = process.argv[3];
if (!assetVersion) {
  try {
    const assets = JSON.parse(fs.readFileSync(path.join(projectRoot, 'active-assets.json'), 'utf8'));
    assetVersion = String(assets.assetVersion || '').replace(/^v/, '') || '3933';
  } catch { assetVersion = '3933'; }
}
const reportPath = path.join(projectRoot, `css-dist-report.v${assetVersion}.json`);
const colorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
const allowedLiteralFiles = new Set([
  'css/core/color-system.css',
  'css/core/tokens.css',
  'css/core/ui-token.css'
]);

function loadSources() {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`missing css dist report: ${reportPath}. Run build-css-dist.mjs first.`);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const sources = new Set();
  for (const page of report.pages || []) {
    for (const rel of page.sources || []) sources.add(rel);
  }
  return [...sources].sort();
}

function classifyLine(line) {
  if (/var\s*\(/.test(line)) return 'fallback-or-token-line';
  if (/linear-gradient|radial-gradient|box-shadow|text-shadow|filter:|backdrop-filter/.test(line)) return 'effect-literal';
  return 'raw-literal';
}

const sources = loadSources();
const byFile = [];
let totalMatches = 0;
let rawOutsideCore = 0;
let fallbackOrTokenLine = 0;
let effectLiteral = 0;
let allowedCoreMatches = 0;
const samples = [];

for (const rel of sources) {
  const abs = path.join(projectRoot, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  const lines = text.split(/\r?\n/);
  let fileMatches = 0;
  let fileRaw = 0;
  let fileFallback = 0;
  let fileEffect = 0;
  let fileAllowed = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [...line.matchAll(colorRe)].map(m => m[0]);
    if (!matches.length) continue;
    fileMatches += matches.length;
    totalMatches += matches.length;
    if (allowedLiteralFiles.has(rel)) {
      fileAllowed += matches.length;
      allowedCoreMatches += matches.length;
      continue;
    }
    const kind = classifyLine(line);
    if (kind === 'fallback-or-token-line') {
      fileFallback += matches.length;
      fallbackOrTokenLine += matches.length;
    } else if (kind === 'effect-literal') {
      fileEffect += matches.length;
      effectLiteral += matches.length;
    } else {
      fileRaw += matches.length;
      rawOutsideCore += matches.length;
      if (samples.length < 40) samples.push({ file: rel, line: i + 1, colors: matches, text: line.trim().slice(0, 220) });
    }
  }
  if (fileMatches) byFile.push({ file: rel, total: fileMatches, rawOutsideCore: fileRaw, fallbackOrTokenLine: fileFallback, effectLiteral: fileEffect, allowedCore: fileAllowed });
}

byFile.sort((a, b) => (b.rawOutsideCore - a.rawOutsideCore) || (b.total - a.total));
const output = {
  assetVersion: `v${assetVersion}`,
  generatedAt: new Date().toISOString(),
  scannedSourceCount: sources.length,
  totals: { totalMatches, allowedCoreMatches, rawOutsideCore, fallbackOrTokenLine, effectLiteral },
  topFiles: byFile.slice(0, 25),
  samples,
  note: 'rawOutsideCore is the main watch item. Core token files are allowed to contain literal colors. Lines using var() are counted separately as fallback/token lines.'
};
const outPath = path.join(projectRoot, `css-color-audit.v${assetVersion}.json`);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(JSON.stringify(output, null, 2));
