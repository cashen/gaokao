import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  if (fs.readFileSync(target, 'utf8') === normalized) return;
  fs.writeFileSync(target, normalized);
};
const replaceExact = (file, from, to) => {
  const source = read(file);
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`${file}: expected source fragment not found`);
  write(file, source.replace(from, to));
};

replaceExact(
  'tongxue/app/tongxue-runtime-controller-v159.js',
  "    resetResolution(state, searchView);\n    scheduleSuggestions(ui, state, searchView);\n  });\n  on(ui.input, 'input', event => {\n    if (event.isComposing || state.composing) return;\n    resetResolution(state, searchView);\n    scheduleSuggestions(ui, state, searchView);\n  });",
  "    resetResolution(state, searchView);\n    scheduleSuggestions(ui, state, searchView);\n    updateButton(ui, state);\n  });\n  on(ui.input, 'input', event => {\n    if (event.isComposing || state.composing) return;\n    resetResolution(state, searchView);\n    scheduleSuggestions(ui, state, searchView);\n    updateButton(ui, state);\n  });"
);
replaceExact(
  'tongxue/app/tongxue-runtime-controller-v159.js',
  "  const serial = ++state.querySerial;\n  abortActive(state);\n  const controller = new AbortController();",
  "  abortActive(state);\n  const serial = ++state.querySerial;\n  const controller = new AbortController();"
);
replaceExact(
  'tongxue/app/tongxue-runtime-search-view-v159.js',
  "import { findSchoolEntityByName, getSchoolEntity } from '../data/school-entities-v150.js?v=150';",
  "import { findSchoolEntityByName, getSchoolEntity, publicSchoolEntity } from '../data/school-entities-v150.js?v=150';"
);
replaceExact(
  'tongxue/app/tongxue-runtime-search-view-v159.js',
  "    const parent = entity.parentEntityId ? getSchoolEntity(entity.parentEntityId) : null;\n    return { ...entity, parentName: parent?.displayName || '' };",
  "    const parent = entity.parentEntityId ? getSchoolEntity(entity.parentEntityId) : null;\n    return { ...publicSchoolEntity(entity), parentName: parent?.displayName || '' };"
);
replaceExact(
  'shared/resources/release/current-release.js',
  "  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3964_0',",
  "  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3965_0',"
);

let headers = read('_headers');
for (const [pattern, type] of [
  ['/tongxue/app/*.js', 'application/javascript; charset=utf-8'],
  ['/shared/resources/release/*.js', 'application/javascript; charset=utf-8']
]) {
  const rule = `${pattern}\n  Content-Type: ${type}`;
  if (!headers.includes(rule)) headers = `${rule}\n${headers}`;
}
write('_headers', headers);

console.log(JSON.stringify({ ok: true, finalized: 'v3.9.65.0' }, null, 2));
