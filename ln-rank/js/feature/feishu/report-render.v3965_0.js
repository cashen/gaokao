import { FEISHU_UI_CONFIG } from '../../config/feishu-ui-config.js?v=3949_0';
import { canGenerateFeishuReport } from '../report/payload-builder.v3964_0.js?v=3964_0';
import { FEISHU_OPERATION, FEISHU_COPY } from './report-state.v3965_0.js?v=3965_0';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function feedback(state) {
  const css = state.copy === FEISHU_COPY.FAILED || state.operation === FEISHU_OPERATION.ERROR
    ? 'feishu-note is-error'
    : state.copy === FEISHU_COPY.COPIED
      ? 'feishu-note is-success'
      : 'feishu-note';
  return `<span class="${css}" data-feishu-feedback aria-live="polite">${escapeHtml(state.feedback || '')}</span>`;
}

export function renderFeishuReportView(state, appState, handlers) {
  const root = document.getElementById('feishuReportMount');
  if (!root) return;
  const availability = canGenerateFeishuReport(appState);

  if (state.operation === FEISHU_OPERATION.GENERATING) {
    root.innerHTML = `<div class="feishu-box is-loading">
      <button class="feishu-main-button" type="button" disabled>${FEISHU_UI_CONFIG.labels.loading}</button>
      ${feedback(state)}
    </div>`;
    return;
  }

  if (state.operation === FEISHU_OPERATION.SUCCESS && state.result?.url) {
    const partial = state.result.partial
      ? '<span class="feishu-warn">报告文档已创建，但内容写入可能不完整。</span>'
      : '';
    const share = state.result.sharePublic
      ? '<span class="feishu-public">已设置为获得链接的人可阅读</span>'
      : state.result.permissionWarning
        ? `<span class="feishu-warn">${escapeHtml(state.result.permissionWarning)}</span>`
        : '';
    const copyLabel = state.copy === FEISHU_COPY.COPYING
      ? '复制中…'
      : state.copy === FEISHU_COPY.COPIED
        ? '已复制'
        : state.copy === FEISHU_COPY.FAILED
          ? '再次复制'
          : FEISHU_UI_CONFIG.labels.copy;
    root.innerHTML = `<div class="feishu-box is-success">
      <span class="feishu-success-text">${FEISHU_UI_CONFIG.labels.success}</span>
      ${partial}${share}
      <button class="feishu-link-button" data-open-feishu type="button">${FEISHU_UI_CONFIG.labels.open}</button>
      <button class="feishu-link-button" data-copy-feishu type="button" ${state.copy === FEISHU_COPY.COPYING ? 'disabled' : ''}>${copyLabel}</button>
      ${feedback(state)}
    </div>`;
    root.querySelector('[data-open-feishu]')?.addEventListener('click', handlers.onOpen);
    root.querySelector('[data-copy-feishu]')?.addEventListener('click', handlers.onCopy);
    return;
  }

  if (state.operation === FEISHU_OPERATION.ERROR) {
    const detail = state.errorDetail
      ? `<details class="feishu-technical-detail"><summary>展开技术详情</summary><div>${escapeHtml(state.errorDetail)}</div></details>`
      : '';
    root.innerHTML = `<div class="feishu-box is-error">
      <button class="feishu-main-button is-error" data-generate-feishu type="button">${FEISHU_UI_CONFIG.labels.retry}</button>
      ${feedback(state)}
      ${detail}
    </div>`;
    root.querySelector('[data-generate-feishu]')?.addEventListener('click', handlers.onGenerate);
    return;
  }

  const disabled = !availability.ok;
  root.innerHTML = `<div class="feishu-box ${disabled ? 'is-disabled' : ''}">
    <button class="feishu-main-button" data-generate-feishu type="button" ${disabled ? 'disabled' : ''}>${FEISHU_UI_CONFIG.labels.idle}</button>
    <span class="feishu-note">${escapeHtml(disabled ? availability.reason : '默认带入当前区间前 20 条结果。')}</span>
  </div>`;
  root.querySelector('[data-generate-feishu]')?.addEventListener('click', handlers.onGenerate);
}
