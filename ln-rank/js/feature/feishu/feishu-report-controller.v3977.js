import {
  feishuReportState,
  resetFeishuReport,
  setFeishuError,
  setFeishuLoading,
  setFeishuResult
} from "./feishu-report-state.v3913.js";
import { renderFeishuReportView } from "./feishu-report-render.v3977.js";
import {
  buildFeishuReportPayload,
  canGenerateFeishuReport
} from "../report/report-payload-builder.v3977.js";
import { createFeishuReport } from "./feishu-report-api.v3977.js";

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
