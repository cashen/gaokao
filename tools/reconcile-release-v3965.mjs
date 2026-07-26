import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content.endsWith('\n') ? content : `${content}\n`);
const replaceExact = (file, from, to) => {
  const source = read(file);
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`${file}: expected reconciliation fragment not found`);
  write(file, source.replace(from, to));
};

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
if (orchestrator.includes('selection-workspace-orchestration-v3964_0')) {
  throw new Error('v3965 orchestrator still exposes the v3964 workspace contract');
}
if (!orchestrator.includes("version: 'selection-workspace-orchestration-v3965_0'")) {
  throw new Error('v3965 orchestrator does not expose the current workspace contract');
}
write(orchestratorPath, orchestrator);

const controller = 'tongxue/app/tongxue-runtime-controller-v159.js';
replaceExact(controller,
  "    currentSchool: '',\n    directMode: false,",
  "    currentSchool: '',\n    currentEntityId: '',\n    directMode: false,"
);
replaceExact(controller,
  "      currentSchool: state.currentSchool,\n      directMode: state.directMode,",
  "      currentSchool: state.currentSchool,\n      currentEntityId: state.currentEntityId,\n      directMode: state.directMode,"
);
replaceExact(controller,
  "    state.currentSchool = '';\n    state.currentResolution = null;",
  "    state.currentSchool = '';\n    state.currentEntityId = '';\n    state.currentResolution = null;"
);
replaceExact(controller,
  "    confidence: candidate.score || 0\n  };",
  "    confidence: candidate.score || 0,\n    entityId: candidate.entityId || ''\n  };"
);
replaceExact(controller,
  "function resetResolution(state, searchView) {\n  state.selectedOfficialName = '';\n  state.currentResolution = null;",
  "function resetResolution(state, searchView) {\n  state.selectedOfficialName = '';\n  state.currentEntityId = '';\n  state.currentResolution = null;"
);
replaceExact(controller,
  "    state.currentSchool = '';\n    state.currentResolution = resolution;\n    state.activeReviewState = null;",
  "    state.currentSchool = '';\n    state.currentEntityId = '';\n    state.currentResolution = resolution;\n    state.activeReviewState = null;"
);
replaceExact(controller,
  "    state.currentSchool = '';\n    state.currentResolution = resolution;\n    state.directMode = Boolean(options.directMode ?? state.directMode);",
  "    state.currentSchool = '';\n    state.currentEntityId = '';\n    state.currentResolution = resolution;\n    state.directMode = Boolean(options.directMode ?? state.directMode);"
);
replaceExact(controller,
  "    state.currentSchool = '';\n    state.currentResolution = resolution;\n    state.directMode = false;",
  "    state.currentSchool = '';\n    state.currentEntityId = '';\n    state.currentResolution = resolution;\n    state.directMode = false;"
);
replaceExact(controller,
  "  state.selectedOfficialName = resolution.resolvedName;\n  state.currentResolution = resolution;\n  state.currentSchool = resolution.resolvedName;\n  state.directMode = Boolean(options.directMode ?? state.directMode);\n  ui.input.value = resolution.resolvedName;\n  searchView.showResolved(input, resolution.resolvedName);\n  const entity = findSchoolEntityByName(resolution.resolvedName);\n  writeLocation('school', resolution.resolvedName, entity?.entityId || '', options.historyMode || 'push');\n  return performExperienceQuery(ui, state, searchView, resultView, resolution.resolvedName, input, resolution, options);",
  "  state.selectedOfficialName = resolution.resolvedName;\n  state.currentResolution = resolution;\n  state.currentSchool = resolution.resolvedName;\n  const entity = (resolution.entityId && getSchoolEntity(resolution.entityId)) || findSchoolEntityByName(resolution.resolvedName);\n  state.currentEntityId = entity?.entityId || options.entityId || '';\n  state.directMode = Boolean(options.directMode ?? state.directMode);\n  ui.input.value = resolution.resolvedName;\n  searchView.showResolved(input, resolution.resolvedName);\n  writeLocation('school', resolution.resolvedName, state.currentEntityId, options.historyMode || 'push');\n  return performExperienceQuery(ui, state, searchView, resultView, resolution.resolvedName, input, resolution, { ...options, entityId: state.currentEntityId });"
);
replaceExact(controller,
  "  const key = experienceKey(school, 1);",
  "  const entityId = options.entityId || state.currentEntityId || '';\n  const key = experienceKey(school, entityId, 1);"
);
replaceExact(controller,
  "        forceRefresh: Boolean(options.forceRefresh),\n        signal: controller.signal",
  "        forceRefresh: Boolean(options.forceRefresh),\n        entityId,\n        signal: controller.signal"
);
replaceExact(controller,
  "  const key = experienceKey(school, page);",
  "  const key = experienceKey(school, options.entityId || '', page);"
);
replaceExact(controller,
  "    const params = new URLSearchParams({ school, page: String(page) });\n    if (originalInput) params.set('input', originalInput);",
  "    const params = new URLSearchParams({ school, page: String(page) });\n    if (options.entityId) params.set('entity', options.entityId);\n    if (originalInput) params.set('input', originalInput);"
);
replaceExact(controller,
  "    await performExperienceQuery(ui, state, searchView, resultView, state.currentSchool, state.currentResolution?.input || state.currentSchool, state.currentResolution, { forceRefresh: true });",
  "    await performExperienceQuery(ui, state, searchView, resultView, state.currentSchool, state.currentResolution?.input || state.currentSchool, state.currentResolution, { forceRefresh: true, entityId: state.currentEntityId });"
);
replaceExact(controller,
  "    const data = await fetchExperience(state, active.school, active.originalInput, nextPage, { signal: controller.signal });",
  "    const data = await fetchExperience(state, active.school, active.originalInput, nextPage, { entityId: active.entityId || '', signal: controller.signal });"
);
replaceExact(controller,
  "  state.currentSchool = '';\n  state.currentResolution = null;\n  state.selectedOfficialName = '';",
  "  state.currentSchool = '';\n  state.currentEntityId = '';\n  state.currentResolution = null;\n  state.selectedOfficialName = '';"
);
replaceExact(controller,
  "    return submitInput(ui, state, searchView, resultView, { input: school, historyMode: 'none', directMode: true });",
  "    return submitInput(ui, state, searchView, resultView, { input: school, entityId, historyMode: 'none', directMode: true });"
);
replaceExact(controller,
  "function experienceKey(school, page) {\n  return `${normalizeSchool(school)}|${Number(page || 1)}`;\n}",
  "function experienceKey(school, entityId, page) {\n  return `${normalizeSchool(school)}|${String(entityId || '')}|${Number(page || 1)}`;\n}"
);

const resultView = 'tongxue/app/tongxue-runtime-result-view-v159.js';
replaceExact(resultView,
  "      originalInput: resolution?.input || school,\n      resolution,",
  "      originalInput: resolution?.input || school,\n      entityId: data.entity?.entityId || resolution?.entityId || '',\n      resolution,"
);

replaceExact(
  'tongxue/index.html',
  '.suggestions{top:62px}',
  '.suggestions{position:static;margin-top:8px;max-height:min(46vh,320px)}'
);

let headers = read('_headers');
const currentReleaseRule = '/shared/resources/release/current-release.js\n  Cache-Control: no-cache, max-age=0, must-revalidate';
if (!headers.includes(currentReleaseRule)) headers += `\n${currentReleaseRule}\n`;
write('_headers', headers);

console.log(JSON.stringify({
  ok: true,
  reconciled: 'v3.9.65.0',
  workspace: 'selection-workspace-orchestration-v3965_0',
  tongxueEntityRequest: true,
  tongxueMobileSuggestionsInFlow: true
}, null, 2));
