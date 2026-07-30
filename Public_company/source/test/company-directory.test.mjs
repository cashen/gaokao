import assert from "node:assert/strict";
import test from "node:test";
import {
  expandCompanies,
  filterCompanies,
  getIndustryCounts,
  matchesBoard,
  paginate
} from "../public/assets/company-directory-core.js";

const companies = expandCompanies({
  companies: [
    ["600001", "辽企甲", "辽宁", "sh-main", "化工", "精细化工", "SH"],
    ["000002", "辽企乙", "辽宁", "sz-main", "装备", "工业装备", "SZ"],
    ["002003", "辽企丙", "辽宁", "sme", "装备", "专用设备", "SZ"],
    ["688004", "粤企甲", "广东", "star", "电子", "芯片设计", "SH"],
    ["300005", "粤企乙", "广东", "chinext", "软件", "工业软件", "SZ"]
  ]
});

test("主板筛选统一包含沪主板、深主板和原中小板", () => {
  assert.equal(matchesBoard(companies[0], "main"), true);
  assert.equal(matchesBoard(companies[1], "main"), true);
  assert.equal(matchesBoard(companies[2], "main"), true);
  assert.equal(matchesBoard(companies[3], "main"), false);
});

test("省份、板块、行业和搜索由同一过滤核心组合", () => {
  const result = filterCompanies({
    companies,
    province: "辽宁",
    boardFilter: "main",
    industry: "装备",
    query: "专用设备"
  });
  assert.deepEqual(result.map((company) => company.code), ["002003"]);
});

test("行业计数按数量优先并稳定排序", () => {
  assert.deepEqual(getIndustryCounts(companies.slice(0, 3)), [
    ["装备", 2],
    ["化工", 1]
  ]);
});

test("分页会限制页码并且不无限追加", () => {
  const firstPage = paginate(companies, 1, 2);
  const lastPage = paginate(companies, 99, 2);
  assert.equal(firstPage.items.length, 2);
  assert.equal(firstPage.pageCount, 3);
  assert.equal(lastPage.page, 3);
  assert.equal(lastPage.items.length, 1);
  assert.equal(lastPage.hasNext, false);
});
