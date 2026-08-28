function esc(value) { return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function list(items = []) { return Array.isArray(items) && items.length ? `<ol class="coach-list">${items.map(x => `<li>${esc(String(x || '').replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, ''))}</li>`).join('')}</ol>` : ''; }
export function renderParentCoach(coach) {
  if (!coach) return '';
  const questions = list(coach.familyQuestions || []);
  const checks = list(coach.manualCheckList || []);
  return `<section class="coach-card">
    <div class="coach-title">家长下一步</div>
    ${coach.headline ? `<p class="coach-headline">${esc(coach.headline)}</p>` : ''}
    ${Array.isArray(coach.nextActions) && coach.nextActions.length ? `<div class="coach-block"><h3>优先动作</h3>${list(coach.nextActions)}</div>` : ''}
    ${coach.bottomLineReview ? `<div class="coach-block coach-bottomline"><h3>底线复核</h3><p>${esc(coach.bottomLineReview)}</p></div>` : ''}
    ${questions ? `<div class="coach-block"><h3>家庭要确认的问题</h3>${questions}</div>` : ''}
    ${checks ? `<details class="coach-checks"><summary>展开人工核验清单</summary>${checks}</details>` : ''}
  </section>`;
}
