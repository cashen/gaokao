import {
  createFeishuViewState,
  resetFeishuViewState,
  beginGeneration,
  finishGeneration,
  failGeneration,
  beginCopy,
  finishCopy,
  failCopy,
  markOpened
} from './report-state.v3965_0.js?v=3965_0';
import { renderFeishuReportView } from './report-render.v3965_0.js?v=3965_0';
import {
  buildFeishuReportPayload,
  canGenerateFeishuReport
} from '../report/payload-builder.v3964_0.js?v=3964_0';
import { createFeishuReport } from './report-api.v3964_0.js?v=3964_0';

const state = createFeishuViewState();
let currentAppState = null;
let generationPromise = null;
let copyPromise = null;

async function copyText(text) {
  if (!text) throw new Error('报告链接为空。');
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.readOnly = true;
  box.style.position = 'fixed';
  box.style.inset = '0 auto auto -10000px';
  document.body.append(box);
  try {
    box.select();
    if (!document.execCommand('copy')) throw new Error('浏览器拒绝复制。');
  } finally {
    box.remove();
  }
}

function handlers() {
  return Object.freeze({
    onGenerate: generateFeishuReport,
    onOpen: openFeishuReport,
    onCopy: copyFeishuReportLink
  });
}

export function initFeishuReport(appState) {
  currentAppState = appState;
}

export function clearFeishuReport() {
  generationPromise = null;
  copyPromise = null;
  resetFeishuViewState(state);
}

export function renderFeishuReport(appState = currentAppState) {
  currentAppState = appState || currentAppState;
  if (!currentAppState) return;
  renderFeishuReportView(state, currentAppState, handlers());
}

export async function generateFeishuReport() {
  if (!currentAppState) return null;
  if (generationPromise) return generationPromise;
  const availability = canGenerateFeishuReport(currentAppState);
  if (!availability.ok) {
    failGeneration(state, new Error(availability.reason));
    renderFeishuReport();
    return null;
  }
  const operationId = beginGeneration(state);
  renderFeishuReport();
  generationPromise = (async () => {
    try {
      const result = await createFeishuReport(buildFeishuReportPayload(currentAppState));
      if (operationId === state.generationId) finishGeneration(state, result);
      return result;
    } catch (error) {
      if (operationId === state.generationId) failGeneration(state, error);
      return null;
    } finally {
      generationPromise = null;
      renderFeishuReport();
    }
  })();
  return generationPromise;
}

export function openFeishuReport() {
  const url = state.result?.url;
  if (!url) return false;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  markOpened(state);
  renderFeishuReport();
  return Boolean(opened);
}

export async function copyFeishuReportLink() {
  const url = state.result?.url;
  if (!url) return false;
  if (copyPromise) return copyPromise;
  const copyId = beginCopy(state);
  renderFeishuReport();
  copyPromise = (async () => {
    try {
      await copyText(url);
      if (copyId === state.copyId) finishCopy(state);
      return true;
    } catch (error) {
      if (copyId === state.copyId) failCopy(state, error);
      return false;
    } finally {
      copyPromise = null;
      renderFeishuReport();
    }
  })();
  return copyPromise;
}

export function getFeishuReportUiState() {
  return Object.freeze({
    operation: state.operation,
    copy: state.copy,
    feedback: state.feedback,
    hasUrl: Boolean(state.result?.url),
    generating: Boolean(generationPromise),
    copying: Boolean(copyPromise)
  });
}
