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
  feishuReportState.error = message || "飞书报告生成失败，请稍后重试。";
}
