const FORBIDDEN_COPY = [
  'AI认为',
  '智能推荐',
  '精准预测',
  '最佳选择',
  '闭眼选择'
];

export function verifyHumanCopy(text) {
  const value = String(text || '');
  const violations = FORBIDDEN_COPY.filter((item) => value.includes(item));

  return {
    pass: violations.length === 0,
    violations
  };
}

export function verifyStateBoundary(state) {
  return ['loading', 'empty', 'error', 'retry', 'success'].includes(state);
}
