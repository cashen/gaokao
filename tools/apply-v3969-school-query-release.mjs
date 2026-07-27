import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const write = (file, content) => {
  const target = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

function replaceOnce(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(oldText, newText);
}

function replaceAllRequired(source, oldText, newText, label) {
  if (!source.includes(oldText)) throw new Error(`${label}: missing ${oldText}`);
  return source.split(oldText).join(newText);
}

const build = spawnSync(process.execPath, ['tools/build-school-admission-directory-v3969.mjs'], { cwd: ROOT, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

// School candidate UI: consume the unified query interpretations, never silently truncate.
{
  let source = read('ln-rank/js/feature/school-majors/school-all-mode.v3967_0.js');
  const oldBlock = `function renderCandidates(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  byId('schoolAllContent').innerHTML = \`<section class="ui-state ui-state--pending school-all-message"><b>\${escapeHtml(payload?.message || '没有精确找到这所学校')}</b><p>学校本部、分校和招生校区不能混在一起，请选择准确名称。</p>\${candidates.length ? \`<div class="school-candidate-list">\${candidates.map(item => \`<button class="ui-button ui-button--compact ui-button--secondary" type="button" data-school-candidate="\${escapeHtml(item.school)}"><span>\${escapeHtml(item.school)}</span><em>\${fmt(item.count)}条记录</em></button>\`).join('')}</div>\` : '<p>请检查学校名称，或切回按分数查看。</p>'}</section>\`;
}`;
  const newBlock = `function renderCandidateButtons(candidates = []) {
  return candidates.map(item => \`<button class="ui-button ui-button--compact ui-button--secondary" type="button" data-school-candidate="\${escapeHtml(item.school || item.officialName)}"><span>\${escapeHtml(item.school || item.officialName)}</span><small>\${escapeHtml(item.city || item.province || item.matchReason || '')}</small><em>\${fmt(item.count ?? item.recordCount2026)}条记录</em></button>\`).join('');
}

function renderCandidates(payload) {
  const query = payload?.query || {};
  const interpretations = Array.isArray(query.interpretations) ? query.interpretations : [];
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const groups = interpretations.length
    ? interpretations.map(item => \`<section class="school-candidate-group" data-school-query-intent="\${escapeHtml(item.intent || '')}"><header><h3>\${escapeHtml(item.label || '候选学校')}</h3><p>\${escapeHtml(item.note || '')}｜共 \${fmt(item.total)} 所，当前全部列出可选学校。</p></header><div class="school-candidate-list">\${renderCandidateButtons(item.candidates || [])}</div></section>\`).join('')
    : (candidates.length ? \`<section class="school-candidate-group"><header><h3>候选学校</h3><p>共 \${fmt(payload?.candidateTotal ?? candidates.length)} 所；招生记录数量只作说明，不决定名称匹配顺序。</p></header><div class="school-candidate-list">\${renderCandidateButtons(candidates)}</div></section>\` : '');
  const ambiguity = query.ambiguityType === 'region-or-school-name'
    ? '<p class="school-candidate-boundary">这个词既可能表示学校所在城市，也可能只是校名片段。系统不会替你暗中选择，请从对应分组中确认准确学校。</p>'
    : '<p class="school-candidate-boundary">学校本部、分校和招生校区不能混在一起，请选择准确名称。</p>';
  byId('schoolAllContent').innerHTML = \`<section class="ui-state ui-state--pending school-all-message"><b>\${escapeHtml(payload?.message || '没有精确确认这所学校')}</b>\${ambiguity}\${groups || '<p>请检查学校名称，或切回按分数查看。</p>'}</section>\`;
}`;
  source = replaceOnce(source, oldBlock, newBlock, 'school candidate renderer');
  source = replaceOnce(source, "if (payload?.code === 'school_not_resolved') {", "if (['school_not_resolved', 'school_query_requires_choice'].includes(payload?.code)) {", 'school candidate error code');
  source = replaceAllRequired(source, 'school-all-mode-v3967_0', 'school-all-mode-v3969_0', 'school mode version');
  source = replaceAllRequired(source, "sharedControlOwner: 'selection-workspace-orchestration-v3967_0'", "sharedControlOwner: 'selection-workspace-orchestration-v3969_0'", 'school mode shared owner');
  write('ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js', source);
}

// Workspace wrapper: same verified behavior, current query owner and truthful copy.
{
  let source = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3967_0.js');
  source = replaceAllRequired(source, 'selection-workspace-orchestration-v3967_0', 'selection-workspace-orchestration-v3969_0', 'workspace version');
  source = replaceAllRequired(source, '[selection-workspace-v3967]', '[selection-workspace-v3969]', 'workspace log');
  source = replaceOnce(source,
    "? '请输入完整学校名称；如果存在本部、分校或校区差异，页面会要求你从候选项中确认。'",
    "? '可以输入完整学校名、简称或城市。城市与校名片段冲突时会分组列出，必须再选择准确学校。'",
    'school mode help');
  source = replaceOnce(source,
    ": '完整学校名称会尽量按本部、分校、校区精确筛选；只输入名称片段时按学校名称包含关系扩大查看。';",
    ": '学校条件只接受统一目录解析后的学校；查看城市学校请使用地区条件，避免把城市词误当校名片段。';",
    'score mode help');
  write('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js', source);
}

// Score search: resolve school filters before scanning score-window chunks.
{
  let source = read('functions/api/major-bands.js');
  source = replaceOnce(source,
    "import { lookupScoreRank, getRankPopulation } from '../_lib/rank-table-provider.js';",
    "import { lookupScoreRank, getRankPopulation } from '../_lib/rank-table-provider.js';\nimport { resolveAdmissionSchoolQuery } from '../_lib/school-query-provider.v3969.js';\nimport { SCHOOL_QUERY_CONTRACT_VERSION, SCHOOL_QUERY_STATUSES, normalizeSchoolQueryIntent } from '../../shared/resources/schools/school-query-contract.v3969_0.js';\nimport { acceptedAdmissionSchoolNames } from '../../shared/resources/schools/school-query-engine.v3969_0.js';",
    'major bands imports');
  source = replaceOnce(source,
    "schoolEntityId: clean(url.searchParams.get('schoolEntityId') || '', 80),",
    "schoolEntityId: clean(url.searchParams.get('schoolEntityId') || '', 80),\n      schoolQueryIntent: normalizeSchoolQueryIntent(url.searchParams.get('schoolQueryIntent') || 'auto'),",
    'major bands filter intent');
  source = replaceOnce(source,
    "const acceptedSchoolNames = exactSchoolNames(schoolEntity, filters.schoolKeyword);",
    `let acceptedSchoolNames = exactSchoolNames(schoolEntity, filters.schoolKeyword);
    let schoolQueryResult = null;
    if (!schoolEntity && filters.schoolKeyword) {
      schoolQueryResult = await resolveAdmissionSchoolQuery(context.request, {
        query: filters.schoolKeyword,
        intent: filters.schoolQueryIntent,
        limit: 500
      });
      if (schoolQueryResult.status === SCHOOL_QUERY_STATUSES.RESOLVED) {
        acceptedSchoolNames = acceptedAdmissionSchoolNames(schoolQueryResult);
      } else {
        return json({
          ok: false,
          code: 'school_query_requires_choice',
          message: schoolQueryResult.status === SCHOOL_QUERY_STATUSES.AMBIGUOUS
            ? '学校条件同时可能表示地域或校名，请先确认一所准确学校；查看城市范围请使用地区条件。'
            : '学校条件没有解析为辽宁2026物理类有投档记录的唯一学校。',
          schoolQuery: schoolQueryResult,
          schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION
        }, schoolQueryResult.status === SCHOOL_QUERY_STATUSES.NOT_FOUND ? 404 : 409);
      }
    }`,
    'major bands school resolution');
  source = replaceOnce(source,
    "if (!acceptedSchoolNames?.size && filters.schoolKeyword && !record.school.includes(filters.schoolKeyword)) continue;",
    "if (filters.schoolKeyword && !acceptedSchoolNames?.size) continue;",
    'major bands remove raw contains');
  source = replaceOnce(source,
    "schoolMatchMode: schoolEntity ? 'exact-entity' : (filters.schoolKeyword ? 'keyword-fragment' : 'all-schools'),",
    "schoolMatchMode: schoolEntity ? 'exact-entity' : (schoolQueryResult?.status === SCHOOL_QUERY_STATUSES.RESOLVED ? 'unified-school-query' : 'all-schools'),\n        schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION,\n        schoolQueryIntent: filters.schoolQueryIntent,",
    'major bands meta');
  write('functions/api/major-bands.js', source);
}

// Report rebuild: the same school query contract, no independent includes() semantics.
{
  let source = read('functions/_lib/report-data-service-v3956.js');
  source = replaceOnce(source,
    "import { lookupScoreRank } from './rank-table-provider.js';",
    "import { lookupScoreRank } from './rank-table-provider.js';\nimport { resolveAdmissionSchoolQuery } from './school-query-provider.v3969.js';\nimport { SCHOOL_QUERY_STATUSES, normalizeSchoolQueryIntent } from '../../shared/resources/schools/school-query-contract.v3969_0.js';\nimport { acceptedAdmissionSchoolNames, normalizeUnifiedSchoolName } from '../../shared/resources/schools/school-query-engine.v3969_0.js';",
    'report school imports');
  source = replaceOnce(source,
    "schoolKeyword: clean(input.filters?.schoolKeyword || '', 40),",
    "schoolKeyword: clean(input.filters?.schoolKeyword || '', 40),\n      schoolQueryIntent: normalizeSchoolQueryIntent(input.filters?.schoolQueryIntent || 'auto'),",
    'report school intent');
  source = replaceOnce(source,
    "function rawSchoolPass(raw, schoolKeyword) {\n  const keyword = clean(schoolKeyword || '', 40);\n  return !keyword || rawSchool(raw).includes(keyword);\n}",
    "function rawSchoolPass(raw, acceptedSchoolNames) {\n  return !acceptedSchoolNames?.size || acceptedSchoolNames.has(normalizeUnifiedSchoolName(rawSchool(raw)));\n}",
    'report raw school filter');
  source = replaceOnce(source,
    "const filters = { ...params.filters, keywordQuery };",
    `const filters = { ...params.filters, keywordQuery };
  let acceptedSchoolNames = null;
  if (filters.schoolKeyword) {
    const schoolQueryResult = await resolveAdmissionSchoolQuery(request, {
      query: filters.schoolKeyword,
      intent: filters.schoolQueryIntent,
      limit: 500
    });
    if (schoolQueryResult.status !== SCHOOL_QUERY_STATUSES.RESOLVED) {
      throw new Error('学校条件需要先在主页面确认一所准确学校；城市范围请使用地区条件。');
    }
    acceptedSchoolNames = acceptedAdmissionSchoolNames(schoolQueryResult);
  }`,
    'report resolve school');
  source = replaceOnce(source,
    "if (!rawSchoolPass(raw, filters.schoolKeyword)) continue;",
    "if (!rawSchoolPass(raw, acceptedSchoolNames)) continue;",
    'report pass accepted names');
  source = replaceOnce(source,
    "if (filters.schoolKeyword && !record.school.includes(filters.schoolKeyword)) continue;",
    "if (filters.schoolKeyword && !acceptedSchoolNames?.has(normalizeUnifiedSchoolName(record.school))) continue;",
    'report remove raw contains');
  write('functions/_lib/report-data-service-v3956.js', source);
}

// Immutable browser and release wrappers.
{
  let runtime = read('ln-rank/js/app-runtime.v3968_0.js');
  runtime = replaceAllRequired(runtime, 'release-presenter.v3968_0.js?v=3968_0', 'release-presenter.v3969_0.js?v=3969_0', 'runtime release presenter');
  runtime = replaceAllRequired(runtime, 'current-release.js?v=3968_0', 'current-release.js?v=3969_0', 'runtime current release');
  runtime = replaceAllRequired(runtime, 'runtime-cache-contract.v3968_0.js?v=3968_0', 'runtime-cache-contract.v3969_0.js?v=3969_0', 'runtime cache');
  runtime = replaceAllRequired(runtime, 'algorithm-registry.js?v=3968_0', 'algorithm-registry.js?v=3969_0', 'runtime algorithm query');
  runtime = replaceAllRequired(runtime, 'selection-workspace-orchestrator.v3967_0.js?v=3967_0', 'selection-workspace-orchestrator.v3969_0.js?v=3969_0', 'runtime workspace');
  runtime = replaceAllRequired(runtime, 'school-all-mode.v3967_0.js?v=3967_0', 'school-all-mode.v3969_0.js?v=3969_0', 'runtime school mode');
  runtime = replaceOnce(runtime, "academicBackground: CURRENT_RELEASE.academicBackgroundVersion", "academicBackground: CURRENT_RELEASE.academicBackgroundVersion,\n  schoolQuery: CURRENT_RELEASE.schoolQueryVersion", 'runtime shared resource');
  runtime = replaceOnce(runtime, "academicBackground: CURRENT_RELEASE.academicBackgroundVersion\n    });", "academicBackground: CURRENT_RELEASE.academicBackgroundVersion,\n      schoolQuery: CURRENT_RELEASE.schoolQueryVersion\n    });", 'runtime result resource');
  write('ln-rank/js/app-runtime.v3969_0.js', runtime);

  let app = read('ln-rank/js/app.v3968_0.js');
  app = replaceAllRequired(app, 'resource-execution-v3968_0', 'resource-execution-v3969_0', 'app execution version');
  app = replaceAllRequired(app, 'app-runtime.v3968_0.js?v=3968_0', 'app-runtime.v3969_0.js?v=3969_0', 'app runtime import');
  app = replaceAllRequired(app, 'ln-rank-runtime-v3968_0', 'ln-rank-runtime-v3969_0', 'app log');
  write('ln-rank/js/app.v3969_0.js', app);

  let presenter = read('shared/resources/release/release-presenter.v3968_0.js');
  presenter = replaceAllRequired(presenter, 'current-release.js?v=3968_0', 'current-release.js?v=3969_0', 'release presenter');
  presenter = replaceOnce(presenter, "doc.body.dataset.academicBackground = CURRENT_RELEASE.academicBackgroundVersion;", "doc.body.dataset.academicBackground = CURRENT_RELEASE.academicBackgroundVersion;\n    doc.body.dataset.schoolQuery = CURRENT_RELEASE.schoolQueryVersion;", 'release presenter school query');
  write('shared/resources/release/release-presenter.v3969_0.js', presenter);
}

// Current release and cache ownership.
{
  let release = read('shared/resources/release/current-release.js');
  release = replaceAllRequired(release, 'v3.9.68.0', 'v3.9.69.0', 'current release display');
  release = replaceAllRequired(release, '3968_0', '3969_0', 'current release asset');
  release = replaceAllRequired(release, 'unified-academic-background-evidence-no-fenxi', 'unified-school-query-admission-directory-no-fenxi', 'current release label');
  release = replaceAllRequired(release, "resource-ownership-v3968_0", "resource-ownership-v3969_0", 'resource ownership');
  release = replaceAllRequired(release, "resource-execution-v3968_0", "resource-execution-v3969_0", 'resource execution');
  release = replaceAllRequired(release, "derivation-trace-v3968_0", "derivation-trace-v3969_0", 'derivation trace');
  release = replaceAllRequired(release, "ui-orchestration-v3968_0", "ui-orchestration-v3969_0", 'ui orchestration');
  release = replaceAllRequired(release, "algorithm-orchestration-v3968", "algorithm-orchestration-v3969", 'algorithm orchestration');
  release = replaceAllRequired(release, "selection-workspace-orchestration-v3967_0", "selection-workspace-orchestration-v3969_0", 'workspace release');
  release = replaceAllRequired(release, "score-school-search-v3967_0", "school-query-contract-v3969_0", 'search intent');
  release = replaceAllRequired(release, "school-all-mode-v3967_0", "school-all-mode-v3969_0", 'school mode release');
  release = replaceAllRequired(release, "runtime-cache-coherence-v3968_0", "runtime-cache-coherence-v3969_0", 'runtime cache release');
  release = replaceAllRequired(release, "release-presenter.v3968_0.js", "release-presenter.v3969_0.js", 'release presenter owner');
  release = replaceAllRequired(release, "resource-execution-contract.v3968_0.js", "resource-execution-contract.v3969_0.js", 'execution owner');
  release = replaceAllRequired(release, "runtime-cache-contract.v3968_0.js", "runtime-cache-contract.v3969_0.js", 'cache owner');
  release = replaceAllRequired(release, "app.v3968_0.js", "app.v3969_0.js", 'app owner');
  release = replaceAllRequired(release, "selection-workspace-orchestrator.v3967_0.js", "selection-workspace-orchestrator.v3969_0.js", 'workspace owner');
  release = replaceAllRequired(release, "school-all-mode.v3967_0.js", "school-all-mode.v3969_0.js", 'school results owner');
  release = replaceOnce(release, "schoolAllModeVersion: 'school-all-mode-v3969_0',", "schoolAllModeVersion: 'school-all-mode-v3969_0',\n  schoolQueryVersion: 'school-query-contract-v3969_0',\n  schoolAdmissionDirectoryVersion: 'liaoning-2026-admission-school-directory-v3969_0',", 'release school query fields');
  release = replaceOnce(release, "schoolIdentity: '/shared/resources/schools/school-identity-center.js',", "schoolIdentity: '/shared/resources/schools/school-identity-center.js',\n    schoolQueryContract: '/shared/resources/schools/school-query-contract.v3969_0.js',\n    schoolQueryEngine: '/shared/resources/schools/school-query-engine.v3969_0.js',\n    schoolAdmissionDirectory: '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',\n    schoolQueryProvider: '/functions/_lib/school-query-provider.v3969.js',", 'release school owners');
  write('shared/resources/release/current-release.js', release);

  let cache = read('shared/resources/release/runtime-cache-contract.v3968_0.js');
  cache = replaceAllRequired(cache, 'v3.9.68.0', 'v3.9.69.0', 'cache release');
  cache = replaceAllRequired(cache, 'v3968_0', 'v3969_0', 'cache asset');
  cache = replaceAllRequired(cache, '3968_0', '3969_0', 'cache query');
  cache = replaceAllRequired(cache, 'school-all-mode.v3967_0.js', 'school-all-mode.v3969_0.js', 'cache school owner');
  cache = replaceAllRequired(cache, 'selection-workspace-orchestrator.v3967_0.js', 'selection-workspace-orchestrator.v3969_0.js', 'cache workspace owner');
  cache = replaceAllRequired(cache, 'resource-execution-contract.v3968_0.js', 'resource-execution-contract.v3969_0.js', 'cache execution owner');
  cache = replaceOnce(cache, "academicBackgroundApi: '/api/academic-background',", "academicBackgroundApi: '/api/academic-background',\n    schoolQueryContract: '/shared/resources/schools/school-query-contract.v3969_0.js?v=3969_0',\n    schoolAdmissionDirectory: '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',", 'cache school entrypoints');
  cache = replaceOnce(cache, "academicBackgroundBrowser: '/ln-rank/js/academic-background/academic-background-app.v3968_0.js',", "academicBackgroundBrowser: '/ln-rank/js/academic-background/academic-background-app.v3968_0.js',\n    schoolQuery: '/shared/resources/schools/school-query-engine.v3969_0.js',\n    schoolAdmissionDirectory: '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',", 'cache school owners');
  cache = replaceOnce(cache, "'/shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js'", "'/shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js',\n    '/shared/resources/schools/school-query-contract.v3969_0.js',\n    '/shared/resources/schools/school-query-engine.v3969_0.js',\n    '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json'", 'cache active school assets');
  cache = replaceOnce(cache, "backgroundEvidenceYearSeparated: true", "backgroundEvidenceYearSeparated: true,\n    unifiedSchoolQueryRequired: true,\n    noSilentSchoolCandidateTruncation: true", 'cache policies');
  write('shared/resources/release/runtime-cache-contract.v3969_0.js', cache);
}

// Page, registry, version, and release contract.
{
  let html = read('ln-rank/index.html');
  html = replaceAllRequired(html, 'data-release="v3.9.68.0"', 'data-release="v3.9.69.0"', 'index release');
  html = replaceAllRequired(html, '<span data-current-release>v3.9.68.0</span>', '<span data-current-release>v3.9.69.0</span>', 'index visible release');
  html = replaceAllRequired(html, '/ln-rank/js/app.v3968_0.js?v=3968_0', '/ln-rank/js/app.v3969_0.js?v=3969_0', 'index app');
  html = replaceOnce(html, 'placeholder="如：大连、辽宁大学"', 'placeholder="如：辽大、沈阳化工大学；城市请用地区"', 'index school placeholder');
  write('ln-rank/index.html', html);
  write('VERSION.txt', 'v3.9.69.0\n');

  let registry = read('shared/resources/resource-registry.js');
  registry = replaceAllRequired(registry, 'current-release.js?v=3968_0', 'current-release.js?v=3969_0', 'registry current release');
  registry = replaceAllRequired(registry, 'runtime-cache-contract.v3967_0.js', 'runtime-cache-contract.v3969_0.js', 'registry runtime cache');
  registry = replaceAllRequired(registry, 'resource-execution-contract.v3968_0.js', 'resource-execution-contract.v3969_0.js', 'registry execution contract');
  registry = replaceOnce(registry, "consumers: Object.freeze(['ln-rank-cards', 'selection-pool', 'reports', 'tongxue', 'future-school-tools', 'academic-background'])", "queryContract: '/shared/resources/schools/school-query-contract.v3969_0.js',\n    queryEngine: '/shared/resources/schools/school-query-engine.v3969_0.js',\n    admissionDirectory: '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',\n    queryProvider: '/functions/_lib/school-query-provider.v3969.js',\n    policy: 'single-directory-single-identity-single-query-intent-and-admission-availability-owner',\n    consumers: Object.freeze(['ln-rank-cards', 'selection-pool', 'reports', 'tongxue', 'school-search', 'score-search', 'future-school-tools', 'academic-background'])", 'registry school execution');
  write('shared/resources/resource-registry.js', registry);

  let contract = read('functions/_lib/release-contract.js');
  contract = replaceOnce(contract, "schoolSelectionLightRefreshContract: true,", "schoolSelectionLightRefreshContract: true,\n  unifiedSchoolQueryContract: true,\n  schoolRegionNameAmbiguityContract: true,\n  noSilentSchoolCandidateTruncationContract: true,\n  admissionRecordCountTiebreakOnlyContract: true,\n  scoreSchoolReportQueryParityContract: true,", 'release contract school gates');
  write('functions/_lib/release-contract.js', contract);
}

console.log(JSON.stringify({ ok: true, version: 'v3.9.69.0' }, null, 2));
