import {
  BOARD_LABELS,
  expandCompanies,
  filterCompanies,
  getIndustryCounts,
  matchesBoard,
  paginate
} from "./company-directory-core.js";

const VERSION = "2.0.0";
const COLLAPSED_INDUSTRY_LIMIT = 8;
const PROVINCE_FULL_NAMES = Object.freeze({
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
});
const FULL_TO_SHORT = new Map(
  Object.entries(PROVINCE_FULL_NAMES).map(([shortName, fullName]) => [fullName, shortName])
);

const state = {
  companies: [],
  selectedIndustry: "all",
  industriesExpanded: false,
  query: "",
  page: 1,
  contextSignature: "",
  rendering: false
};

const elements = {
  boardFilters: document.getElementById("boardFilters"),
  mapStage: document.getElementById("mapStage"),
  provinceTitle: document.getElementById("provinceTitle"),
  provinceSummary: document.getElementById("provinceSummary"),
  industryList: document.getElementById("industryList"),
  companySection: document.querySelector(".company-section"),
  companyListTitle: document.getElementById("companyListTitle"),
  companyResultCount: document.getElementById("companyResultCount"),
  companySearch: document.getElementById("companySearch"),
  companyList: document.getElementById("companyList"),
  loadMoreButton: document.getElementById("loadMoreButton")
};

function number(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSelectedProvince() {
  const visibleName = elements.provinceTitle?.textContent?.trim() || "辽宁省";
  if (FULL_TO_SHORT.has(visibleName)) {
    return FULL_TO_SHORT.get(visibleName);
  }
  if (PROVINCE_FULL_NAMES[visibleName]) {
    return visibleName;
  }
  return visibleName
    .replace(/特别行政区$/, "")
    .replace(/壮族自治区$/, "")
    .replace(/回族自治区$/, "")
    .replace(/维吾尔自治区$/, "")
    .replace(/自治区$/, "")
    .replace(/[省市]$/, "");
}

function getSelectedBoard() {
  return (
    elements.boardFilters?.querySelector('.filter-button[aria-pressed="true"]')?.dataset
      ?.filter || "all"
  );
}

function getBoardLabel(boardFilter) {
  if (boardFilter === "all") {
    return "全部A股";
  }
  if (boardFilter === "main") {
    return "主板";
  }
  return BOARD_LABELS[boardFilter] ?? "当前板块";
}

function getPageSize() {
  if (window.matchMedia("(max-width: 720px)").matches) {
    return 8;
  }
  if (window.matchMedia("(max-width: 1100px)").matches) {
    return 10;
  }
  return 12;
}

function getContext() {
  const province = getSelectedProvince();
  const boardFilter = getSelectedBoard();
  return {
    province,
    boardFilter,
    signature: `${province}|${boardFilter}`
  };
}

function getProvinceBoardCompanies(context) {
  return state.companies.filter(
    (company) =>
      company.province === context.province && matchesBoard(company, context.boardFilter)
  );
}

function ensureDirectoryScaffold() {
  if (!elements.companySection || document.getElementById("companyPagination")) {
    return;
  }

  elements.companyListTitle.textContent = "企业目录";
  elements.loadMoreButton.hidden = true;
  elements.loadMoreButton.setAttribute("aria-hidden", "true");
  elements.industryList.setAttribute("role", "group");
  elements.industryList.setAttribute("aria-label", "按行业筛选当前省份企业");

  const industryHelper = document.createElement("p");
  industryHelper.className = "directory-helper";
  industryHelper.textContent = "先选行业，再看企业；默认只展示一页，避免企业卡片无限向下展开。";
  elements.industryList.before(industryHelper);

  const contextLine = document.createElement("p");
  contextLine.className = "directory-context";
  contextLine.id = "directoryContext";
  contextLine.setAttribute("aria-live", "polite");
  elements.companyListTitle.parentElement.append(contextLine);

  const pagination = document.createElement("nav");
  pagination.className = "company-pagination";
  pagination.id = "companyPagination";
  pagination.setAttribute("aria-label", "企业目录分页");
  pagination.innerHTML = `
    <button type="button" data-page-action="previous">上一页</button>
    <span id="companyPageStatus" aria-live="polite">第 1 / 1 页</span>
    <button type="button" data-page-action="next">下一页</button>
  `;
  elements.companyList.after(pagination);

  pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page-action]");
    if (!button || button.disabled) {
      return;
    }
    state.page += button.dataset.pageAction === "next" ? 1 : -1;
    renderDirectory({ userInitiatedPageChange: true });
  });
}

function renderIndustries(companies) {
  const industryCounts = getIndustryCounts(companies);
  const availableIndustries = new Set(industryCounts.map(([industry]) => industry));
  if (
    state.selectedIndustry !== "all" &&
    !availableIndustries.has(state.selectedIndustry)
  ) {
    state.selectedIndustry = "all";
    state.page = 1;
  }

  if (!industryCounts.length) {
    elements.industryList.innerHTML =
      '<div class="empty-state">当前省份和板块下暂无行业记录。</div>';
    return;
  }

  const visibleIndustries = state.industriesExpanded
    ? industryCounts
    : industryCounts.slice(0, COLLAPSED_INDUSTRY_LIMIT);
  if (
    !state.industriesExpanded &&
    state.selectedIndustry !== "all" &&
    !visibleIndustries.some(([industry]) => industry === state.selectedIndustry)
  ) {
    const selectedEntry = industryCounts.find(
      ([industry]) => industry === state.selectedIndustry
    );
    if (selectedEntry) {
      visibleIndustries.push(selectedEntry);
    }
  }

  const total = companies.length;
  const filterButtons = [
    ["all", total],
    ...visibleIndustries
  ]
    .map(
      ([industry, count]) => `
        <button
          type="button"
          class="industry-filter-button"
          data-industry="${escapeHtml(industry)}"
          aria-pressed="${String(industry === state.selectedIndustry)}"
        >
          <span>${industry === "all" ? "全部行业" : escapeHtml(industry)}</span>
          <strong>${number(count)}</strong>
        </button>
      `
    )
    .join("");

  const toggle =
    industryCounts.length > COLLAPSED_INDUSTRY_LIMIT
      ? `
        <button type="button" class="industry-expand-button" data-industry-toggle>
          ${state.industriesExpanded
            ? "收起行业"
            : `查看全部 ${number(industryCounts.length)} 个行业`}
        </button>
      `
      : "";

  elements.industryList.innerHTML = `
    <div class="industry-filter-grid">${filterButtons}</div>
    ${toggle}
  `;
}

function renderCompanyRows(companies) {
  if (!companies.length) {
    elements.companyList.innerHTML = `
      <li class="empty-state">
        ${state.query
          ? "没有找到匹配企业，请更换企业名称、证券代码、行业或经营方向。"
          : "当前行业下暂无企业记录，请选择其他行业。"}
      </li>
    `;
    return;
  }

  elements.companyList.innerHTML = companies
    .map(
      (company) => `
        <li class="company-card directory-company-row">
          <div class="company-title directory-company-name">
            <strong>${escapeHtml(company.name)}</strong>
            <span class="company-code">${escapeHtml(company.code)}</span>
          </div>
          <div class="directory-company-board">
            <span class="directory-field-label">板块</span>
            <span class="company-board">${escapeHtml(BOARD_LABELS[company.board])}</span>
          </div>
          <div class="directory-company-industry">
            <span class="directory-field-label">行业</span>
            <strong>${escapeHtml(company.industry)}</strong>
          </div>
          <div class="directory-company-direction">
            <span class="directory-field-label">主要经营方向</span>
            <p>${escapeHtml(company.direction)}</p>
          </div>
        </li>
      `
    )
    .join("");
}

function renderPagination(pageData) {
  const pagination = document.getElementById("companyPagination");
  const previous = pagination.querySelector('[data-page-action="previous"]');
  const next = pagination.querySelector('[data-page-action="next"]');
  const status = document.getElementById("companyPageStatus");

  previous.disabled = !pageData.hasPrevious;
  next.disabled = !pageData.hasNext;
  status.textContent = `第 ${number(pageData.page)} / ${number(pageData.pageCount)} 页`;
  pagination.hidden = pageData.pageCount <= 1;
}

function renderDirectory({ userInitiatedPageChange = false } = {}) {
  if (state.rendering || !state.companies.length) {
    return;
  }
  state.rendering = true;

  try {
    ensureDirectoryScaffold();
    const context = getContext();
    if (context.signature !== state.contextSignature) {
      state.contextSignature = context.signature;
      state.selectedIndustry = "all";
      state.industriesExpanded = false;
      state.page = 1;
      state.query = elements.companySearch.value;
    }

    const provinceBoardCompanies = getProvinceBoardCompanies(context);
    renderIndustries(provinceBoardCompanies);

    const filteredCompanies = filterCompanies({
      companies: state.companies,
      province: context.province,
      boardFilter: context.boardFilter,
      industry: state.selectedIndustry,
      query: state.query
    });
    const pageData = paginate(filteredCompanies, state.page, getPageSize());
    state.page = pageData.page;

    renderCompanyRows(pageData.items);
    renderPagination(pageData);

    const industryLabel =
      state.selectedIndustry === "all" ? "全部行业" : state.selectedIndustry;
    document.getElementById("directoryContext").textContent =
      `${PROVINCE_FULL_NAMES[context.province] ?? context.province} · ` +
      `${getBoardLabel(context.boardFilter)} · ${industryLabel}`;

    if (state.query) {
      elements.companyResultCount.textContent = `找到 ${number(filteredCompanies.length)} 家`;
    } else if (filteredCompanies.length) {
      elements.companyResultCount.textContent =
        `共 ${number(filteredCompanies.length)} 家 · ` +
        `当前 ${number(pageData.startIndex + 1)}—${number(pageData.endIndex)} 家`;
    } else {
      elements.companyResultCount.textContent = "共 0 家";
    }

    if (elements.provinceSummary && provinceBoardCompanies.length) {
      elements.provinceSummary.textContent =
        `先从 ${number(getIndustryCounts(provinceBoardCompanies).length)} 个行业中选择方向，` +
        `再分页核对 ${number(provinceBoardCompanies.length)} 家企业。`;
    }

    if (userInitiatedPageChange) {
      elements.companySection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } finally {
    state.rendering = false;
  }
}

let scheduled = false;
function scheduleContextSync() {
  if (scheduled) {
    return;
  }
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    renderDirectory();
  });
}

function bindEvents() {
  elements.industryList.addEventListener("click", (event) => {
    const industryButton = event.target.closest("button[data-industry]");
    if (industryButton) {
      state.selectedIndustry = industryButton.dataset.industry;
      state.page = 1;
      renderDirectory();
      return;
    }

    if (event.target.closest("button[data-industry-toggle]")) {
      state.industriesExpanded = !state.industriesExpanded;
      renderDirectory();
    }
  });

  elements.companySearch.addEventListener("input", (event) => {
    state.query = event.currentTarget.value;
    state.page = 1;
    renderDirectory();
  });

  elements.boardFilters.addEventListener("click", scheduleContextSync);
  elements.mapStage.addEventListener("click", scheduleContextSync);
  elements.mapStage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      scheduleContextSync();
    }
  });

  const provinceObserver = new MutationObserver(scheduleContextSync);
  provinceObserver.observe(elements.provinceTitle, {
    subtree: true,
    childList: true,
    characterData: true
  });

  const boardObserver = new MutationObserver(scheduleContextSync);
  boardObserver.observe(elements.boardFilters, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-pressed"]
  });

  for (const query of ["(max-width: 720px)", "(max-width: 1100px)"]) {
    window.matchMedia(query).addEventListener("change", () => {
      state.page = 1;
      renderDirectory();
    });
  }
}

async function init() {
  if (Object.values(elements).some((element) => !element)) {
    return;
  }

  const response = await fetch("./data/companies.compact.json");
  if (!response.ok) {
    throw new Error(`企业目录数据读取失败（${response.status}）`);
  }

  state.companies = expandCompanies(await response.json());
  ensureDirectoryScaffold();
  bindEvents();
  document.body.classList.add("directory-v2-ready");
  document.body.dataset.companyDirectoryVersion = VERSION;
  renderDirectory();
}

init().catch((error) => {
  console.error("企业目录控制器启动失败", error);
});
