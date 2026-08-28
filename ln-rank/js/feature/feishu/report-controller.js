import {
  feishuReportState,
  resetFeishuReport,
  setFeishuError,
  setFeishuLoading,
  setFeishuResult
} from "./state.js?v=3949_0";
import { renderFeishuReportView } from "./report-render.js?v=3949_0";
import {
  buildFeishuReportPayload,
  canGenerateFeishuReport
} from "../report/payload-builder.js?v=3949_0";
import { createFeishuReport } from "./report-api.js?v=3949_0";

let currentAppState = null;

export function initFeishuReport(appState) {
  currentAppState = appState;
}

export function clearFeishuReport() {
  resetFeishuReport();
}

export function renderFeishuReport(appState) {
  currentAppState = appState;
  renderFeishuReportView(feishuReportState, appState, {
    onGenerate: generateFeishuReport
  });
}

export async function generateFeishuReport() {
  if (!currentAppState) return;

  const availability = canGenerateFeishuReport(currentAppState);
  if (!availability.ok) {
    setFeishuError(availability.reason);
    renderFeishuReport(currentAppState);
    return;
  }

  setFeishuLoading();
  renderFeishuReport(currentAppState);

  try {
    const payload = buildFeishuReportPayload(currentAppState);
    const result = await createFeishuReport(payload);
    setFeishuResult(result);
  } catch (error) {
    setFeishuError(error.message || String(error));
  } finally {
    renderFeishuReport(currentAppState);
  }
}
