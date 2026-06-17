const OPEN_BASE = "https://open.feishu.cn/open-apis";

async function feishuPatch(token, path, body) {
  const response = await fetch(`${OPEN_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.code !== 0) {
    const msg = data.msg || data.error?.message || `飞书权限设置失败：HTTP ${response.status}`;
    const error = new Error(msg);
    error.response = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

function publicReadableBody() {
  return {
    external_access: true,
    security_entity: "anyone_can_view",
    comment_entity: "anyone_can_view",
    share_entity: "anyone",
    link_share_entity: "anyone_readable",
    invite_external: true
  };
}

export async function setFeishuDocumentPublicReadable(token, documentId, env = {}) {
  const enabled = String(env.FEISHU_PUBLIC_SHARE ?? "true").toLowerCase();
  if (enabled === "false" || enabled === "0" || enabled === "off") {
    return { ok: false, skipped: true, message: "FEISHU_PUBLIC_SHARE 已关闭。" };
  }

  const explicitType = String(env.FEISHU_PERMISSION_TYPE || "").trim();
  const types = explicitType ? [explicitType] : ["docx", ""];

  let lastError = null;
  const body = publicReadableBody();

  for (const type of types) {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    try {
      const result = await feishuPatch(
        token,
        `/drive/v1/permissions/${encodeURIComponent(documentId)}/public${query}`,
        body
      );
      return {
        ok: true,
        type: type || "omitted",
        permission: result?.data?.permission_public || body
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    skipped: false,
    message: lastError?.message || "飞书公开分享权限设置失败。"
  };
}
