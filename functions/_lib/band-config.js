export const RANGE_PRESETS = {
  standard: {
    key: 'standard', label: '正常查看',
    help: '第一次使用先看这个范围。',
    bands: {
      upper: { title: '稍高目标', minDelta: 1, maxDelta: 10, desc: '比孩子分数略高，适合少量看看，不宜放太多。' },
      near: { title: '主要参考', minDelta: -10, maxDelta: 0, desc: '和孩子分数更接近，最值得重点核验。' },
      steady: { title: '稳妥补充', minDelta: -25, maxDelta: -11, desc: '低于孩子分数一些，用来补足安全感。' }
    }
  },
  wide: {
    key: 'wide', label: '多看一些',
    help: '结果太少，或想多看可能性时使用。',
    bands: {
      upper: { title: '稍高目标', minDelta: 1, maxDelta: 20, desc: '扩大略高目标范围，适合多观察前部可能性。' },
      near: { title: '主要参考', minDelta: -15, maxDelta: 0, desc: '扩大主要参考范围，便于补充更多讨论对象。' },
      steady: { title: '稳妥补充', minDelta: -40, maxDelta: -16, desc: '扩大稳妥补充范围，但过低目标不宜大量集中。' }
    }
  },
  safe: {
    key: 'safe', label: '稳妥一点',
    help: '想先看更稳、更保守的选择时使用。',
    bands: {
      upper: { title: '稍高目标', minDelta: 1, maxDelta: 5, desc: '只看略高一点的目标。' },
      near: { title: '主要参考', minDelta: -10, maxDelta: 0, desc: '保留接近分数的主要参考区。' },
      steady: { title: '稳妥补充', minDelta: -20, maxDelta: -11, desc: '保留较稳妥的补充区间。' }
    }
  }
};
