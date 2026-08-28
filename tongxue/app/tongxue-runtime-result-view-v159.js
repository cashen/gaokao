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
import { buildUndergradGraduatePathwayView, UNDERGRAD_GRADUATE_PATHWAY_VIEW_META } from '../../shared/resources/majors/undergrad-graduate-pathway-view.v001.js?v=001_0';
import { summarizeDecisionContext } from '../../shared/decision-context/decision-context.v001.js';

const PAGE_VERSION = 'v1.5.9-uec01-evidence02';
const PATHWAY_VIEW_VERSION = UNDERGRAD_GRADUATE_PATHWAY_VIEW_META.version;
const DIMENSIONS = Object.freeze({ dormitory:'宿舍', cafeteria:'食堂', faculty:'师资', environment:'环境', culture:'氛围', employment:'就业感受', safety:'安全', stability:'稳定感受', difficulty:'学习难度', work_env:'工作环境感受' });
const TOPIC_LABELS = Object.freeze({
  general:'大学生怎么说', living:'住宿与食宿', dormitory:'宿舍体验', cafeteria:'食堂体验', environment:'校园环境与人文体验',
  management:'管理与日常规则', teaching:'教学与学习体验', campus:'校园生活', major_learning:'实际学什么', course_load:'课程与学习节奏',
  difficulty:'学习难度', math_physics:'数学与物理门槛', programming:'编程体验', lab_project:'实验与项目', internship:'实习体验',
  postgraduate:'考研与继续深造', employment_perception:'就业感受', transfer_regret:'转专业与后悔体验', expectation_gap:'入学前后预期差'
});

export function createTongxueResultView(ui, state, searchView) {
  function renderResult(data, school, resolution) {
    if (['major_reviews','topic_reviews'].includes(data.mode)) renderReviews(data, school, resolution);
    else if (['topic_no_content','topic_not_found_within_budget'].includes(data.mode)) renderTopicState(data, school, resolution);
    else if (data.mode === 'recent_reviews') renderReviews(data, school, resolution);
    else if (data.mode === 'no_content') renderNoContent(data, school, resolution);
    else renderSummary(data, school, resolution);
    mountDecisionContext();
  }

  function mountDecisionContext() {
    const context = state.decisionContext;
    if (!context || !ui.result) return;
    const host = ui.result.querySelector('.result-shell, .state-card');
    if (!host || host.querySelector('[data-decision-context-strip]')) return;
    const summary = summarizeDecisionContext(context, { surface:'tongxue' });
    if (!summary.lines.length) return;
    const strip = document.createElement('section');
    strip.className = 'decision-context-strip';
    strip.dataset.decisionContextStrip = 'readonly';
    strip.innerHTML = `<strong>${html(summary.title)}</strong><span>${html(summary.lines.join(' · '))}</span><small>${html(summary.note)}；不会自动修改家庭方案。</small>`;
    if (context.returnTo) {
      const link = document.createElement('a');
      link.href = context.returnTo;
      link.textContent = '返回原查询';
      link.className = 'decision-context-return';
      strip.append(link);
    }
    host.prepend(strip);
  }

  function renderSummary(data, school, resolution) {
    state.activeReviewState = null;
    const actual = data.school || school;
    const source = sourceInfo(data.source, actual);
    const meta = data.schoolMeta || {};
    const groups = summaryGroups(data.summary);
    const cards = groups.map(group => `<section class="insight-card ${group.key === 'attention' ? 'attention' : ''}"><h3 class="insight-title"><span class="insight-dot"></span>${html(group.title)}</h3><ul class="insight-list">${group.items.map(item => `<li>${html(item)}</li>`).join('')}</ul></section>`).join('');
    const studentEvidence = Array.isArray(data.studentEvidence) ? data.studentEvidence.slice(0, 5) : [];
    const evidenceCards = studentEvidence.map((review, index) => reviewCard(review, `evidence-${index}`, source)).join('');
    const evidenceExplanation = studentEvidence.length
      ? `<div class="review-intro" data-summary-evidence-explanation><strong>这些概括从哪来？</strong>下面列出本次参考的 ${studentEvidence.length} 条学生留言，尽量覆盖不同话题、具体细节和较新的内容。每个人经历不同，最好结合原留言一起看。</div><div class="section-heading">几条有代表性的学生留言</div><div class="review-grid" data-student-evidence-grid>${evidenceCards}</div>`
      : '<div class="review-intro" data-summary-evidence-empty><strong>这些概括从哪来？</strong>这次有可用的概括，但暂时没拿到能对应展示的原留言。这里不补写。</div>';
    searchView.commit('success', `<article class="result-shell"${entityData(actual)}><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(actual)}</h2><span class="badge">大家怎么说</span></div><div class="meta">${metaChips(meta, data, resolution, actual)}${entityChips(actual)}${evidenceChips(data.evidence)}</div>${entityNote(actual)}<div class="divider"></div><div class="section-heading">大家主要在说什么</div><div class="summary-grid">${cards}</div><details class="raw-summary"><summary>查看完整概括</summary><div class="raw-summary-text">${html(tidySummary(data.summary))}</div></details><div class="divider"></div>${evidenceExplanation}<div class="source-note">内容整理自学生公开留言，只代表部分评论者在特定时间、专业和校区的个人经历，不是学校官方结论，也不参与录取或推荐排序。</div><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">去来源站看更多留言 →</a>${technical(meta, data, source, data.evidence)}</article>`);
    searchView.focusResult();
  }

  function renderReviews(data, school, resolution) {
    const isMajor = data.scope === 'major' || Boolean(data.major?.code);
    const actual = isMajor ? String(data.major?.name || state.currentMajorName || '这个专业') : (data.school || school);
    const source = sourceInfo(data.source, actual);
    state.activeReviewState = {
      scope:isMajor ? 'major' : 'school',
      school:isMajor ? '' : actual,
      major:isMajor ? (data.major || { code:state.currentMajorCode || '', name:actual }) : null,
      topic:data.topic || state.currentTopic || 'general',
      evidence:data.evidence || null,
      originalInput:resolution?.input || school,
      entityId:isMajor ? '' : (data.entity?.entityId || resolution?.entityId || ''),
      resolution,
      schoolMeta:isMajor ? {} : (data.schoolMeta || {}),
      source,
      fetchedAt:data.fetchedAt,
      transport:data.transport,
      version:data.version || PAGE_VERSION,
      reviews:dedupeReviews(data.reviews || []),
      pagination:data.reviewPagination || { page:1, hasMore:false },
      mode:data.mode
    };
    renderActiveReviews();
  }

  function renderActiveReviews() {
    const active = state.activeReviewState;
    if (!active) return;
    if (active.scope === 'major') return renderActiveMajorReviews(active);
    const data = { school:active.school, fetchedAt:active.fetchedAt, transport:active.transport, version:active.version };
    const cards = active.reviews.map((review, index) => reviewCard(review, index, active.source)).join('');
    const more = active.pagination?.hasMore && active.mode === 'recent_reviews'
      ? '<div id="loadMoreWrap" class="load-more-wrap"><button id="loadMoreReviews" class="load-more" type="button">再看一些学生留言</button></div>' : '';
    const intro = active.mode === 'topic_reviews'
      ? `<div class="review-intro"><strong>先看相关留言</strong>${html(topicLabel(active.topic))}：${html(sampleSentence(active.evidence, active.reviews.length))}</div>`
      : '<div class="review-intro"><strong>先看学生怎么说</strong>现有留言还不够支持一段稳妥的概括，下面直接列出原留言。</div>';
    searchView.commit('success', `<article class="result-shell"${entityData(active.school)}><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(active.school)}</h2><span class="badge review">大学生怎么说</span></div><div class="meta">${metaChips(active.schoolMeta, data, active.resolution, active.school)}${entityChips(active.school)}${evidenceChips(active.evidence)}</div>${entityNote(active.school)}<div class="divider"></div>${intro}<div class="section-heading">${html(active.mode === 'topic_reviews' ? '与这个问题直接相关的学生留言' : '学生留言')}</div><div id="reviewGrid" class="review-grid">${cards}</div>${more}<div class="source-note">这些是学生个人经历，不是学校官方事实。来源站的认证标记只说明账号状态，不参与排序或推荐；不同学生的感受可能相反。</div><a class="link" href="${attr(active.source.url)}" target="_blank" rel="noopener noreferrer">去来源站看更多留言 →</a>${technical(active.schoolMeta, data, active.source, active.evidence)}</article>`);
    searchView.focusResult();
  }

  function majorSourceIntroShell(major = {}) {
    const code = String(major.code || '').trim();
    return `<section class="major-source-intro" data-major-source-intro="${attr(code)}" aria-label="专业解读">
      <div class="section-heading">先看懂这个专业</div>
      <div class="state-card loading"><strong>正在读取专业解读</strong><p>先把“是什么、学什么、做什么、就业方向”看清楚，再看大学生的个人体验。</p></div>
    </section>${buildUndergradGraduatePathwayView({ major, returnTo:'/tongxue/' })}`;
  }

  function mountMajorSourceIntro(major = {}) {
    const code = String(major.code || '').trim();
    if (!code) return;
    const target = document.querySelector(`[data-major-source-intro="${code}"]`);
    if (!target) return;
    import('../../ln-rank/kb/major-understanding/major-source-profile.generated.js?v=pr194-flow002')
      .then(({ getMajorSourceProfile }) => {
        const profile = getMajorSourceProfile(code);
        const fieldSpecs = [
          ['专业是什么', profile?.whatIs],
          ['主要学什么', profile?.whatLearn],
          ['毕业后做什么', profile?.whatDo],
          ['就业方向', profile?.careerPath]
        ];
        const rows = profile
          ? fieldSpecs.map(([label, value]) => [label, String(value || '').trim()])
          : [];
        const footerNote = document.querySelector('[data-major-source-footer-note]');
        if (footerNote) {
          footerNote.hidden = true;
          footerNote.textContent = '';
        }
        if (!rows.some(([, value]) => value)) {
          target.innerHTML = '<div class="section-heading">先看懂这个专业</div><div class="state-card"><strong>暂无可核验的原站专业解读</strong><p>这个专业暂时没有可核验的源站四字段资料；下面的大学生留言仍保持为个人体验，不代替专业事实。</p></div>';
          return;
        }
        const fields = rows.map(([label, value], index) => `<section class="major-source-row"><div class="major-source-heading"><span class="major-source-index">${String(index + 1).padStart(2, '0')}</span><h3>${label}</h3></div><p>${html(value || '源站暂未提供可核验内容')}</p></section>`).join('');
        if (footerNote) {
          const sourceHref = profile?.sourceUrl
            ? ` <a href="${attr(profile.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原站专业解读 ↗</a>`
            : '';
          footerNote.innerHTML = `专业解读来源：eo.srgaoxiao.cn；抓取日期：${html(profile?.retrievedAt || '—')}。专业资料与学生留言分开阅读。${sourceHref}`;
          footerNote.hidden = false;
        }
        target.innerHTML = `<div class="section-heading">先看懂这个专业</div><p class="review-intro"><strong>源站专业解读</strong>按“是什么、学什么、做什么、就业方向”顺序阅读；它们是资料说明，不是录取或就业承诺。</p><div class="major-source-flow" data-major-source-flow>${fields}</div>`;
      })
      .catch(() => {
        target.innerHTML = '<div class="section-heading">先看懂这个专业</div><div class="state-card"><strong>专业解读暂时无法读取</strong><p>可以先看下方学生留言，稍后再试；学生留言不代替官方专业资料。</p></div>';
      });
  }

  function renderActiveMajorReviews(active) {
    const major = active.major || {};
    const data = { fetchedAt:active.fetchedAt, transport:active.transport, version:active.version };
    const cards = active.reviews.map((review, index) => reviewCard(review, index, active.source)).join('');
    const more = active.pagination?.hasMore && active.mode === 'major_reviews'
      ? '<div id="loadMoreWrap" class="load-more-wrap"><button id="loadMoreReviews" class="load-more" type="button">再看一些学生留言</button></div>' : '';
    const topicText = active.topic && active.topic !== 'general' ? topicLabel(active.topic) : '这个专业实际读起来怎么样';
    searchView.commit('success', `<article class="result-shell" data-student-voice-scope="major" data-major-code="${attr(major.code || '')}"><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(major.name || '专业体验')}</h2><span class="badge review">大学生怎么说</span></div><div class="meta"><span class="meta-chip resolve">本科专业代码 ${html(major.code || '—')}</span>${major.categoryName ? `<span class="meta-chip">${html(major.categoryName)}</span>` : ''}${evidenceChips(active.evidence)}${active.fetchedAt ? `<span class="meta-chip">更新：${html(formatTime(active.fetchedAt))}</span>` : ''}</div>${majorSourceIntroShell(major)}<div class="divider"></div><div class="review-intro"><strong>先看相关留言</strong>${html(topicText)}：${html(sampleSentence(active.evidence, active.reviews.length))}</div><div class="section-heading">学生留言</div><div id="reviewGrid" class="review-grid">${cards}</div>${more}<div class="source-note">这些留言来自不同学校的学生，只能帮助了解“${html(major.name || '该专业')}”常见的学习和生活感受，不能代表某一所学校的培养情况，也不是就业率、薪资或专业强弱的官方结论。来源站认证标记只作来源说明，不参与推荐。</div><a class="link" href="${attr(active.source.url)}" target="_blank" rel="noopener noreferrer">去来源站看这个专业的更多留言 →</a>${technical({}, data, active.source, active.evidence, major)}</article>`);
    searchView.focusResult();
    mountMajorSourceIntro(major);
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
      button.textContent = '再看一些学生留言';
    }
  }

  function renderTopicState(data, school, resolution) {
    state.activeReviewState = null;
    const isMajor = data.scope === 'major' || Boolean(data.major?.code);
    const actual = isMajor ? String(data.major?.name || state.currentMajorName || '这个专业') : (data.school || school);
    const source = sourceInfo(data.source, actual);
    const exhausted = data.mode === 'topic_no_content' || data.evidence?.exhaustive === true;
    const title = exhausted ? `暂时没有找到“${topicLabel(data.topic)}”的直接学生留言` : `这次还没找到“${topicLabel(data.topic)}”的直接学生留言`;
    const body = exhausted
      ? '这只表示当前取得的留言里没有直接匹配内容，不代表现实中没人讨论，也不能据此判断体验好坏。'
      : '来源里还有更多留言。为了控制一次查询的范围，这次没有继续无止境往后翻，所以这里只能说“暂时没找到”。';
    const major = data.major || { code:state.currentMajorCode || '', name:actual };
    const shell = isMajor ? `<article class="result-shell" data-student-voice-scope="major" data-major-code="${attr(major.code || '')}">${majorSourceIntroShell(major)}<div class="divider"></div>` : '';
    const close = isMajor ? '</article>' : '';
    searchView.commit('empty', `${shell}<div class="state-card notice" data-student-voice-scope="${attr(isMajor ? 'major' : 'school')}"><h2 id="resultTitle" tabindex="-1">${html(title)}</h2><p>${html(body)}</p><div class="state-meta">${isMajor && major.code ? `<span class="meta-chip resolve">${html(major.name)} · ${html(major.code)}</span>` : `${resolutionChip(resolution, actual)}${stateMeta(data.schoolMeta || {})}`}${evidenceChips(data.evidence)}</div><div class="state-actions"><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">去来源页面看看 →</a></div>${technical(data.schoolMeta || {}, data, source, data.evidence, major)}</div>${close}`);
    searchView.focusResult();
    if (isMajor) mountMajorSourceIntro(major);
  }

  function renderNoContent(data, school, resolution) {
    state.activeReviewState = null;
    const isMajor = data.scope === 'major' || Boolean(data.major?.code);
    const actual = isMajor ? String(data.major?.name || state.currentMajorName || '这个专业') : (data.school || school);
    const source = sourceInfo(data.source, actual);
    const title = isMajor ? '这个专业暂时没有可展示的学生留言' : '暂时没有找到可展示的学生留言';
    const body = isMajor
      ? '专业名称已经确认，但当前来源没有返回可展示的专业留言。这不代表这个专业没人读、没人讨论或体验不好。'
      : '学校名称已经确认，但当前来源没有返回可展示的概括或留言。这不代表没人评价这所学校。';
    const major = data.major || { code:state.currentMajorCode || '', name:actual };
    const shell = isMajor ? `<article class="result-shell" data-student-voice-scope="major" data-major-code="${attr(major.code || '')}">${majorSourceIntroShell(major)}<div class="divider"></div>` : '';
    const close = isMajor ? '</article>' : '';
    searchView.commit('empty', `${shell}<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">${html(title)}</h2><p>${html(body)}</p><div class="state-meta">${isMajor && major.code ? `<span class="meta-chip resolve">${html(major.name)} · ${html(major.code)}</span>` : `${resolutionChip(resolution, actual)}${stateMeta(data.schoolMeta || {})}`}${evidenceChips(data.evidence)}</div><div class="state-actions"><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">去来源页面看看 →</a>${isMajor ? '' : '<button class="action-button" type="button" data-retry-school>稍后再试</button>'}</div>${technical(data.schoolMeta || {}, data, source, data.evidence, major)}</div>${close}`);
    searchView.focusResult();
    if (isMajor) mountMajorSourceIntro(major);
  }

  function renderFailure(error, school, resolution) {
    state.activeReviewState = null;
    const data = error?.data || {};
    const code = error?.code || 'unknown';
    const isMajor = data.scope === 'major' || Boolean(data.major?.code) || state.voiceScope === 'major';
    const actual = isMajor ? String(data.major?.name || state.currentMajorName || '这个专业') : school;
    const source = sourceInfo(data.source, actual);
    let message = code === 'school_not_found'
      ? '来源站暂时没有这所学校的独立记录。'
      : (isMajor ? '专业名称已经确认，但学生评价来源现在连接不稳定或没有对应记录。' : '学校名称已经确认，但学生评价来源现在连接不稳定。');
    if (code === 'school_major_source_binding_unavailable') message = '当前专业留言没有学校身份信息，所以不能把不同学校的留言当成这所学校的专业体验。';
    searchView.commit('error', `<div class="state-card error"><h2 id="resultTitle" tabindex="-1">暂时看不了大学生评价</h2><p>${html(message)}</p><div class="state-meta">${isMajor && data.major?.code ? `<span class="meta-chip resolve">${html(data.major.name)} · ${html(data.major.code)}</span>` : `${resolutionChip(resolution, school)}${stateMeta(data.schoolMeta || {})}`}</div><div class="state-actions"><a class="link" href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">去来源页面看看 →</a>${isMajor ? '' : '<button class="action-button" type="button" data-retry-school>重新尝试</button>'}</div><details><summary>技术诊断（供排查）</summary><div class="diagnostic">${html(`${code}\n${error?.message || ''}`)}</div></details></div>`);
    searchView.focusResult();
  }

  function reviewCard(review, index, source) {
    const content = String(review?.content || '').trim();
    const long = content.length > 240 || content.split(/\n/).length > 5;
    const tags = [];
    if (review?.categoryLabel) tags.push(`<span class="review-tag">${html(review.categoryLabel)}</span>`);
    if (review?.isVerified) tags.push(`<span class="review-tag verified">${review?.evidenceScope === 'major' ? '来源站认证标记' : '来源站学生认证标记'}</span>`);
    if (review?.campus) tags.push(`<span class="review-tag">${html(review.campus)}</span>`);
    if (review?.isQuestion) tags.push('<span class="review-tag question">提问</span>');
    const author = String(review?.authorLabel || '匿名用户');
    const sourceUrl = String(review?.sourceUrl || source?.url || '#');
    const social = [];
    if (Number(review?.likes) > 0) social.push(`👍 ${Number(review.likes)} 赞`);
    if (Number(review?.replies) > 0) social.push(`💬 ${Number(review.replies)} 回复`);
    const reason = review?.reason ? `<div class="rating-details"><strong>这条为什么有代表性：</strong>${html(review.reason)}</div>` : '';
    return `<article class="review-card"><div class="review-card-head"><div class="review-author"><span class="review-avatar">${html(author.slice(0, 1) || '同')}</span><span class="review-author-name">${html(author)}</span></div><time class="review-date">${html(formatReviewDate(review?.createdAt))}</time></div>${tags.length ? `<div class="review-tags">${tags.join('')}</div>` : ''}<div id="reviewContent${attr(index)}" class="review-content ${long ? 'collapsed' : ''}">${html(content)}</div>${long ? `<button class="review-expand" type="button" data-expand-review="${attr(index)}" aria-controls="reviewContent${attr(index)}" aria-expanded="false">展开全文</button>` : ''}${reason}${rating(review?.rating)}<div class="review-footer">${social.map(item => `<span>${html(item)}</span>`).join('')}<a class="review-source" href="${attr(sourceUrl)}" target="_blank" rel="noopener noreferrer">看原留言 →</a></div></article>`;
  }

  function rating(value) {
    if (!value) return '';
    const dimensions = value.dimensions && typeof value.dimensions === 'object' ? value.dimensions : {};
    const items = Object.entries(dimensions)
      .filter(([, score]) => Number.isFinite(Number(score)))
      .map(([key, score]) => `<span class="rating-dim">${html(DIMENSIONS[key] || key)} ${Number(score).toFixed(1)}</span>`)
      .join('');
    const hasOverall = Number.isFinite(Number(value.overall));
    if (!hasOverall && !items) return '';
    const head = hasOverall
      ? `<div class="review-rating"><span>来源体验评分</span><span class="review-score">${Number(value.overall).toFixed(1)}</span><span>/ 5.0</span></div>`
      : '<div class="review-rating"><span>来源分项评分</span><span class="rating-note">仅作原留言信息展示</span></div>';
    return `${head}${items ? `<details class="rating-details"><summary>查看分项评分</summary><div class="rating-dims">${items}</div></details>` : ''}`;
  }

  function topicLabel(topic) {
    return TOPIC_LABELS[String(topic || '')] || '相关话题';
  }

  function sampleSentence(evidence, fallbackCount = 0) {
    const count = Number.isFinite(Number(evidence?.matchCount)) ? Number(evidence.matchCount) : Number(fallbackCount || 0);
    const scanned = Number.isFinite(Number(evidence?.scannedCount)) ? Number(evidence.scannedCount) : null;
    const level = String(evidence?.sampleLevel || '');
    if (level === 'single_voice' || count === 1) return '本次只取得 1 条直接相关留言，只能看作一位学生的经历，不能外推。';
    if (level === 'two_voices' || count === 2) return '本次取得 2 条直接相关留言，逐条看即可，不把两个人的经历写成共识。';
    if (level === 'recent_themes_no_consensus' || (count >= 3 && count <= 4)) return `本次取得 ${count} 条相关留言，可以看看最近在谈什么，但还不能据此说“多数学生都这样”。`;
    if (count >= 5) return `本次取得 ${count} 条相关留言${scanned && scanned > count ? `（固定范围内查看 ${scanned} 条）` : ''}，可以观察常见话题和分歧，但仍不是统计调查。`;
    return scanned ? `本次固定范围内查看了 ${scanned} 条学生留言。` : '以下只展示当前取得的学生留言。';
  }

  function evidenceChips(evidence) {
    if (!evidence || typeof evidence !== 'object') return '';
    const values = [];
    if (Number.isFinite(Number(evidence.matchCount))) values.push(`相关留言 ${Number(evidence.matchCount)} 条`);
    if (Number.isFinite(Number(evidence.scannedCount)) && Number(evidence.scannedCount) > Number(evidence.matchCount || 0)) values.push(`查看 ${Number(evidence.scannedCount)} 条`);
    if (Number.isFinite(Number(evidence.scannedPages)) && Number(evidence.scannedPages) > 1) values.push(`最多查看 ${Number(evidence.scannedPages)} 页`);
    return values.map(value => `<span class="meta-chip">${html(value)}</span>`).join('');
  }

  function metaChips(meta, data, resolution, actual) {
    const values = [];
    if (resolution?.input && resolution.input !== actual) values.push({ text:`${resolution.input} → ${actual}`, resolve:true });
    if (meta.province || meta.city) values.push({ text:[meta.province, meta.city].filter(Boolean).join(' · ') });
    if (meta.type) values.push({ text:meta.type });
    if (Number.isFinite(Number(meta.reviewCount))) values.push({ text:`${Number(meta.reviewCount)} 条学生评价` });
    if (data.fetchedAt) values.push({ text:`更新：${formatTime(data.fetchedAt)}` });
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
    return `<div class="source-note"><strong>当前查询的是独立招生实体：</strong>${html(entity.displayName)}${entity.parentName ? `，所属学校为 ${html(entity.parentName)}` : ''}。留言可能混合学校整体与校区体验，请核对留言中的具体校区。</div>`;
  }

  function technical(meta, data, source, evidence = null, major = null) {
    const items = [`来源：${source?.name || '学生评价来源'}`, `页面：${PAGE_VERSION}`];
    if (data?.transport) items.push(`获取方式：${data.transport}`);
    if (data?.version) items.push(`内容接口：${data.version}`);
    if (meta?.id !== undefined && meta?.id !== null) items.push(`来源学校编号：${meta.id}`);
    if (major?.sourceId !== undefined && major?.sourceId !== null) items.push(`来源专业编号：${major.sourceId}`);
    if (evidence?.scope) items.push(`证据范围：${evidence.scope}`);
    if (major?.code) items.push(`升学路径：${PATHWAY_VIEW_VERSION}`);
    return `<details class="technical-details"><summary>数据来源与技术信息</summary><div class="technical-list">${items.map(item => `<span class="technical-item">${html(item)}</span>`).join('')}</div></details>`;
  }

  return Object.freeze({ renderResult, renderActiveReviews, appendReviews, updateLoadMore, renderFailure });
}
