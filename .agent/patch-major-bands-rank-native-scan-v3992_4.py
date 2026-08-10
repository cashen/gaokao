from pathlib import Path
import re

static_path = Path('functions/_lib/major-bands-static-provider.js')
workflow_path = Path('.github/workflows/verify-production-resource-graph-v3972_6.yml')
verifier_path = Path('tools/verify-major-bands-rank-native-scan-v3990_1.mjs')

static = static_path.read_text(encoding='utf-8')
workflow = workflow_path.read_text(encoding='utf-8')

const_anchor = "export const MAJOR_BANDS_RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_1';"
if static.count(const_anchor) != 1:
    raise SystemExit(f'constant anchor count {static.count(const_anchor)}')
static = static.replace(
    const_anchor,
    const_anchor + "\nexport const MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION = 'major-bands-rank-row-native-scan-v3990_1';",
    1
)

fetch_pattern = r"async function fetchStaticJson\(request, pathname, options = \{\}\) \{.*?\n\}\n\nexport async function loadMajorBandsStaticManifest"
fetch_replacement = r'''async function fetchStaticResponse(request, pathname, options = {}) {
  const url = `${origin(request)}${pathname}`;
  const assetRequest = new Request(url, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });
  const owner = hasPagesAssets(options) ? 'pages-assets-binding' : 'same-origin-fallback';
  const response = hasPagesAssets(options)
    ? await options.assets.fetch(assetRequest)
    : await fetch(assetRequest, {
      cf: { cacheTtl: 300, cacheEverything: false }
    });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok) throw new Error(`静态专业分数索引读取失败：${pathname}，HTTP ${response.status}，owner=${owner}`);
  if (contentType.includes('text/html')) throw new Error(`静态专业分数索引返回 HTML：${pathname}，owner=${owner}`);
  return { response, owner };
}

async function fetchStaticJson(request, pathname, options = {}) {
  const { response, owner } = await fetchStaticResponse(request, pathname, options);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`静态专业分数索引 JSON 解析失败：${pathname}，owner=${owner}。${error?.message || String(error)}`);
  }
}

export async function loadMajorBandsStaticManifest'''
static2, count = re.subn(fetch_pattern, fetch_replacement, static, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'fetch helper replacement count {count}')
static = static2

scan_anchor = "export async function loadMajorBandsStaticRankBucket(request, bucketFile, options = {}) {"
if static.count(scan_anchor) != 1:
    raise SystemExit(f'rank loader anchor count {static.count(scan_anchor)}')
scan_code = r'''function findStaticRowsArrayStart(text) {
  const match = /"rows"\s*:\s*\[/.exec(String(text || ''));
  return match ? match.index + match[0].lastIndexOf('[') : -1;
}

export function scanMajorBandsStaticRankRowsText(text, options = {}) {
  const source = String(text || '');
  const rowsStart = findStaticRowsArrayStart(source);
  if (rowsStart < 0) throw new Error('静态专业位次桶 rows 数组不存在');
  const prefix = source.slice(0, rowsStart);
  const versionMatch = /"version"\s*:\s*"([^"]+)"/.exec(prefix);
  const version = versionMatch?.[1] || '';
  const expectedVersion = String(options.expectedVersion || '');
  if (expectedVersion && version !== expectedVersion) {
    throw new Error(`静态专业位次桶版本异常：${version || 'unknown'}`);
  }

  const rankIndex = Number.isInteger(options.rankIndex) ? options.rankIndex : -1;
  const idIndex = Number.isInteger(options.idIndex) ? options.idIndex : -1;
  const rankRange = options.rankRange && Number.isFinite(Number(options.rankRange.minRank)) && Number.isFinite(Number(options.rankRange.maxRank))
    ? Object.freeze({ minRank: Number(options.rankRange.minRank), maxRank: Number(options.rankRange.maxRank) })
    : null;
  const allowedIds = options.allowedIds instanceof Set ? options.allowedIds : null;
  const rows = [];
  let rowCount = 0;
  let rankMatchedCount = 0;
  let cursor = rowsStart + 1;
  let ended = false;

  while (cursor < source.length) {
    while (cursor < source.length && (/\s/.test(source[cursor]) || source[cursor] === ',')) cursor += 1;
    if (cursor >= source.length) break;
    if (source[cursor] === ']') {
      cursor += 1;
      ended = true;
      break;
    }
    if (source[cursor] !== '[') {
      throw new Error(`静态专业位次桶 row 必须是数组：${JSON.stringify(source[cursor])}`);
    }

    const start = cursor;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '[' || char === '{') depth += 1;
      else if (char === ']' || char === '}') {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          break;
        }
        if (depth < 0) throw new Error('静态专业位次桶 row 容器深度异常');
      }
    }
    if (depth !== 0 || inString) throw new Error('静态专业位次桶 row 未完整结束');

    const row = JSON.parse(source.slice(start, cursor));
    if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');
    rowCount += 1;
    const rankMatch = rankRange && rankIndex >= 0
      ? majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange)
      : true;
    if (!rankMatch) continue;
    rankMatchedCount += 1;
    if (allowedIds && idIndex >= 0 && !allowedIds.has(String(row?.[idIndex] || ''))) continue;
    rows.push(row);
  }

  if (!ended) throw new Error('静态专业位次桶 rows 数组未完整结束');
  const expectedRecordCount = Math.max(0, Number(options.expectedRecordCount || 0));
  if (expectedRecordCount && rowCount !== expectedRecordCount) {
    throw new Error(`静态专业位次桶记录数异常：${rowCount}/${expectedRecordCount}`);
  }
  const suffix = source.slice(cursor).trim();
  if (!suffix.endsWith('}')) throw new Error('静态专业位次桶外层 JSON 未完整结束');
  return {
    version,
    rows,
    rowCount,
    rankMatchedCount,
    mode: 'native-row-text-scan',
    scanVersion: MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION
  };
}

'''
static = static.replace(scan_anchor, scan_code + scan_anchor, 1)

loader_pattern = r"export async function loadMajorBandsStaticRankBucket\(request, bucketFile, options = \{\}\) \{.*?\n\}\n\n/\*\* Compatibility helper"
loader_replacement = r'''export async function loadMajorBandsStaticRankBucket(request, bucketFile, options = {}) {
  const manifest = await loadMajorBandsStaticManifest(request, options);
  const bucket = (manifest.buckets || []).find(item => item.file === bucketFile);
  if (!bucket) throw new Error(`静态专业分数桶不在发布清单中：${bucketFile || 'empty'}`);
  const { response, owner } = await fetchStaticResponse(request, bucket.file, options);
  const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
  const rankIndex = schema.indexOf('rank2026');
  const idIndex = schema.indexOf('id');
  const rankRange = options.rankRange && Number.isFinite(Number(options.rankRange.minRank)) && Number.isFinite(Number(options.rankRange.maxRank))
    ? Object.freeze({
        minRank: Number(options.rankRange.minRank),
        maxRank: Number(options.rankRange.maxRank)
      })
    : null;
  const allowedIds = options.allowedIds instanceof Set ? options.allowedIds : null;
  const text = await response.text();
  const scan = scanMajorBandsStaticRankRowsText(text, {
    expectedVersion: manifest.version,
    expectedRecordCount: Number(bucket.recordCount || 0),
    rankIndex,
    idIndex,
    rankRange,
    allowedIds
  });
  const selectedRows = scan.rows;
  const projectionVersion = options.projection === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    : 'full-record-v3990_1';
  const projectionSchema = projectionVersion === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    ? buildMajorBandsRankOrderProjectionSchema(schema)
    : null;
  const records = projectionSchema
    ? selectedRows.map(row => decodeMajorBandsRankOrderRow(row, projectionSchema, {
        rawRowStorage: options.rawRowStorage
      }))
    : selectedRows.map(row => decodeRow(row, schema));
  return {
    manifest,
    bucket,
    records,
    projectionVersion,
    minimalProjection: projectionVersion === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
    rawRowStorage: projectionSchema
      ? (options.rawRowStorage === 'serialized-json' ? 'serialized-json' : 'array-reference')
      : 'full-record',
    rowCount: scan.rowCount,
    decodedRowCount: selectedRows.length,
    rankRowsSkipped: scan.rowCount - selectedRows.length,
    pageIdRowsSkipped: scan.rankMatchedCount - selectedRows.length,
    pageIdFilterCount: allowedIds?.size || 0,
    pageIdFilterVersion: 'major-bands-page-id-predecode-filter-v3990_1',
    rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
    rowScanVersion: scan.scanVersion,
    rowScanMode: scan.mode,
    rankRange,
    bytes: Number(bucket.bytes || 0),
    assetOwner: owner
  };
}

/** Compatibility helper'''
static2, count = re.subn(loader_pattern, loader_replacement, static, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'rank loader replacement count {count}')
static = static2
static_path.write_text(static, encoding='utf-8')

verifier = r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION,
  majorBandsRankValueMatchesRange,
  scanMajorBandsStaticRankRowsText
} from '../functions/_lib/major-bands-static-provider.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
const rankIndex = schema.indexOf('rank2026');
const idIndex = schema.indexOf('id');
assert.ok(rankIndex >= 0 && idIndex >= 0, 'rank/id schema indexes missing');
assert.equal(MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION, 'major-bands-rank-row-native-scan-v3990_1');

const selectiveRange = Object.freeze({ minRank: 25000, maxRank: 65000 });
let total = 0;
let selectiveTruth = 0;
let selectiveScanned = 0;
let allowedTruth = 0;
let allowedScanned = 0;

for (const bucket of manifest.buckets || []) {
  const path = `.${bucket.file}`;
  const text = fs.readFileSync(path, 'utf8');
  const payload = JSON.parse(text);
  assert.equal(payload.version, manifest.version, `${bucket.file}: legacy version`);
  assert.equal(payload.rows.length, Number(bucket.recordCount), `${bucket.file}: legacy count`);

  const all = scanMajorBandsStaticRankRowsText(text, {
    expectedVersion: manifest.version,
    expectedRecordCount: Number(bucket.recordCount),
    rankIndex,
    idIndex
  });
  assert.equal(all.mode, 'native-row-text-scan', `${bucket.file}: scan mode`);
  assert.equal(all.scanVersion, MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION, `${bucket.file}: scan version`);
  assert.equal(all.rowCount, payload.rows.length, `${bucket.file}: scan count`);
  assert.deepEqual(all.rows, payload.rows, `${bucket.file}: full truth mismatch`);
  total += all.rowCount;

  const rankTruth = payload.rows.filter(row => majorBandsRankValueMatchesRange(row?.[rankIndex], selectiveRange));
  const allowedIds = new Set(rankTruth.filter((_, index) => index % 3 === 0).map(row => String(row?.[idIndex] || '')));
  const allowedRowsTruth = rankTruth.filter(row => allowedIds.has(String(row?.[idIndex] || '')));
  const selective = scanMajorBandsStaticRankRowsText(text, {
    expectedVersion: manifest.version,
    expectedRecordCount: Number(bucket.recordCount),
    rankIndex,
    idIndex,
    rankRange: selectiveRange,
    allowedIds
  });
  assert.equal(selective.rankMatchedCount, rankTruth.length, `${bucket.file}: rank truth count`);
  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  selectiveTruth += rankTruth.length;
  selectiveScanned += selective.rankMatchedCount;
  allowedTruth += allowedRowsTruth.length;
  allowedScanned += selective.rows.length;
}

assert.equal(total, Number(manifest.recordCount), 'full manifest record total');
assert.equal(selectiveScanned, selectiveTruth, 'selective rank truth total');
assert.equal(allowedScanned, allowedTruth, 'selective allowed-ID truth total');
assert.throws(() => scanMajorBandsStaticRankRowsText('{"version":"major-bands-static-v3972_2","rows":[]}', {
  expectedVersion: manifest.version,
  expectedRecordCount: 1,
  rankIndex,
  idIndex
}), /记录数异常/);

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION,
  manifestRecords: total,
  selectiveRankRows: selectiveTruth,
  allowedRows: allowedTruth,
  fullTruthEqual: true,
  selectiveTruthEqual: true,
  wholeBucketResponseJsonRequired: false
}, null, 2));
'''
verifier_path.write_text(verifier, encoding='utf-8')

if "  checks: read\n" not in workflow:
    workflow = workflow.replace("permissions:\n  contents: read\n", "permissions:\n  contents: read\n  checks: read\n  issues: read\n", 1)

path_anchor = "      - 'tools/verify-major-bands-preview-concurrency-v3990_1.mjs'\n"
if workflow.count(path_anchor) != 1:
    raise SystemExit(f'workflow path anchor count {workflow.count(path_anchor)}')
workflow = workflow.replace(path_anchor, path_anchor + "      - 'tools/verify-major-bands-rank-native-scan-v3990_1.mjs'\n", 1)

check_anchor = "          node --check tools/verify-major-bands-preview-concurrency-v3990_1.mjs\n"
if workflow.count(check_anchor) != 1:
    raise SystemExit(f'workflow check anchor count {workflow.count(check_anchor)}')
workflow = workflow.replace(check_anchor, check_anchor + "          node --check tools/verify-major-bands-rank-native-scan-v3990_1.mjs\n", 1)

run_anchor = "          node /tmp/audit-production-rank-concurrency-contract-v3990_1.mjs | tee /tmp/v3990-1-production-rank-concurrency-contract.out\n"
if workflow.count(run_anchor) != 1:
    raise SystemExit(f'workflow run anchor count {workflow.count(run_anchor)}')
workflow = workflow.replace(run_anchor, run_anchor + "          node tools/verify-major-bands-rank-native-scan-v3990_1.mjs | tee /tmp/v3990-1-production-rank-native-scan.out\n", 1)

job_anchor = "  production-graph:\n"
if workflow.count(job_anchor) != 1:
    raise SystemExit(f'workflow production job anchor count {workflow.count(job_anchor)}')
preview_job = r'''  preview-concurrency:
    if: github.event_name == 'pull_request'
    needs: source-contract
    runs-on: ubuntu-latest
    timeout-minutes: 35
    env:
      EXPECTED_SHA: ${{ github.event.pull_request.head.sha }}
      PR_NUMBER: ${{ github.event.pull_request.number }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 1
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Resolve exact-SHA Cloudflare branch Preview
        id: resolve-preview
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPOSITORY: ${{ github.repository }}
        shell: bash
        run: |
          set -euo pipefail
          branch_preview=''
          immutable_preview=''
          short_sha="${EXPECTED_SHA:0:7}"
          for attempt in $(seq 1 70); do
            checks="$(curl -fsSL --max-time 20 \
              -H 'Accept: application/vnd.github+json' \
              -H "Authorization: Bearer ${GH_TOKEN}" \
              -H 'X-GitHub-Api-Version: 2022-11-28' \
              "https://api.github.com/repos/${GH_REPOSITORY}/commits/${EXPECTED_SHA}/check-runs?per_page=100" || true)"
            conclusion="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].conclusion // empty' <<<"$checks" 2>/dev/null || true)"
            summary="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].output.summary // empty' <<<"$checks" 2>/dev/null || true)"
            if [ "$conclusion" = failure ] || [ "$conclusion" = cancelled ]; then
              echo "Cloudflare exact-SHA Check failed for ${EXPECTED_SHA}." >&2
              exit 2
            fi
            if [ "$conclusion" = success ]; then
              immutable_preview="$(grep -Eo 'https://[A-Za-z0-9-]+\.gaokao-4y9\.pages\.dev' <<<"$summary" | head -n1 || true)"
              comments="$(curl -fsSL --max-time 20 \
                -H 'Accept: application/vnd.github+json' \
                -H "Authorization: Bearer ${GH_TOKEN}" \
                -H 'X-GitHub-Api-Version: 2022-11-28' \
                "https://api.github.com/repos/${GH_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" || true)"
              cloudflare_body="$(jq -r '[.[]? | select(.user.login == "cloudflare-workers-and-pages[bot]")][-1].body // empty' <<<"$comments" 2>/dev/null || true)"
              if grep -q "$short_sha" <<<"$cloudflare_body"; then
                branch_preview="$(grep -Eo 'https://[A-Za-z0-9-]+\.gaokao-4y9\.pages\.dev' <<<"$cloudflare_body" | tail -n1 || true)"
              fi
              if [ -n "$immutable_preview" ] && [ -n "$branch_preview" ]; then break; fi
            fi
            sleep 8
          done
          test -n "$immutable_preview"
          test -n "$branch_preview"
          echo "immutable_preview=$immutable_preview" >> "$GITHUB_OUTPUT"
          echo "preview_base=$branch_preview" >> "$GITHUB_OUTPUT"
          echo "Exact deployment: $immutable_preview"
          echo "Functions branch preview: $branch_preview"
      - name: Verify exact-SHA Preview rank-kernel concurrency budget
        env:
          TARGET_BASE: ${{ steps.resolve-preview.outputs.preview_base }}
          CONCURRENCY_LEVELS: 1,5,10,25,50
          CONCURRENCY_WAVES: '2'
          COLD_HARD_LIMIT_MS: '15000'
          P95_LIMIT_MS: '8000'
          P99_LIMIT_MS: '15000'
          HARD_LIMIT_MS: '25000'
          MAJOR_BANDS_CONCURRENCY_EVIDENCE: /tmp/v3990-1-preview-major-bands-concurrency.json
        run: node tools/verify-major-bands-preview-concurrency-v3990_1.mjs
      - name: Upload Preview concurrency evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: v3990-1-preview-major-bands-concurrency
          path: /tmp/v3990-1-preview-major-bands-concurrency.json
          if-no-files-found: warn
          retention-days: 7

'''
workflow = workflow.replace(job_anchor, preview_job + job_anchor, 1)
workflow_path.write_text(workflow, encoding='utf-8')

print('patched native rank row scan, full-truth verifier, and PR Preview concurrency gate')
