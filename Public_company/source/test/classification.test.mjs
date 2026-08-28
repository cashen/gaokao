import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDirection,
  classifyBoard,
  isActiveSecurity,
  matchesBoardFilter,
  normalizeCompanyName,
  normalizeProvince
} from "../scripts/lib.mjs";

test("正确识别沪深京主要上市板块", () => {
  assert.equal(classifyBoard("600000"), "sh-main");
  assert.equal(classifyBoard("688001"), "star");
  assert.equal(classifyBoard("000001"), "sz-main");
  assert.equal(classifyBoard("002001"), "sme");
  assert.equal(classifyBoard("300001"), "chinext");
  assert.equal(classifyBoard("430001"), "bse");
  assert.equal(classifyBoard("830001"), "bse");
  assert.equal(classifyBoard("920001"), "bse");
});

test("主板筛选包含原中小板", () => {
  assert.equal(matchesBoardFilter("sh-main", "main"), true);
  assert.equal(matchesBoardFilter("sz-main", "main"), true);
  assert.equal(matchesBoardFilter("sme", "main"), true);
  assert.equal(matchesBoardFilter("star", "main"), false);
});

test("地区板块归一成省级名称", () => {
  assert.equal(normalizeProvince("辽宁板块"), "辽宁");
  assert.equal(normalizeProvince("内蒙古板块"), "内蒙古");
  assert.equal(normalizeProvince("广西壮族自治区"), "广西");
  assert.equal(normalizeProvince("-"), "未知");
});

test("证券简称清除行情排版空格", () => {
  assert.equal(normalizeCompanyName("万  科Ａ"), "万科A");
});

test("排除退市和缺少行业地区的证券", () => {
  assert.equal(
    isActiveSecurity({
      f12: "000001",
      f14: "平安银行",
      f100: "银行",
      f102: "广东板块"
    }),
    true
  );
  assert.equal(
    isActiveSecurity({
      f12: "000004",
      f14: "国华退",
      f100: "-",
      f102: "-"
    }),
    false
  );
});

test("经营方向优先使用有限数量的概念标签", () => {
  assert.equal(
    buildDirection("电池", "锂电池概念,新能源车,储能概念,钠离子电池,第五项"),
    "锂电池概念、新能源车、储能概念、钠离子电池"
  );
  assert.equal(buildDirection("银行", "-"), "银行");
});
