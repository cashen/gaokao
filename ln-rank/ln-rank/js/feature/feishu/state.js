export const feishuReportState = {
  loading: false,
  error: "",
  errorDetail: "",
  result: null
};

export function resetFeishuReport() {
  feishuReportState.loading = false;
  feishuReportState.error = "";
  feishuReportState.errorDetail = "";
  feishuReportState.result = null;
}

export function setFeishuLoading() {
  feishuReportState.loading = true;
  feishuReportState.error = "";
  feishuReportState.errorDetail = "";
}

export function setFeishuResult(result) {
  feishuReportState.loading = false;
  feishuReportState.error = "";
  feishuReportState.result = result;
}

export function setFeishuError(message) {
  feishuReportState.loading = false;
  const text = String(message || "");
  const parts = text.split("技术详情：");
  feishuReportState.error = "报告暂时生成失败。可以先复制文字版报告，稍后再试。";
  feishuReportState.errorDetail = parts[1] ? parts[1].trim() : (text && !text.includes("报告暂时生成失败") ? text : "");
}
