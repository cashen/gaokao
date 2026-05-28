function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("zh-CN") : "—";
}

const REGION_LABELS = {
  all: "不限",
  ln: "辽宁省内",
  shenyang: "沈阳",
  dalian: "大连",
  "ln-other": "辽宁其他",
  outside: "省外",
  beijing: "北京",
  tianjin: "天津",
  hebei: "河北",
  shandong: "山东",
  jilin: "吉林",
  heilongjiang: "黑龙江",
  jiangzhehu: "江浙沪",
  guangdong: "广东",
  huazhong: "华中",
  southwest: "西南",
  northwest: "西北"
};

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return "—";
  return n > 0 ? `+${n}` : String(n);
}

function tags(record) {
  const arr = [];
  if (Array.isArray(record.schoolTags)) arr.push(...record.schoolTags);
  if (record.natureLabel) arr.push(record.natureLabel);
  if (record.displayLocation) arr.push(record.displayLocation);
  return [...new Set(arr.filter(Boolean))].join(" / ") || "标签待核验";
}

function filterText(filters) {
  const region = REGION_LABELS[filters.region] || "不限";
  const school = filters.schoolKeyword ? `学校：${filters.schoolKeyword}` : "学校不限";
  const major = filters.majorKeyword ? `专业：${filters.majorKeyword}` : "专业不限";
  return `${region} / ${school} / ${major}`;
}

export function buildFeishuReport(data) {
  const band = data.selectedBand;
  const title = `${data.candidateScore}分｜${band.title}专业池｜辽宁物理类`;
  const lines = [];

  lines.push(`# ${title}`);
  lines.push("");
  lines.push("## 辽宁物理类分数区间专业池参考");
  lines.push("");
  lines.push(`- 考生分数：${data.candidateScore}`);
  lines.push(`- 当前区间：${band.title}（${band.rangeText} 分）`);
  lines.push(`- 筛选条件：${filterText(data.filters)}`);
  lines.push(`- 数据口径：${data.dataScope}专业数据`);
  lines.push("");
  lines.push("## 结果摘要");
  lines.push("");
  lines.push(`- 上探参考：${fmt(data.counts.upper)} 条`);
  lines.push(`- 主体参考：${fmt(data.counts.near)} 条`);
  lines.push(`- 稳妥参考：${fmt(data.counts.steady)} 条`);
  lines.push(`- 当前生成：${band.title}前 ${data.selectedRecords.length} 条`);
  lines.push("");
  lines.push(`## ${band.title}专业列表`);
  lines.push("");

  data.selectedRecords.forEach((record, index) => {
    lines.push(`### ${index + 1}. ${record.school}｜${record.major}`);
    lines.push("");
    lines.push(`- 2025最低分：${fmt(record.score)} 分`);
    lines.push(`- 2025最低位次：${fmt(record.rank)}`);
    lines.push(`- 相对考生：${deltaText(record.scoreDelta)} 分`);
    lines.push(`- 状态：${record.statusLabel || "待核验"}`);
    lines.push(`- 适合位置：${record.position || "待核验"}`);
    lines.push(`- 地域：${record.displayLocation || record.region || "地域待核验"}`);
    lines.push(`- 标签：${tags(record)}`);
    if (record.tuition) lines.push(`- 学费：${record.tuition}`);
    if (Array.isArray(record.flags) && record.flags.length) {
      lines.push(`- 需核验：${record.flags.slice(0, 2).join(" / ")}`);
    }
    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push("## 口径说明");
  lines.push("");
  lines.push("本结果基于辽宁 2025 物理类历史录取数据，用于形成可讨论专业池，不等同于录取预测。正式填报仍需结合当年位次、等位分/同位分、招生计划和专业要求综合判断。");

  return {
    title,
    markdown: lines.join("\n"),
    recordsCount: data.selectedRecords.length,
    bandTitle: band.title,
    rangeText: band.rangeText
  };
}
