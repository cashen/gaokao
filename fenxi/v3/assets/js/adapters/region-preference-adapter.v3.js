(function () {
  'use strict';
  function arr(v) { return Array.isArray(v) ? v : []; }
  function analyze(family) {
    family = family || {};
    var mode = family.regionMode || 'none';
    var provinces = arr(family.provinces).filter(Boolean);
    var target = provinces.join('、') || '不限地区';
    var out = { mode: mode, provinces: provinces, target: target };
    if (mode === 'hard') {
      out.level = 'bottomline';
      out.name = '地域底线';
      out.label = '只看 ' + target;
      out.display = '这是硬底线，会明显收窄候选。适合家里明确不能接受外地时使用。';
      out.choiceMeaning = '不是系统替你放弃其它机会，而是尊重家庭底线。';
      out.pathHint = '后续 A/B/C 会优先在这个地域内解释。';
      out.flexScore = 0;
    } else if (mode === 'soft') {
      out.level = 'preference';
      out.name = '地域偏好';
      out.label = '优先 ' + target + '，但保留比较空间';
      out.display = '这是偏好，不是放弃。系统会优先解释目标地区，同时保留外省/其它地区作为比较参照。';
      out.choiceMeaning = '更宽松不一定不好，它代表家庭愿意用更多选择换比较空间。';
      out.pathHint = '后续卡片会标出“目标地区 / 参照地区”，让家长看清取舍。';
      out.flexScore = 0.6;
    } else {
      out.level = 'open';
      out.name = '地域开放';
      out.label = '全国都可比较';
      out.display = '这是开放比较，不是没有底线。适合先看学校、专业和成本，再决定是否收窄地域。';
      out.choiceMeaning = '系统会把地域作为解释维度，而不是立即硬筛。';
      out.pathHint = '后续适合加入城市、距离和成本的反事实比较。';
      out.flexScore = 1;
    }
    return out;
  }
  window.LN_V3_REGION_PREFERENCE = { analyze: analyze };
})();
