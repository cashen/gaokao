import { buildPathAnalysis } from './analysis.v3963_1.js?v=3963_1';
import { FEISHU_REPORT_CONTRACT } from '../../../../shared/resources/reports/feishu-report-contract.v3963_1.js?v=3963_1';

function firstChars(text, len = 180) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

export async function requestPathAnalysis(payload) {
  try {
    const response = await fetch('/api/path-analysis', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      cache: 'no-store',
      body: JSON.stringify(payload || {})
    });
    const raw = await response.text();
    if (looksLikeHtml(raw)) throw new Error('排序诊断接口返回了 HTML。');
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error(`排序诊断接口返回内容不是 JSON：${firstChars(raw)}`); }
    if (!response.ok || data.ok === false) throw new Error(data.message || `排序诊断失败：${response.status}`);
    if (
      Number(data.dataYear) !== FEISHU_REPORT_CONTRACT.dataYear
      || Number(data.rankYear) !== FEISHU_REPORT_CONTRACT.rankYear
      || Number(data.audienceYear) !== FEISHU_REPORT_CONTRACT.audienceYear
      || data.yearCaliberVersion !== FEISHU_REPORT_CONTRACT.yearCaliberVersion
    ) throw new Error('排序诊断接口年度口径与当前页面不一致。');
    return data;
  } catch (error) {
    return buildPathAnalysis(payload || {});
  }
}
