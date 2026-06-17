let tokenCache = null;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function requireEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`飞书功能暂未配置：缺少 ${name}`);
  return value;
}

async function feishuJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== 0) {
    throw new Error(data.msg || `飞书鉴权失败：HTTP ${response.status}`);
  }
  return data;
}

export async function getTenantAccessToken(env = {}) {
  if (tokenCache && tokenCache.expireAt - nowSeconds() > 120) {
    return tokenCache.token;
  }

  const appId = requireEnv(env, "FEISHU_APP_ID");
  const appSecret = requireEnv(env, "FEISHU_APP_SECRET");

  const data = await feishuJson("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    app_id: appId,
    app_secret: appSecret
  });

  const token = data.tenant_access_token;
  if (!token) throw new Error("飞书鉴权成功但没有返回 tenant_access_token");

  tokenCache = {
    token,
    expireAt: nowSeconds() + Number(data.expire || 7000)
  };

  return token;
}
