import fs from 'node:fs';
import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../ln-rank/kb/major-understanding/admission-major-alias.generated.js';
import {
  STANDARD_MAJOR_CATALOG_2026_FULL,
  STANDARD_MAJOR_CATEGORIES_2026_FULL,
  STANDARD_MAJOR_DISCIPLINES_2026
} from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import { GRADUATE_CATALOG_2022, GRADUATE_CATALOG_2022_META, GRADUATE_CATALOG_SOURCES } from '../shared/resources/graduate/graduate-catalog-2022.v001.js';
import {
  MAJOR_CATALOG_RESOURCE_CONTRACT,
  deriveMajorCatalogHierarchy
} from '../shared/resources/majors/major-catalog-contract.js';
import { buildUndergradGraduatePathway, UNDERGRAD_GRADUATE_PATHWAY_META } from '../shared/resources/majors/undergrad-graduate-pathway.v001.js';
import { createMajorSearchIntentResolver, MAJOR_SEARCH_INTENT_META } from '../shared/resources/majors/major-search-intent.v001.js';
import { createMajorRelationshipGraphResolver, MAJOR_RELATIONSHIP_GRAPH_META } from '../shared/resources/majors/major-relationship-graph.v002.js';

function assert(value, message) { if (!value) throw new Error(message); }
function unique(values) { return new Set(values).size === values.length; }
function semanticSnapshot(result = {}) {
  return JSON.stringify({
    kind: result.kind || '',
    matchType: result.matchType || '',
    semanticType: result.semanticType || '',
    code: result.major?.code || '',
    name: result.major?.name || '',
    label: result.label || '',
    total: result.total || 0,
    candidates: (result.allCandidates || result.candidates || []).map(item => `${item.code}:${item.name}`)
  });
}

assert(MAJOR_CATALOG_RESOURCE_CONTRACT.canonicalCount === 883, 'major catalog contract count drift');
assert(MAJOR_CATALOG_RESOURCE_CONTRACT.canonicalCategoryCount === 92, 'major catalog contract category count drift');
assert(MAJOR_CATALOG_RESOURCE_CONTRACT.canonicalDisciplineCount === 13, 'major catalog contract discipline count drift');
assert(MAJOR_CATALOG_2026_META.total === 883, `undergraduate source meta must remain 883, got ${MAJOR_CATALOG_2026_META.total}`);
assert(MAJOR_CATALOG_2026_META.majorClassCount === 92, `undergraduate source major-class meta must remain 92, got ${MAJOR_CATALOG_2026_META.majorClassCount}`);
assert(MAJOR_CATALOG_2026_META.disciplineCount === 13, `undergraduate source discipline meta must remain 13, got ${MAJOR_CATALOG_2026_META.disciplineCount}`);
assert(MAJOR_CATALOG_2026.length === 883, `undergraduate runtime count must remain 883, got ${MAJOR_CATALOG_2026.length}`);
assert(unique(MAJOR_CATALOG_2026.map(item => item.code)), 'undergraduate codes must be unique');
assert(STANDARD_MAJOR_CATALOG_2026_FULL.length === 883, 'standard undergraduate catalog must remain 883');
assert(STANDARD_MAJOR_CATEGORIES_2026_FULL.length === 92, 'standard undergraduate category catalog must remain 92');
assert(STANDARD_MAJOR_DISCIPLINES_2026.length === 13, 'standard undergraduate discipline catalog must remain 13');
assert(GRADUATE_CATALOG_2022_META.count === 184, `graduate catalog count drift: ${GRADUATE_CATALOG_2022_META.count}`);
assert(GRADUATE_CATALOG_2022.length === 184, 'graduate catalog runtime count drift');
assert(unique(GRADUATE_CATALOG_2022.map(item => item.code)), 'graduate four-digit codes must be unique');
assert(Object.values(GRADUATE_CATALOG_SOURCES).every(source => /^https:\/\/www\.moe\.gov\.cn\//.test(source.url)), 'graduate sources must stay on official MOE host');
assert(UNDERGRAD_GRADUATE_PATHWAY_META.boundary.includes('一一对应表'), 'cross-level no-one-to-one boundary missing');
assert(MAJOR_RELATIONSHIP_GRAPH_META.identityPolicy.includes('major-catalog-contract-derived-category-identity'), 'relationship identity must use canonical major catalog contract');
assert(MAJOR_RELATIONSHIP_GRAPH_META.undergraduateBoundary.includes('不补造1400专业类'), 'cross-discipline no-fabricated-class boundary missing');
assert(MAJOR_RELATIONSHIP_GRAPH_META.graduateBoundary.includes('二级学科') && MAJOR_RELATIONSHIP_GRAPH_META.graduateBoundary.includes('自主设置'), 'graduate second-level boundary must be explicit');
assert(MAJOR_RELATIONSHIP_GRAPH_META.neighborBoundary.includes('不代表课程相同'), 'neighbor boundary must forbid course-equivalence inference');

const standardByCode = new Map(STANDARD_MAJOR_CATALOG_2026_FULL.map(item => [item.code, item]));
const standardCategoryByCode = new Map(STANDARD_MAJOR_CATEGORIES_2026_FULL.map(item => [item.code, item]));
const standardDisciplineByCode = new Map(STANDARD_MAJOR_DISCIPLINES_2026.map(item => [item.code, item]));
const directDisciplineMajors = STANDARD_MAJOR_CATALOG_2026_FULL.filter(item => !item.categoryCode);
assert(directDisciplineMajors.length > 0, '2026 standard catalog must preserve direct-under-discipline majors');
assert(directDisciplineMajors.every(item => item.disciplineCode === '14' && item.disciplineName === '交叉学科'), 'only cross-discipline majors may omit category identity');
assert(standardByCode.get('140001TK')?.categoryCode === '', '未来机器人 must not invent category code');
assert(standardByCode.get('140012TK')?.categoryCode === '', '具身智能 must not invent category code');

for (const major of MAJOR_CATALOG_2026) {
  const standard = standardByCode.get(major.code);
  assert(standard, `browser undergraduate catalog major missing from canonical standard owner: ${major.code}`);
  const hierarchy = deriveMajorCatalogHierarchy(major);
  assert(hierarchy.disciplineCode === standard.disciplineCode, `discipline-code parity drift ${major.code}: ${hierarchy.disciplineCode}/${standard.disciplineCode}`);
  assert(hierarchy.disciplineName === standard.disciplineName, `discipline-name parity drift ${major.code}: ${hierarchy.disciplineName}/${standard.disciplineName}`);
  assert(hierarchy.categoryCode === standard.categoryCode, `category-code parity drift ${major.code}: ${hierarchy.categoryCode}/${standard.categoryCode}`);
  assert(hierarchy.categoryName === standard.categoryName, `category-name parity drift ${major.code}: ${hierarchy.categoryName}/${standard.categoryName}`);
  assert(hierarchy.categoryIsUnlisted === !standard.categoryCode, `category-unlisted parity drift ${major.code}`);
}

const graduateCodes = new Set(GRADUATE_CATALOG_2022.map(item => item.code));
let curated = 0;
let explicitNoCrosswalk = 0;
let routeCount = 0;
for (const major of MAJOR_CATALOG_2026) {
  const pathway = buildUndergradGraduatePathway(major);
  assert(pathway?.undergraduate?.code === major.code, `pathway lost undergraduate code ${major.code}`);
  assert(['curated_navigation','no_national_one_to_one'].includes(pathway.relationStatus), `invalid relation status ${major.code}`);
  const codes = [...pathway.academic, ...pathway.professional].map(item => item.code);
  assert(unique(codes), `duplicate graduate route for ${major.code}: ${codes.join(',')}`);
  for (const code of codes) assert(graduateCodes.has(code), `route ${major.code} points outside canonical graduate catalog: ${code}`);
  if (pathway.relationStatus === 'curated_navigation') curated += 1;
  else explicitNoCrosswalk += 1;
  routeCount += codes.length;
}
assert(curated + explicitNoCrosswalk === 883, 'every undergraduate major must have an explicit relation state');

const REL = createMajorRelationshipGraphResolver(MAJOR_CATALOG_2026);
const stats = REL.stats();
assert(stats.majors === 883, `relationship graph must consume all 883 majors, got ${stats.majors}`);
assert(stats.majorClasses === 92, `relationship graph must preserve all 92 canonical category identities, got ${stats.majorClasses}`);
assert(stats.disciplines === 13, `relationship graph must preserve all 13 undergraduate discipline identities, got ${stats.disciplines}`);
assert(stats.directDisciplineMajors === directDisciplineMajors.length, `direct-under-discipline count drift: ${stats.directDisciplineMajors}/${directDisciplineMajors.length}`);
assert(stats.version === 'major-relationship-graph-v002', 'relationship graph version drift');

const classCounts = new Map();
for (const standard of STANDARD_MAJOR_CATALOG_2026_FULL) {
  if (!standard.categoryCode) continue;
  assert(standardCategoryByCode.has(standard.categoryCode), `major points to non-canonical category ${standard.code}->${standard.categoryCode}`);
  classCounts.set(standard.categoryCode, (classCounts.get(standard.categoryCode) || 0) + 1);
}
assert(classCounts.size === 92, `canonical category count drift: ${classCounts.size}`);
let siblingEdges = 0;
let crossEdges = 0;
for (const major of MAJOR_CATALOG_2026) {
  const standard = standardByCode.get(major.code);
  const graph = REL.buildMajorGraph(major, { crossLimit: 20 });
  assert(graph?.focus?.code === major.code, `graph lost focus ${major.code}`);
  assert(graph.hierarchy.major.code === major.code, `hierarchy lost major ${major.code}`);
  assert(graph.hierarchy.discipline.code === standard.disciplineCode, `hierarchy discipline-code drift ${major.code}`);
  assert(graph.hierarchy.discipline.name === standard.disciplineName, `hierarchy discipline-name drift ${major.code}`);
  assert(graph.hierarchy.majorClass.code === standard.categoryCode, `hierarchy category-code drift ${major.code}`);
  assert(graph.hierarchy.majorClass.name === standard.categoryName, `hierarchy category-name drift ${major.code}`);
  assert(graph.hierarchy.majorClass.isUnlisted === !standard.categoryCode, `hierarchy unlisted-class drift ${major.code}`);
  const expectedSiblings = standard.categoryCode ? (classCounts.get(standard.categoryCode) || 1) - 1 : 0;
  assert(graph.siblings.length === expectedSiblings, `sibling completeness drift ${major.code}: ${graph.siblings.length}/${expectedSiblings}`);
  assert(graph.siblingRelations.length === expectedSiblings, `sibling relation completeness drift ${major.code}`);
  for (const relation of graph.siblingRelations) {
    const target = standardByCode.get(relation.target.code);
    assert(target?.categoryCode === standard.categoryCode, `sibling escaped canonical category ${major.code}->${relation.target.code}`);
    assert(relation.sameClass === true, `sibling relation must be same class ${major.code}->${relation.target.code}`);
    assert(relation.relationTypes.includes('same_undergraduate_major_class'), `sibling relation type missing ${major.code}->${relation.target.code}`);
    siblingEdges += 1;
  }
  for (const relation of graph.crossNeighbors) {
    const target = standardByCode.get(relation.target.code);
    assert(relation.sameClass === false, `cross neighbor duplicated same-class edge ${major.code}->${relation.target.code}`);
    assert(!standard.categoryCode || target?.categoryCode !== standard.categoryCode, `cross neighbor shares canonical category ${major.code}->${relation.target.code}`);
    assert(relation.sharedRouteCount > 0, `cross neighbor lacks graduate-path evidence ${major.code}->${relation.target.code}`);
    assert(relation.relationTypes.some(type => type === 'shared_academic_navigation' || type === 'shared_professional_navigation'), `cross relation lacks route type ${major.code}->${relation.target.code}`);
    crossEdges += 1;
  }
}
assert(siblingEdges > 0, 'relationship graph must expose real same-class edges');
assert(crossEdges > 0, 'relationship graph must expose evidence-backed cross-class edges');

let classMajorTotal = 0;
for (const [categoryCode, expectedCount] of classCounts) {
  const graph = REL.buildClassGraph(categoryCode);
  assert(graph, `class graph missing code ${categoryCode}`);
  assert(graph.majorClass.code === categoryCode, `class graph identity drift ${categoryCode}`);
  assert(graph.majorClass.name === standardCategoryByCode.get(categoryCode)?.name, `class graph display-name drift ${categoryCode}`);
  assert(graph.majors.length === expectedCount, `class graph count drift ${categoryCode}: ${graph.majors.length}/${expectedCount}`);
  assert(graph.majors.every(item => standardByCode.get(item.code)?.categoryCode === categoryCode), `class graph leaked another category ${categoryCode}`);
  for (const route of graph.commonGraduateRoutes) assert(graduateCodes.has(route.code), `class graph ${categoryCode} emitted non-canonical graduate route ${route.code}`);
  classMajorTotal += graph.majors.length;
}
assert(classMajorTotal + directDisciplineMajors.length === 883, `class graphs + direct-discipline majors must cover 883: ${classMajorTotal}+${directDisciplineMajors.length}`);

for (const discipline of STANDARD_MAJOR_DISCIPLINES_2026) {
  const graph = REL.buildDisciplineGraph(discipline.code);
  assert(graph, `discipline graph missing ${discipline.code}`);
  assert(graph.discipline.code === discipline.code && graph.discipline.name === discipline.name, `discipline graph identity drift ${discipline.code}`);
  const standardMajors = STANDARD_MAJOR_CATALOG_2026_FULL.filter(item => item.disciplineCode === discipline.code);
  assert(graph.categories.reduce((sum, item) => sum + item.majors.length, 0) + graph.directMajors.length === standardMajors.length, `discipline graph coverage drift ${discipline.code}`);
  for (const direct of graph.directMajors) assert(standardByCode.get(direct.code)?.categoryCode === '', `direct discipline graph major gained category ${direct.code}`);
}
const crossDisciplineGraph = REL.buildDisciplineGraph('14');
assert(crossDisciplineGraph?.categories.length === 0, '交叉学科 must not invent a 1400 category node');
assert(crossDisciplineGraph?.directMajors.length === directDisciplineMajors.length, '交叉学科 direct-major coverage drift');
assert(crossDisciplineGraph.directMajors.some(item => item.code === '140012TK'), '交叉学科 graph lost 具身智能');

const embodied = REL.buildMajorGraph('140012TK');
assert(embodied?.hierarchy.discipline.code === '14', '具身智能 discipline identity drift');
assert(embodied?.hierarchy.majorClass.code === '' && embodied?.hierarchy.majorClass.isUnlisted === true, '具身智能 must not invent 1400 category');
assert(embodied?.siblings.length === 0, '具身智能 must not receive invented same-category siblings');

const cs = MAJOR_CATALOG_2026.find(item => item.name === '计算机科学与技术');
const software = MAJOR_CATALOG_2026.find(item => item.name === '软件工程');
const ai = MAJOR_CATALOG_2026.find(item => item.name === '人工智能');
assert(cs && software && ai, 'representative computing majors missing');
const csSoftware = REL.relationship(cs, software);
assert(csSoftware?.sameClass === true, '计算机科学与技术 / 软件工程 must retain official same-class relation');
assert(csSoftware.sharedRouteCount > 0, '计算机科学与技术 / 软件工程 should expose shared graduate navigation when present');
const csAi = REL.relationship(cs, ai);
assert(csAi && csAi.sameClass === false && csAi.sharedRouteCount >= 2, '计算机科学与技术 / 人工智能 cross-class relation requires multiple shared graduate routes');
const csGraph = REL.buildMajorGraph(cs, { crossLimit: 20 });
assert(csGraph.crossNeighbors.some(item => item.target.code === ai.code), '计算机科学与技术 graph should surface evidence-backed 人工智能 cross-class neighbor');
const computerClass = REL.buildClassGraph('计算机类');
assert(computerClass?.majorClass.code === '0809', '计算机类 class graph must resolve to canonical code 0809');
assert(computerClass?.majors.some(item => item.name === '计算机科学与技术'), '计算机类 graph lost 计算机科学与技术');
assert(computerClass?.majors.some(item => item.name === '软件工程'), '计算机类 graph lost 软件工程');

const candidateGraph = REL.buildCandidateGraph([
  MAJOR_CATALOG_2026.find(item => item.code === '080301'),
  MAJOR_CATALOG_2026.find(item => item.code === '080720T')
]);
assert(candidateGraph.candidateCount === 2, '测控 candidate graph must keep both canonical candidates');
assert(candidateGraph.groups.length >= 1, 'candidate graph must group candidates by canonical class');

const SEARCH = createMajorSearchIntentResolver(MAJOR_CATALOG_2026, ADMISSION_MAJOR_ALIAS_2026);
assert(SEARCH.count === 883, `search owner must consume all 883 majors, got ${SEARCH.count}`);
assert(MAJOR_SEARCH_INTENT_META.boundary.includes('不得静默升级'), 'search owner must forbid silent major selection');
function assertAmbiguous(query, requiredCodes = []) {
  const result = SEARCH.resolve(query, { limit: 8 });
  assert(result.kind === 'ambiguous', `${query} must disambiguate; actual=${semanticSnapshot(result)}`);
  const allCodes = (result.allCandidates || []).map(item => item.code);
  for (const code of requiredCodes) assert(allCodes.includes(code), `${query} missing candidate ${code}; actual=${semanticSnapshot(result)}`);
  return result;
}
const computerClassSearch = assertAmbiguous('计算机类', ['080901','080902','080903']);
assert(computerClassSearch.semanticType === 'major_class' && computerClassSearch.label === '计算机类', `计算机类 must preserve class semantic view; actual=${semanticSnapshot(computerClassSearch)}`);
const computerStem = assertAmbiguous('计算机', ['080901','080902','080903']);
assert(computerStem.semanticType === 'class_stem' && computerStem.label === '计算机类', `计算机 must preserve class-stem semantic view; actual=${semanticSnapshot(computerStem)}`);
assertAmbiguous('机械', ['080201','080202','080204']);
assertAmbiguous('测控', ['080301','080720T']);
const jike = SEARCH.resolve('计科');
assert(jike.kind === 'direct' && jike.major?.code === '080901', `计科 must resolve to 080901; actual=${semanticSnapshot(jike)}`);

const html = fs.readFileSync('major-path/index.html','utf8');
const app = fs.readFileSync('major-path/app-core.v005.js','utf8');
const human = fs.readFileSync('major-path/app.v005.js','utf8');
const baseCss = fs.readFileSync('major-path/major-path.v001.css','utf8');
const graphCss = fs.readFileSync('major-path/major-path-graph.v002.css','utf8');
assert(html.includes('data-major-path-version="major-path-v0.05"'), 'current major-path v0.05 page marker missing');
assert(html.includes('data-major-path-core-version="major-path-core-v0.05"'), 'v0.05 core marker missing');
assert(html.includes('name="major-path-core-app" content="/major-path/app-core.v005.js?v=005_0"'), 'v0.05 core app declaration missing');
assert(html.includes('/major-path/app.v005.js?v=005_0'), 'v0.05 presentation app edge missing');
assert(!html.includes('/major-path/app.v003.js?v=003_0'), 'retired v0.03 presentation wrapper must not remain active');
assert(html.includes('/major-path/major-path.v001.css?v=001_0'), 'stable base CSS edge missing');
assert(html.includes('/major-path/major-path-graph.v002.css?v=002_0'), 'v0.02 graph CSS edge missing');
assert(!html.includes('/major-path/app.v001.js?v=001_0'), 'retired v0.01 app must not remain active');
assert(human.includes("await import('./app-core.v005.js?v=005_0')"), 'v0.05 presentation must delegate directly to the single v0.05 core runtime');
assert(!human.includes('app.v003.js'), 'v0.04 must not create a v0.04 -> v0.03 -> v0.02 wrapper chain');
assert(app.includes('createMajorRelationshipGraphResolver'), 'truth core must use relationship graph owner');
assert(app.includes('renderDirectorySvg') && app.includes('renderNeighborSvg') && app.includes('renderClassSvg') && app.includes('renderCandidateSvg'), 'all graph search perspectives must remain implemented in truth core');
assert(app.includes('buildDisciplineGraph'), 'browse must consume canonical discipline graph instead of rebuilding hierarchy');
assert(app.includes('二级学科与专业领域由学位授予单位') && app.includes('自主设置与调整'), 'truth core must preserve graduate second-level boundary');
assert(app.includes('专业类未单列'), 'truth core must preserve direct-under-discipline explanation');
assert(app.includes('data-major-relationship-graph'), 'specific-major graph mount missing from truth core');
assert(app.includes('data-class-relationship-graph'), 'major-class graph mount missing from truth core');
assert(app.includes('graph-viewport'), 'graph viewport owner missing from truth core');
assert(!app.includes('fetch('), 'major path core must remain deterministic/static; no runtime crawler');
assert(!/localStorage|sessionStorage|indexedDB/.test(app), 'relationship graph must not invent persistent state');
assert(baseCss.includes('@media(max-width:760px)'), 'stable base responsive CSS missing');
assert(graphCss.includes('.relationship-svg') && graphCss.includes('.graph-edge-catalog') && graphCss.includes('.graph-edge-cross'), 'SVG graph styles missing');
assert(graphCss.includes('overflow-x:auto') && graphCss.includes('min-width:720px'), 'mobile graph must own horizontal panning without document overflow');
assert(graphCss.includes('@media(max-width:760px)') && graphCss.includes('@media(max-width:390px)'), 'Pad/Android graph responsive contracts missing');
assert(!/if\s*\([^)]*(Android|iPad|iPhone)/i.test(app), 'device-specific business state is forbidden');

console.log(JSON.stringify({
  ok:true,
  version:'major-path-verifier-v0.02',
  undergraduate:MAJOR_CATALOG_2026.length,
  graduate:GRADUATE_CATALOG_2022.length,
  disciplines:stats.disciplines,
  majorClasses:stats.majorClasses,
  directDisciplineMajors:stats.directDisciplineMajors,
  curated,
  explicitNoCrosswalk,
  routeCount,
  siblingEdges,
  crossEdges,
  relationshipGraph:stats.version,
  searchAliases:SEARCH.aliasCount
},null,2));