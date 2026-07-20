import {
  addIdentityTags,
  renderPortrait as renderBasePortrait,
  renderPortraitFailure,
  renderPortraitLoading
} from './tongxue-school-portrait-view-v120.js';

export { addIdentityTags, renderPortraitFailure, renderPortraitLoading };

export function renderPortrait(mount,data,pageVersion='v1.6.0'){
  renderBasePortrait(mount,data,pageVersion);
  mount.dataset.evidenceVersion='v1.6.0';
  const kicker=mount.querySelector('.portrait-kicker');
  const title=mount.querySelector('.portrait-head h3');
  if(kicker)kicker.textContent='学校体验证据';
  if(title)title.textContent='先看样本，再看共识与分歧';
  const evidence=data?.evidence||{};
  const freshness=mount.querySelector('.portrait-freshness');
  if(freshness)freshness.insertAdjacentHTML('afterend',renderOverview(evidence,data?.sample||{}));
  const focus=mount.querySelector('.portrait-focus');
  const dimensions=mount.querySelector('.portrait-dimensions')?.closest('.portrait-section');
  const agreement=renderAgreementSection(evidence);
  if(agreement){
    if(focus)focus.insertAdjacentHTML('afterend',agreement);
    else if(dimensions)dimensions.insertAdjacentHTML('beforebegin',agreement);
  }
  if(dimensions&&Array.isArray(evidence.topicSignals)&&evidence.topicSignals.length){
    dimensions.insertAdjacentHTML('afterend',renderTopicSignals(evidence.topicSignals));
  }
  const note=mount.querySelector('.portrait-note');
  const checklist=renderChecklist(evidence.checklist||[]);
  if(note&&checklist)note.insertAdjacentHTML('beforebegin',checklist);
  if(note)note.insertAdjacentHTML('beforebegin',`<div class="portrait-evidence-note">${html(evidence.note||'公开评论只能作为经验线索，不能替代招生章程、培养方案和学校官方说明。')}</div>`);
}

function renderOverview(evidence,sample){
  const context=evidence?.context||{};
  const time=evidence?.timeliness||{};
  const chips=[];
  chips.push(`读取 ${number(sample.fetchedReviews)} 条评论`);
  chips.push(`认证样本 ${number(context.verifiedReviews)} 条`);
  if(Number(context.verifiedShare)>0)chips.push(`认证占比约 ${number(context.verifiedShare)}%`);
  if(Number(time.recentYearCount)>0)chips.push(`近一年 ${number(time.recentYearCount)} 条`);
  else if(time.status==='stale')chips.push('近一年暂无新样本');
  if(Number(context.campusCount)>0)chips.push(`识别 ${number(context.campusCount)} 个校区标签`);
  if(context.partial)chips.push('当前仅为部分样本');
  return `<section class="portrait-evidence-overview"><h4>这份证据怎么读</h4><p>分数只在样本达到门槛时展示；同时查看高、中、低评价分布、评论时间和校区上下文，避免把少量极端体验当成学校定论。</p><div class="portrait-evidence-chips">${chips.map(value=>`<span class="portrait-evidence-chip">${html(value)}</span>`).join('')}</div></section>`;
}

function renderAgreementSection(evidence){
  const consensus=Array.isArray(evidence?.consensus)?evidence.consensus:[];
  const disputes=Array.isArray(evidence?.disputes)?evidence.disputes:[];
  const consensusHtml=consensus.length?`<div class="portrait-evidence-grid">${consensus.map(item=>renderEvidenceCard(item,'consensus')).join('')}</div>`:'<div class="portrait-empty-evidence">暂时没有达到门槛且评价较一致的分项，不应强行制造“共识”。</div>';
  const disputesHtml=disputes.length?`<div class="portrait-evidence-grid">${disputes.map(item=>renderEvidenceCard(item,'dispute')).join('')}</div>`:'<div class="portrait-empty-evidence">当前分项样本中暂未识别出明显的高低评价对立；这不等于所有学生体验完全一致。</div>';
  return `<section class="portrait-section"><div class="portrait-section-head"><h4>共识与分歧</h4><span>分布比单一平均分更重要</span></div><div class="portrait-section-head"><h4>相对一致</h4><span>至少 3 条评分且离散度较低</span></div>${consensusHtml}<div class="portrait-section-head" style="margin-top:16px"><h4>分化明显</h4><span>同时出现明显高分和低分</span></div>${disputesHtml}</section>`;
}

function renderEvidenceCard(item,tone){
  const distribution=item?.distribution||{};
  const score=Number(item?.score);
  const trend=trendText(item?.trend,item?.recentScore,item?.historicalScore);
  const description=tone==='consensus'
    ?`现有 ${number(item?.sampleSize)} 条评分较集中，可作为有限共识参考。`
    :`现有 ${number(item?.sampleSize)} 条评分同时出现高低评价，平均分代表性有限。`;
  return `<article class="portrait-evidence-card ${tone}"><div class="portrait-evidence-card-head"><strong>${html(item?.label||'体验维度')}</strong><span>${Number.isFinite(score)?score.toFixed(1):'—'}</span></div><p>${html(description)}</p><div class="portrait-distribution"><span>低分 ${number(distribution.low)}</span><span>中间 ${number(distribution.mid)}</span><span>高分 ${number(distribution.high)}</span></div>${trend?`<span class="portrait-trend">${html(trend)}</span>`:''}</article>`;
}

function renderTopicSignals(items){
  const rows=items.slice(0,8).map(item=>{
    const meta=[];
    if(Number(item.verifiedCount)>0)meta.push(`${number(item.verifiedCount)} 条认证`);
    if(Number(item.recentCount)>0)meta.push(`近一年 ${number(item.recentCount)} 条`);
    if(Number(item.questionCount)>0)meta.push(`${number(item.questionCount)} 个提问`);
    if(Array.isArray(item.campuses)&&item.campuses.length)meta.push(item.campuses.join('、'));
    const links=(item.sourceUrls||[]).slice(0,2).map((url,index)=>`<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">查看相关原评论 ${index+1} →</a>`).join('');
    return `<article class="portrait-topic-card"><div class="portrait-topic-card-head"><strong>${html(item.label||'讨论主题')}</strong><span class="portrait-topic-count">${number(item.mentionCount)} 条提及</span></div><div class="portrait-topic-meta">${meta.map(value=>`<span>${html(value)}</span>`).join('')}</div>${links?`<div class="portrait-topic-links">${links}</div>`:''}</article>`;
  }).join('');
  return `<section class="portrait-section"><div class="portrait-section-head"><h4>高频讨论信号</h4><span>只表示被谈到，不表示事实已经确认</span></div><div class="portrait-topic-grid">${rows}</div></section>`;
}

function renderChecklist(items){
  if(!items.length)return'';
  const rows=items.slice(0,6).map((item,index)=>`<div class="portrait-check-item"><span class="portrait-check-mark" aria-hidden="true">${index+1}</span><div class="portrait-check-copy"><strong>${html(item.label||'继续核验')}</strong><span>${html(item.reason||'以学校当年官方信息为准。')}</span></div></div>`).join('');
  return `<section class="portrait-section"><div class="portrait-section-head"><h4>报考前核验清单</h4><span>把焦虑转成可以询问和确认的事项</span></div><div class="portrait-checklist">${rows}</div></section>`;
}

function trendText(trend,recent,historical){
  if(trend==='improving')return`近一年评分高于较早样本（${score(recent)} vs ${score(historical)}）`;
  if(trend==='declining')return`近一年评分低于较早样本（${score(recent)} vs ${score(historical)}）`;
  if(trend==='stable')return`近一年与较早样本接近（${score(recent)} vs ${score(historical)}）`;
  return'';
}
function score(value){const number=Number(value);return Number.isFinite(number)?number.toFixed(1):'—';}
function number(value){return Math.max(0,Number(value)||0);}
function html(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function attr(value){return html(value).replace(/`/g,'&#96;');}
