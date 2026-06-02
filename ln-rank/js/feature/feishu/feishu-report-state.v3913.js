export const feishuReportState = {
  loading: false,
  error: "",
  result: null
};

export function resetFeishuReport() {
  feishuReportState.loading = false;
  feishuReportState.error = "";
  feishuReportState.result = null;
}

export function setFeishuLoading() {
  feishuReportState.loading = true;
  feishuReportState.error = "";
}

export function setFeishuResult(result) {
  feishuReportState.loading = false;
  feishuReportState.error = "";
  feishuReportState.result = result;
}

export function setFeishuError(message) {
  feishuReportState.loading = false;
  feishuReportState.error = message || "报告暂时生成失败。可以先复制文字版，稍后再试。";
}
