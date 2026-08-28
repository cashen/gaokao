import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES } from '../../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0';

function firstChars(text, len = 180) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const value = String(text || '').trim().toLowerCase();
  return value.startsWith('<!doctype html') || value.startsWith('<html') || value.includes('<html');
}

function routeLabel(path) {
  if (path === FEISHU_REPORT_ROUTES.selectionPool) return '家庭复核报告';
  if (path === FEISHU_REPORT_ROUTES.currentBand) return '当前专业报告';
  return '飞书报告';
}

function interfaceError({ path, status, raw }) {
  const preview = firstChars(raw, 140);
  const label = routeLabel(path);
  if (looksLikeHtml(raw)) {
    return new Error(`${label}暂时没生成成功。可以先保存文字版，稍后再试。技术详情：请求路径 ${path}；HTTP ${status}；返回内容是 HTML，通常表示 Functions 路由没有部署或请求被静态页面接管。返回片段：${preview}`);
  }
  return new Error(`${label}暂时没生成成功。可以先保存文字版，稍后再试。技术详情：请求路径 ${path}；HTTP ${status}；返回片段：${preview}`);
}

export async function postFeishuReport(path, payload, options = {}) {
  const allowed = new Set([FEISHU_REPORT_ROUTES.currentBand, FEISHU_REPORT_ROUTES.selectionPool]);
  if (!allowed.has(path)) throw new Error(`未登记的飞书报告接口：${path}`);

  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Math.max(5000, Number(options.timeoutMs)) : 90000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        cache: 'no-store',
        body: JSON.stringify(payload || {}),
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`${routeLabel(path)}生成时间过长，已经停止等待。可以稍后重试或先保存文字版。`);
      throw new Error(`${routeLabel(path)}暂时无法连接。请检查网络后重试。技术详情：${error?.message || String(error)}`);
    }

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw || '{}');
    } catch {
      throw interfaceError({ path, status: response.status, raw });
    }

    if (!response.ok || data.ok === false) {
      const detail = data.technical?.message || data.message || data.hint || `HTTP ${response.status}`;
      throw new Error(detail);
    }
    if (!data.url) throw new Error(`${routeLabel(path)}已返回结果，但没有可打开的文档链接。`);
    if (
      Number(data.dataYear) !== FEISHU_REPORT_CONTRACT.dataYear
      || Number(data.rankYear) !== FEISHU_REPORT_CONTRACT.rankYear
      || Number(data.audienceYear) !== FEISHU_REPORT_CONTRACT.audienceYear
      || data.yearCaliberVersion !== FEISHU_REPORT_CONTRACT.yearCaliberVersion
    ) throw new Error(`${routeLabel(path)}返回的年度口径与当前页面不一致，已停止使用该报告。`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
