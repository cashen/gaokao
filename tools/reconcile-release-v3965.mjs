import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content.endsWith('\n') ? content : `${content}\n`);

for (const file of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
  const data = JSON.parse(read(file));
  data.familyDecisionBarJs = '../shared/ui/shell/family-shell.v3965_0.js';
  data.sharedUiShellJs = '../shared/ui/shell/family-shell.v3965_0.js';
  data.sharedUiRegistry = '../shared/ui/ui-registry.v3965_0.js';
  data.runtimeCacheResource = '../shared/resources/release/runtime-cache-contract.v3965_0.js';
  write(file, JSON.stringify(data, null, 2));
}

const orchestratorPath = 'ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js';
let orchestrator = read(orchestratorPath);
orchestrator = orchestrator
  .split('selection-workspace-orchestration-v3964_0')
  .join('selection-workspace-orchestration-v3965_0')
  .split('[selection-workspace-v3963]')
  .join('[selection-workspace-v3965]');
write(orchestratorPath, orchestrator);

let headers = read('_headers');
const currentReleaseRule = '/shared/resources/release/current-release.js\n  Cache-Control: no-cache, max-age=0, must-revalidate';
if (!headers.includes(currentReleaseRule)) headers += `\n${currentReleaseRule}\n`;
write('_headers', headers);

console.log(JSON.stringify({
  ok: true,
  reconciled: 'v3.9.65.0',
  workspace: 'selection-workspace-orchestration-v3965_0'
}, null, 2));
