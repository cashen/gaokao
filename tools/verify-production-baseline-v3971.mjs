import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

const STABLE_SHA = 'f347fd268ad06e2bd0b339786dd4daf692974a34';
const ROOT = process.cwd();
const TMP = '/tmp/v3972-worker-bundle-diagnosis';
const STABLE_DIR = path.join(TMP, 'stable-src');

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(STABLE_DIR, { recursive: true });

function run(command, args, cwd = ROOT) {
  console.log(`$ ${command} ${args.join(' ')}`);
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: '1', NO_COLOR: '1' }
  });
}

function build(label, cwd) {
  const outfile = path.join(TMP, `${label}-worker.js`);
  const metafile = path.join(TMP, `${label}-meta.json`);
  const output = run('npx', [
    '--yes', 'wrangler@4.28.1',
    'pages', 'functions', 'build', 'functions',
    `--outfile=${outfile}`,
    `--metafile=${metafile}`,
    '--compatibility-date=2026-07-01'
  ], cwd);
  console.log(output);
  if (!fs.existsSync(outfile) || !fs.existsSync(metafile)) throw new Error(`${label} bundle output missing`);
  return { outfile, metafile };
}

function analyze(label, bundle) {
  const workerBytes = fs.statSync(bundle.outfile).size;
  const meta = JSON.parse(fs.readFileSync(bundle.metafile, 'utf8'));
  const contributions = new Map();
  for (const output of Object.values(meta.outputs || {})) {
    for (const [input, info] of Object.entries(output.inputs || {})) {
      contributions.set(input, (contributions.get(input) || 0) + Number(info.bytesInOutput || 0));
    }
  }
  const rows = [...contributions.entries()]
    .map(([input, bytesInOutput]) => ({ input, bytesInOutput, sourceBytes: Number(meta.inputs?.[input]?.bytes || 0) }))
    .sort((a, b) => b.bytesInOutput - a.bytesInOutput || b.sourceBytes - a.sourceBytes);
  const workerText = fs.readFileSync(bundle.outfile, 'utf8');
  return {
    label,
    workerBytes,
    inputCount: Object.keys(meta.inputs || {}).length,
    outputCount: Object.keys(meta.outputs || {}).length,
    topInputs: rows.slice(0, 40),
    markers: {
      all211StaticIndex: workerText.includes('211-static-index.v3972_0.json'),
      doubleFirstClass: workerText.includes('double-first-class-disciplines'),
      schoolProfileCenter: workerText.includes('school-profile-center'),
      all211Compat: workerText.includes('all-211-functions-compat-v3972_1'),
      admissionDataLiteral: workerText.includes('ln-rank-2026')
    },
    contributions
  };
}

console.log(`Fetching stable baseline ${STABLE_SHA}`);
execSync(`git fetch --depth=1 origin ${STABLE_SHA}`, { cwd: ROOT, stdio: 'inherit' });
execSync(`git archive ${STABLE_SHA} | tar -x -C ${STABLE_DIR}`, { cwd: ROOT, stdio: 'inherit', shell: '/bin/bash' });

const stableBundle = build('stable', STABLE_DIR);
const incidentBundle = build('incident', ROOT);
const stable = analyze('stable', stableBundle);
const incident = analyze('incident', incidentBundle);

const keys = new Set([...stable.contributions.keys(), ...incident.contributions.keys()]);
const delta = [...keys].map(input => ({
  input,
  stableBytes: stable.contributions.get(input) || 0,
  incidentBytes: incident.contributions.get(input) || 0,
  deltaBytes: (incident.contributions.get(input) || 0) - (stable.contributions.get(input) || 0)
})).filter(row => row.deltaBytes !== 0)
  .sort((a, b) => Math.abs(b.deltaBytes) - Math.abs(a.deltaBytes));

const report = {
  stable: {
    workerBytes: stable.workerBytes,
    inputCount: stable.inputCount,
    outputCount: stable.outputCount,
    markers: stable.markers,
    topInputs: stable.topInputs
  },
  incident: {
    workerBytes: incident.workerBytes,
    inputCount: incident.inputCount,
    outputCount: incident.outputCount,
    markers: incident.markers,
    topInputs: incident.topInputs
  },
  difference: {
    workerBytes: incident.workerBytes - stable.workerBytes,
    inputCount: incident.inputCount - stable.inputCount,
    topChangedInputs: delta.slice(0, 80)
  }
};

fs.writeFileSync(path.join(TMP, 'bundle-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('=== BUNDLE DIAGNOSIS ===');
console.log(JSON.stringify(report, null, 2));
console.log(`diagnostics=${TMP}`);
