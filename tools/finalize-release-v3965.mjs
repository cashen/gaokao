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
const copyWithReplacements = (sourceFile, targetFile, pairs) => {
  let source = read(sourceFile);
  for (const [from, to] of pairs) source = source.split(from).join(to);
  const target = path.join(root, targetFile);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const normalized = source.endsWith('\n') ? source : `${source}\n`;
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== normalized) fs.writeFileSync(target, normalized);
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
  'tongxue/app/tongxue-runtime-controller-v159.js',
  "    loadingMore: false,\n    activeReviewState: null,",
  "    loadingMore: false,\n    loadMoreController: null,\n    loadMoreSerial: 0,\n    activeReviewState: null,"
);
replaceExact(
  'tongxue/app/tongxue-runtime-controller-v159.js',
  "async function loadMoreReviews(ui, state, searchView, resultView) {\n  const active = state.activeReviewState;\n  const button = document.getElementById('loadMoreReviews');\n  if (!active || !button || !active.pagination?.hasMore || state.loadingMore) return;\n  state.loadingMore = true;\n  button.disabled = true;\n  button.textContent = '正在加载';\n  try {\n    const nextPage = Number(active.pagination.page || 1) + 1;\n    const data = await fetchExperience(state, active.school, active.originalInput, nextPage);\n    if (data.mode !== 'recent_reviews') throw new TongxueError('reviews_page_invalid', '后续评论页没有返回评论列表。', data);\n    const existing = new Set(active.reviews.map(reviewKey));\n    const added = dedupeReviews(data.reviews || []).filter(review => !existing.has(reviewKey(review)));\n    resultView.appendReviews(added, active.reviews.length);\n    active.reviews.push(...added);\n    active.pagination = data.reviewPagination || { ...active.pagination, page: nextPage, hasMore: false };\n    active.fetchedAt = data.fetchedAt || active.fetchedAt;\n    active.transport = data.transport || active.transport;\n    resultView.updateLoadMore();\n    searchView.announce(`已新增 ${added.length} 条评论`);\n  } catch (error) {\n    button.disabled = false;\n    button.textContent = '加载失败，点击重试';\n    button.title = error?.message || '加载失败';\n    searchView.announce('评论加载失败，可以再次点击重试');\n  } finally {\n    state.loadingMore = false;\n  }\n}",
  "async function loadMoreReviews(ui, state, searchView, resultView) {\n  const active = state.activeReviewState;\n  const button = document.getElementById('loadMoreReviews');\n  if (!active || !button || !active.pagination?.hasMore || state.loadingMore) return;\n  state.loadingMore = true;\n  state.loadMoreController?.abort();\n  const controller = new AbortController();\n  const serial = ++state.loadMoreSerial;\n  state.loadMoreController = controller;\n  button.disabled = true;\n  button.textContent = '正在加载';\n  try {\n    const nextPage = Number(active.pagination.page || 1) + 1;\n    const data = await fetchExperience(state, active.school, active.originalInput, nextPage, { signal: controller.signal });\n    if (serial !== state.loadMoreSerial || state.activeReviewState !== active) return;\n    if (data.mode !== 'recent_reviews') throw new TongxueError('reviews_page_invalid', '后续评论页没有返回评论列表。', data);\n    const existing = new Set(active.reviews.map(reviewKey));\n    const added = dedupeReviews(data.reviews || []).filter(review => !existing.has(reviewKey(review)));\n    resultView.appendReviews(added, active.reviews.length);\n    active.reviews.push(...added);\n    active.pagination = data.reviewPagination || { ...active.pagination, page: nextPage, hasMore: false };\n    active.fetchedAt = data.fetchedAt || active.fetchedAt;\n    active.transport = data.transport || active.transport;\n    resultView.updateLoadMore();\n    searchView.announce(`已新增 ${added.length} 条评论`);\n  } catch (error) {\n    if (isAbortError(error) || serial !== state.loadMoreSerial) return;\n    button.disabled = false;\n    button.textContent = '加载失败，点击重试';\n    button.title = error?.message || '加载失败';\n    searchView.announce('评论加载失败，可以再次点击重试');\n  } finally {\n    if (serial === state.loadMoreSerial) {\n      state.loadingMore = false;\n      state.loadMoreController = null;\n    }\n  }\n}"
);
replaceExact(
  'tongxue/app/tongxue-runtime-controller-v159.js',
  "  state.activeQueryKey = '';\n  state.requestInFlight = false;\n  state.loadingMore = false;",
  "  state.activeQueryKey = '';\n  state.requestInFlight = false;\n  state.loadMoreSerial += 1;\n  state.loadMoreController?.abort();\n  state.loadMoreController = null;\n  state.loadingMore = false;"
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
replaceExact(
  'tools/browser-feishu-ownership-v3965.mjs',
  "      await generate.click({ clickCount: 2, delay: 0 });",
  "      await generate.evaluate(button => {\n        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));\n        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));\n      });"
);
replaceExact(
  'tools/browser-tongxue-runtime-v159.mjs',
  "          const nav = document.querySelector('[data-ui-mobile-nav]')?.getBoundingClientRect();\n          return {\n            inputBottom: inputBox?.bottom || 0,\n            buttonBottom: buttonBox?.bottom || 0,\n            viewportHeight: window.innerHeight,\n            navTop: nav?.top || window.innerHeight\n          };",
  "          const navElement = document.querySelector('[data-ui-mobile-nav]');\n          const navVisible = navElement && getComputedStyle(navElement).display !== 'none' && navElement.getBoundingClientRect().height > 0;\n          const nav = navVisible ? navElement.getBoundingClientRect() : null;\n          return {\n            inputBottom: inputBox?.bottom || 0,\n            buttonBottom: buttonBox?.bottom || 0,\n            viewportHeight: window.innerHeight,\n            navTop: nav?.top || window.innerHeight\n          };"
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

copyWithReplacements(
  'tools/browser-human-task-journey-v3964_1.mjs',
  'tools/browser-human-task-journey-v3965_0.mjs',
  [
    ['v3964_1', 'v3965_0'],
    ['v3.9.64.1', 'v3.9.65.0'],
    ['selection-workspace-orchestration-v3964_0', 'selection-workspace-orchestration-v3965_0']
  ]
);
copyWithReplacements(
  'tools/browser-runtime-readiness-v3964_1.mjs',
  'tools/browser-runtime-readiness-v3965_0.mjs',
  [
    ['v3964_1', 'v3965_0'],
    ['v3.9.64.1', 'v3.9.65.0']
  ]
);

console.log(JSON.stringify({ ok: true, finalized: 'v3.9.65.0' }, null, 2));
