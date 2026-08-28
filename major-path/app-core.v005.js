import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../ln-rank/kb/major-understanding/admission-major-alias.generated.js?v=3949_0';
import { resolveMajorUnderstanding } from '../ln-rank/js/knowledge/major-understanding-resolver.js?v=3949_0';
import { buildUndergradGraduatePathway, UNDERGRAD_GRADUATE_PATHWAY_META } from '../shared/resources/majors/undergrad-graduate-pathway.v001.js?v=001_0';
import { createMajorSearchIntentResolver, MAJOR_SEARCH_INTENT_META } from '../shared/resources/majors/major-search-intent.v001.js?v=001_0';
import { createMajorRelationshipGraphResolver, MAJOR_RELATIONSHIP_GRAPH_META } from '../shared/resources/majors/major-relationship-graph.v002.js?v=002_0';
import { GRADUATE_CATALOG_SOURCES } from '../shared/resources/graduate/graduate-catalog-2022.v001.js?v=001_0';

const UNDERGRAD_SOURCE = Object.freeze({
  issuer: '教育部',
  title: '普通高等学校本科专业目录（2026年）',
  url: 'https://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html'
});
const SEARCH = createMajorSearchIntentResolver(MAJOR_CATALOG_2026, ADMISSION_MAJOR_ALIAS_2026);
const RELATIONSHIPS = createMajorRelationshipGraphResolver(MAJOR_CATALOG_2026);
const els = {
  form: document.querySelector('#searchForm'), input: document.querySelector('#majorInput'),
  suggestions: document.querySelector('#suggestions'), result: document.querySelector('#result'),
  disciplineChips: document.querySelector('#disciplineChips'), classBrowser: document.querySelector('#classBrowser')
};
let activeSuggestionIndex = 0;

function syncSuggestionActive(index) {
  const options = [...els.suggestions.querySelectorAll('[role="option"]')];
  if (!options.length) return;
  activeSuggestionIndex = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => {
    const active = optionIndex === activeSuggestionIndex;
    option.classList.toggle('active', active);
    option.setAttribute('aria-selected', String(active));
  });
  els.input?.setAttribute('aria-activedescendant', options[activeSuggestionIndex].id);
}

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function findMajor(code) { return MAJOR_CATALOG_2026.find(item => item.code === code) || null; }
function shortLabel(value = '', max = 13) { const text = String(value || ''); return text.length > max ? `${text.slice(0,max-1)}…` : text; }
function hierarchyFor(major) { return RELATIONSHIPS.buildMajorGraph(major)?.hierarchy || null; }
function majorContext(item) {
  const h = hierarchyFor(item);
  if (!h) return `${item.discipline || ''}${item.majorClass ? ` · ${item.majorClass}` : ''}`;
  return h.majorClass.code ? `${h.discipline.name} · ${h.majorClass.name}` : `${h.discipline.name} · 专业类未单列`;
}

function svgNode({x,y,width=230,height=54,title,meta='',kind='plain',majorCode='',extraClass=''}) {
  const interactive = majorCode ? ` data-major-code="${escapeHtml(majorCode)}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(title)}"` : '';
  return `<g class="graph-node graph-node-${escapeHtml(kind)} ${escapeHtml(extraClass)}"${interactive}><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14"></rect><text x="${x+14}" y="${y+22}"><tspan class="graph-node-title">${escapeHtml(shortLabel(title))}</tspan>${meta ? `<tspan class="graph-node-meta" x="${x+14}" dy="18">${escapeHtml(shortLabel(meta,22))}</tspan>` : ''}</text></g>`;
}
function graphPath(x1,y1,x2,y2,kind='catalog') { const bend=Math.max(40,Math.abs(x2-x1)*.42); return `<path class="graph-edge graph-edge-${escapeHtml(kind)}" d="M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}"></path>`; }
function graphLegend() { return `<div class="graph-legend" aria-label="图例"><span><i class="legend-line catalog"></i>本科目录硬关系</span><span><i class="legend-line graduate"></i>研究生升学导航</span><span><i class="legend-line cross"></i>跨专业类升学交叉</span></div>`; }

function suggestionItem(item,index=0) {
  return `<button type="button" id="major-suggestion-${escapeHtml(item.code)}" class="suggestion${index===0?' active':''}" role="option" aria-selected="${index===0?'true':'false'}" data-major-code="${escapeHtml(item.code)}"><span class="suggestion-main"><span class="suggestion-name">${escapeHtml(item.name)}</span><span class="suggestion-meta">${escapeHtml(majorContext(item))}</span></span><span class="suggestion-type">${escapeHtml(item.code)}</span></button>`;
}
function renderSuggestions(query) {
  activeSuggestionIndex = 0;
  els.input?.removeAttribute('aria-activedescendant');
  const intent=SEARCH.resolve(query,{limit:8});
  if(intent.kind==='empty'){ els.suggestions.hidden=true; els.suggestions.innerHTML=''; els.input?.setAttribute('aria-expanded','false'); return; }
  els.suggestions.hidden=false;
  els.input?.setAttribute('aria-expanded','true');
  if(intent.kind==='none'){ els.suggestions.innerHTML='<div class="suggestion-context"><strong>暂时没认出这是哪个本科专业</strong><span>可以输入正式专业名、六位专业代码，或家长常用简称，例如“机械”“电气”“计科”“测控”。</span></div>'; return; }
  if(intent.kind==='direct'){ els.suggestions.innerHTML=`${intent.explanation?`<div class="suggestion-context"><strong>已按家长常用说法识别</strong><span>${escapeHtml(intent.explanation)}</span></div>`:''}${suggestionItem(intent.major,0)}`; return; }
  const more=intent.total>intent.candidates.length?`还有 ${intent.total-intent.candidates.length} 个同类候选；提交后可以展开全部。`:'先选一个正式本科专业，再看它在专业家族和读研路径里的位置。';
  els.suggestions.innerHTML=`<div class="suggestion-context"><strong>你可能在找下面这些专业</strong><span>${escapeHtml(intent.explanation)} ${escapeHtml(more)}</span></div>${intent.candidates.map(suggestionItem).join('')}`;
}

function degreeItem(item,professional=false) {
  const kind=professional?'专业学位类别':'一级学科';
  const masters=item.mastersOnly?' · 仅硕士专业学位':'';
  const note=item.note?` · ${escapeHtml(item.note)}`:'';
  return `<div class="degree-item"><div><div class="degree-name"><span class="degree-code">${escapeHtml(item.code)}</span> ${escapeHtml(item.name)}</div><div class="degree-meta">研究生目录 · ${kind}${masters}${note}</div></div><span class="degree-tag${professional?' professional':''}">${professional?'专硕':'学硕'}</span></div>`;
}
function sourceItem(source,detail) { return `<div class="source-item"><div class="source-main"><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.issuer)}${detail?` · ${escapeHtml(detail)}`:''}</span></div><a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">查看官方来源</a></div>`; }
function renderFields(fields=[]) {
  if(!fields.length) return '';
  return `<div class="field-block"><h4 class="field-title">当前国家招生规定明确点名的专业学位细分领域</h4><div class="field-grid">${fields.map(field=>{const required=field.workExperienceRequired;const status=required?'2026 有工作经历要求':'2026 可按当年招生规定核验';return `<div class="field-item"><div class="field-head"><div class="field-name"><span class="degree-code">${escapeHtml(field.code)}</span> ${escapeHtml(field.name)}</div><span class="rule-chip${required?'':' open'}">${escapeHtml(status)}</span></div>${field.note?`<p>${escapeHtml(field.note)}</p>`:''}${field.futureRule?`<p><strong>已公布的变化：</strong>${escapeHtml(field.futureRule)}</p>`:''}</div>`;}).join('')}</div></div>`;
}
function graduateRouteText(relation) { return [...(relation.shared?.academic||[]),...(relation.shared?.professional||[])].map(item=>`${item.code} ${item.name}`).join('、'); }

function renderDirectorySvg(graph) {
  if(graph.hierarchy.majorClass.isUnlisted){
    const edges=graphPath(280,77,610,77,'catalog');
    const nodes=svgNode({x:40,y:50,width:240,title:graph.hierarchy.discipline.name,meta:`本科门类 ${graph.hierarchy.discipline.code}`,kind:'discipline'})+svgNode({x:610,y:50,width:300,title:graph.focus.name,meta:`本科专业 ${graph.focus.code}`,kind:'focus',majorCode:graph.focus.code});
    return `<svg class="relationship-svg" viewBox="0 0 980 230" role="img" aria-label="${escapeHtml(graph.focus.name)}本科目录关系图"><g>${edges}</g><g>${nodes}<text class="graph-annotation" x="360" y="62">2026目录：专业类未单列</text><text class="graph-annotation-sub" x="360" y="84">不补造“1400专业类”</text></g></svg>`;
  }
  const shown=graph.siblings.slice(0,8), summary=Math.max(0,graph.siblings.length-shown.length), height=Math.max(340,170+(shown.length+(summary?1:0))*66);
  let edges=graphPath(260,67,330,67,'catalog')+graphPath(570,67,650,67,'catalog');
  let nodes=svgNode({x:40,y:40,width:220,title:graph.hierarchy.discipline.name,meta:`本科门类 ${graph.hierarchy.discipline.code}`,kind:'discipline'})+svgNode({x:330,y:40,width:240,title:graph.hierarchy.majorClass.name,meta:`本科专业类 ${graph.hierarchy.majorClass.code}`,kind:'class'})+svgNode({x:650,y:40,width:280,title:graph.focus.name,meta:`当前专业 ${graph.focus.code}`,kind:'focus',majorCode:graph.focus.code});
  shown.forEach((item,index)=>{const y=135+index*66;edges+=graphPath(570,67,650,y+27,'catalog');nodes+=svgNode({x:650,y,width:280,title:item.name,meta:`同类专业 ${item.code}`,kind:'sibling',majorCode:item.code});});
  if(summary){const y=135+shown.length*66;edges+=graphPath(570,67,650,y+27,'catalog');nodes+=svgNode({x:650,y,width:280,title:`还有 ${summary} 个同类专业`,meta:'下方列表可全部查看',kind:'summary'});}
  return `<svg class="relationship-svg" viewBox="0 0 980 ${height}" role="img" aria-label="${escapeHtml(graph.focus.name)}本科目录关系图"><g>${edges}</g><g>${nodes}</g></svg>`;
}

function renderNeighborSvg(graph) {
  const same=[...graph.siblingRelations].sort((a,b)=>b.sharedRouteCount-a.sharedRouteCount||a.target.code.localeCompare(b.target.code)).slice(0,5), cross=graph.crossNeighbors.slice(0,5);
  const routes=[...(graph.pathway.academic||[]).map(item=>({...item,kind:'academic'})),...(graph.pathway.professional||[]).map(item=>({...item,kind:'professional'}))].slice(0,6);
  const rows=Math.max(same.length,cross.length,routes.length,1), height=190+rows*66;
  let edges='', nodes=svgNode({x:360,y:40,width:260,title:graph.focus.name,meta:`当前专业 ${graph.focus.code}`,kind:'focus',majorCode:graph.focus.code});
  nodes+=`<text class="graph-group-title" x="40" y="150">${graph.hierarchy.majorClass.isUnlisted?'专业类未单列':'同专业类'}</text><text class="graph-group-title" x="370" y="150">共享的读研导航</text><text class="graph-group-title" x="700" y="150">跨专业类升学交叉</text>`;
  same.forEach((relation,index)=>{const y=170+index*66;edges+=graphPath(360,67,270,y+27,'catalog');nodes+=svgNode({x:40,y,width:230,title:relation.target.name,meta:relation.sharedRouteCount?`共享 ${relation.sharedRouteCount} 个读研方向`:'同一本科专业类',kind:'sibling',majorCode:relation.target.code});});
  routes.forEach((route,index)=>{const y=170+index*66;edges+=graphPath(490,94,490,y,'graduate');nodes+=svgNode({x:370,y,width:240,title:route.name,meta:`${route.code} · ${route.kind==='academic'?'一级学科':'专业学位类别'}`,kind:'graduate'});});
  cross.forEach((relation,index)=>{const y=170+index*66;edges+=graphPath(620,67,700,y+27,'cross');nodes+=svgNode({x:700,y,width:240,title:relation.target.name,meta:`共享 ${relation.sharedRouteCount} 个读研方向`,kind:'cross',majorCode:relation.target.code});});
  if(!same.length) nodes+=`<text class="graph-empty" x="40" y="192">${graph.hierarchy.majorClass.isUnlisted?'2026目录未单列专业类':'当前专业类没有其他本科专业'}</text>`;
  if(!routes.length) nodes+='<text class="graph-empty" x="370" y="192">国家目录层面暂无可直接展示的方向</text>';
  if(!cross.length) nodes+='<text class="graph-empty" x="700" y="192">暂无证据足够强的跨类节点</text>';
  return `<svg class="relationship-svg" viewBox="0 0 980 ${height}" role="img" aria-label="${escapeHtml(graph.focus.name)}相邻专业与读研方向关系图"><g>${edges}</g><g>${nodes}</g></svg>`;
}

function renderClassSvg(classGraph) {
  const shown=classGraph.majors.slice(0,12), summary=Math.max(0,classGraph.majors.length-shown.length), height=Math.max(330,120+(shown.length+(summary?1:0))*62);
  let edges=graphPath(250,67,330,67,'catalog');
  let nodes=svgNode({x:40,y:40,width:210,title:classGraph.discipline.name,meta:`本科门类 ${classGraph.discipline.code}`,kind:'discipline'})+svgNode({x:330,y:40,width:250,title:classGraph.majorClass.name,meta:`本科专业类 ${classGraph.majorClass.code}`,kind:'class'});
  shown.forEach((major,index)=>{const y=25+index*62;edges+=graphPath(580,67,660,y+27,'catalog');nodes+=svgNode({x:660,y,width:270,title:major.name,meta:major.code,kind:'sibling',majorCode:major.code});});
  if(summary){const y=25+shown.length*62;edges+=graphPath(580,67,660,y+27,'catalog');nodes+=svgNode({x:660,y,width:270,title:`还有 ${summary} 个专业`,meta:'下方候选列表完整保留',kind:'summary'});}
  return `<svg class="relationship-svg" viewBox="0 0 980 ${height}" role="img" aria-label="${escapeHtml(classGraph.majorClass.name)}本科专业类关系图"><g>${edges}</g><g>${nodes}</g></svg>`;
}

function renderDirectDisciplineSvg(disciplineGraph) {
  const shown=disciplineGraph.directMajors.slice(0,12), summary=Math.max(0,disciplineGraph.directMajors.length-shown.length), height=Math.max(300,100+(shown.length+(summary?1:0))*62);
  let edges='', nodes=svgNode({x:40,y:40,width:240,title:disciplineGraph.discipline.name,meta:`本科门类 ${disciplineGraph.discipline.code}`,kind:'discipline'});
  shown.forEach((major,index)=>{const y=25+index*62;edges+=graphPath(280,67,620,y+27,'catalog');nodes+=svgNode({x:620,y,width:300,title:major.name,meta:`${major.code} · 专业类未单列`,kind:'sibling',majorCode:major.code});});
  if(summary){const y=25+shown.length*62;edges+=graphPath(280,67,620,y+27,'catalog');nodes+=svgNode({x:620,y,width:300,title:`还有 ${summary} 个专业`,meta:'下方列表完整保留',kind:'summary'});}
  return `<svg class="relationship-svg" viewBox="0 0 980 ${height}" role="img" aria-label="${escapeHtml(disciplineGraph.discipline.name)}直接列入门类的本科专业"><g>${edges}</g><g>${nodes}<text class="graph-annotation" x="350" y="55">2026目录：专业类未单列</text><text class="graph-annotation-sub" x="350" y="77">门类直接连接具体专业</text></g></svg>`;
}

function renderCandidateSvg(candidateGraph,query='') {
  const groups=candidateGraph.groups.slice(0,6); let y=34,edges='',nodes=svgNode({x:35,y:40,width:210,title:`“${query}”`,meta:'家长输入',kind:'query'});
  for(const group of groups){const groupY=y;const groupTitle=group.categoryIsUnlisted?`${group.discipline} · 专业类未单列`:group.majorClass;const groupMeta=group.categoryIsUnlisted?`本科门类 ${group.disciplineCode}`:`${group.majorClassCode} · ${group.discipline}`;nodes+=svgNode({x:330,y:groupY,width:250,title:groupTitle,meta:groupMeta,kind:group.categoryIsUnlisted?'unlisted':'class'});edges+=graphPath(245,67,330,groupY+27,'catalog');for(const major of group.majors.slice(0,5)){nodes+=svgNode({x:660,y,width:270,title:major.name,meta:major.code,kind:'sibling',majorCode:major.code});edges+=graphPath(580,groupY+27,660,y+27,'catalog');y+=62;}y+=24;}
  return `<svg class="relationship-svg" viewBox="0 0 980 ${Math.max(310,y+30)}" role="img" aria-label="${escapeHtml(query)}候选专业归类关系图"><g>${edges}</g><g>${nodes}</g></svg>`;
}

function warmMajorCopy(graph) {
  if(graph.hierarchy.majorClass.isUnlisted){
    const crossText=graph.crossNeighborTotal?`还能找到 ${graph.crossNeighborTotal} 个有结构证据的升学交叉点。`:'目前没有必要为了“扩展选择”硬凑跨专业类关系。';
    return `这个专业在2026本科目录里直接列在“${graph.focus.discipline}”门类下，专业类未单列，所以这里不会补造一个“1400专业类”。${crossText} 这些交叉点适合继续了解，但不是课程一样或无条件平替。`;
  }
  const sharedSiblingCount=graph.siblingRelations.filter(item=>item.sharedRouteCount>0).length;
  const siblingText=graph.siblings.length?`它在“${graph.focus.majorClass}”这个专业家族里还有 ${graph.siblings.length} 个兄弟专业${sharedSiblingCount?`，其中 ${sharedSiblingCount} 个与它共享当前页面已验证的研究生导航方向`:''}。`:`它所在的“${graph.focus.majorClass}”当前没有其他本科专业。`;
  const crossText=graph.crossNeighborTotal?`另外还能找到 ${graph.crossNeighborTotal} 个有结构证据的跨专业类升学交叉点，图中只展示证据更集中的一部分。`:'目前没有必要为了“扩展选择”硬凑跨专业类关系。';
  return `${siblingText}${crossText} 这些节点适合一起比较，但不是“课程一样”或“可以无条件平替”的结论；具体课程仍要看学校培养方案。`;
}
function relationshipList(graph) {
  const same=graph.siblingRelations.slice(0,12),cross=graph.crossNeighbors.slice(0,8);
  const firstTitle=graph.hierarchy.majorClass.isUnlisted?'本科目录层级提醒':'同专业类可以一起看';
  const firstBody=graph.hierarchy.majorClass.isUnlisted?'<p>2026目录在交叉学科门类下未给这个专业单列专业类，因此这里不制造“同类专业”关系；可以从右侧有证据的升学交叉继续扩展。</p>':(same.length?`<div class="neighbor-list">${same.map(item=>`<button type="button" class="neighbor-chip" data-major-code="${escapeHtml(item.target.code)}"><strong>${escapeHtml(item.target.name)}</strong><span>${escapeHtml(item.label)}${item.sharedRouteCount?` · ${escapeHtml(graduateRouteText(item))}`:''}</span></button>`).join('')}</div>`:'<p>当前专业类没有其他本科专业。</p>');
  const crossBody=cross.length?`<div class="neighbor-list">${cross.map(item=>`<button type="button" class="neighbor-chip cross" data-major-code="${escapeHtml(item.target.code)}"><strong>${escapeHtml(item.target.name)}</strong><span>${escapeHtml(item.label)} · ${escapeHtml(graduateRouteText(item))}</span></button>`).join('')}</div>`:'<p>当前没有证据足够强的跨专业类节点，不为了“看起来丰富”强行补关系。</p>';
  return `<div class="relationship-fallback"><div><h4>${firstTitle}</h4>${firstBody}</div><div><h4>跨专业类的升学交叉</h4>${crossBody}</div></div>`;
}
function renderMajorRelationshipSection(graph) {
  return `<section class="relationship-section" data-major-relationship-graph="${escapeHtml(graph.focus.code)}" data-graph-mode="directory"><div class="relationship-head"><div><p class="eyebrow">把专业放回关系里看</p><h3>专业关系图谱</h3></div><span class="graph-truth-chip">13门类 · 92专业类 · 883专业</span></div><div class="relationship-warm"><strong>家长先这样理解</strong><p>${escapeHtml(warmMajorCopy(graph))}</p></div><div class="graph-tabs" role="tablist" aria-label="专业关系图视角"><button type="button" role="tab" aria-selected="true" data-graph-mode="directory">按本科目录看</button><button type="button" role="tab" aria-selected="false" data-graph-mode="neighbors">看相邻选择与读研交叉</button></div><p class="graph-mobile-hint">关系图可以左右滑动；点专业节点可继续查看。</p><div class="graph-viewport" data-graph-panel>${renderDirectorySvg(graph)}</div>${graphLegend()}${relationshipList(graph)}<div class="graph-boundary"><strong>“相邻”不等于“平替”。</strong> ${escapeHtml(MAJOR_RELATIONSHIP_GRAPH_META.neighborBoundary)}</div></section>`;
}
function renderGraphMode(section,mode) { const major=findMajor(section?.dataset?.majorRelationshipGraph||''); const graph=major?RELATIONSHIPS.buildMajorGraph(major):null; if(!graph||!section)return; section.dataset.graphMode=mode; for(const button of section.querySelectorAll('.graph-tabs [data-graph-mode]'))button.setAttribute('aria-selected',String(button.dataset.graphMode===mode)); const panel=section.querySelector('[data-graph-panel]'); if(panel)panel.innerHTML=mode==='neighbors'?renderNeighborSvg(graph):renderDirectorySvg(graph); }
function graduateSecondLevelNote() { return `<div class="second-level-note"><strong>为什么这里没有硬画“全国统一二级学科”？</strong><p>国家《研究生教育学科专业目录》统一到学科门类、一级学科和专业学位类别。二级学科与专业领域由学位授予单位在授权权限内按规定自主设置与调整，所以真正查某校读研方向时，要继续看该校当年招生专业目录，而不是由本页替国家编一棵不存在的统一二级树。</p></div>`; }

function renderMajor(major) {
  const graph=RELATIONSHIPS.buildMajorGraph(major), focus=graph?.focus || major, hierarchy=graph?.hierarchy;
  const understanding=resolveMajorUnderstanding({major:major.name,standardMajor:{code:major.code,name:major.name,categoryName:focus.majorClass||''}});
  const pathway=buildUndergradGraduatePathway(major);
  const oneLine=understanding?.matched&&understanding?.card?.oneLine?understanding.card.oneLine:(focus.majorClass?`${major.name}是教育部2026本科专业目录中的本科专业，属于${focus.discipline}门类、${focus.majorClass}。具体课程与培养方向要继续看学校培养方案。`:`${major.name}是教育部2026本科专业目录中的本科专业，直接列在${focus.discipline}门类下，专业类未单列。具体课程与培养方向要继续看学校培养方案。`);
  const academicHtml=pathway.academic.length?pathway.academic.map(item=>degreeItem(item,false)).join(''):'<p class="empty-route">国家目录没有给这个本科专业规定固定的学术学位去向；需要结合目标院校招生目录继续判断。</p>';
  const professionalHtml=pathway.professional.length?pathway.professional.map(item=>degreeItem(item,true)).join(''):'<p class="empty-route">没有可在国家目录层面直接给出的专业学位类别。不要据此理解为“不能考专硕”，应继续看目标招生单位的专业目录。</p>';
  const classMeta=hierarchy?.majorClass?.code?`本科专业类：${escapeHtml(hierarchy.majorClass.name)}`:'本科专业类：2026目录未单列';
  const undergradPath=hierarchy?.majorClass?.code?`<div class="path-node"><small>本科门类</small><strong><code>${escapeHtml(hierarchy.discipline.code)}</code> ${escapeHtml(hierarchy.discipline.name)}</strong></div><span class="path-arrow">→</span><div class="path-node"><small>本科专业类</small><strong><code>${escapeHtml(hierarchy.majorClass.code)}</code> ${escapeHtml(hierarchy.majorClass.name)}</strong></div><span class="path-arrow">→</span><div class="path-node"><small>本科专业</small><strong><code>${escapeHtml(major.code)}</code> ${escapeHtml(major.name)}</strong></div>`:`<div class="path-node"><small>本科门类</small><strong><code>${escapeHtml(hierarchy?.discipline?.code||'')}</code> ${escapeHtml(hierarchy?.discipline?.name||focus.discipline)}</strong></div><span class="path-arrow">→</span><div class="path-node path-node-note"><small>2026目录结构</small><strong>专业类未单列</strong></div><span class="path-arrow">→</span><div class="path-node"><small>本科专业</small><strong><code>${escapeHtml(major.code)}</code> ${escapeHtml(major.name)}</strong></div>`;
  els.result.innerHTML=`<article class="result-shell" data-result-major="${escapeHtml(major.code)}"><header class="result-head"><div><p class="eyebrow">你正在看的专业</p><h2>${escapeHtml(major.name)}</h2><div class="meta"><span class="meta-chip">本科门类：${escapeHtml(focus.discipline)}</span><span class="meta-chip">${classMeta}</span></div></div><span class="code-badge">本科专业代码 ${escapeHtml(major.code)}</span></header><section class="answer-first"><strong>一句话先看懂</strong><p>${escapeHtml(oneLine)}</p></section><div class="divider"></div><section><h3 class="section-heading">本科目录里的位置</h3><div class="undergrad-line">${undergradPath}</div>${hierarchy?.majorClass?.isUnlisted?'<div class="relation-note"><strong>目录提醒：</strong>交叉学科的这类专业在2026标准目录中专业类未单列，所以这里直接从门类连到具体专业，不补造“1400专业类”。</div>':''}</section><div class="divider"></div>${graph?renderMajorRelationshipSection(graph):''}<div class="divider"></div><section><h3 class="section-heading">继续读研，可以先看哪些国家目录方向</h3>${graduateSecondLevelNote()}<div class="degree-grid"><div class="degree-card"><h4>学术学位</h4><p>研究生目录里的一级学科。更偏学科研究与学术训练，但不同学校培养方案差异很大。</p><div class="degree-list">${academicHtml}</div></div><div class="degree-card"><h4>专业学位</h4><p>面向职业与应用场景的专业学位类别。代码属于研究生目录，不是本科专业代码的延伸。</p><div class="degree-list">${professionalHtml}</div></div></div>${renderFields(pathway.professionalFields)}<div class="relation-note"><strong>关系边界：</strong>${escapeHtml(pathway.note)}<br>${escapeHtml(pathway.boundary)}</div></section><div class="divider"></div><section><h3 class="section-heading">权威依据</h3><div class="source-list">${sourceItem(UNDERGRAD_SOURCE,`2026本科目录 · 当前库 ${MAJOR_CATALOG_2026_META.total||883} 个专业`)}${sourceItem(GRADUATE_CATALOG_SOURCES.catalog2022,'研究生一级学科与专业学位类别，自2023年起实施；二级学科/专业领域由学位授予单位按规定自主设置调整')}${pathway.professionalFields.length?sourceItem(GRADUATE_CATALOG_SOURCES.admissions2026,'仅用于页面中明确点名的2026报考条件与2027已公布变化'):''}</div></section></article>`;
  const url=new URL(location.href);url.searchParams.set('major',major.name);history.replaceState(null,'',`${url.pathname}?${url.searchParams.toString()}`);document.title=`${major.name}：专业关系与读研方向 - 专业升学地图`;els.result;
}

function renderRecognition(intent) { if(!intent?.explanation||['official_name','code'].includes(intent.matchType))return;const shell=els.result.querySelector('.result-shell'),header=shell?.querySelector('.result-head');if(!shell||!header)return;const note=document.createElement('div');note.className='recognition-note';note.setAttribute('data-recognition-query',intent.query||'');note.innerHTML=`<strong>搜索识别说明</strong><span>${escapeHtml(intent.explanation)}</span>`;header.insertAdjacentElement('afterend',note); }
function renderAmbiguityGraph(intent,candidates) {
  if(['major_class','class_stem'].includes(intent.semanticType)&&intent.label){const classGraph=RELATIONSHIPS.buildClassGraph(intent.label);if(classGraph){const routeCount=classGraph.commonGraduateRoutes.length;return `<section class="class-insight" data-class-relationship-graph="${escapeHtml(intent.label)}"><div class="relationship-warm"><strong>先把“${escapeHtml(intent.label)}”当成一个专业家族</strong><p>这是教育部本科目录里的专业类，下面有 ${classGraph.majors.length} 个具体本科专业。它们属于同一目录家族，但不等于课程完全一样。${routeCount?`这一专业类还能从现有升学导航中看到 ${routeCount} 个研究生一级学科/专业学位类别交叉点。`:''}</p></div><p class="graph-mobile-hint">关系图可以左右滑动；点专业节点可直接进入。</p><div class="graph-viewport">${renderClassSvg(classGraph)}</div>${graphLegend()}</section>`;}}
  const candidateGraph=RELATIONSHIPS.buildCandidateGraph(candidates);if(!candidateGraph?.candidateCount)return '';
  return `<section class="class-insight"><div class="relationship-warm"><strong>先看这些候选分别属于哪里</strong><p>名字里都带着你输入的词，不代表它们是同一个专业。图先把候选放回各自专业类；如果2026目录未单列专业类，就保留“门类直接到专业”的结构，再由你选择，避免只看名字误判。</p></div><p class="graph-mobile-hint">关系图可以左右滑动；点专业节点可直接进入。</p><div class="graph-viewport">${renderCandidateSvg(candidateGraph,intent.query)}</div>${graphLegend()}</section>`;
}
function renderDisambiguation(intent,{expanded=false}={}) { const candidates=expanded?intent.allCandidates:intent.candidates;const countText=intent.total>candidates.length?`先展示最接近的 ${candidates.length} 个，共 ${intent.total} 个候选。`:`共 ${intent.total} 个候选。`;els.result.innerHTML=`<section class="result-shell disambiguation-shell" data-disambiguation-query="${escapeHtml(intent.query)}"><header class="result-head"><div><p class="eyebrow">先确认你说的是哪个正式专业</p><h2>你说的“${escapeHtml(intent.query)}”，可能是这些</h2></div>${intent.label?`<span class="code-badge">${escapeHtml(intent.label)}</span>`:''}</header><section class="answer-first"><strong>为什么不直接替你选一个</strong><p>${escapeHtml(intent.explanation)}</p></section>${renderAmbiguityGraph(intent,candidates)}<p class="disambiguation-count">${escapeHtml(countText)}</p><div class="disambiguation-grid">${candidates.map(item=>`<button type="button" class="disambiguation-card" data-major-code="${escapeHtml(item.code)}"><span class="disambiguation-name">${escapeHtml(item.name)}</span><span class="disambiguation-meta">${escapeHtml(item.code)} · ${escapeHtml(majorContext(item))}</span></button>`).join('')}</div>${!expanded&&intent.total>candidates.length?`<div class="load-more-wrap"><button type="button" class="load-more" data-expand-disambiguation="${escapeHtml(intent.query)}">展开全部 ${intent.total} 个</button></div>`:''}<div class="relation-note"><strong>这里做的是语义消歧：</strong>家长简称、专业类简称和关键词只用来找候选，不会静默改成某一个正式本科专业。你点中具体专业后，页面才进入专业关系和本科→研究生路径。</div></section>`;els.suggestions.hidden=true;els.result; }
function submitQuery(query) { const intent=SEARCH.resolve(query,{limit:8});if(intent.kind==='direct'){els.input.value=intent.major.name;els.suggestions.hidden=true;renderMajor(intent.major);renderRecognition(intent);return;}if(intent.kind==='ambiguous'){renderDisambiguation(intent);return;}els.result.innerHTML='<section class="result-shell"><div class="answer-first"><strong>没有匹配到规范本科专业</strong><p>请尝试输入教育部本科专业全名、六位本科专业代码、专业类名称或家长常用简称。模糊说法只会进入候选消歧，不会被强行当成一个具体专业。</p></div></section>'; }

function renderBrowseClass(classCode,target) { const graph=RELATIONSHIPS.buildClassGraph(classCode);if(!graph||!target)return;target.hidden=false;target.innerHTML=`<div class="browse-class-head"><div><strong>${escapeHtml(graph.majorClass.name)}</strong><span>${escapeHtml(graph.majorClass.code)} · ${graph.majors.length} 个本科专业</span></div><span>点图或下方专业名继续看</span></div><div class="graph-viewport browse-graph">${renderClassSvg(graph)}</div><div class="major-list">${graph.majors.map(item=>`<button type="button" class="major-chip" data-major-code="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>`).join('')}</div>`; }
function renderBrowse() {
  const disciplineNames=[...new Set(MAJOR_CATALOG_2026.map(item=>item.discipline).filter(Boolean))];
  els.disciplineChips.innerHTML=disciplineNames.map(name=>`<button type="button" class="discipline-chip" aria-pressed="false" data-discipline="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
  els.disciplineChips.addEventListener('click',event=>{const button=event.target.closest('[data-discipline]');if(!button)return;const graph=RELATIONSHIPS.buildDisciplineGraph(button.dataset.discipline);if(!graph)return;for(const chip of els.disciplineChips.querySelectorAll('[data-discipline]'))chip.setAttribute('aria-pressed',chip===button?'true':'false');els.classBrowser.hidden=false;els.classBrowser.dataset.discipline=graph.discipline.name;const classButtons=graph.categories.length?`<h3 class="class-title">${escapeHtml(graph.discipline.name)} · 先选专业类</h3><div class="class-list">${graph.categories.map(item=>`<button type="button" class="class-chip" data-major-class-code="${escapeHtml(item.code)}">${escapeHtml(item.name)} · ${item.majors.length}</button>`).join('')}</div>`:'';const direct=graph.directMajors.length?`<section class="browse-direct"><div class="relationship-warm"><strong>${escapeHtml(graph.discipline.name)}：专业类未单列的专业</strong><p>2026标准目录没有为这些专业补一层四位专业类，所以这里直接从门类连到具体专业，不制造一个不存在的中间层。</p></div><div class="graph-viewport browse-graph">${renderDirectDisciplineSvg(graph)}</div><div class="major-list">${graph.directMajors.map(item=>`<button type="button" class="major-chip" data-major-code="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>`).join('')}</div></section>`:'';els.classBrowser.innerHTML=`${classButtons}${direct}<div id="browseMajors" class="browse-class-panel" hidden></div>`;});
  els.classBrowser.addEventListener('click',event=>{const classButton=event.target.closest('[data-major-class-code]');if(classButton){renderBrowseClass(classButton.dataset.majorClassCode,els.classBrowser.querySelector('#browseMajors'));return;}const majorButton=event.target.closest('[data-major-code]');if(!majorButton)return;const major=findMajor(majorButton.dataset.majorCode);if(major){els.input.value=major.name;renderMajor(major);}});
}
function activateMajorFromElement(element) { const major=findMajor(element?.dataset?.majorCode||'');if(!major)return false;els.input.value=major.name;els.suggestions.hidden=true;renderMajor(major);return true; }

els.input.addEventListener('input',()=>renderSuggestions(els.input.value));
els.input.addEventListener('keydown',event=>{if(event.key==='Escape'){els.suggestions.hidden=true;els.input?.setAttribute('aria-expanded','false');els.input?.removeAttribute('aria-activedescendant');return;}if((event.key==='ArrowDown'||event.key==='ArrowUp')&&!els.suggestions.hidden){event.preventDefault();syncSuggestionActive(activeSuggestionIndex+(event.key==='ArrowDown'?1:-1));return;}if(event.key==='Enter'){event.preventDefault();submitQuery(els.input.value);}});
els.suggestions.addEventListener('click',event=>{const button=event.target.closest('[data-major-code]');if(!button)return;const intent=SEARCH.resolve(els.input.value,{limit:8}),major=findMajor(button.dataset.majorCode);if(major){els.input.value=major.name;els.suggestions.hidden=true;els.input?.setAttribute('aria-expanded','false');els.input?.removeAttribute('aria-activedescendant');renderMajor(major);if(intent.kind==='direct'&&intent.major?.code===major.code)renderRecognition(intent);}});
els.result.addEventListener('click',event=>{const tab=event.target.closest('.graph-tabs [data-graph-mode]');if(tab){renderGraphMode(tab.closest('[data-major-relationship-graph]'),tab.dataset.graphMode);return;}const majorButton=event.target.closest('[data-major-code]');if(majorButton&&activateMajorFromElement(majorButton))return;const expand=event.target.closest('[data-expand-disambiguation]');if(expand){const intent=SEARCH.resolve(expand.dataset.expandDisambiguation,{limit:100});if(intent.kind==='ambiguous')renderDisambiguation(intent,{expanded:true});}});
els.result.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const node=event.target.closest('.graph-node[data-major-code]');if(!node)return;event.preventDefault();activateMajorFromElement(node);});
els.form.addEventListener('submit',event=>{event.preventDefault();submitQuery(els.input.value);});
for(const button of document.querySelectorAll('[data-major-example]'))button.addEventListener('click',()=>submitQuery(button.dataset.majorExample));
document.addEventListener('click',event=>{if(!event.target.closest('.input-wrap'))els.suggestions.hidden=true;});

renderBrowse();
const initial=new URL(location.href).searchParams.get('major');if(initial)submitQuery(initial);
window.__MAJOR_PATH_META__=Object.freeze({version:'major-path-core-v0.05',undergraduateCount:MAJOR_CATALOG_2026.length,relationVersion:UNDERGRAD_GRADUATE_PATHWAY_META.version,searchVersion:MAJOR_SEARCH_INTENT_META.version,relationshipGraphVersion:MAJOR_RELATIONSHIP_GRAPH_META.version,relationshipStats:RELATIONSHIPS.stats()});
