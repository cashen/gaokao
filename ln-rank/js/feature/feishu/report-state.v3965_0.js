export const FEISHU_OPERATION = Object.freeze({
  IDLE: 'idle',
  GENERATING: 'generating',
  SUCCESS: 'success',
  ERROR: 'error'
});

export const FEISHU_COPY = Object.freeze({
  IDLE: 'idle',
  COPYING: 'copying',
  COPIED: 'copied',
  FAILED: 'failed'
});

export function createFeishuViewState() {
  return {
    operation: FEISHU_OPERATION.IDLE,
    result: null,
    error: '',
    errorDetail: '',
    copy: FEISHU_COPY.IDLE,
    feedback: '',
    generationId: 0,
    copyId: 0
  };
}

export function resetFeishuViewState(state) {
  Object.assign(state, createFeishuViewState());
}

export function beginGeneration(state) {
  state.generationId += 1;
  state.operation = FEISHU_OPERATION.GENERATING;
  state.error = '';
  state.errorDetail = '';
  state.copy = FEISHU_COPY.IDLE;
  state.feedback = '正在创建报告文档并写入结果…';
  return state.generationId;
}

export function finishGeneration(state, result) {
  state.operation = FEISHU_OPERATION.SUCCESS;
  state.result = result || null;
  state.error = '';
  state.errorDetail = '';
  state.copy = FEISHU_COPY.IDLE;
  state.feedback = result?.partial
    ? '报告已创建，但内容可能不完整，请打开后核验。'
    : '报告已经生成，可以打开或复制链接。';
}

export function failGeneration(state, error) {
  const text = String(error?.message || error || '');
  const parts = text.split('技术详情：');
  state.operation = FEISHU_OPERATION.ERROR;
  state.result = null;
  state.error = '报告暂时生成失败。可以先复制文字版报告，稍后再试。';
  state.errorDetail = parts[1]?.trim() || (text && !text.includes('报告暂时生成失败') ? text : '');
  state.copy = FEISHU_COPY.IDLE;
  state.feedback = state.error;
}

export function beginCopy(state) {
  state.copyId += 1;
  state.copy = FEISHU_COPY.COPYING;
  state.feedback = '正在复制报告链接…';
  return state.copyId;
}

export function finishCopy(state) {
  state.copy = FEISHU_COPY.COPIED;
  state.feedback = '报告链接已复制。';
}

export function failCopy(state, error) {
  state.copy = FEISHU_COPY.FAILED;
  state.feedback = '复制失败，请打开报告后手动复制链接。';
  state.errorDetail = String(error?.message || error || '');
}

export function markOpened(state) {
  state.feedback = '已尝试在新窗口打开报告。';
}
