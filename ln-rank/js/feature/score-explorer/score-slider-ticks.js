function chooseStep(min, max) {
  const span = max - min;
  if (span <= 50) return 5;
  if (span <= 100) return 10;
  return 25;
}
export function buildTicks({ min, max, candidateScore }) {
  const step = chooseStep(min, max);
  const ticks = new Set([min, max, 0]);
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.add(v);
  return [...ticks].sort((a, b) => a - b).map((delta) => ({ delta, score: candidateScore + delta }));
}
export function toPercent(value, min, max) {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}
