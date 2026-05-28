export const DEFAULT_FEISHU_DOC_FOLDER_TOKEN = "Bpl6f4yh5lt3TcdHBCScuxRmnyc";

export function getFeishuFolderToken(env = {}) {
  const fromEnv = String(env.FEISHU_DOC_FOLDER_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_FEISHU_DOC_FOLDER_TOKEN;
}

export function describeFeishuFolderTarget(env = {}) {
  const token = getFeishuFolderToken(env);
  return {
    enabled: Boolean(token),
    token,
    source: String(env.FEISHU_DOC_FOLDER_TOKEN || "").trim() ? "env" : "default"
  };
}
