import fs from 'node:fs';
import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../ln-rank/kb/major-understanding/admission-major-alias.generated.js';
import { GRADUATE_CATALOG_2022, GRADUATE_CATALOG_2022_META, GRADUATE_CATALOG_SOURCES } from '../shared/resources/graduate/graduate-catalog-2022.v001.js';
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

assert(MAJOR_CATALOG_2026_META.total === 883, `undergraduate source meta must remain 883, got ${MAJOR_CATALOG_2026_META.total}`);
assert(MAJOR_CATALOG_2026.length === 883, `undergraduate runtime count must remain 883, got ${MAJOR_CATALOG_2026.length}`);
assert(unique(MAJOR_CATALOG_2026.map(item => item.code)), 'undergraduate codes must be unique');
assert(GRADUATE_CATALOG_2022_META.count === 184, `graduate catalog count drift: ${GRADUATE_CATALOG_2022_META.count}`);
assert(GRADUATE_CATALOG_2022.length === 184, 'graduate catalog runtime count drift');
assert(unique(GRADUATE_CATALOG_2022.map(item => item.code)), 'graduate four-digit codes must be unique');
assert(Object.values(GRADUATE_CATALOG_SOURCES).every(source => /^https:\/\/www\.moe\.gov\.cn\//.test(source.url)), 'graduate sources must stay on official MOE host');
assert(UNDERGRAD_GRADUATE_PATHWAY_META.boundary.includes('一一对应表'), 'cross-level no-one-to-one boundary missing');
assert(MAJOR_RELATIONSHIP_GRAPH_META.undergraduateBoundary.includes('2026本科专业目录'), 'relationship graph must derive from canonical undergraduate catalog');
assert(MAJOR_RELATIONSHIP_GRAPH_META.graduateBoundary.includes('二级学科') && MAJOR_RELATIONSHIP_GRAPH_META.graduateBoundary.includes('自主设置'), 'graduate second-level boundary must be explicit');
assert(MAJOR_RELATIONSHIP_GRAPH_META.neighborBoundary.includes('不代表课程相同'), 'neighbor boundary must forbid course-equivalence inference');

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
assert(stats.majorClasses === 92, `relationship graph must preserve all 92 major classes, got ${stats.majorClasses}`);
assert(stats.disciplines === 13, `relationship graph must preserve all 13 undergraduate disciplines, got ${stats.disciplines}`);
assert(stats.version === 'major-relationship-graph-v002', 'relationship graph version drift');

const classCounts = new Map();
for (const major of MAJOR_CATALOG_2026) classCounts.set(major.majorClass, (classCounts.get(major.majorClass) || 0) + 1);
assert(classCounts.size === 92, 'canonical class count drift');
let siblingEdges = 0;
let crossEdges = 0;
for (const major of MAJOR_CATALOG_2026) {
  const graph = REL.buildMajorGraph(major, { crossLimit: 20 });
  assert(graph?.focus?.code === major.code, `graph lost focus ${major.code}`);
  assert(graph.hierarchy.major.code === major.code, `hierarchy lost major ${major.code}`);
  assert(graph.hierarchy.majorClass.name === major.majorClass, `hierarchy class drift ${major.code}`);
  assert(graph.hierarchy.discipline.name === major.discipline, `hierarchy discipline drift ${major.code}`);
  const expectedSiblings = (classCounts.get(major.majorClass) || 1) - 1;
  assert(graph.siblings.length === expectedSiblings, `sibling completeness drift ${major.code}: ${graph.siblings.length}/${expectedSiblings}`);
  assert(graph.siblingRelations.length === expectedSiblings, `sibling relation completeness drift ${major.code}`);
  for (const relation of graph.siblingRelations) {
    assert(relation.source.code === major.code, `sibling source drift ${major.code}`);
    assert(relation.target.majorClass === major.majorClass, `sibling escaped class ${major.code}->${relation.target.code}`);
    assert(relation.sameClass === true, `sibling relation must be same class ${major.code}->${relation.target.code}`);
    assert(relation.relationTypes.includes('same_undergraduate_major_class'), `sibling relation type missing ${major.code}->${relation.target.code}`);
    assert(MAJOR_CATALOG_2026.some(item => item.code === relation.target.code), `sibling points outside canonical catalog ${relation.target.code}`);
    siblingEdges += 1;
  }
  for (const relation of graph.crossNeighbors) {
    assert(relation.sameClass === false, `cross neighbor duplicated same-class edge ${major.code}->${relation.target.code}`);
    assert(relation.sharedRouteCount > 0, `cross neighbor lacks graduate-path evidence ${major.code}->${relation.target.code}`);
    assert(relation.relationTypes.some(type => type === 'shared_academic_navigation' || type === 'shared_professional_navigation'), `cross relation lacks route type ${major.code}->${relation.target.code}`);
    assert(MAJOR_CATALOG_2026.some(item => item.code === relation.target.code), `cross relation points outside canonical catalog ${relation.target.code}`);
    crossEdges += 1;
  }
}
assert(siblingEdges > 0, 'relationship graph must expose real same-class edges');
assert(crossEdges > 0, 'relationship graph must expose evidence-backed cross-class edges');

let classMajorTotal = 0;
for (const className of classCounts.keys()) {
  const graph = REL.buildClassGraph(className);
  assert(graph, `class graph missing ${className}`);
  assert(graph.majors.length === classCounts.get(className), `class graph count drift ${className}`);
  assert(graph.majors.every(item => item.majorClass === className), `class graph leaked another class ${className}`);
  for (const route of graph.commonGraduateRoutes) assert(graduateCodes.has(route.code), `class graph ${className} emitted non-canonical graduate route ${route.code}`);
  classMajorTotal += graph.majors.length;
}
assert(classMajorTotal === 883, `all class graphs must cover 883 majors, got ${classMajorTotal}`);

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
const app = fs.readFileSync('major-path/app.v002.js','utf8');
const baseCss = fs.readFileSync('major-path/major-path.v001.css','utf8');
const graphCss = fs.readFileSync('major-path/major-path-graph.v002.css','utf8');
assert(html.includes('data-major-path-version="major-path-v0.02"'), 'v0.02 page version marker missing');
assert(html.includes('关系图不是“平替排行榜”'), 'human relationship boundary copy missing');
assert(html.includes('二级学科与专业领域由学位授予单位'), 'graduate second-level human boundary missing');
assert(html.includes('/major-path/app.v002.js?v=002_0'), 'v0.02 app edge missing');
assert(html.includes('/major-path/major-path.v001.css?v=001_0'), 'stable base CSS edge missing');
assert(html.includes('/major-path/major-path-graph.v002.css?v=002_0'), 'v0.02 graph CSS edge missing');
assert(!html.includes('/major-path/app.v001.js?v=001_0'), 'retired v0.01 app must not remain active');
assert(app.includes('createMajorRelationshipGraphResolver'), 'page must use relationship graph owner');
assert(app.includes('renderDirectorySvg') && app.includes('renderNeighborSvg') && app.includes('renderClassSvg') && app.includes('renderCandidateSvg'), 'all graph search perspectives must be implemented');
assert(app.includes('二级学科与专业领域由学位授予单位') && app.includes('自主设置与调整'), 'runtime must explain graduate second-level boundary in parent language');
assert(app.includes('data-major-relationship-graph'), 'specific-major graph mount missing');
assert(app.includes('data-class-relationship-graph'), 'major-class graph mount missing');
assert(app.includes('graph-viewport'), 'graph viewport owner missing');
assert(!app.includes('fetch('), 'major path v0.02 must remain deterministic/static; no runtime crawler');
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
  curated,
  explicitNoCrosswalk,
  routeCount,
  siblingEdges,
  crossEdges,
  relationshipGraph:stats.version,
  searchAliases:SEARCH.aliasCount
},null,2));
