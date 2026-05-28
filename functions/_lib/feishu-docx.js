import { reportToFallbackBlocks } from "./feishu-block-builder.js";

const OPEN_BASE = "https://open.feishu.cn/open-apis";

async function feishuRequest(token, path, { method = "GET", body } = {}) {
  const response = await fetch(`${OPEN_BASE}${path}`, {
    method,
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: body == null ? undefined : JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.code !== 0) {
    const msg = data.msg || data.error?.message || `飞书接口调用失败：HTTP ${response.status}`;
    throw new Error(msg);
  }

  return data;
}

function pickDocumentId(data) {
  return (
    data?.data?.document?.document_id ||
    data?.data?.document?.token ||
    data?.data?.document_id ||
    data?.data?.token ||
    data?.document?.document_id ||
    data?.document_id ||
    ""
  );
}

export async function createFeishuDocument(token, env = {}, title) {
  const body = { title };
  const folderToken = String(env.FEISHU_DOC_FOLDER_TOKEN || "").trim();
  if (folderToken) body.folder_token = folderToken;

  const data = await feishuRequest(token, "/docx/v1/documents", {
    method: "POST",
    body
  });

  const documentId = pickDocumentId(data);
  if (!documentId) throw new Error("飞书文档已创建但没有返回 document_id");

  return { documentId, raw: data };
}

async function convertMarkdownToBlocks(token, markdown) {
  return feishuRequest(token, "/docx/v1/documents/blocks/convert", {
    method: "POST",
    body: {
      content_type: "markdown",
      content: markdown
    }
  });
}

function cleanConvertedBlock(block) {
  const copy = JSON.parse(JSON.stringify(block));
  if (copy.block_type === 31 && copy.table?.property?.merge_info) {
    delete copy.table.property.merge_info;
  }
  return copy;
}

async function insertConvertedBlocks(token, documentId, convertResponse) {
  const data = convertResponse?.data || {};
  const firstLevelIds = data.first_level_block_ids || data.first_level_blocks || [];
  const blocks = Array.isArray(data.blocks) ? data.blocks.map(cleanConvertedBlock) : [];

  if (!firstLevelIds.length || !blocks.length) {
    throw new Error("飞书 Markdown 转换没有返回可写入的文档块");
  }

  return feishuRequest(
    token,
    `/docx/v1/documents/${documentId}/blocks/${documentId}/descendant?document_revision_id=-1`,
    {
      method: "POST",
      body: {
        children_id: firstLevelIds,
        descendants: blocks,
        index: 0
      }
    }
  );
}

async function createBlocks(token, documentId, blocks) {
  const chunkSize = 45;
  let index = 0;

  for (let start = 0; start < blocks.length; start += chunkSize) {
    const chunk = blocks.slice(start, start + chunkSize);
    await feishuRequest(
      token,
      `/docx/v1/documents/${documentId}/blocks/${documentId}/children?document_revision_id=-1`,
      {
        method: "POST",
        body: {
          children: chunk,
          index
        }
      }
    );
    index += chunk.length;
  }
}

export async function writeReportToFeishuDocument(token, documentId, report) {
  try {
    const converted = await convertMarkdownToBlocks(token, report.markdown);
    await insertConvertedBlocks(token, documentId, converted);
    return { ok: true, method: "markdown-convert" };
  } catch (convertError) {
    const blocks = reportToFallbackBlocks(report);
    try {
      await createBlocks(token, documentId, blocks);
      return { ok: true, method: "fallback-blocks", warning: convertError.message };
    } catch (fallbackError) {
      return {
        ok: false,
        method: "failed",
        error: fallbackError.message,
        convertError: convertError.message
      };
    }
  }
}
