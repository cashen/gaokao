import { getTenantAccessToken } from "../_lib/feishu-auth.js";
import { buildReportData } from "../_lib/report-data-service.js";
import { buildFeishuReport } from "../_lib/feishu-report-builder.js";
import { buildFeishuDocUrl } from "../_lib/feishu-link.js";
import { createFeishuDocument, writeReportToFeishuDocument } from "../_lib/feishu-docx.js";
import { setFeishuDocumentPublicReadable } from "../_lib/feishu-permission.js";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("请求内容不是有效 JSON。");
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ ok: false, message: "只支持 POST 请求。" }, 405);
  }

  try {
    const input = await readJson(context.request);
    const env = context.env || {};

    const reportData = await buildReportData(context.request, env, input);
    const report = buildFeishuReport(reportData);

    const token = await getTenantAccessToken(env);
    const doc = await createFeishuDocument(token, env, report.title);
    const writeResult = await writeReportToFeishuDocument(token, doc.documentId, report);
    const permissionResult = await setFeishuDocumentPublicReadable(token, doc.documentId, env);
    const url = buildFeishuDocUrl(env, doc.documentId);

    if (!writeResult.ok) {
      return json({
        ok: true,
        partial: true,
        sharePublic: Boolean(permissionResult.ok),
        title: report.title,
        documentId: doc.documentId,
        url,
        message: "飞书文档已创建，但内容写入失败。请检查文档块写入权限。",
        writeError: writeResult.error,
        convertError: writeResult.convertError,
        permissionWarning: permissionResult.ok ? "" : permissionResult.message
      });
    }

    return json({
      ok: true,
      partial: false,
      sharePublic: Boolean(permissionResult.ok),
      title: report.title,
      documentId: doc.documentId,
      url,
      writeMethod: writeResult.method,
      warning: writeResult.warning || "",
      permissionType: permissionResult.type || "",
      permissionWarning: permissionResult.ok ? "" : permissionResult.message
    });
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: "请检查 Cloudflare Secrets：FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_DOC_HOST，并确认飞书应用已开通 docx 文档创建、编辑与 Drive 权限设置能力。"
    }, 500);
  }
}
