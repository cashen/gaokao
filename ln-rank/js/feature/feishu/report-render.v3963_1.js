import { FEISHU_UI_CONFIG } from '../../config/feishu-ui-config.js?v=3956_0';
import { canGenerateFeishuReport } from '../report/payload-builder.v3963_1.js?v=3963_1';

async function copyText(text) {
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.position = 'fixed';
  box.style.left = '-9999px';
  document.body.appendChild(box);
  box.select();
  const ok = document.execCommand('copy');
  box.remove();
  return ok;
}

export function renderFeishuReportView(reportState, appState, handlers) {
  const root = document.getElementById('feishuReportMount');
  if (!root) return;
  const availability = canGenerateFeishuReport(appState);

  if (reportState.loading) {
    root.innerHTML = `<div class="feishu-box is-loading"><button class="feishu-main-button" type="button" disabled>${FEISHU_UI_CONFIG.labels.loading}</button><span class="feishu-note">正在创建报告文档并写入结果…</span></div>`;
    return;
  }

  if (reportState.result?.url) {
    const partial = reportState.result.partial ? '<span class="feishu-warn">报告文档已创建，但内容写入可能不完整。</span>' : '';
    const share = reportState.result.sharePublic
      ? '<span class="feishu-public">已设置为获得链接的人可阅读</span>'
      : (reportState.result.permissionWarning ? `<span class="feishu-warn">${reportState.result.permissionWarning}</span>` : '');
    root.innerHTML = `<div class="feishu-box is-success"><span class="feishu-success-text">${FEISHU_UI_CONFIG.labels.success}</span>${partial}${share}<button class="feishu-link-button" data-open-feishu type="button">${FEISHU_UI_CONFIG.labels.open}</button><button class="feishu-link-button" data-copy-feishu type="button">${FEISHU_UI_CONFIG.labels.copy}</button></div>`;
    root.querySelector('[data-open-feishu]')?.addEventListener('click', () => window.open(reportState.result.url, '_blank', 'noopener,noreferrer'));
    root.querySelector('[data-copy-feishu]')?.addEventListener('click', async event => {
      try {
        await copyText(reportState.result.url);
        event.currentTarget.textContent = '已复制';
        setTimeout(() => { event.currentTarget.textContent = FEISHU_UI_CONFIG.labels.copy; }, 1400);
      } catch {
        event.currentTarget.textContent = '复制失败';
      }
    });
    return;
  }

  if (reportState.error) {
    const detail = reportState.errorDetail ? `<details class="feishu-technical-detail"><summary>展开技术详情</summary><div>${reportState.errorDetail}</div></details>` : '';
    root.innerHTML = `<div class="feishu-box is-error"><button class="feishu-main-button is-error" data-generate-feishu type="button">${FEISHU_UI_CONFIG.labels.retry}</button><span class="feishu-note">报告暂时生成失败。可以先到已选专业页复制文字版，稍后再试。</span>${detail}</div>`;
    root.querySelector('[data-generate-feishu]')?.addEventListener('click', handlers.onGenerate);
    return;
  }

  const disabled = !availability.ok;
  root.innerHTML = `<div class="feishu-box ${disabled ? 'is-disabled' : ''}"><button class="feishu-main-button" data-generate-feishu type="button" ${disabled ? 'disabled' : ''}>${FEISHU_UI_CONFIG.labels.idle}</button><span class="feishu-note">${disabled ? availability.reason : '默认带入当前区间前20条2026专业记录。'}</span></div>`;
  root.querySelector('[data-generate-feishu]')?.addEventListener('click', handlers.onGenerate);
}
