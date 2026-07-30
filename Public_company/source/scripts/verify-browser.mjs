import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const currentFile = fileURLToPath(import.meta.url);
const sourceRoot = path.resolve(path.dirname(currentFile), "..");
const viteCli = path.join(sourceRoot, "node_modules", "vite", "bin", "vite.js");
const baseUrl = "http://127.0.0.1:4173";

const preview = spawn(
  process.execPath,
  [viteCli, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    cwd: sourceRoot,
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let previewOutput = "";
preview.stdout.on("data", (chunk) => {
  previewOutput += chunk;
});
preview.stderr.on("data", (chunk) => {
  previewOutput += chunk;
});

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (preview.exitCode !== null) {
      throw new Error(`预览服务提前退出：\n${previewOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // 预览服务仍在启动。
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`预览服务未在规定时间内启动：\n${previewOutput}`);
}

let browser;

try {
  await waitForPreview();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const browserErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#totalMetric").waitFor({ state: "visible" });

  assert.equal(await page.locator("#totalMetric").textContent(), "5,522");
  assert.equal(await page.locator("path.province-shape").count(), 35);
  assert.equal(await page.locator("#provinceTitle").textContent(), "辽宁省");
  assert.equal(await page.locator("#provinceCount").textContent(), "84");

  await page.getByRole("button", { name: "科创板604", exact: true }).click();
  assert.equal(await page.locator("#totalMetric").textContent(), "604");

  await page
    .getByRole("button", { name: "广东省，科创板95家", exact: true })
    .click();
  assert.equal(await page.locator("#provinceTitle").textContent(), "广东省");
  assert.equal(await page.locator("#provinceCount").textContent(), "95");

  await page.getByRole("searchbox", { name: "搜索当前省份的企业" }).fill("688007");
  assert.equal(await page.locator("#companyResultCount").textContent(), "找到 1 家");
  assert.equal(await page.locator(".company-card").count(), 1);
  assert.equal(await page.locator(".company-code").textContent(), "688007");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  assert.ok(overflow <= 1, `移动端出现横向溢出：${overflow}px`);
  assert.equal(await page.locator("#totalMetric").textContent(), "5,522");
  assert.deepEqual(browserErrors, []);

  process.stdout.write(
    `${JSON.stringify(
      {
        totalCompanies: 5522,
        mapFeatures: 35,
        starCompanies: 604,
        guangdongStarCompanies: 95,
        searchCode: "688007",
        mobileOverflow: overflow,
        browserErrors
      },
      null,
      2
    )}\n`
  );
} finally {
  await browser?.close();
  preview.kill("SIGTERM");
}
