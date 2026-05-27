(function () {
  'use strict';

  window.TargetMajorPoolConfig = {
    version: 'v3.8.1-cloudflare-api-connected',
    apiEndpoint: '/api/target-majors',
    upperDelta: 10,
    lowerDelta: 25,
    defaultVisibleCount: 15,
    supportedSubject: 'physics',
    groups: {
      upper: {
        title: '上探参考',
        rangeText: '目标分上方 1-10 分',
        note: '这些记录历史分数略高于目标分，可以少量看看。',
        order: 1
      },
      near: {
        title: '主体参考',
        rangeText: '目标分附近 0 到 -10 分',
        note: '这些记录和目标分更接近，适合作为重点讨论区。',
        order: 2
      },
      lower: {
        title: '稳妥参考',
        rangeText: '目标分下方 11-25 分',
        note: '这些记录低于目标分一些，可以作为稳妥补充。',
        order: 3
      }
    },
    regionOptions: [
      { value: 'all', label: '不限地域' },
      { value: 'ln', label: '辽宁省内' },
      { value: 'shenyang', label: '沈阳' },
      { value: 'dalian', label: '大连' },
      { value: 'ln-other', label: '辽宁其他' },
      { value: 'outside', label: '省外' }
    ]
  };
})();
