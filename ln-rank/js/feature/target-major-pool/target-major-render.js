(function () {
  'use strict';

  const cfg = () => window.TargetMajorPoolConfig;
  const fmt = (value) => Number(value || 0).toLocaleString('zh-CN');
  const signed = (value) => Number(value) > 0 ? `+${value}` : String(value);

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderShell(container) {
    if (!container) return;
    const regionOptions = cfg().regionOptions.map((item) => (
      `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
    )).join('');

    container.innerHTML = `
      <section class="target-major-panel" aria-label="目标分附近专业">
        <div class="target-major-head">
          <div>
            <p class="eyebrow">安全读取 /fenxi 数据</p>
            <h2>目标分附近专业</h2>
            <p>按当前目标分，查看上 10 分、下 25 分附近的院校专业记录。</p>
          </div>
          <button type="button" class="target-major-refresh" id="targetMajorLoadBtn">读取专业数据</button>
        </div>

        <div class="target-major-filters" aria-label="专业筛选条件">
          <label>
            <span>地域</span>
            <select id="targetMajorRegion">${regionOptions}</select>
          </label>
          <label>
            <span>学校关键词</span>
            <input id="targetMajorSchool" type="text" placeholder="例如：大连、沈阳、辽宁大学" />
          </label>
          <label>
            <span>专业关键词</span>
            <input id="targetMajorMajor" type="text" placeholder="例如：计算机、电气、护理" />
          </label>
        </div>

        <div class="target-major-status" id="targetMajorStatus">
          当前未读取。点击“读取专业数据”，会通过安全接口筛选目标分附近记录。
        </div>

        <div class="target-major-results" id="targetMajorResults"></div>

        <p class="target-major-note">
          本功能通过后端安全接口读取 /fenxi 历史录取数据，用于形成目标分附近的可讨论专业池，不等同于录取预测。正式填报仍需结合当年位次、等位分/同位分、招生计划、专业要求等信息。
        </p>
      </section>
    `;
  }

  function renderStatus(message, tone = '') {
    const el = qs('#targetMajorStatus');
    if (!el) return;
    el.className = `target-major-status ${tone ? `is-${tone}` : ''}`;
    el.textContent = message;
  }

  function renderUnsupported(result) {
    const box = qs('#targetMajorResults');
    if (!box) return;
    box.innerHTML = `
      <div class="target-major-empty">
        当前 /fenxi 专业数据以物理类为主。历史类暂不展示专业池，可以先使用位次梯度判断。
      </div>
    `;
    renderStatus('历史类专业池暂未接入。', 'soft');
  }

  function renderRecord(record) {
    const flags = record.flags.slice(0, 2).map((flag) => `<span>${escapeHtml(flag)}</span>`).join('');
    return `
      <article class="target-major-item">
        <div class="target-major-item-main">
          <strong>${escapeHtml(record.school || '学校待核验')}</strong>
          <span>${escapeHtml(record.major || '专业待核验')}</span>
        </div>
        <div class="target-major-meta">
          <span>2025 最低分：<b>${escapeHtml(record.score ?? '—')}</b></span>
          <span>最低位次：<b>${record.rank ? fmt(record.rank) : '—'}</b></span>
          <span>与目标分差：<b>${record.scoreDelta == null ? '—' : signed(record.scoreDelta)}</b></span>
        </div>
        <div class="target-major-submeta">
          <span>${escapeHtml(record.region)}</span>
          ${record.nature ? `<span>${escapeHtml(record.nature)}</span>` : ''}
          ${record.tuition && record.tuition !== '待核验' ? `<span>学费：${escapeHtml(record.tuition)}</span>` : ''}
        </div>
        ${flags ? `<div class="target-major-flags">${flags}</div>` : ''}
      </article>
    `;
  }

  function renderGroup(key, records, targetScore, expandedMap) {
    const conf = cfg().groups[key];
    const visibleCount = expandedMap[key] ? records.length : cfg().defaultVisibleCount;
    const visible = records.slice(0, visibleCount);
    const more = records.length > visible.length;
    const items = visible.map(renderRecord).join('');

    return `
      <section class="target-major-group target-major-group--${key}">
        <div class="target-major-group-head">
          <div>
            <h3>${escapeHtml(conf.title)} <small>${escapeHtml(conf.rangeText)}</small></h3>
            <p>${escapeHtml(conf.note)}</p>
          </div>
          <span>${fmt(records.length)} 条</span>
        </div>
        ${items || '<div class="target-major-empty">当前筛选条件下暂无记录。</div>'}
        ${more ? `<button type="button" class="target-major-more" data-target-major-more="${key}">查看更多</button>` : ''}
      </section>
    `;
  }

  function renderResults(result, expandedMap = {}) {
    const box = qs('#targetMajorResults');
    if (!box) return;

    if (result.unsupported) {
      renderUnsupported(result);
      return;
    }

    const rw = result.rankWindow;
    renderStatus(
      `目标分 ${result.targetScore} 分，筛选 ${rw.lowerScore}-${rw.upperScore} 分附近记录；当前共 ${fmt(result.total)} 条。`,
      result.total ? 'ok' : 'soft'
    );

    if (!result.total) {
      box.innerHTML = `
        <div class="target-major-empty">
          当前筛选条件下，目标分附近暂无记录。可以适当放宽地域、学校或专业关键词。
        </div>
      `;
      return;
    }

    box.innerHTML = ['upper', 'near', 'lower']
      .map((key) => renderGroup(key, result.groups[key] || [], result.targetScore, expandedMap))
      .join('');
  }

  window.TargetMajorPoolRender = {
    qs,
    renderShell,
    renderStatus,
    renderResults
  };
})();
