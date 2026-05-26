(function () {
  'use strict';

  window.LNRankUIText = {
    labels: {
      currentScore: '考生分数',
      targetScore: '想看的目标分',
      rankSpan: '位次跨度',
      rankMargin: '位次余量',
      rankClose: '位次接近'
    },
    levels: {
      match: {
        name: '匹配',
        position: '主体讨论',
        advice: '这个分数点和考生当前位置比较接近，适合放在主体讨论区间。',
        short: '位置比较接近。'
      },
      smallRush: {
        name: '小冲',
        position: '前部可放',
        advice: '这个目标略高一些，可以放在前部尝试，后面搭配匹配和稳妥目标。',
        short: '略高一些，仍在可讨论范围。'
      },
      midRush: {
        name: '中冲',
        position: '前部搭配',
        advice: '这个目标有一定上探空间，适合放在前部搭配，不建议同类目标过于集中。',
        short: '有一定上探空间。'
      },
      bigRush: {
        name: '大冲',
        position: '前部尝试',
        advice: '这个目标位次跨度比较明显，可以放在前面尝试，但后面需要搭配更稳妥的目标。',
        short: '位次跨度比较明显。'
      },
      superRush: {
        name: '超冲',
        position: '最前面少量',
        advice: '这个目标主要用于保留机会，建议少量放在最前面，不能替代匹配、稳和保。',
        short: '上探幅度较高。'
      },
      stable: {
        name: '稳',
        position: '主体偏稳',
        advice: '这个目标相对稳妥，适合作为主体偏稳的选择，但仍要结合专业热度和往年位次。',
        short: '相对稳妥。'
      },
      superStable: {
        name: '超稳',
        position: '稳妥区',
        advice: '这个目标位次余量较明显，适合放在稳妥区，但不建议全部集中在明显偏低的位置。',
        short: '位次余量较明显。'
      },
      safe: {
        name: '保',
        position: '保底区',
        advice: '这个目标可用于保护底线，同时要注意不要过度降低学校、城市或专业选择空间。',
        short: '用于保护底线。'
      },
      lowReference: {
        name: '偏低参考',
        position: '少量保底或特殊偏好',
        advice: '这个目标相对更稳，但分差已经比较大，可作为保底或特殊偏好参考，不建议大量集中在这个区间。',
        short: '位次余量较大。'
      }
    },
    drawer: {
      gradient: '梯度参考表',
      major: '专业方向影响',
      explain: '怎么看结果',
      data: '数据说明'
    }
  };
})();
