import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  BOARD_DEFINITIONS,
  PROVINCES,
  classifyBoard,
  normalizeCompanyName,
  normalizeProvince
} from "./lib.mjs";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const outputDir = path.join(rootDir, "public", "data");
const execFileAsync = promisify(execFile);

const mapUrl = "https://unpkg.com/echarts@3.6.2/map/json/china.json";
const sinaSectorIndexUrl =
  "https://money.finance.sina.com.cn/q/view/newFLJK.php";
const sinaSectorDetailUrl =
  "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData";
const eastmoneyProductUrl =
  "https://datacenter-web.eastmoney.com/api/data/v1/get";
const sectorPageSize = 100;
const productPageSize = 500;
const productColumns = [
  "SECUCODE",
  "SECURITY_CODE",
  "SECURITY_NAME_ABBR",
  "STD_PRODUCT_NAME",
  "MAIN_BUSINESS_INCOME",
  "REPORT_DATE"
];

await fs.mkdir(outputDir, { recursive: true });

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchBuffer(url, options = {}) {
  const {
    attempts = 4,
    referer = "https://finance.sina.com.cn/",
    timeoutSeconds = 35
  } = options;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { stdout } = await execFileAsync(
        "curl",
        [
          "--location",
          "--fail",
          "--silent",
          "--show-error",
          "--compressed",
          "--max-time",
          String(timeoutSeconds),
          "--retry",
          "1",
          "--retry-all-errors",
          "--header",
          "Accept: application/json,text/plain,*/*",
          "--header",
          `Referer: ${referer}`,
          "--user-agent",
          "Mozilla/5.0 PublicCompanyMap/0.1",
          url
        ],
        {
          encoding: "buffer",
          maxBuffer: 20 * 1024 * 1024
        }
      );

      return stdout;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(550 * attempt);
      }
    }
  }

  throw lastError;
}

async function fetchJson(url, options) {
  const buffer = await fetchBuffer(url, options);
  return JSON.parse(new TextDecoder("utf-8").decode(buffer));
}

async function fetchGb18030Text(url, options) {
  const buffer = await fetchBuffer(url, options);
  return new TextDecoder("gb18030").decode(buffer);
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(values[index], index);
      await wait(75);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );

  return output;
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1])
  );
}

function formatChinaDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function createNanHaiFeature() {
  const origin = [126, 25];
  const rawPolygons = [
    [[0, 3.5], [7, 11.2], [15, 11.9], [30, 7], [42, 0.7], [52, 0.7], [56, 7.7], [59, 0.7], [64, 0.7], [64, 0], [5, 0], [0, 3.5]],
    [[13, 16.1], [19, 14.7], [16, 21.7], [11, 23.1], [13, 16.1]],
    [[12, 32.2], [14, 38.5], [15, 38.5], [13, 32.2], [12, 32.2]],
    [[16, 47.6], [12, 53.2], [13, 53.2], [18, 47.6], [16, 47.6]],
    [[6, 64.4], [8, 70], [9, 70], [8, 64.4], [6, 64.4]],
    [[23, 82.6], [29, 79.8], [30, 79.8], [25, 82.6], [23, 82.6]],
    [[37, 70.7], [43, 62.3], [44, 62.3], [39, 70.7], [37, 70.7]],
    [[48, 51.1], [51, 45.5], [53, 45.5], [50, 51.1], [48, 51.1]],
    [[51, 35], [51, 28.7], [53, 28.7], [53, 35], [51, 35]],
    [[52, 22.4], [55, 17.5], [56, 17.5], [53, 22.4], [52, 22.4]],
    [[58, 12.6], [62, 7], [63, 7], [60, 12.6], [58, 12.6]],
    [[0, 3.5], [0, 93.1], [64, 93.1], [64, 0], [63, 0], [63, 92.4], [1, 92.4], [1, 3.5], [0, 3.5]]
  ];

  const coordinates = rawPolygons.slice(0, -1).map((polygon) => {
    const ring = polygon.map(([x, y]) => [
      origin[0] + x / 10.5,
      origin[1] + y / (-10.5 / 0.75)
    ]);
    const signedArea = ring.slice(0, -1).reduce((area, point, index) => {
      const next = ring[index + 1];
      return area + point[0] * next[1] - next[0] * point[1];
    }, 0);
    return [signedArea > 0 ? ring.reverse() : ring];
  });

  return {
    id: "100000_JD",
    type: "Feature",
    properties: {
      name: "南海诸岛",
      cp: origin,
      source: "ECharts 3.6.2 nanhai.js"
    },
    geometry: {
      type: "MultiPolygon",
      coordinates
    }
  };
}

function appendDiaoyuIsland(mapData) {
  const taiwan = mapData.features.find(
    (feature) => feature?.properties?.name === "台湾"
  );
  const ring = [
    [123.45165252685547, 25.73527164402261],
    [123.49731445312499, 25.73527164402261],
    [123.49731445312499, 25.750734064600884],
    [123.45165252685547, 25.750734064600884],
    [123.45165252685547, 25.73527164402261]
  ];

  if (!taiwan || taiwan.geometry?.type !== "MultiPolygon") {
    throw new Error("地图数据中未找到可追加钓鱼岛坐标的台湾 MultiPolygon");
  }

  taiwan.geometry.coordinates.push([[...ring].reverse()]);
}

function decodePolygon(coordinate, encodeOffsets, encodeScale) {
  const result = [];
  let previousX = encodeOffsets[0];
  let previousY = encodeOffsets[1];

  for (let index = 0; index < coordinate.length; index += 2) {
    let x = coordinate.charCodeAt(index) - 64;
    let y = coordinate.charCodeAt(index + 1) - 64;
    x = (x >> 1) ^ -(x & 1);
    y = (y >> 1) ^ -(y & 1);
    x += previousX;
    y += previousY;
    previousX = x;
    previousY = y;
    result.push([x / encodeScale, y / encodeScale]);
  }

  return result;
}

function decodeEchartsGeoJson(mapData) {
  if (!mapData.UTF8Encoding) {
    return mapData;
  }
  const encodeScale = mapData.UTF8Scale ?? 1024;

  for (const feature of mapData.features) {
    const { geometry } = feature;
    const { coordinates, encodeOffsets } = geometry;
    for (let index = 0; index < coordinates.length; index += 1) {
      if (geometry.type === "Polygon") {
        coordinates[index] = decodePolygon(
          coordinates[index],
          encodeOffsets[index],
          encodeScale
        );
      } else if (geometry.type === "MultiPolygon") {
        for (
          let polygonIndex = 0;
          polygonIndex < coordinates[index].length;
          polygonIndex += 1
        ) {
          coordinates[index][polygonIndex] = decodePolygon(
            coordinates[index][polygonIndex],
            encodeOffsets[index][polygonIndex],
            encodeScale
          );
        }
      }
    }
    delete geometry.encodeOffsets;
  }

  mapData.UTF8Encoding = false;
  delete mapData.UTF8Scale;
  return mapData;
}

async function buildMapData() {
  const mapData = decodeEchartsGeoJson(await fetchJson(mapUrl));
  if (mapData?.type !== "FeatureCollection" || mapData.features?.length !== 34) {
    throw new Error("ECharts 中国地图结构或省级地区数量不符合预期");
  }

  appendDiaoyuIsland(mapData);
  mapData.features.push(createNanHaiFeature());
  mapData.metadata = {
    source: mapUrl,
    license: "BSD-3-Clause",
    sourceVersion: "ECharts 3.6.2",
    localDevelopmentOnly: true
  };

  await fs.writeFile(
    path.join(outputDir, "china.json"),
    JSON.stringify(mapData),
    "utf8"
  );

  return mapData;
}

function parseSectorIndex(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("新浪板块索引返回内容无法识别");
  }

  const payload = JSON.parse(text.slice(start, end + 1));
  return Object.entries(payload).map(([node, value]) => {
    const [payloadNode, label] = String(value).split(",");
    return {
      node: payloadNode || node,
      label: String(label ?? "").trim()
    };
  });
}

async function fetchSectorIndex(kind) {
  const url = new URL(sinaSectorIndexUrl);
  url.searchParams.set("param", kind);
  const text = await fetchGb18030Text(url.href, {
    referer: "https://finance.sina.com.cn/stock/sl/"
  });
  return parseSectorIndex(text);
}

async function fetchSectorPage(node, page) {
  const url = new URL(sinaSectorDetailUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("num", String(sectorPageSize));
  url.searchParams.set("sort", "symbol");
  url.searchParams.set("asc", "1");
  url.searchParams.set("node", node);
  url.searchParams.set("symbol", "");
  url.searchParams.set("_s_r_a", "page");

  const rows = await fetchJson(url.href, {
    referer: "https://finance.sina.com.cn/stock/sl/"
  });
  return Array.isArray(rows) ? rows : [];
}

async function fetchSectorMembers(sector) {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const pageRows = await fetchSectorPage(sector.node, page);
    rows.push(...pageRows);
    if (pageRows.length < sectorPageSize) {
      return rows;
    }
  }
  throw new Error(`${sector.label} 板块超过安全分页上限`);
}

function isMainlandListedShare(row) {
  const code = String(row?.code ?? "");
  const name = normalizeCompanyName(row?.name);
  const symbol = String(row?.symbol ?? "").toLowerCase();
  const board = classifyBoard(code);

  if (!/^\d{6}$/.test(code) || !name || board === "unknown") {
    return false;
  }
  if (!/^(sh|sz|bj)/.test(symbol)) {
    return false;
  }
  return !/^PT/i.test(name) && !/退$/.test(name) && !/退市/.test(name);
}

async function buildAreaCompanies() {
  const areaSectors = (await fetchSectorIndex("area"))
    .map((sector) => ({
      ...sector,
      province: normalizeProvince(sector.label)
    }))
    .filter((sector) => sector.province !== "未知");

  if (areaSectors.length !== 31) {
    throw new Error(`地域板块数量异常：${areaSectors.length}`);
  }

  const sectorRows = await mapWithConcurrency(
    areaSectors,
    5,
    async (sector, index) => {
      const rows = await fetchSectorMembers(sector);
      process.stdout.write(
        `地域 ${index + 1}/${areaSectors.length}：${sector.province} ${rows.length} 条\n`
      );
      return { sector, rows };
    }
  );

  const companies = new Map();
  for (const { sector, rows } of sectorRows) {
    for (const row of rows) {
      if (!isMainlandListedShare(row)) {
        continue;
      }
      const code = String(row.code);
      companies.set(code, {
        code,
        name: normalizeCompanyName(row.name),
        province: sector.province,
        board: classifyBoard(code),
        industry: "",
        direction: ""
      });
    }
  }

  return companies;
}

async function buildIndustryMap(companyCodes) {
  const industrySectors = (await fetchSectorIndex("industry")).filter(
    (sector) => sector.label
  );
  const sectorRows = await mapWithConcurrency(
    industrySectors,
    6,
    async (sector, index) => {
      const rows = await fetchSectorMembers(sector);
      process.stdout.write(
        `行业 ${index + 1}/${industrySectors.length}：${sector.label} ${rows.length} 条\n`
      );
      return { sector, rows };
    }
  );

  const industries = new Map();
  for (const { sector, rows } of sectorRows) {
    for (const row of rows) {
      const code = String(row?.code ?? "");
      if (companyCodes.has(code) && !industries.has(code)) {
        industries.set(code, sector.label);
      }
    }
  }
  return industries;
}

function buildProductUrl(page) {
  const url = new URL(eastmoneyProductUrl);
  url.searchParams.set("reportName", "RPT_HS_MAINOP_PRODUCT");
  url.searchParams.set("columns", productColumns.join(","));
  url.searchParams.set(
    "sortColumns",
    "SECURITY_CODE,REPORT_DATE,MAIN_BUSINESS_INCOME"
  );
  url.searchParams.set("sortTypes", "1,-1,-1");
  url.searchParams.set("pageNumber", String(page));
  url.searchParams.set("pageSize", String(productPageSize));
  url.searchParams.set("source", "WEB");
  url.searchParams.set("client", "WEB");
  return url.href;
}

async function fetchProductPage(page) {
  const payload = await fetchJson(buildProductUrl(page), {
    referer: "https://data.eastmoney.com/",
    timeoutSeconds: 45
  });
  const result = payload?.result;
  if (!payload?.success || !result || !Array.isArray(result.data)) {
    throw new Error(`主营构成第 ${page} 页返回内容异常`);
  }
  return result;
}

function isNoiseProduct(value) {
  return /^(?:其他(?:\s*[\(（]补充[\)）])?|其他业务|分部间抵销|内部抵销|合计|未分配项目|未分配分部)$/.test(
    value
  );
}

function buildProductDirections(rows, companyCodes) {
  const grouped = new Map();
  for (const row of rows) {
    const code = String(row?.SECURITY_CODE ?? "");
    const date = String(row?.REPORT_DATE ?? "");
    const product = String(row?.STD_PRODUCT_NAME ?? "").trim();
    if (!companyCodes.has(code) || !date || !product || isNoiseProduct(product)) {
      continue;
    }

    const current = grouped.get(code);
    if (!current || date > current.date) {
      grouped.set(code, {
        date,
        products: [
          {
            name: product,
            income: Number(row?.MAIN_BUSINESS_INCOME) || 0
          }
        ]
      });
    } else if (date === current.date) {
      current.products.push({
        name: product,
        income: Number(row?.MAIN_BUSINESS_INCOME) || 0
      });
    }
  }

  const directions = new Map();
  for (const [code, entry] of grouped) {
    const products = Array.from(
      new Map(
        entry.products
          .sort((left, right) => right.income - left.income)
          .map((product) => [product.name, product])
      ).values()
    );
    const concrete = products.filter(
      (product) => !/^主业\d+产品及服务$/.test(product.name)
    );
    const selected = (concrete.length ? concrete : products)
      .slice(0, 3)
      .map((product) => product.name);
    if (selected.length) {
      directions.set(code, {
        direction: selected.join("、"),
        reportDate: entry.date.slice(0, 10)
      });
    }
  }
  return directions;
}

async function buildProductMap(companyCodes) {
  const first = await fetchProductPage(1);
  const pages = Number(first.pages);
  const remainingPages = Array.from(
    { length: Math.max(0, pages - 1) },
    (_, index) => index + 2
  );
  process.stdout.write(
    `主营构成共 ${first.count} 条，${pages} 页；开始抓取。\n`
  );

  const remaining = await mapWithConcurrency(
    remainingPages,
    5,
    async (page, index) => {
      const result = await fetchProductPage(page);
      process.stdout.write(`主营 ${index + 2}/${pages} 页\n`);
      return result.data;
    }
  );
  return buildProductDirections([first.data, ...remaining].flat(), companyCodes);
}

async function buildCompanyData() {
  const companyMap = await buildAreaCompanies();
  const companyCodes = new Set(companyMap.keys());
  process.stdout.write(`地域板块整理出 ${companyMap.size} 家沪深京 A 股公司。\n`);

  const [industryMap, productMap] = await Promise.all([
    buildIndustryMap(companyCodes),
    buildProductMap(companyCodes)
  ]);

  let industryFallbackCount = 0;
  let productFallbackCount = 0;
  let latestProductReportDate = "";
  for (const company of companyMap.values()) {
    company.industry = industryMap.get(company.code) || "行业分类待核对";
    if (!industryMap.has(company.code)) {
      industryFallbackCount += 1;
    }

    const product = productMap.get(company.code);
    company.direction = product?.direction || company.industry;
    if (!product) {
      productFallbackCount += 1;
    } else if (product.reportDate > latestProductReportDate) {
      latestProductReportDate = product.reportDate;
    }
  }

  const companies = [...companyMap.values()]
    .map((company) => {
      const boardDefinition = BOARD_DEFINITIONS[company.board];
      return [
        company.code,
        company.name,
        company.province,
        company.board,
        company.industry,
        company.direction,
        boardDefinition.exchange
      ];
    })
    .sort((left, right) => left[0].localeCompare(right[0], "zh-CN"));

  const generatedAt = new Date().toISOString();
  const snapshotDate = formatChinaDate(new Date());
  const provinceCounts = Object.fromEntries(
    PROVINCES.map((province) => [
      province,
      companies.filter((company) => company[2] === province).length
    ])
  );

  const payload = {
    meta: {
      generatedAt,
      snapshotDate,
      source: "新浪财经地域/行业板块 + 东方财富主营构成",
      sourceUrls: [
        "https://finance.sina.com.cn/stock/sl/",
        "https://data.eastmoney.com/"
      ],
      scope: "中国境内沪深京A股",
      companyCount: companies.length,
      industryCoverageCount: companies.length - industryFallbackCount,
      productCoverageCount: companies.length - productFallbackCount,
      latestProductReportDate,
      fields: [
        "证券代码",
        "证券简称",
        "注册省份线索",
        "上市板块",
        "行业分类",
        "主要经营方向",
        "交易所"
      ],
      caveat:
        "省份按新浪财经地域板块归属整理，作为注册省份线索；主要方向优先取东方财富公开主营构成中的最新披露产品，缺失时回退为行业分类。快照会随上市、退市和迁址变化，使用前仍应到交易所公告或公司年报核对，不构成就业或投资建议。"
    },
    boards: BOARD_DEFINITIONS,
    summary: {
      provinceCounts,
      boardCounts: Object.fromEntries(
        Object.keys(BOARD_DEFINITIONS).map((board) => [
          board,
          companies.filter((company) => company[3] === board).length
        ])
      ),
      industryCounts: countBy(companies, (company) => company[4])
    },
    companies
  };

  await fs.writeFile(
    path.join(outputDir, "companies.compact.json"),
    JSON.stringify(payload),
    "utf8"
  );

  await fs.writeFile(
    path.join(outputDir, "data-sources.json"),
    JSON.stringify(
      {
        generatedAt,
        map: {
          source: mapUrl,
          license: "BSD-3-Clause",
          note: "全国34个省级地区边界来自 ECharts 3.6.2；南海诸岛和钓鱼岛几何沿用同版本修正代码。"
        },
        companies: {
          source: payload.meta.source,
          sourceUrls: payload.meta.sourceUrls,
          note: payload.meta.caveat
        }
      },
      null,
      2
    ),
    "utf8"
  );

  process.stdout.write(
    `已写入 ${companies.length} 家；行业覆盖 ${payload.meta.industryCoverageCount} 家，主营产品覆盖 ${payload.meta.productCoverageCount} 家。\n`
  );
  process.stdout.write(
    `板块分布：${JSON.stringify(payload.summary.boardCounts)}\n`
  );

  return payload;
}

await Promise.all([buildMapData(), buildCompanyData()]);
process.stdout.write(`数据已写入 ${outputDir}\n`);
