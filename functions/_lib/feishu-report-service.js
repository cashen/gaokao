import { getTenantAccessToken } from './feishu-auth.js';
import { buildFeishuDocUrl } from './feishu-link.js';
import { createFeishuDocument, writeReportToFeishuDocument } from './feishu-docx.js';
import { setFeishuDocumentPublicReadable } from './feishu-permission.js';

export function feishuJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function readFeishuJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('请求内容不是有效 JSON。');
  }
}

function technicalError(context, error) {
  return {
    route: new URL(context.request.url).pathname,
    message: error?.message || String(error),
    possibleReason: '飞书权限、接口返回、数据读取或报告字段兼容问题。技术详情只供排查，不应展示给家长正文。'
  };
}

export async function createFeishuReportResponse(context, buildReport, options = {}) {
  if (context.request.method !== 'POST') return feishuJson({ ok: false, message: '只支持 POST 请求。' }, 405);
  try {
    const input = await readFeishuJson(context.request);
    const env = context.env || {};
    const report = await buildReport(input, { context, env });
    if (!report?.title || !report?.markdown) throw new Error('报告内容没有正确生成。');

    const token = await getTenantAccessToken(env);
    const doc = await createFeishuDocument(token, env, report.title);
    const writeResult = await writeReportToFeishuDocument(token, doc.documentId, report);
    const permissionResult = await setFeishuDocumentPublicReadable(token, doc.documentId, env);
    const url = buildFeishuDocUrl(env, doc.documentId);
    const common = {
      ok: true,
      sharePublic: Boolean(permissionResult.ok),
      title: report.title,
      documentId: doc.documentId,
      url,
      reportType: report.reportType || options.reportType || '',
      dataYear: report.dataYear || options.dataYear || 2026,
      rankYear: report.rankYear || options.rankYear || report.dataYear || options.dataYear || 2026,
      audienceYear: report.audienceYear || options.audienceYear || 2027,
      yearCaliberVersion: report.yearCaliberVersion || options.yearCaliberVersion || '',
      permissionType: permissionResult.type || '',
      permissionWarning: permissionResult.ok ? '' : permissionResult.message
    };

    if (!writeResult.ok) {
      return feishuJson({
        ...common,
        partial: true,
        message: '飞书文档已创建，但内容写入失败。请检查文档块写入权限。',
        writeError: writeResult.error,
        convertError: writeResult.convertError
      });
    }

    return feishuJson({
      ...common,
      partial: false,
      writeMethod: writeResult.method,
      warning: writeResult.warning || ''
    });
  } catch (error) {
    return feishuJson({
      ok: false,
      message: error?.message || String(error),
      hint: '报告暂时生成失败。可以先复制文字版报告，稍后再试。',
      technical: technicalError(context, error)
    }, 500);
  }
}
