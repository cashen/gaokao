(function () {
  'use strict';
  function n(v) { var x = Number(v); return Number.isFinite(x) ? x : 0; }
  var BANDS = [
    {
      id: '625_plus', label: '625+ 高分平台段', min: 625, max: 750,
      level: 'high_platform', priority: '平台、专业质量、城市资源、读研/保研空间',
      firstQuestion: '不是先问稳不稳就业，而是先比较平台、专业上限和城市资源值不值得。',
      abc: { A: '稳妥强校或强平台', B: '强专业与长期成长路径', C: '平台上限、城市资源与深造机会' },
      cardFocus: ['学校平台与城市资源', '专业上限与学科基础', '读研/保研和长期路径', '不要因单一就业稳定叙事过早收窄'],
      windowPolicy: 'quality_compare'
    },
    {
      id: '590_624', label: '590–624 学校专业平衡段', min: 590, max: 624,
      level: 'school_major_balance', priority: '学校层级与专业路径平衡',
      firstQuestion: '这段最容易在学校层级和专业质量之间拉扯，要把取舍讲清楚。',
      abc: { A: '稳层级和可接受专业', B: '专业路径和学校层级平衡', C: '适度比较城市或更高平台' },
      cardFocus: ['学校层级与专业质量的交换', '省内外是否值得', '专业是否真正理解', '后续读研/就业弹性'],
      windowPolicy: 'balanced_compare'
    },
    {
      id: '550_589', label: '550–589 专业优先段', min: 550, max: 589,
      level: 'major_priority', priority: '专业正主程度、就业确定性、学科/行业匹配、公办与地域底线',
      firstQuestion: '先看专业是否正主、路径是否清楚，再比较学校层级和城市。',
      abc: { A: '稳妥公办与可接受专业', B: '强专业正主与就业/深造路径', C: '适度看更好城市或层级' },
      cardFocus: ['专业正主程度', '就业确定性', '学科/行业匹配', '学校层级与城市比较', '学费与校区'],
      windowPolicy: 'normal_window'
    },
    {
      id: '500_549', label: '500–549 家庭底线主导段', min: 500, max: 549,
      level: 'family_bottomline', priority: '家庭底线、专业可读性、省内外、公办稳定性',
      firstQuestion: '先把家里不能接受的排除，再看孩子兴趣有没有真实命中。',
      abc: { A: '家庭底线内的稳妥选择', B: '孩子兴趣与可就业路径', C: '适度看更好学校/城市/专业弹性' },
      cardFocus: ['底线命中', '孩子兴趣是否真实命中', '专业名是否误认', '省内外和成本取舍'],
      windowPolicy: 'bottomline_first'
    },
    {
      id: '450_499', label: '450–499 低分保底与风险段', min: 450, max: 499,
      level: 'low_guardrail', priority: '保底真实性、费用风险、学校性质、防误认',
      firstQuestion: '不要先追热门名词，要先确认本科机会、成本和学校性质是否可接受。',
      abc: { A: '真实保底和可承受成本', B: '可读专业路径', C: '民办/成本/区域替代比较' },
      cardFocus: ['保底是否真实', '高收费与民办风险', '专业名防误认', '是否需要放宽地域换机会'],
      windowPolicy: 'wider_safe_pool'
    },
    {
      id: '367_449', label: '367–449 本科机会边缘段', min: 367, max: 449,
      level: 'edge_bachelor', priority: '本科机会、成本、兜底和可转化路径',
      firstQuestion: '先确认本科机会和家庭成本，再比较专业是否有可转化路径。',
      abc: { A: '本科机会与成本底线', B: '可读可转化专业', C: '兜底与替代路径复核' },
      cardFocus: ['本科机会真实性', '成本是否能承受', '性质与校区复核', '是否需要更宽地域窗口'],
      windowPolicy: 'widest_edge_pool'
    }
  ];
  function fromScore(score) {
    var s = n(score);
    if (!s) return null;
    for (var i = 0; i < BANDS.length; i++) {
      if (s >= BANDS[i].min && s <= BANDS[i].max) return BANDS[i];
    }
    if (s > 750) return BANDS[0];
    return BANDS[BANDS.length - 1];
  }
  function fromRank(rank) {
    var r = n(rank);
    if (!r) return null;
    if (r <= 18000) return BANDS[0];
    if (r <= 32000) return BANDS[1];
    if (r <= 48000) return BANDS[2];
    if (r <= 72000) return BANDS[3];
    if (r <= 98000) return BANDS[4];
    return BANDS[5];
  }
  function resolve(state) {
    state = state || (window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {});
    var rank = state.rank || {};
    var guard = rank.inputConsistency || {};
    if (guard && guard.ok === false) {
      return JSON.parse(JSON.stringify({ id: 'input_conflict', label: '分数/位次冲突，需先确认', level: 'blocked', priority: '先修正输入口径', firstQuestion: '分数和位次明显不一致，不能继续生成推荐。', abc: {}, cardFocus: ['重新确认分数或位次'], windowPolicy: 'blocked' }));
    }
    var effectiveRank = rank.effectiveRank || rank.rank;
    var effectiveScore = rank.effectiveScore || rank.score || rank.rawScore;
    /* rc1.fix5: 分数段展示必须与采用/展示分数一致。
       有有效分数时先按分数判段；只有纯位次输入时才按位次估段，避免 580 分因位次阈值被显示成 590–624。 */
    var band = fromScore(effectiveScore) || fromRank(effectiveRank) || BANDS[3];
    return JSON.parse(JSON.stringify(band));
  }
  window.LN_V3_SCORE_BAND_STRATEGY = { bands: BANDS, resolve: resolve, fromScore: fromScore, fromRank: fromRank };
})();
