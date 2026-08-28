import * as d3 from "d3";
import "./style.css";

const BOARD_LABELS = {
  "sh-main": "沪市主板",
  "sz-main": "深市主板",
  sme: "原中小板",
  star: "科创板",
  chinext: "创业板",
  bse: "北交所"
};

const FILTERS = [
  { key: "all", label: "全部A股" },
  { key: "main", label: "主板" },
  { key: "sme", label: "原中小板" },
  { key: "star", label: "科创板" },
  { key: "chinext", label: "创业板" },
  { key: "bse", label: "北交所" }
];

const PROVINCE_FULL_NAMES = {
  北京: "北京市",
  天津: "天津市",
  河北: "河北省",
  山西: "山西省",
  内蒙古: "内蒙古自治区",
  辽宁: "辽宁省",
  吉林: "吉林省",
  黑龙江: "黑龙江省",
  上海: "上海市",
  江苏: "江苏省",
  浙江: "浙江省",
  安徽: "安徽省",
  福建: "福建省",
  江西: "江西省",
  山东: "山东省",
  河南: "河南省",
  湖北: "湖北省",
  湖南: "湖南省",
  广东: "广东省",
  广西: "广西壮族自治区",
  海南: "海南省",
  重庆: "重庆市",
  四川: "四川省",
  贵州: "贵州省",
  云南: "云南省",
  西藏: "西藏自治区",
  陕西: "陕西省",
  甘肃: "甘肃省",
  青海: "青海省",
  宁夏: "宁夏回族自治区",
  新疆: "新疆维吾尔自治区",
  台湾: "台湾省",
  香港: "香港特别行政区",
  澳门: "澳门特别行政区"
};

const state = {
  companies: [],
  mapData: null,
  selectedFilter: "all",
  selectedProvince: "辽宁",
  query: "",
  visibleCompanies: 24,
  mapWidth: 0
};

const elements = {
  snapshotText: document.getElementById("snapshotText"),
  totalMetricLabel: document.getElementById("totalMetricLabel"),
  totalMetric: document.getElementById("totalMetric"),
  provinceMetric: document.getElementById("provinceMetric"),
  leaderMetric: document.getElementById("leaderMetric"),
  leaderMetricNote: document.getElementById("leaderMetricNote"),
  boardFilters: document.getElementById("boardFilters"),
  mapTitle: document.getElementById("mapTitle"),
  mapSubtitle: document.getElementById("mapSubtitle"),
  mapStatus: document.getElementById("mapStatus"),
  mapStage: document.getElementById("mapStage"),
  chinaMap: document.getElementById("chinaMap"),
  mapTooltip: document.getElementById("mapTooltip"),
  legendRange: document.getElementById("legendRange"),
  provinceTitle: document.getElementById("provinceTitle"),
  provinceSummary: document.getElementById("provinceSummary"),
  provinceCount: document.getElementById("provinceCount"),
  boardBreakdown: document.getElementById("boardBreakdown"),
  industryList: document.getElementById("industryList"),
  companyResultCount: document.getElementById("companyResultCount"),
  companySearch: document.getElementById("companySearch"),
  companyList: document.getElementById("companyList"),
  loadMoreButton: document.getElementById("loadMoreButton"),
  dataCaveat: document.getElementById("dataCaveat"),
  fatalError: document.getElementById("fatalError"),
  fatalErrorMessage: document.getElementById("fatalErrorMessage")
};

function number(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeFeatureName(feature) {
  return feature?.properties?.name || "南海诸岛";
}

function matchesFilter(company, filter = state.selectedFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "main") {
    return ["sh-main", "sz-main", "sme"].includes(company.board);
  }
  return company.board === filter;
}

function getFilteredCompanies() {
  return state.companies.filter((company) => matchesFilter(company));
}

function getProvinceCompanies() {
  return getFilteredCompanies().filter(
    (company) => company.province === state.selectedProvince
  );
}

function createCounts(companies, property) {
  return d3.rollup(companies, (group) => group.length, (company) => company[property]);
}

function getFilterLabel() {
  return FILTERS.find((filter) => filter.key === state.selectedFilter)?.label ?? "全部A股";
}

function renderFilters() {
  elements.boardFilters.innerHTML = "";

  for (const filter of FILTERS) {
    const count = state.companies.filter((company) =>
      matchesFilter(company, filter.key)
    ).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.dataset.filter = filter.key;
    button.setAttribute(
      "aria-pressed",
      String(filter.key === state.selectedFilter)
    );
    button.innerHTML = `${escapeHtml(filter.label)}<span>${number(count)}</span>`;
    button.addEventListener("click", () => {
      if (state.selectedFilter === filter.key) {
        return;
      }
      state.selectedFilter = filter.key;
      state.visibleCompanies = 24;
      state.query = "";
      elements.companySearch.value = "";
      renderAll();
    });
    elements.boardFilters.append(button);
  }
}

function renderMetrics() {
  const filteredCompanies = getFilteredCompanies();
  const provinceCounts = createCounts(filteredCompanies, "province");
  const leaders = [...provinceCounts.entries()].sort((left, right) => right[1] - left[1]);
  const [leaderProvince = "—", leaderCount = 0] = leaders[0] ?? [];
  const filterLabel = getFilterLabel();

  elements.totalMetricLabel.textContent =
    state.selectedFilter === "all" ? "全国上市公司" : `全国${filterLabel}公司`;
  elements.totalMetric.textContent = number(filteredCompanies.length);
  elements.provinceMetric.textContent = number(
    [...provinceCounts.values()].filter((count) => count > 0).length
  );
  elements.leaderMetric.textContent = leaderProvince;
  elements.leaderMetricNote.textContent = `${number(leaderCount)} 家${filterLabel}公司`;
}

function showTooltip(event, province, count) {
  const filterLabel = getFilterLabel();
  elements.mapTooltip.innerHTML = `
    <strong>${escapeHtml(PROVINCE_FULL_NAMES[province] ?? province)}</strong>
    <span>${escapeHtml(filterLabel)}：${number(count)} 家</span>
  `;
  elements.mapTooltip.hidden = false;

  const stageRect = elements.mapStage.getBoundingClientRect();
  const tooltipRect = elements.mapTooltip.getBoundingClientRect();
  const pointerX = event.clientX - stageRect.left;
  const pointerY = event.clientY - stageRect.top;
  const left = Math.max(
    8,
    Math.min(stageRect.width - tooltipRect.width - 8, pointerX + 12)
  );
  const top = Math.max(
    8,
    Math.min(stageRect.height - tooltipRect.height - 8, pointerY - 18)
  );

  elements.mapTooltip.style.left = `${left}px`;
  elements.mapTooltip.style.top = `${top}px`;
}

function hideTooltip() {
  elements.mapTooltip.hidden = true;
}

function selectProvince(province) {
  if (province === "南海诸岛") {
    return;
  }
  state.selectedProvince = province;
  state.visibleCompanies = 24;
  state.query = "";
  elements.companySearch.value = "";
  renderMap();
  renderDetails();

  if (window.matchMedia("(max-width: 720px)").matches) {
    elements.provinceTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderMap() {
  if (!state.mapData) {
    return;
  }

  const stageRect = elements.mapStage.getBoundingClientRect();
  const width = Math.max(300, Math.round(stageRect.width));
  const height = Math.max(
    width <= 450 ? 365 : width <= 720 ? 430 : 560,
    Math.round(width * (width <= 450 ? 0.94 : 0.72))
  );
  state.mapWidth = width;

  const svg = d3
    .select(elements.chinaMap)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("height", height);

  svg.selectAll("g.map-root").remove();
  const root = svg.append("g").attr("class", "map-root");
  const projection = d3
    .geoMercator()
    .fitExtent(
      [
        [18, 16],
        [width - 18, height - 16]
      ],
      state.mapData
    );
  const path = d3.geoPath(projection);
  const filteredCompanies = getFilteredCompanies();
  const provinceCounts = createCounts(filteredCompanies, "province");
  const maxCount = d3.max([...provinceCounts.values()]) ?? 0;
  const color = d3
    .scaleSequentialSqrt()
    .domain([0, Math.max(1, maxCount)])
    .interpolator(d3.interpolateRgb("#eaf5f1", "#0f655f"));

  elements.legendRange.textContent = `0 — ${number(maxCount)} 家`;
  elements.mapTitle.textContent = `全国${getFilterLabel()}公司数量`;
  elements.mapSubtitle.textContent =
    "点击任一省份，查看企业名称、上市板块和主要经营方向。";
  elements.mapStatus.textContent = `${number(filteredCompanies.length)} 家企业`;

  const features = root
    .selectAll("path.province-shape")
    .data(state.mapData.features)
    .join("path")
    .attr("class", (feature) => {
      const province = normalizeFeatureName(feature);
      return `province-shape${province === state.selectedProvince ? " is-selected" : ""}`;
    })
    .attr("d", path)
    .attr("fill", (feature) => {
      const province = normalizeFeatureName(feature);
      return color(provinceCounts.get(province) ?? 0);
    })
    .attr("role", (feature) =>
      normalizeFeatureName(feature) === "南海诸岛" ? "img" : "button"
    )
    .attr("tabindex", (feature) =>
      normalizeFeatureName(feature) === "南海诸岛" ? null : 0
    )
    .attr("aria-label", (feature) => {
      const province = normalizeFeatureName(feature);
      const count = provinceCounts.get(province) ?? 0;
      return province === "南海诸岛"
        ? "南海诸岛示意"
        : `${PROVINCE_FULL_NAMES[province] ?? province}，${getFilterLabel()}${number(count)}家`;
    })
    .on("pointermove", (event, feature) => {
      const province = normalizeFeatureName(feature);
      showTooltip(event, province, provinceCounts.get(province) ?? 0);
    })
    .on("pointerleave", hideTooltip)
    .on("focus", (event, feature) => {
      const province = normalizeFeatureName(feature);
      const bounds = event.currentTarget.getBoundingClientRect();
      showTooltip(
        {
          clientX: bounds.left + bounds.width / 2,
          clientY: bounds.top + bounds.height / 2
        },
        province,
        provinceCounts.get(province) ?? 0
      );
    })
    .on("blur", hideTooltip)
    .on("click", (_, feature) => selectProvince(normalizeFeatureName(feature)))
    .on("keydown", (event, feature) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectProvince(normalizeFeatureName(feature));
      }
    });

  features
    .append("title")
    .text((feature) => {
      const province = normalizeFeatureName(feature);
      return `${province}：${provinceCounts.get(province) ?? 0} 家`;
    });

  const labels = state.mapData.features.filter((feature) => {
    const province = normalizeFeatureName(feature);
    if (province === "南海诸岛") {
      return false;
    }
    const bounds = path.bounds(feature);
    const area =
      Math.max(0, bounds[1][0] - bounds[0][0]) *
      Math.max(0, bounds[1][1] - bounds[0][1]);
    return area > (width <= 450 ? 1_800 : 760) || province === state.selectedProvince;
  });

  const labelGroup = root
    .selectAll("text.province-label")
    .data(labels)
    .join("text")
    .attr("class", (feature) => {
      const province = normalizeFeatureName(feature);
      return `province-label${province === state.selectedProvince ? " is-selected-label" : ""}`;
    })
    .attr("transform", (feature) => {
      const [x, y] = path.centroid(feature);
      return `translate(${x},${y})`;
    });

  labelGroup
    .append("tspan")
    .attr("x", 0)
    .attr("dy", "-0.15em")
    .text((feature) => normalizeFeatureName(feature));

  labelGroup
    .append("tspan")
    .attr("class", "label-count")
    .attr("x", 0)
    .attr("dy", "1.2em")
    .text((feature) => number(provinceCounts.get(normalizeFeatureName(feature)) ?? 0));
}

function renderBoardBreakdown(companies) {
  const counts = createCounts(companies, "board");
  const boardOrder = ["sh-main", "sz-main", "sme", "star", "chinext", "bse"];
  const rows = boardOrder.filter((board) => (counts.get(board) ?? 0) > 0);

  if (!rows.length) {
    elements.boardBreakdown.innerHTML =
      '<span class="empty-state">当前筛选下暂无板块记录。</span>';
    return;
  }

  elements.boardBreakdown.innerHTML = rows
    .map(
      (board) => `
        <span class="board-chip">
          ${escapeHtml(BOARD_LABELS[board])}
          <strong>${number(counts.get(board))}</strong>
        </span>
      `
    )
    .join("");
}

function renderIndustries(companies) {
  const industries = [...createCounts(companies, "industry").entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const max = industries[0]?.[1] ?? 0;

  if (!industries.length) {
    elements.industryList.innerHTML =
      '<div class="empty-state">当前筛选下暂无行业记录。</div>';
    return;
  }

  elements.industryList.innerHTML = industries
    .map(
      ([industry, count]) => `
        <div class="industry-row">
          <span>${escapeHtml(industry)}</span>
          <strong>${number(count)} 家</strong>
          <div class="industry-bar" aria-hidden="true">
            <i style="width:${Math.max(6, (count / max) * 100).toFixed(1)}%"></i>
          </div>
        </div>
      `
    )
    .join("");
}

function getSearchedProvinceCompanies(companies) {
  const query = state.query.trim().toLocaleLowerCase("zh-CN");
  if (!query) {
    return companies;
  }

  return companies.filter((company) =>
    [
      company.name,
      company.code,
      company.industry,
      company.direction,
      BOARD_LABELS[company.board]
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN")
      .includes(query)
  );
}

function renderCompanyList(companies) {
  const searchedCompanies = getSearchedProvinceCompanies(companies);
  const visibleCompanies = searchedCompanies.slice(0, state.visibleCompanies);

  elements.companyResultCount.textContent = state.query
    ? `找到 ${number(searchedCompanies.length)} 家`
    : `共 ${number(searchedCompanies.length)} 家`;

  if (!visibleCompanies.length) {
    elements.companyList.innerHTML = `
      <li class="empty-state">
        ${state.query ? "没有找到匹配的企业，请换个名称、代码或行业。" : "当前筛选条件下暂无企业记录。"}
      </li>
    `;
  } else {
    elements.companyList.innerHTML = visibleCompanies
      .map(
        (company) => `
          <li class="company-card">
            <div class="company-title">
              <strong>${escapeHtml(company.name)}</strong>
              <span class="company-code">${escapeHtml(company.code)}</span>
              <span class="company-board">${escapeHtml(BOARD_LABELS[company.board])}</span>
            </div>
            <div class="company-meta">
              <p><b>注册地区线索</b>${escapeHtml(PROVINCE_FULL_NAMES[company.province] ?? company.province)}</p>
              <p><b>行业</b>${escapeHtml(company.industry)}</p>
              <p><b>主要方向</b>${escapeHtml(company.direction)}</p>
            </div>
          </li>
        `
      )
      .join("");
  }

  const remaining = searchedCompanies.length - visibleCompanies.length;
  elements.loadMoreButton.hidden = remaining <= 0;
  elements.loadMoreButton.textContent =
    remaining > 0 ? `继续查看（还有 ${number(remaining)} 家）` : "继续查看";
}

function renderDetails() {
  const provinceCompanies = getProvinceCompanies();
  const filterLabel = getFilterLabel();

  elements.provinceTitle.textContent =
    PROVINCE_FULL_NAMES[state.selectedProvince] ?? state.selectedProvince;
  elements.provinceCount.textContent = number(provinceCompanies.length);
  elements.provinceSummary.textContent = provinceCompanies.length
    ? `当前显示 ${filterLabel}，可继续核对产业结构与代表企业。`
    : `当前筛选为${filterLabel}，暂无可用企业记录。`;

  renderBoardBreakdown(provinceCompanies);
  renderIndustries(provinceCompanies);
  renderCompanyList(provinceCompanies);
}

function renderAll() {
  renderFilters();
  renderMetrics();
  renderMap();
  renderDetails();
}

function expandRows(payload) {
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

async function loadApplication() {
  const [mapResponse, companyResponse] = await Promise.all([
    fetch("./data/china.json"),
    fetch("./data/companies.compact.json")
  ]);

  if (!mapResponse.ok || !companyResponse.ok) {
    throw new Error(
      `数据文件读取失败（地图 ${mapResponse.status}，企业 ${companyResponse.status}）`
    );
  }

  const [mapData, companyData] = await Promise.all([
    mapResponse.json(),
    companyResponse.json()
  ]);

  if (
    mapData?.type !== "FeatureCollection" ||
    !Array.isArray(companyData?.companies)
  ) {
    throw new Error("数据格式不正确");
  }

  state.mapData = mapData;
  state.companies = expandRows(companyData);
  elements.snapshotText.textContent = `全国数据快照 · ${companyData.meta.snapshotDate}`;
  elements.dataCaveat.textContent =
    `共整理 ${number(companyData.meta.companyCount)} 家沪深京A股公司。${companyData.meta.caveat}`;

  renderAll();

  const resizeObserver = new ResizeObserver(() => {
    const nextWidth = Math.round(elements.mapStage.getBoundingClientRect().width);
    if (Math.abs(nextWidth - state.mapWidth) > 2) {
      window.requestAnimationFrame(renderMap);
    }
  });
  resizeObserver.observe(elements.mapStage);
}

elements.companySearch.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  state.visibleCompanies = 24;
  renderCompanyList(getProvinceCompanies());
});

elements.loadMoreButton.addEventListener("click", () => {
  state.visibleCompanies += 24;
  renderCompanyList(getProvinceCompanies());
});

loadApplication().catch((error) => {
  console.error(error);
  document.querySelector(".page-shell").hidden = true;
  elements.fatalError.hidden = false;
  elements.fatalErrorMessage.textContent = error.message;
});
