(function () {
  'use strict';

  const cfg = () => window.TargetMajorPoolConfig;

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function getActiveSubject() {
    const active = document.querySelector('[data-subject].is-active') || document.querySelector('[data-subject][aria-pressed="true"]');
    return active?.dataset?.subject || 'physics';
  }

  function getTargetScoreFromPage() {
    const value = document.getElementById('targetScoreInput')?.value;
    const n = Math.round(Number(String(value || '').replace(/[^0-9.]/g, '')));
    return Number.isFinite(n) ? n : 500;
  }

  function buildScoreWindow(targetScore) {
    const score = Math.round(Number(targetScore));
    return {
      targetScore: score,
      upperScore: score + cfg().upperDelta,
      lowerScore: score - cfg().lowerDelta,
      upperRange: [score + 1, score + cfg().upperDelta],
      nearRange: [score - 10, score],
      lowerRange: [score - cfg().lowerDelta, score - 11]
    };
  }

  function classify(recordScore, targetScore) {
    const delta = recordScore - targetScore;
    if (delta >= 1 && delta <= cfg().upperDelta) return 'upper';
    if (delta <= 0 && delta >= -10) return 'near';
    if (delta <= -11 && delta >= -cfg().lowerDelta) return 'lower';
    return 'outside';
  }

  async function fetchApi(params) {
    const endpoint = cfg().apiEndpoint || '/api/target-majors';
    const url = new URL(endpoint, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && text(value) !== '') url.searchParams.set(key, value);
    });

    const res = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: { 'accept': 'application/json' }
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch (error) {
      payload = null;
    }

    if (!res.ok || !payload || payload.ok === false) {
      const msg = payload?.message || payload?.error || `专业数据接口读取失败（${res.status}）`;
      throw new Error(msg);
    }

    return payload;
  }

  async function query(options) {
    const subjectKey = options.subjectKey || getActiveSubject();
    const targetScore = Math.round(Number(options.targetScore || getTargetScoreFromPage()));

    return fetchApi({
      subject: subjectKey,
      targetScore,
      region: options.region || 'all',
      schoolKeyword: options.schoolKeyword || '',
      majorKeyword: options.majorKeyword || ''
    });
  }

  window.TargetMajorPoolEngine = {
    buildScoreWindow,
    query,
    getActiveSubject,
    getTargetScoreFromPage,
    classify
  };
})();
