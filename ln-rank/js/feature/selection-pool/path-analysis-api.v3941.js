import { buildPathAnalysis } from './selection-pool-analysis.v3941.js';

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
    if (looksLikeHtml(raw)) throw new Error('路径分析接口返回了 HTML。');
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error(`路径分析接口返回内容不是 JSON：${firstChars(raw)}`); }
    if (!response.ok || data.ok === false) throw new Error(data.message || `路径分析失败：${response.status}`);
    return data;
  } catch (error) {
    return buildPathAnalysis(payload || {});
  }
}
