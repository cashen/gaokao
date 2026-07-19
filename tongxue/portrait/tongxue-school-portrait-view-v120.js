export function renderPortrait(mount,data,pageVersion='v1.2.0'){
  mount.className='school-portrait';
  const sample=data.sample||{};
  const cards=[['已读取评论',count(sample.fetchedReviews)],['包含分项评分',count(sample.ratedReviews)],['认证学生评论',count(sample.verifiedReviews)]];
  mount.innerHTML=`
<div class="portrait-head"><div><div class="portrait-kicker">学校体验画像</div><h3>先看证据，再看结论</h3></div><span class="portrait-evidence ${attr(sample.evidenceLevel||'low')}">${html(evidenceText(sample.evidenceLevel))}</span></div>
<div class="portrait-sample">${cards.map(([label,value])=>`<div class="portrait-sample-card"><strong>${value}</strong><span>${html(label)}</span></div>`).join('')}</div>
<div class="portrait-freshness">${html(freshnessText(sample))}</div>
${renderAttention(data.attentionPoints||[])}
<section class="portrait-section"><div class="portrait-section-head"><h4>七维体验</h4><span>每个维度按独立评分样本计算</span></div><div class="portrait-dimensions">${(data.dimensions||[]).map(renderDimension).join('')}</div></section>
${renderQuestions(data.questions||[])}
${renderCampuses(data.campuses||[])}
<div class="portrait-note">画像基于当前读取到的公开评论生成。少于 3 条分项评分时不展示精确分数；3—9 条会标记“样本较少”。它不是学校排名，也不代表学校官方结论。页面 ${html(pageVersion)}</div>`;
}

export function renderPortraitFailure(mount,onRetry){
  mount.className='school-portrait portrait-failed';
  mount.innerHTML='<div><strong>学校体验画像暂时没有加载完成</strong><p>下面的 AI 摘要或公开评论仍可正常查看。</p></div><button type="button" class="portrait-retry">重新加载画像</button>';
  mount.querySelector('.portrait-retry')?.addEventListener('click',onRetry,{once:true});
}

export function renderPortraitLoading(mount,retry=false){
  mount.className='school-portrait portrait-loading';
  mount.setAttribute('aria-live','polite');
  mount.innerHTML='<div class="portrait-loading-line"><span class="portrait-spinner" aria-hidden="true"></span><span>'+(retry?'正在重新整理学校体验画像…':'正在整理学校体验画像…')+'</span></div>';
}

export function addIdentityTags(shell,tags=[]){
  const meta=shell.querySelector('.meta');
  if(!meta)return;
  const existing=new Set([...meta.querySelectorAll('.meta-chip')].map(node=>node.textContent.trim()));
  tags.slice(0,6).forEach(value=>{
    const text=String(value||'').trim();
    if(!text||existing.has(text))return;
    existing.add(text);
    const chip=document.createElement('span');
    chip.className='meta-chip portrait-tag';
    chip.textContent=text;
    meta.append(chip);
  });
}

function renderAttention(items){
  if(!items.length)return'';
  const rows=items.map(item=>`<li class="portrait-attention ${tone(item.tone)}"><span>${html(item.text)}</span></li>`).join('');
  return `<section class="portrait-section portrait-focus"><h4>报考关注点</h4><ul>${rows}</ul></section>`;
}

function renderDimension(item){
  const sampleSize=Math.max(0,Number(item?.sampleSize)||0);
  const score=Number(item?.score);
  const available=Number.isFinite(score);
  const value=available?score.toFixed(1):'—';
  const width=available?Math.max(0,Math.min(100,score*20)):0;
  const status=item?.confidence==='small'?'样本较少':item?.confidence==='insufficient'?'样本不足':'';
  const label=String(item?.label||'体验维度');
  return `<div class="portrait-dimension" aria-label="${attr(label+' '+(available?value+' 分':'样本不足')+'，'+sampleSize+' 条评分')}"><div class="portrait-dimension-top"><strong>${html(label)}</strong><span class="portrait-dimension-value">${value}</span></div><div class="portrait-bar"><i style="width:${width.toFixed(1)}%"></i></div><div class="portrait-dimension-meta"><span>${sampleSize} 条评分</span>${status?`<span class="portrait-status">${status}</span>`:''}</div></div>`;
}

function renderQuestions(items){
  if(!items.length)return'';
  const rows=items.map((item,index)=>{
    const meta=[];
    if(item.isVerified)meta.push('认证学生');
    if(item.campus)meta.push(item.campus);
    if(Number(item.replies)>0)meta.push(item.replies+' 条回复');
    if(item.createdAt)meta.push(formatDate(item.createdAt));
    const source=item.sourceUrl?`<a href="${attr(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原问题 →</a>`:'';
    return `<article class="portrait-question"><span class="portrait-question-number">${index+1}</span><div><p>${html(item.content).replace(/\n/g,'<br>')}</p><div class="portrait-question-meta">${meta.map(value=>`<span>${html(value)}</span>`).join('')}${source}</div></div></article>`;
  }).join('');
  return `<section class="portrait-section"><div class="portrait-section-head"><h4>大家在问</h4><span>来自真实提问字段</span></div><div class="portrait-questions">${rows}</div></section>`;
}

function renderCampuses(items){
  if(!items.length)return'';
  const hint=items.length>=2?'来源评论中出现了多个校区标签，报考前请核验专业所在校区。':'来源评论中识别到以下校区标签。';
  const rows=items.map(item=>`<div class="portrait-campus"><strong>${html(item.name)}</strong><span>${Number(item.reviewCount||0)} 条相关评论${Number(item.verifiedCount)>0?' · '+Number(item.verifiedCount)+' 条认证':''}</span></div>`).join('');
  return `<section class="portrait-section"><div class="portrait-section-head"><h4>校区线索</h4><span>${html(hint)}</span></div><div class="portrait-campuses">${rows}</div></section>`;
}

function evidenceText(level){return level==='high'?'样本相对充分':level==='medium'?'可作有限参考':'样本较少';}
function freshnessText(sample){if(!sample.newestReviewAt)return'暂时没有可用评论时间';return '最近评论：'+formatDate(sample.newestReviewAt)+(Number(sample.recentYearCount)>0?' · 近一年 '+Number(sample.recentYearCount)+' 条':' · 近一年暂无新样本')+(sample.partial?' · 当前只读取了部分评论样本':'');}
function count(value){return Math.max(0,Number(value)||0)+' 条';}
function tone(value){return value==='positive'?'positive':value==='caution'?'caution':'neutral';}
function formatDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?String(value||'').slice(0,10):new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function html(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function attr(value){return html(value).replace(/`/g,'&#96;');}
