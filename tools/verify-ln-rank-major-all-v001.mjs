import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
function requireText(file, text, label = text) {
  const content = read(file);
  if (!content.includes(text)) throw new Error(`${file}: missing ${label}`);
  checks.push(label);
}
function forbidText(file, text, label = text) {
  const content = read(file);
  if (content.includes(text)) throw new Error(`${file}: forbidden ${label}`);
  checks.push(`no ${label}`);
}

requireText('ln-rank/index.html', 'data-school-view-mode="major-all"', 'third parallel major tab');
requireText('ln-rank/index.html', 'id="majorCandidatePanel"', 'major candidate confirmation panel');
requireText('ln-rank/index.html', 'id="majorProjectMode"', 'ordinary/sino project filter');
requireText('ln-rank/index.html', 'id="majorAllResultsPanel"', 'major result panel');
requireText('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js', "const MODE_MAJOR = 'major-all';", 'shared major mode');
requireText('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js', "gaokao:major-search-submit", 'shared major submit event');
requireText('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js', 'major-action-sync', 'major action synchronization');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', "p.append('major',n)", 'repeated multi-major API inputs');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'data-major-remove-term', 'remove-one-major draft action');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'data-major-clear', 'clear-major draft action');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'yearText(r,2024)', '2024 trend rendering');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'yearText(r,2025)', '2025 trend rendering');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'yearText(r,2026)', '2026 trend rendering');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'rawCandidate===null||rawCandidate===undefined', 'empty score does not render as zero');
requireText('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'hasCandidateScore=d.candidateScore!==null', 'empty score summary guard');
requireText('ln-rank/js/knowledge/major-understanding-resolver.js', 'resolveMajorQueryCandidates', 'canonical major resolver owner');
forbidText('ln-rank/js/knowledge/major-understanding-resolver.js', '\\\\s+(?:和|与|及|或)', 'double-escaped natural conjunction');
requireText('functions/api/ai/major-history.js', 'const majorInputs = splitMajorInputs', 'multi-major API normalization');
requireText('functions/api/ai/major-history.js', 'lookupScoreRank({ year: 2026', 'score-to-rank owner');
requireText('functions/api/ai/major-history.js', 'candidateReferenceRank2026', 'candidate rank metadata');
requireText('functions/api/ai/major-history.js', 'projectMode', 'project-mode filtering');
requireText('functions/api/ai/major-history.js', 'score2024', 'three-year API fields');
requireText('ln-rank/js/workspace/major-path-handoff.v003.js', "context:'major'", 'major path navigation context');
requireText('ln-rank/js/workspace/major-path-handoff.v003.js', 'decorateMajorAllCards', 'major card handoff decorator');
requireText('ln-rank/css/major-all-mode.v001.css', '@media (max-width: 720px)', 'compact Android responsive layout');
requireText('ln-rank/css/major-all-mode.v001.css', 'min-height: 44px', 'touch target contract');
requireText('functions/api/ai/major-history.js', 'sameTruthSet', 'same truth-set boundary');
requireText('functions/api/ai/major-history.js', 'candidateScore', 'optional score contract');
console.log(`major-all contract checks passed: ${checks.length}`);
