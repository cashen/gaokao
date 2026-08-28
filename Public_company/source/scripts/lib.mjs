export const PROVINCES = [
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
  "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
  "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "台湾",
  "香港", "澳门"
];

export const BOARD_DEFINITIONS = {
  "sh-main": { label: "沪市主板", exchange: "上海证券交易所" },
  "sz-main": { label: "深市主板", exchange: "深圳证券交易所" },
  "sme": { label: "深市主板·原中小板", exchange: "深圳证券交易所" },
  "star": { label: "科创板", exchange: "上海证券交易所" },
  "chinext": { label: "创业板", exchange: "深圳证券交易所" },
  "bse": { label: "北交所", exchange: "北京证券交易所" }
};

export function normalizeCompanyName(value = "") {
  return String(value)
    .replace(/\s+/g, "")
    .replaceAll("Ａ", "A")
    .replaceAll("Ｂ", "B")
    .trim();
}

export function normalizeProvince(value = "") {
  const normalized = String(value)
    .trim()
    .replace(/板块$/, "")
    .replace(/省$/, "")
    .replace(/市$/, "")
    .replace(/壮族自治区$/, "")
    .replace(/回族自治区$/, "")
    .replace(/维吾尔自治区$/, "")
    .replace(/自治区$/, "")
    .replace(/特别行政区$/, "");

  return PROVINCES.includes(normalized) ? normalized : "未知";
}

export function classifyBoard(code = "") {
  const normalized = String(code).padStart(6, "0");

  if (/^(43|83|87|88|92)/.test(normalized)) {
    return "bse";
  }
  if (/^(688|689)/.test(normalized)) {
    return "star";
  }
  if (/^(300|301)/.test(normalized)) {
    return "chinext";
  }
  if (/^002/.test(normalized)) {
    return "sme";
  }
  if (/^(000|001|003)/.test(normalized)) {
    return "sz-main";
  }
  if (/^(600|601|603|605)/.test(normalized)) {
    return "sh-main";
  }

  return "unknown";
}

export function matchesBoardFilter(board, filter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "main") {
    return ["sh-main", "sz-main", "sme"].includes(board);
  }
  return board === filter;
}

export function isActiveSecurity(item) {
  const name = normalizeCompanyName(item?.f14);
  const region = String(item?.f102 ?? "").trim();
  const industry = String(item?.f100 ?? "").trim();

  if (!/^\d{6}$/.test(String(item?.f12 ?? "")) || !name) {
    return false;
  }
  if (/^PT/i.test(name) || /退$/.test(name) || /退市/.test(name)) {
    return false;
  }
  if (!region || ["-", "--"].includes(region)) {
    return false;
  }
  if (!industry || ["-", "--"].includes(industry)) {
    return false;
  }

  return classifyBoard(item.f12) !== "unknown";
}

export function buildDirection(industry, concepts) {
  const tags = String(concepts ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && !["-", "--"].includes(item))
    .filter((item) => item !== industry)
    .slice(0, 4);

  return tags.length ? tags.join("、") : industry;
}
