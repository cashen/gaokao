import { loadSchoolCatalog } from '../data/school-name-resolver.js';

const PAGE_VERSION='v1.1.2';
const SOURCE_ORIGIN='https://srgaoxiao.com';
const REVIEW_DIMENSION_LABELS={dormitory:'宿舍',cafeteria:'食堂',faculty:'师资',environment:'环境',culture:'氛围',employment:'就业',safety:'安全'};
const EXPERIENCE_TTL={ai_summary:300000,recent_reviews:120000,no_content:120000};
const schoolInput=document.getElementById('school');
const queryButton=document.getElementById('queryButton');
const resultBox=document.getElementById('result');
const suggestionsBox=document.getElementById('schoolSuggestions');
const resolveHint=document.getElementById('resolveHint');
const indexStatus=document.getElementById('indexStatus');
const inputState=document.getElementById('inputState');
const liveStatus=document.getElementById('liveStatus');
let resolver=null,resolverError=null,suggestions=[],activeSuggestion=-1,selectedOfficialName='',inputTimer=0,currentResolution=null,activeReviewState=null,inputComposing=false;
let schoolMetaIndex=new Map(),activeChoiceCandidates=[],activeQueryController=null,activeQueryKey='',querySerial=0;
const experienceCache=new Map();
const inflightExperience=new Map();

class TongxueError extends Error{constructor(code,message,data={}){super(message);this.name='TongxueError';this.code=code;this.data=data;}}
initializeResolver();

async function initializeResolver(){
  try{
    const catalog=await loadSchoolCatalog();
    resolver=catalog.resolver;
    schoolMetaIndex=catalog.metadata;
    indexStatus.textContent='已支持教育部公布的 '+resolver.count.toLocaleString('zh-CN')+' 所普通高校';
  }catch(error){
    resolverError=error;
    indexStatus.textContent='高校名单暂时没有加载完成，请稍后再试。';
  }finally{
    inputState.hidden=true;
    updateButtonState();
  }
}

function resetSchoolInputState(){
  selectedOfficialName='';
  currentResolution=null;
  activeReviewState=null;
  hideResolveHint();
  updateButtonState();
}
function scheduleSuggestions(){
  clearTimeout(inputTimer);
  if(!inputComposing)inputTimer=setTimeout(updateSuggestions,110);
}
schoolInput.addEventListener('compositionstart',()=>{inputComposing=true;clearTimeout(inputTimer);closeSuggestions();});
schoolInput.addEventListener('compositionend',()=>{inputComposing=false;resetSchoolInputState();scheduleSuggestions();});
schoolInput.addEventListener('input',event=>{
  if(event.isComposing||inputComposing)return;
  resetSchoolInputState();
  scheduleSuggestions();
});
schoolInput.addEventListener('focus',()=>{if(!inputComposing&&schoolInput.value.trim().length>=2)updateSuggestions();});
schoolInput.addEventListener('keydown',event=>{
  if(event.isComposing||inputComposing)return;
  if(!suggestionsBox.hidden&&suggestions.length){
    if(event.key==='ArrowDown'){event.preventDefault();setActiveSuggestion(Math.min(activeSuggestion+1,suggestions.length-1));return;}
    if(event.key==='ArrowUp'){event.preventDefault();setActiveSuggestion(Math.max(activeSuggestion-1,0));return;}
    if(event.key==='Escape'){closeSuggestions();return;}
    if(event.key==='Enter'&&activeSuggestion>=0){event.preventDefault();chooseSuggestion(suggestions[activeSuggestion]);return;}
  }
  if(event.key==='Enter'&&!queryButton.disabled){event.preventDefault();querySchool();}
});
queryButton.addEventListener('click',()=>querySchool());
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.input-wrap'))closeSuggestions();});
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{
  schoolInput.value=button.dataset.example||'';
  selectedOfficialName='';
  hideResolveHint();
  updateButtonState();
  querySchool();
}));
resultBox.addEventListener('click',handleResultClick);

function handleResultClick(event){
  const expand=event.target.closest('[data-expand]');
  if(expand){
    const content=document.getElementById('reviewContent'+expand.dataset.expand);
    if(!content)return;
    const collapsed=content.classList.toggle('collapsed');
    expand.textContent=collapsed?'展开全文':'收起全文';
    expand.setAttribute('aria-expanded',String(!collapsed));
    return;
  }
  if(event.target.closest('#loadMoreReviews')){loadMoreReviews();return;}
  if(event.target.closest('[data-retry="1"]')){querySchool({forceRefresh:true});return;}
  const choice=event.target.closest('[data-choice]');
  if(choice){
    const candidate=activeChoiceCandidates[Number(choice.dataset.choice)];
    if(!candidate)return;
    const input=normalizeSchool(schoolInput.dataset.choiceInput||schoolInput.value);
    const resolution={status:'resolved',input,resolvedName:candidate.officialName,matchType:'user_choice',confidence:candidate.score||0,candidates:[]};
    selectedOfficialName=candidate.officialName;
    currentResolution=resolution;
    schoolInput.value=candidate.officialName;
    showResolveHint(input,candidate.officialName);
    performExperienceQuery(candidate.officialName,input,resolution);
  }
}

function updateButtonState(){queryButton.disabled=!schoolInput.value.trim()||!resolver||Boolean(resolverError);}
function updateSuggestions(){
  const query=normalizeSchool(schoolInput.value);
  if(inputComposing||!resolver||query.length<2){closeSuggestions();return;}
  suggestions=resolver.search(query,{limit:8});
  activeSuggestion=-1;
  if(!suggestions.length){
    suggestionsBox.innerHTML='<div class="suggestion-empty">暂时没有找到明显匹配。可以补充学校所在地区，或输入更完整的名称。</div>';
    openSuggestions();
    return;
  }
  suggestionsBox.innerHTML=suggestions.map((item,index)=>{
    const meta=schoolMetaIndex.get(item.officialName)||{};
    const detail=[meta.location,meta.level].filter(Boolean).join(' · ');
    return '<button id="schoolOption'+index+'" class="suggestion" type="button" role="option" data-index="'+index+'" aria-selected="false">'
      +'<span class="suggestion-main"><span class="suggestion-name">'+escapeHtml(item.officialName)+'</span>'
      +(detail?'<span class="suggestion-meta">'+escapeHtml(detail)+'</span>':'')+'</span>'
      +'<span class="suggestion-type">'+escapeHtml(matchTypeLabel(item.matchType))+'</span></button>';
  }).join('');
  suggestionsBox.querySelectorAll('[data-index]').forEach(button=>{
    button.addEventListener('pointerdown',event=>event.preventDefault());
    button.addEventListener('click',()=>chooseSuggestion(suggestions[Number(button.dataset.index)]));
  });
  openSuggestions();
}
function chooseSuggestion(candidate){
  if(!candidate)return;
  const original=normalizeSchool(schoolInput.value);
  selectedOfficialName=candidate.officialName;
  schoolInput.value=candidate.officialName;
  closeSuggestions();
  currentResolution={status:'resolved',input:original,resolvedName:candidate.officialName,matchType:candidate.matchType||'candidate',confidence:candidate.score||0,candidates:[]};
  if(original&&original!==candidate.officialName)showResolveHint(original,candidate.officialName);else hideResolveHint();
  updateButtonState();
}
function openSuggestions(){suggestionsBox.hidden=false;schoolInput.setAttribute('aria-expanded','true');}
function closeSuggestions(){suggestionsBox.hidden=true;schoolInput.setAttribute('aria-expanded','false');schoolInput.removeAttribute('aria-activedescendant');activeSuggestion=-1;}
function setActiveSuggestion(index){
  activeSuggestion=index;
  suggestionsBox.querySelectorAll('[data-index]').forEach((button,i)=>{
    const active=i===index;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
    if(active){button.scrollIntoView({block:'nearest'});schoolInput.setAttribute('aria-activedescendant',button.id);}
  });
}

async function querySchool(options={}){
  const originalInput=normalizeSchool(schoolInput.value);
  if(!originalInput){schoolInput.focus();return;}
  if(!resolver){renderLocalFailure('高校名单还没有加载完成，请稍后再试。');return;}
  closeSuggestions();
  const resolution=selectedOfficialName&&selectedOfficialName===originalInput
    ? {status:'resolved',input:originalInput,resolvedName:selectedOfficialName,matchType:'candidate',confidence:1,candidates:[]}
    : resolver.resolve(originalInput,{limit:8});
  if(resolution.status==='ambiguous'){renderSchoolChoices(originalInput,resolution.candidates);return;}
  if(resolution.status!=='resolved'||!resolution.resolvedName){renderSchoolNotMatched(originalInput,resolution.candidates||[]);return;}
  selectedOfficialName=resolution.resolvedName;
  currentResolution=resolution;
  schoolInput.value=resolution.resolvedName;
  if(originalInput!==resolution.resolvedName)showResolveHint(originalInput,resolution.resolvedName);else hideResolveHint();
  await performExperienceQuery(resolution.resolvedName,originalInput,resolution,options);
}

async function performExperienceQuery(officialName,originalInput,resolution,options={}){
  const serial=++querySerial;
  activeQueryController?.abort();
  if(activeQueryKey)inflightExperience.delete(activeQueryKey);
  const controller=new AbortController();
  activeQueryController=controller;
  activeQueryKey=experienceKey(officialName,1);
  activeReviewState=null;
  queryButton.disabled=true;
  queryButton.textContent='正在查找';
  resultBox.innerHTML='<div class="state-card loading">已找到“'+escapeHtml(officialName)+'”<br>正在查找这所学校的公开评价…</div>';
  try{
    const data=await fetchExperience(officialName,originalInput,1,{forceRefresh:Boolean(options.forceRefresh),signal:controller.signal});
    if(serial!==querySerial)return;
    renderResult(data,officialName,resolution);
  }catch(error){
    if(isAbortError(error)||serial!==querySerial)return;
    renderFailure(error,officialName,resolution);
  }finally{
    if(serial===querySerial){activeQueryController=null;activeQueryKey='';updateButtonState();queryButton.textContent='查看学校体验';}
  }
}

async function fetchExperience(school,originalInput,page=1,options={}){
  const key=experienceKey(school,page);
  const cached=experienceCache.get(key);
  if(!options.forceRefresh&&cached&&cached.expiresAt>Date.now())return cloneData(cached.data);
  if(!options.forceRefresh&&inflightExperience.has(key))return cloneData(await inflightExperience.get(key));
  const request=(async()=>{
    const params=new URLSearchParams({school,page:String(page)});
    if(options.forceRefresh)params.set('refresh','1');
    let response;
    try{response=await fetch('/api/tongxue-summary?'+params.toString(),{cache:'default',headers:{accept:'application/json'},signal:options.signal});}
    catch(error){if(isAbortError(error))throw error;throw new TongxueError('network_error','暂时无法连接学校体验服务。',{cause:String(error)});}
    const raw=await response.text();
    if(looksLikeHtml(raw))throw new TongxueError('api_route_missed','学校体验服务没有正常运行。',{raw:raw.slice(0,180)});
    let data;
    try{data=JSON.parse(raw||'{}');}catch{throw new TongxueError('api_invalid_json','学校体验服务返回了无法识别的内容。',{raw:raw.slice(0,300)});}
    if(!response.ok||data.ok===false||data.error)throw new TongxueError(data.error||'api_error',data.message||'暂时没有取得学校体验信息。',data);
    if(data.mode==='ai_summary'){
      if(!isUsefulSummary(data.summary))throw new TongxueError('summary_invalid','来源摘要暂时无法正常显示。',data);
    }else if(data.mode==='recent_reviews'){
      if(!Array.isArray(data.reviews)||!data.reviews.length)throw new TongxueError('reviews_invalid','近期评论暂时无法正常显示。',data);
    }else if(data.mode!=='no_content')throw new TongxueError('mode_invalid','暂时无法识别来源内容。',data);
    const ttl=EXPERIENCE_TTL[data.mode]||0;
    if(ttl)experienceCache.set(key,{data:cloneData(data),expiresAt:Date.now()+ttl});
    return data;
  })();
  inflightExperience.set(key,request);
  try{return cloneData(await request);}finally{if(inflightExperience.get(key)===request)inflightExperience.delete(key);}
}

function renderResult(data,school,resolution){if(data.mode==='recent_reviews'){renderReviewsResult(data,school,resolution);return;}if(data.mode==='no_content'){renderNoContent(data,school,resolution);return;}renderSummaryResult(data,school,resolution);}
function renderSummaryResult(data,school,resolution){
  activeReviewState=null;
  const source=normalizeSource(data.source,school);
  const meta=data.schoolMeta||{};
  const groups=buildSummaryGroups(data.summary);
  const groupHtml=groups.map(group=>'<section class="insight-card '+(group.key==='attention'?'attention':'')+'"><h3 class="insight-title"><span class="insight-dot"></span>'+escapeHtml(group.title)+'</h3><ul class="insight-list">'+group.items.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul></section>').join('');
  resultBox.innerHTML='<article class="result-shell"><div class="result-head"><h2 id="resultTitle" tabindex="-1">'+escapeHtml(data.school||school)+'</h2><span class="badge">来源 AI 摘要</span></div>'
    +'<div class="meta">'+buildMetaChips(meta,data,resolution)+'</div><div class="divider"></div><div class="section-heading">来源站整理的主要观点</div><div class="summary-grid">'+groupHtml+'</div>'
    +'<details class="raw-summary"><summary>查看来源摘要原文</summary><div class="raw-summary-text">'+escapeHtml(tidySummary(data.summary))+'</div></details>'
    +'<div class="source-note">以下内容由来源站根据公开评论生成，本站仅按主题归类展示，不自行增加评价。它反映部分评论者的个人体验，不代表学校官方结论，也不应单独作为报考依据。</div>'
    +'<a class="link" href="'+escapeAttribute(source.url)+'" target="_blank" rel="noopener noreferrer">查看来源站全部评论 →</a>'+buildTechnicalDetails(meta,data,source)+'</article>';
  focusResult();
}
function renderReviewsResult(data,school,resolution){
  activeReviewState={school:data.school||school,originalInput:resolution?.input||school,resolution,schoolMeta:data.schoolMeta||{},source:normalizeSource(data.source,school),fetchedAt:data.fetchedAt,transport:data.transport,version:data.version||PAGE_VERSION,reviews:dedupeReviews(data.reviews||[]),pagination:data.reviewPagination||{page:1,pageSize:6,total:(data.reviews||[]).length,totalPages:1,hasMore:false}};
  renderActiveReviews();
}
function renderActiveReviews(){
  const state=activeReviewState;if(!state)return;
  const data={school:state.school,schoolMeta:state.schoolMeta,fetchedAt:state.fetchedAt,transport:state.transport,version:state.version};
  const cards=state.reviews.map((review,index)=>renderReviewCard(review,index)).join('');
  const loadMore=state.pagination?.hasMore?'<div id="loadMoreWrap" class="load-more-wrap"><button id="loadMoreReviews" class="load-more" type="button">加载更多近期评论</button></div>':'';
  resultBox.innerHTML='<article class="result-shell"><div class="result-head"><h2 id="resultTitle" tabindex="-1">'+escapeHtml(state.school)+'</h2><span class="badge review">近期公开评论</span></div><div class="meta">'+buildMetaChips(state.schoolMeta,data,state.resolution)+'</div><div class="divider"></div>'
    +'<div class="review-intro"><strong>来源站当前未提供 AI 摘要</strong>下面按发布时间展示近期公开评论，帮助你了解不同同学的个人体验。</div><div class="section-heading">最近发布的评论</div><div id="reviewGrid" class="review-grid">'+cards+'</div>'+loadMore
    +'<div class="source-note">评论来自来源站公开接口。本站仅清理页面格式和危险标签，并按时间排序展示，不改写评论观点。匿名评论和未认证评论请结合多条信息判断。</div>'
    +'<a class="link" href="'+escapeAttribute(state.source.url)+'" target="_blank" rel="noopener noreferrer">查看来源站全部评论 →</a>'+buildTechnicalDetails(state.schoolMeta,data,state.source)+'</article>';
  focusResult();
}
function renderReviewCard(review,index){
  const content=String(review?.content||'').trim();
  const isLong=content.length>240||content.split(/\n/).length>5;
  const tags=[];
  if(review?.isVerified)tags.push('<span class="review-tag verified">已认证本校学生</span>');
  if(review?.campus)tags.push('<span class="review-tag">'+escapeHtml(review.campus)+'</span>');
  if(review?.isQuestion)tags.push('<span class="review-tag question">提问</span>');
  const ratingHtml=renderReviewRating(review?.rating);
  const social=[];
  if(Number(review?.likes)>0)social.push('👍 '+Number(review.likes)+' 赞');
  if(Number(review?.replies)>0)social.push('💬 '+Number(review.replies)+' 回复');
  const author=String(review?.authorLabel||'匿名同学');
  const sourceUrl=String(review?.sourceUrl||activeReviewState?.source?.url||'#');
  return '<article class="review-card"><div class="review-card-head"><div class="review-author"><span class="review-avatar">'+escapeHtml(author.slice(0,1)||'同')+'</span><span class="review-author-name">'+escapeHtml(author)+'</span></div><time class="review-date">'+escapeHtml(formatReviewDate(review?.createdAt))+'</time></div>'
    +(tags.length?'<div class="review-tags">'+tags.join('')+'</div>':'')
    +'<div id="reviewContent'+index+'" class="review-content '+(isLong?'collapsed':'')+'">'+escapeHtml(content)+'</div>'
    +(isLong?'<button class="review-expand" type="button" data-expand="'+index+'" aria-controls="reviewContent'+index+'" aria-expanded="false">展开全文</button>':'')
    +ratingHtml+'<div class="review-footer">'+social.map(item=>'<span>'+escapeHtml(item)+'</span>').join('')+'<a class="review-source" href="'+escapeAttribute(sourceUrl)+'" target="_blank" rel="noopener noreferrer">查看原评论 →</a></div></article>';
}
function renderReviewRating(rating){
  if(!rating||!Number.isFinite(Number(rating.overall)))return'';
  const dimensions=rating.dimensions&&typeof rating.dimensions==='object'?rating.dimensions:{};
  const dimItems=Object.entries(dimensions).filter(([,value])=>Number.isFinite(Number(value))).map(([key,value])=>'<span class="rating-dim">'+escapeHtml(REVIEW_DIMENSION_LABELS[key]||key)+' '+Number(value).toFixed(1)+'</span>').join('');
  return '<div class="review-rating"><span>体验评分</span><span class="review-score">'+Number(rating.overall).toFixed(1)+'</span><span>/ 5.0</span><span class="rating-note">按来源分项计算</span></div>'
    +(dimItems?'<details class="rating-details"><summary>查看分项评分</summary><div class="rating-dims">'+dimItems+'</div></details>':'');
}
async function loadMoreReviews(){
  const state=activeReviewState;
  const button=document.getElementById('loadMoreReviews');
  if(!state||!button||!state.pagination?.hasMore)return;
  const nextPage=Number(state.pagination.page||1)+1;
  button.disabled=true;
  button.textContent='正在加载';
  try{
    const data=await fetchExperience(state.school,state.originalInput,nextPage);
    if(data.mode!=='recent_reviews')throw new TongxueError('reviews_page_invalid','后续评论页没有返回评论列表。',data);
    const existing=new Set(state.reviews.map(reviewKey));
    const added=dedupeReviews(data.reviews||[]).filter(review=>!existing.has(reviewKey(review)));
    appendReviewCards(added,state.reviews.length);
    state.reviews.push(...added);
    state.pagination=data.reviewPagination||{...state.pagination,page:nextPage,hasMore:false};
    state.fetchedAt=data.fetchedAt||state.fetchedAt;
    state.transport=data.transport||state.transport;
    updateLoadMoreControl();
    announce('已新增 '+added.length+' 条评论');
  }catch(error){
    button.disabled=false;
    button.textContent='加载失败，点击重试';
    button.title=error?.message||'加载失败';
    announce('评论加载失败，可以再次点击重试');
  }
}
function appendReviewCards(reviews,startIndex){
  const grid=document.getElementById('reviewGrid');
  if(!grid||!reviews.length)return;
  const template=document.createElement('template');
  template.innerHTML=reviews.map((review,index)=>renderReviewCard(review,startIndex+index)).join('');
  grid.append(template.content);
}
function updateLoadMoreControl(){
  const wrap=document.getElementById('loadMoreWrap');
  if(!wrap)return;
  if(!activeReviewState?.pagination?.hasMore){wrap.remove();return;}
  const button=document.getElementById('loadMoreReviews');
  if(button){button.disabled=false;button.textContent='加载更多近期评论';}
}
function reviewKey(review){return review?.id!==null&&review?.id!==undefined?'id:'+review.id:'content:'+String(review?.content||'').replace(/\s+/g,'').slice(0,500);}
function renderNoContent(data,school,resolution){
  activeReviewState=null;
  const source=normalizeSource(data.source,school);
  const meta=data.schoolMeta||{};
  const resolutionChip=resolution?.input&&resolution.input!==school?'<span class="meta-chip resolve">'+escapeHtml(resolution.input)+' → '+escapeHtml(school)+'</span>':'';
  resultBox.innerHTML='<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">来源站暂时没有可展示内容</h2><p>学校名称已经确认，但来源站目前没有 AI 摘要，也没有公开评论。这不代表学校没有学生评价，只表示当前来源中没有可展示的数据。</p><div class="state-meta">'+resolutionChip+buildStateMeta(meta,data)+'</div><div class="state-actions"><a class="link" href="'+escapeAttribute(source.url)+'" target="_blank" rel="noopener noreferrer">查看来源页面 →</a><button class="action-button" type="button" data-retry="1">稍后重新获取</button></div>'+buildTechnicalDetails(meta,data,source)+'</div>';
  focusResult();
}
function renderSchoolChoices(input,candidates){
  activeChoiceCandidates=(candidates||[]).slice(0,8);
  schoolInput.dataset.choiceInput=input;
  resultBox.innerHTML='<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">请确认你想查询的学校</h2><p>“'+escapeHtml(input)+'”可能对应多所学校。为避免查错，请选择正式校名后再查询。</p><div class="choice-grid">'
    +activeChoiceCandidates.map((candidate,index)=>{const meta=schoolMetaIndex.get(candidate.officialName)||{};const detail=[meta.location,meta.level].filter(Boolean).join(' · ');return '<button type="button" class="choice-card" data-choice="'+index+'"><span class="choice-name">'+escapeHtml(candidate.officialName)+'</span><span class="choice-note">'+escapeHtml(detail||matchTypeLabel(candidate.matchType))+' · 选择后立即查询</span></button>';}).join('')+'</div></div>';
  focusResult();
}
function renderSchoolNotMatched(input,candidates){const suggestionsHtml=(candidates||[]).length?'<div class="state-meta">'+candidates.map(item=>'<span class="meta-chip">'+escapeHtml(item.officialName)+'</span>').join('')+'</div>':'';resultBox.innerHTML='<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">还不能确定是哪所学校</h2><p>没有在教育部高校名单中唯一识别“'+escapeHtml(input)+'”。请补充省份、城市或输入更完整的名称，避免查错学校。</p>'+suggestionsHtml+'</div>';focusResult();}
function renderLocalFailure(message){resultBox.innerHTML='<div class="state-card error"><h2 id="resultTitle" tabindex="-1">学校名称识别暂不可用</h2><p>'+escapeHtml(message)+'</p></div>';focusResult();}
function renderFailure(error,school,resolution){
  activeReviewState=null;
  const code=error instanceof TongxueError?error.code:'unknown';
  const data=error instanceof TongxueError?error.data||{}:{};
  const meta=data.schoolMeta||{};
  const source=normalizeSource(data.source,school);
  let title='暂时没能读取学校信息';
  let message='学校名称已经确认，但来源站当前连接不稳定。可以稍后再试，或直接查看来源页面。';
  let css='error';
  if(code==='reviews_api_unavailable'){title='学校已找到，但近期评论暂时读取失败';message='来源站当前没有提供 AI 摘要，评论这次也没有成功读取。这不是“学校没有评论”的结论。';css='notice';}
  else if(code==='school_not_found'){title='来源站暂时没有这所学校的记录';message='本站已经匹配到正式校名，但来源站目前没有对应学校页面。';css='notice';}
  else if(code==='summary_api_unavailable'||code==='source_api_unavailable'){title='来源站暂时无法访问';message='学校名称已经确认，但来源站这次没有正常返回内容。';css='notice';}
  const resolutionChip=resolution?.input&&resolution.input!==school?'<span class="meta-chip resolve">'+escapeHtml(resolution.input)+' → '+escapeHtml(school)+'</span>':'';
  resultBox.innerHTML='<div class="state-card '+css+'"><h2 id="resultTitle" tabindex="-1">'+escapeHtml(title)+'</h2><p>'+escapeHtml(message)+'</p><div class="state-meta">'+resolutionChip+buildStateMeta(meta,data)+'</div><div class="state-actions"><a class="link" href="'+escapeAttribute(source.url)+'" target="_blank" rel="noopener noreferrer">查看来源页面 →</a><button class="action-button" type="button" data-retry="1">重新尝试</button></div><details><summary>技术诊断（供排查）</summary><div class="diagnostic">'+escapeHtml(buildDiagnosticText(code,error,data))+'</div></details></div>';
  focusResult();
}
function buildMetaChips(meta,data,resolution){const values=[];if(resolution?.input&&resolution.input!==(data.school||''))values.push({text:resolution.input+' → '+(data.school||resolution.resolvedName),resolve:true});if(meta.province||meta.city)values.push({text:[meta.province,meta.city].filter(Boolean).join(' · ')});if(meta.type)values.push({text:meta.type});if(Number.isFinite(Number(meta.reviewCount)))values.push({text:Number(meta.reviewCount)+' 条公开评价'});if(data.fetchedAt)values.push({text:'更新：'+formatTime(data.fetchedAt)});return values.filter(item=>item.text).map(item=>'<span class="meta-chip '+(item.resolve?'resolve':'')+'">'+escapeHtml(item.text)+'</span>').join('');}
function buildStateMeta(meta){const values=[];if(meta.name)values.push(meta.name);if(meta.province||meta.city)values.push([meta.province,meta.city].filter(Boolean).join(' · '));if(Number.isFinite(Number(meta.reviewCount)))values.push(Number(meta.reviewCount)+' 条公开评价');return values.map(value=>'<span class="meta-chip">'+escapeHtml(value)+'</span>').join('');}
function buildTechnicalDetails(meta,data,source){const items=['来源：'+(source?.name||'srgaoxiao.com')];if(data?.transport)items.push('获取方式：'+data.transport);if(data?.version)items.push('内容接口：'+data.version);items.push('页面：'+PAGE_VERSION);if(meta?.id!==undefined&&meta?.id!==null)items.push('来源学校编号：'+meta.id);return '<details class="technical-details"><summary>数据来源与技术信息</summary><div class="technical-list">'+items.map(item=>'<span class="technical-item">'+escapeHtml(item)+'</span>').join('')+'</div></details>';}
function buildSummaryGroups(summary){const text=tidySummary(summary).replace(/，但/g,'。但').replace(/，不过/g,'。不过').replace(/，然而/g,'。然而').replace(/；/g,'。');const sentences=(text.match(/[^。！？\n]+[。！？]?/g)||[text]).map(item=>item.trim()).filter(item=>item.length>2);const defs=[{key:'life',title:'校园与生活',words:['宿舍','寝室','食堂','校区','校园','交通','环境','空调','卫浴','生活','住宿','设施']},{key:'study',title:'学习与管理',words:['师资','课程','教学','学习','管理','跑操','自习','考试','课堂','形式主义','老师']},{key:'career',title:'就业与发展',words:['就业','实习','转专业','保研','考研','升学','科研','机会','发展','深造','资源']},{key:'attention',title:'需要留意',words:['但','不过','然而','较差','不足','较少','受限','问题','偏高','争议','参差','槽点']},{key:'overall',title:'综合印象',words:[]}];const groups=new Map(defs.map(item=>[item.key,{...item,items:[]}])) ;for(const sentence of sentences){let selected;if(defs[3].words.some(word=>sentence.includes(word))&&/^(但|不过|然而)|较差|不足|较少|受限|问题|偏高|争议|参差|槽点/.test(sentence))selected=defs[3];else selected=defs.find(item=>!['attention','overall'].includes(item.key)&&item.words.some(word=>sentence.includes(word)));if(!selected)selected=defs[4];groups.get(selected.key).items.push(sentence);}const output=['overall','life','study','career','attention'].map(key=>groups.get(key)).filter(group=>group.items.length);return output.length?output:[{key:'overall',title:'综合印象',items:[tidySummary(summary)]}];}
function dedupeReviews(reviews){const seen=new Set();return(Array.isArray(reviews)?reviews:[]).filter(review=>{const key=reviewKey(review);if(seen.has(key))return false;seen.add(key);return Boolean(String(review?.content||'').trim());});}
function buildDiagnosticText(code,error,data){const lines=['错误类型：'+code,'信息：'+(error?.message||'未知错误')];if(Array.isArray(data.diagnostics)){for(const item of data.diagnostics)lines.push([item.stage,item.host,'HTTP '+item.status,item.contentType,item.length+' bytes',item.parseError].filter(Boolean).join(' | '));}return lines.join('\n');}
function showResolveHint(input,officialName){resolveHint.innerHTML='<span>已识别：'+escapeHtml(input)+' → '+escapeHtml(officialName)+'</span><button type="button" class="resolve-change">不是这所？</button>';resolveHint.hidden=false;resolveHint.querySelector('button')?.addEventListener('click',()=>{selectedOfficialName='';currentResolution=null;schoolInput.value=input;hideResolveHint();schoolInput.focus();updateSuggestions();});}
function hideResolveHint(){resolveHint.hidden=true;resolveHint.textContent='';}
function matchTypeLabel(type){const value=String(type||'');if(value.includes('initial_exact'))return'首字母代码';if(value.includes('initial_prefix')||value.includes('initial_match'))return'首字母联想';if(value.includes('official_exact'))return'正式校名';if(value.includes('alias_exact'))return'常用简称';if(value.includes('prefix'))return'名称匹配';if(value.includes('contains'))return'名称相近';if(value.includes('fuzzy'))return'可能是';if(type==='generic_shortcut')return'简称候选';return'学校候选';}
function normalizeSource(source,school){if(source&&typeof source==='object')return{name:String(source.name||'srgaoxiao.com'),url:String(source.url||buildSourceUrl(school))};return{name:'srgaoxiao.com',url:buildSourceUrl(school)};}
function buildSourceUrl(school){return SOURCE_ORIGIN+'/school/'+encodeURIComponent(normalizeSchool(school));}
function normalizeSchool(value){return String(value||'').replace(/\s+/g,' ').trim();}
function tidySummary(value){return String(value||'').replace(/\r/g,'').replace(/\s*([，。！？；：、])\s*/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function isUsefulSummary(value){const text=tidySummary(value);return text.length>=20&&text.length<=5000;}
function formatTime(value){const date=new Date(value||Date.now());return Number.isNaN(date.getTime())?'刚刚':date.toLocaleString('zh-CN',{hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
function formatReviewDate(value){const date=new Date(value||'');if(Number.isNaN(date.getTime()))return String(value||'时间未知').slice(0,16);return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function looksLikeHtml(value){const text=String(value||'').trim().toLowerCase();return text.startsWith('<!doctype html')||text.startsWith('<html')||text.includes('<html');}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function escapeAttribute(value){return escapeHtml(value).replace(/`/g,'&#96;');}
function focusResult(){requestAnimationFrame(()=>document.getElementById('resultTitle')?.focus({preventScroll:false}));}
function announce(message){liveStatus.textContent='';requestAnimationFrame(()=>{liveStatus.textContent=message;});}
function experienceKey(school,page){return normalizeSchool(school)+'|'+Number(page||1);}
function cloneData(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
function isAbortError(error){return error?.name==='AbortError'||String(error?.message||'').includes('aborted');}
