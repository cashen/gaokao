import {
  feishuReportState,
  resetFeishuReport,
  setFeishuError,
  setFeishuLoading,
  setFeishuResult
} from './state.js?v=3956_0';
import { renderFeishuReportView } from './report-render.v3963_1.js?v=3963_1';
import {
  buildFeishuReportPayload,
  canGenerateFeishuReport
} from '../report/payload-builder.v3963_1.js?v=3963_1';
import { createFeishuReport } from './report-api.v3963_1.js?v=3963_1';

let currentAppState = null;

export function initFeishuReport(appState) {
  currentAppState = appState;
}

export function clearFeishuReport() {
  resetFeishuReport();
}

export function renderFeishuReport(appState) {
  currentAppState = appState;
  renderFeishuReportView(feishuReportState, appState, { onGenerate: generateFeishuReport });
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
    const result = await createFeishuReport(buildFeishuReportPayload(currentAppState));
    setFeishuResult(result);
  } catch (error) {
    setFeishuError(error?.message || String(error));
  } finally {
    renderFeishuReport(currentAppState);
  }
}
