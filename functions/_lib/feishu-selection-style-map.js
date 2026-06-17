// 报告 Docx 文本颜色枚举：1 红、2 橙、3 黄、4 绿、5 蓝、6 紫、7 灰。
// 本项目只做克制提醒：稍高目标用红/橙，主体用绿/蓝，低分侧补充用灰。
export const FEISHU_TEXT_COLOR = {
  red: 1,
  orange: 2,
  yellow: 3,
  green: 4,
  blue: 5,
  purple: 6,
  grey: 7
};

export const STYLE = {
  title: { bold: true },
  strong: { bold: true },
  muted: { text_color: FEISHU_TEXT_COLOR.grey },
  warning: { bold: true, text_color: FEISHU_TEXT_COLOR.orange, background_color: FEISHU_TEXT_COLOR.yellow },
  rushHigh: { bold: true, text_color: FEISHU_TEXT_COLOR.red, background_color: FEISHU_TEXT_COLOR.red },
  rush: { bold: true, text_color: FEISHU_TEXT_COLOR.orange, background_color: FEISHU_TEXT_COLOR.orange },
  stable: { bold: true, text_color: FEISHU_TEXT_COLOR.green, background_color: FEISHU_TEXT_COLOR.green },
  safe: { bold: true, text_color: FEISHU_TEXT_COLOR.blue, background_color: FEISHU_TEXT_COLOR.blue },
  floor: { bold: true, text_color: FEISHU_TEXT_COLOR.grey, background_color: FEISHU_TEXT_COLOR.grey },
  risk: { bold: true, text_color: FEISHU_TEXT_COLOR.red },
  action: { bold: true, text_color: FEISHU_TEXT_COLOR.blue },
  rankForward: { bold: true, text_color: FEISHU_TEXT_COLOR.orange, background_color: FEISHU_TEXT_COLOR.yellow },
  rankBackward: { bold: true, text_color: FEISHU_TEXT_COLOR.blue },
  rankNear: { bold: true, text_color: FEISHU_TEXT_COLOR.green },
  rankMissing: { text_color: FEISHU_TEXT_COLOR.grey }
};

export function styleForBand(band = {}) {
  const detail = String(band.detail || '');
  if (detail.includes('高一点') || detail.includes('稍高目标')) return STYLE.rushHigh;
  if (detail.includes('冲')) return STYLE.rush;
  if (detail.includes('接近匹配') || detail.includes('稳') || band.group === 'stable') return STYLE.stable;
  if (detail.includes('低分侧补充')) return STYLE.floor;
  if (detail.includes('保') || band.group === 'safe') return STYLE.safe;
  return STYLE.muted;
}

export function styleForDelta(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return STYLE.muted;
  if (n >= 16) return STYLE.rushHigh;
  if (n >= 4) return STYLE.rush;
  if (n >= -15) return STYLE.stable;
  if (n >= -25) return STYLE.safe;
  return STYLE.floor;
}

export function groupMeta(group) {
  if (group === 'rush') {
    return {
      title: '一、稍高目标：少量保留，重点看专业接受度',
      style: STYLE.rush,
      note: '稍高目标不是越多越好，建议控制数量，重点保留城市、学校、专业接受度都能认可的项目。'
    };
  }
  if (group === 'stable') {
    return {
      title: '二、匹配 / 主要参考：主力承接区',
      style: STYLE.stable,
      note: '这里应是整套排序的主体，重点看专业质量、城市接受度和计划变化后的承接稳定性。'
    };
  }
  return {
    title: '三、低分侧补充：保证志愿梯度不断档',
    style: STYLE.safe,
    note: '低分侧补充要看是否真愿意读，不建议只为了低分安全而堆过多不接受的专业。'
  };
}


export function styleForRankGap(gap) {
  const n = Number(gap);
  if (!Number.isFinite(n)) return STYLE.rankMissing;
  if (n > 800) return STYLE.rankForward;
  if (n < -800) return STYLE.rankBackward;
  return STYLE.rankNear;
}
