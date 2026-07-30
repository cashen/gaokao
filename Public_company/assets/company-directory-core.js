export const BOARD_LABELS = Object.freeze({
  "sh-main": "沪市主板",
  "sz-main": "深市主板",
  sme: "原中小板",
  star: "科创板",
  chinext: "创业板",
  bse: "北交所"
});

export function expandCompanies(payload) {
  if (!Array.isArray(payload?.companies)) {
    return [];
  }

  return payload.companies.map(
    ([code, name, province, board, industry, direction, exchange]) => ({
      code,
      name,
      province,
      board,
      industry,
      direction,
      exchange
    })
  );
}

export function matchesBoard(company, boardFilter = "all") {
  if (boardFilter === "all") {
    return true;
  }
  if (boardFilter === "main") {
    return ["sh-main", "sz-main", "sme"].includes(company.board);
  }
  return company.board === boardFilter;
}

export function normalizeQuery(value) {
  return String(value ?? "").trim().toLocaleLowerCase("zh-CN");
}

export function filterCompanies({
  companies,
  province,
  boardFilter = "all",
  industry = "all",
  query = ""
}) {
  const normalizedQuery = normalizeQuery(query);

  return companies
    .filter((company) => company.province === province)
    .filter((company) => matchesBoard(company, boardFilter))
    .filter((company) => industry === "all" || company.industry === industry)
    .filter((company) => {
      if (!normalizedQuery) {
        return true;
      }
      return [
        company.name,
        company.code,
        company.industry,
        company.direction,
        BOARD_LABELS[company.board]
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN")
        .includes(normalizedQuery);
    })
    .sort((left, right) =>
      left.industry.localeCompare(right.industry, "zh-CN") ||
      left.code.localeCompare(right.code, "zh-CN") ||
      left.name.localeCompare(right.name, "zh-CN")
    );
}

export function getIndustryCounts(companies) {
  const counts = new Map();
  for (const company of companies) {
    counts.set(company.industry, (counts.get(company.industry) ?? 0) + 1);
  }

  return [...counts.entries()].sort(
    (left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN")
  );
}

export function paginate(items, requestedPage, pageSize) {
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));
  const page = Math.min(pageCount, Math.max(1, Number(requestedPage) || 1));
  const startIndex = (page - 1) * safePageSize;
  const endIndex = Math.min(items.length, startIndex + safePageSize);

  return {
    page,
    pageCount,
    pageSize: safePageSize,
    startIndex,
    endIndex,
    items: items.slice(startIndex, endIndex),
    hasPrevious: page > 1,
    hasNext: page < pageCount
  };
}
