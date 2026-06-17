export function buildFeishuDocUrl(env = {}, documentId) {
  const host = String(env.FEISHU_DOC_HOST || "https://my.feishu.cn").replace(/\/$/, "");
  return `${host}/docx/${documentId}`;
}
