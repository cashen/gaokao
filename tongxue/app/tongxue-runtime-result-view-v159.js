import {
  escapeHtml as html,
  escapeAttribute as attr,
  tidySummary,
  formatTime,
  formatReviewDate,
  sourceInfo,
  dedupeReviews,
  summaryGroups
} from './tongxue-runtime-utils-v159.js?v=159';

const PAGE_VERSION = 'v1.5.9';
const DIMENSIONS = Object.freeze({ dormitory:'宿舍', cafeteria:'食堂', faculty:'师资', environment:'环境', culture:'氛围', employment:'就业', safety:'安全' });

export function createTongxueResultView(ui, state, searchView) {
  function renderResult(data, school, resolution) {
    if (data.mode === 'recent_reviews') return renderReviews(data, school, resolution);
    if (data.mode === 'no_content') return renderNoContent(data, school, resolution);
    return renderSummary(data, school, resolution);
  }

  function renderSummary(data, school, resolution) {
    state.activeReviewState = null;
    const actual = data.school || school;
    const source = sourceInfo(data.source, actual);
    const meta = data.schoolMeta || {};
    const groups = summaryGroups(data.summary);
    const cards = groups.map(group => `<section class="insight-card ${group.key === 'attention' ? 'attention' : ''}"><h3 class="insight-title"><span class="insight-dot"></span>${html(group.title)}</h3><ul class="insight-list">${group.items.map(item => `<li>${html(item)}</li>`).join('')}</ul></section>`).join('');
    searchView.commit('success', `<article class="result-shell"${entityData(actual)}><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(actual)}</h2><span class="badge">公开评论摘要</span></div><div class="meta">${metaChips(meta, data, resolution, actual)}${entityChips(actual)}</div>${entityNote(actual)}<div class="divider"></div><div class="section-heading">公开评论摘要</div><div class="summary-grid">${cards}</div><details class="raw-summary"><summary>查看完整摘要</summary><div class="raw-summary-text">${html(tidySummary(data.summary))}</div></details><div class="source-note">内容来自公开评论整理，只代表部分评论者在特定时间、专业和校区的个人体验，不代表学校官方结论。</div><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">查看来源站全部评论 →</a>${technical(meta, data, source)}</article>`);
    searchView.focusResult();
  }

  function renderReviews(data, school, resolution) {
    const actual = data.school || school;
    const source = sourceInfo(data.source, actual);
    state.activeReviewState = {
      school: actual,
      originalInput: resolution?.input || school,
      resolution,
      schoolMeta: data.schoolMeta || {},
      source,
      fetchedAt: data.fetchedAt,
      transport: data.transport,
      version: data.version || PAGE_VERSION,
      reviews: dedupeReviews(data.reviews || []),
      pagination: data.reviewPagination || { page: 1, hasMore: false }
    };
    renderActiveReviews();
  }

  function renderActiveReviews() {
    const active = state.activeReviewState;
    if (!active) return;
    const data = { school: active.school, fetchedAt: active.fetchedAt, transport: active.transport, version: active.version };
    const cards = active.reviews.map((review, index) => reviewCard(review, index, active.source)).join('');
    const more = active.pagination?.hasMore
      ? '<div id="loadMoreWrap" class="load-more-wrap"><button id="loadMoreReviews" class="load-more" type="button">加载更多近期评论</button></div>' : '';
    searchView.commit('success', `<article class="result-shell"${entityData(active.school)}><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(active.school)}</h2><span class="badge review">近期公开评论</span></div><div class="meta">${metaChips(active.schoolMeta, data, active.resolution, active.school)}${entityChips(active.school)}</div>${entityNote(active.school)}<div class="divider"></div><div class="review-intro"><strong>暂无评论摘要</strong>下面按发布时间展示近期公开评论，供你了解不同评论者的个人体验。</div><div class="section-heading">最近发布的评论</div><div id="reviewGrid" class="review-grid">${cards}</div>${more}<div class="source-note">匿名评论和未认证评论请结合多条信息判断。</div><a class="link" href="${attr(active.source.url)}" target="_blank" rel="noopener noreferrer">查看来源站全部评论 →</a>${technical(active.schoolMeta, data, active.source)}</article>`);
    searchView.focusResult();
  }

  function appendReviews(reviews, startIndex) {
    const grid = document.getElementById('reviewGrid');
    if (!grid || !reviews.length) return;
    const template = document.createElement('template');
    template.innerHTML = reviews.map((review, index) => reviewCard(review, startIndex + index, state.activeReviewState?.source)).join('');
    grid.append(template.content);
  }

  function updateLoadMore() {
    const wrap = document.getElementById('loadMoreWrap');
    if (!wrap) return;
    if (!state.activeReviewState?.pagination?.hasMore) {
      wrap.remove();
      return;
    }
    const button = document.getElementById('loadMoreReviews');
    if (button) {
      button.disabled = false;
      button.textContent = '加载更多近期评论';
    }
  }

  function renderNoContent(data, school, resolution) {
    state.activeReviewState = null;
    const actual = data.school || school;
    const source = sourceInfo(data.source, actual);
    searchView.commit('empty', `<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">暂时没有可展示的公开评论</h2><p>学校名称已经确认，但当前来源没有可展示的摘要或评论。这不代表学校没有学生评价。</p><div class="state-meta">${resolutionChip(resolution, actual)}${stateMeta(data.schoolMeta || {})}</div><div class="state-actions"><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">查看来源页面 →</a><button class="action-button" type="button" data-retry-school>稍后重新获取</button></div>${technical(data.schoolMeta || {}, data, source)}</div>`);
    searchView.focusResult();
  }

  function renderFailure(error, school, resolution) {
    state.activeReviewState = null;
    const data = error?.data || {};
    const code = error?.code || 'unknown';
    const source = sourceInfo(data.source, school);
    const message = code === 'school_not_found'
      ? '来源站暂时没有这所学校的独立记录。'
      : '学校名称已经确认，但公开评论服务当前连接不稳定。';
    searchView.commit('error', `<div class="state-card error"><h2 id="resultTitle" tabindex="-1">暂时无法读取公开评论</h2><p>${html(message)}</p><div class="state-meta">${resolutionChip(resolution, school)}${stateMeta(data.schoolMeta || {})}</div><div class="state-actions"><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">查看来源页面 →</a><button class="action-button" type="button" data-retry-school>重新尝试</button></div><details><summary>技术诊断（供排查）</summary><div class="diagnostic">${html(`${code}\n${error?.message || ''}`)}</div></details></div>`);
    searchView.focusResult();
  }

  function reviewCard(review, index, source) {
    const content = String(review?.content || '').trim();
    const long = content.length > 240 || content.split(/\n/).length > 5;
    const tags = [];
    if (review?.isVerified) tags.push('<span class="review-tag verified">已认证本校学生</span>');
    if (review?.campus) tags.push(`<span class="review-tag">${html(review.campus)}</span>`);
    if (review?.isQuestion) tags.push('<span class="review-tag question">提问</span>');
    const author = String(review?.authorLabel || '匿名用户');
    const sourceUrl = String(review?.sourceUrl || source?.url || '#');
    const social = [];
    if (Number(review?.likes) > 0) social.push(`👍 ${Number(review.likes)} 赞`);
    if (Number(review?.replies) > 0) social.push(`💬 ${Number(review.replies)} 回复`);
    return `<article class="review-card"><div class="review-card-head"><div class="review-author"><span class="review-avatar">${html(author.slice(0, 1) || '同')}</span><span class="review-author-name">${html(author)}</span></div><time class="review-date">${html(formatReviewDate(review?.createdAt))}</time></div>${tags.length ? `<div class="review-tags">${tags.join('')}</div>` : ''}<div id="reviewContent${index}" class="review-content ${long ? 'collapsed' : ''}">${html(content)}</div>${long ? `<button class="review-expand" type="button" data-expand-review="${index}" aria-controls="reviewContent${index}" aria-expanded="false">展开全文</button>` : ''}${rating(review?.rating)}<div class="review-footer">${social.map(item => `<span>${html(item)}</span>`).join('')}<a class="review-source" href="${attr(sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原评论 →</a></div></article>`;
  }

  function rating(value) {
    if (!value || !Number.isFinite(Number(value.overall))) return '';
    const dimensions = value.dimensions && typeof value.dimensions === 'object' ? value.dimensions : {};
    const items = Object.entries(dimensions)
      .filter(([, score]) => Number.isFinite(Number(score)))
      .map(([key, score]) => `<span class="rating-dim">${html(DIMENSIONS[key] || key)} ${Number(score).toFixed(1)}</span>`)
      .join('');
    return `<div class="review-rating"><span>体验评分</span><span class="review-score">${Number(value.overall).toFixed(1)}</span><span>/ 5.0</span></div>${items ? `<details class="rating-details"><summary>查看分项评分</summary><div class="rating-dims">${items}</div></details>` : ''}`;
  }

  function metaChips(meta, data, resolution, actual) {
    const values = [];
    if (resolution?.input && resolution.input !== actual) values.push({ text: `${resolution.input} → ${actual}`, resolve: true });
    if (meta.province || meta.city) values.push({ text: [meta.province, meta.city].filter(Boolean).join(' · ') });
    if (meta.type) values.push({ text: meta.type });
    if (Number.isFinite(Number(meta.reviewCount))) values.push({ text: `${Number(meta.reviewCount)} 条公开评价` });
    if (data.fetchedAt) values.push({ text: `更新：${formatTime(data.fetchedAt)}` });
    return values.map(item => `<span class="meta-chip ${item.resolve ? 'resolve' : ''}">${html(item.text)}</span>`).join('');
  }

  function stateMeta(meta) {
    return [meta.name, [meta.province, meta.city].filter(Boolean).join(' · ')]
      .filter(Boolean)
      .map(value => `<span class="meta-chip">${html(value)}</span>`)
      .join('');
  }

  function resolutionChip(resolution, school) {
    return resolution?.input && resolution.input !== school
      ? `<span class="meta-chip resolve">${html(resolution.input)} → ${html(school)}</span>` : '';
  }

  function entityData(name) {
    const entity = searchView.entityMeta(name);
    return entity ? ` data-school-entity="${attr(entity.entityId)}" data-school-entity-type="${attr(entity.entityType)}"` : '';
  }

  function entityChips(name) {
    const entity = searchView.entityMeta(name);
    if (!entity) return '';
    const labels = [];
    if (entity.typeLabel) labels.push(entity.typeLabel);
    if (entity.parentName) labels.push(`所属：${entity.parentName}`);
    return labels.map(value => `<span class="meta-chip resolve">${html(value)}</span>`).join('');
  }

  function entityNote(name) {
    const entity = searchView.entityMeta(name);
    if (!entity || entity.entityType === 'official_school') return '';
    return `<div class="source-note"><strong>当前查询的是独立招生实体：</strong>${html(entity.displayName)}${entity.parentName ? `，所属学校为 ${html(entity.parentName)}` : ''}。评论可能混合学校整体与校区体验，请核对评论中的具体校区。</div>`;
  }

  function technical(meta, data, source) {
    const items = [`来源：${source?.name || 'srgaoxiao.com'}`, `页面：${PAGE_VERSION}`];
    if (data?.transport) items.push(`获取方式：${data.transport}`);
    if (data?.version) items.push(`内容接口：${data.version}`);
    if (meta?.id !== undefined && meta?.id !== null) items.push(`来源学校编号：${meta.id}`);
    return `<details class="technical-details"><summary>数据来源与技术信息</summary><div class="technical-list">${items.map(item => `<span class="technical-item">${html(item)}</span>`).join('')}</div></details>`;
  }

  return Object.freeze({ renderResult, renderActiveReviews, appendReviews, updateLoadMore, renderFailure });
}
