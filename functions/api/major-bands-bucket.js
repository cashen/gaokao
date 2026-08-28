import { makeBands } from '../_lib/band-engine.js';
import { normalizeBottomLineMode } from '../_lib/bottomline-policy.js';
import { normalizeSpecialProjectMode } from '../_lib/special-project-policy.js';
import { loadMajorBandsStaticBucket } from '../_lib/major-bands-static-provider.js';
import { processMajorBandsStaticBucket } from '../_lib/major-bands-bucket-engine.js';
import { MAJOR_BANDS_BUCKET_TRANSFER_VERSION } from '../_lib/major-bands-bucket-transfer.v3972_5.js';

const CONTRACT = 'major-bands-bucket-v3972_2';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gaokao-bucket-contract': CONTRACT
    }
  });
}

function clean(value, max = 120) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(band => band.minScore)),
    max: Math.max(...all.map(band => band.maxScore))
  };
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  if (context.request.headers.get('x-gaokao-major-bands-bucket') !== CONTRACT) {
    return json({ ok: false, message: '缺少分布式分数桶调用合同。' }, 403);
  }

  try {
    const url = new URL(context.request.url);
    const candidateScore = Math.round(Number(url.searchParams.get('candidateScore')));
    const rangePreset = clean(url.searchParams.get('rangePreset') || 'standard', 20);
    const bucketFile = clean(url.searchParams.get('bucketFile') || '', 240);
    const region = clean(url.searchParams.get('region') || 'all', 30);
    const majorKeyword = clean(url.searchParams.get('majorKeyword') || '', 160);
    const bottomLineMode = normalizeBottomLineMode(url.searchParams.get('bottomLineMode') || 'all');
    const specialProjectMode = normalizeSpecialProjectMode(url.searchParams.get('specialProjectMode') || 'hide_eligibility_projects');
    const schoolFilter = url.searchParams.get('schoolFilter') === '1';
    const acceptedSchoolNames = url.searchParams.getAll('schoolName').slice(0, 32).map(value => clean(value, 160)).filter(Boolean);
    const maxCandidates = Math.max(16, Math.min(240, Math.floor(Number(url.searchParams.get('maxCandidates') || 96))));

    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }
    if (!bucketFile.startsWith('/ln-rank/data/major-bands-static-v3972_2/buckets/score_')) {
      return json({ ok: false, message: '分数桶路径格式不正确。' }, 400);
    }
    if (schoolFilter && acceptedSchoolNames.length === 0) {
      return json({ ok: false, message: '学校过滤已启用，但没有传入有效学校名称。' }, 400);
    }

    const scoreWindow = minMaxScore(makeBands(candidateScore, rangePreset));
    const loaded = await loadMajorBandsStaticBucket(context.request, bucketFile, scoreWindow, {
      assets: context.env?.ASSETS
    });
    const processed = processMajorBandsStaticBucket(loaded.records, {
      candidateScore,
      rangePreset,
      region,
      majorKeyword,
      bottomLineMode,
      specialProjectMode,
      schoolFilter,
      acceptedSchoolNames,
      maxCandidates
    });

    return json({
      ok: true,
      contract: CONTRACT,
      candidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
      architecture: 'build-time-static-score-index-single-bucket-worker',
      version: loaded.manifest.version,
      assetOwner: loaded.assetOwner,
      bucket: {
        file: loaded.bucket.file,
        minScore: loaded.bucket.minScore,
        maxScore: loaded.bucket.maxScore,
        bytes: loaded.bytes,
        rowCount: loaded.rowCount
      },
      scoreWindow: processed.scoreWindow,
      grouped: processed.grouped,
      stats: {
        rawScanned: loaded.rowCount,
        ...processed.stats
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error?.message || String(error),
      engineerHint: '单桶 Worker 只能通过 Pages ASSETS 读取发布清单中的一个五分桶，不允许组合或全量扫描。'
    }, 500);
  }
}
