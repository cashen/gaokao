(function () {
  'use strict';
  var MANIFEST_URL = '/fenxi/data/manifest.json';
  var RANK_URL = '/fenxi/data/rank_2025_physics.json';
  var manifestCache = null;
  var rankCache = null;
  var chunkCache = Object.create(null);
  var lastLoad = null;

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function toNumber(value) {
    if (value === null || value === undefined) return 0;
    var n = Number(String(value).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function baseUrl(file) {
    if (!file) return '';
    if (/^https?:\/\//.test(file) || file.charAt(0) === '/') return file;
    return '/fenxi/' + file.replace(/^\.\//, '');
  }
  function fetchJson(url, retried) {
    return fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(function (res) {
      if (res.status === 401 && !retried && window.LN_V3_ACCESS && window.LN_V3_ACCESS.ensureServerSession) {
        return window.LN_V3_ACCESS.ensureServerSession().then(function () { return fetchJson(url, true); });
      }
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
      return res.json();
    });
  }
  function getManifest() {
    if (manifestCache) return Promise.resolve(manifestCache);
    return fetchJson(MANIFEST_URL).then(function (data) {
      manifestCache = data || { chunks: [] };
      return manifestCache;
    });
  }
  function getRankTable() {
    if (rankCache) return Promise.resolve(rankCache);
    return fetchJson(RANK_URL).then(function (data) {
      rankCache = data || {};
      return rankCache;
    });
  }
  function resolveRankByScore(score) {
    var s = String(toNumber(score));
    if (!s || s === '0') return Promise.resolve({ rank: 0, source: '' });
    return getRankTable().then(function (table) {
      var exact = toNumber(table[s]);
      if (exact) return { rank: exact, source: '2025辽宁物理类一分一段：' + s + '分' };
      var scores = Object.keys(table || {}).map(Number).filter(Number.isFinite).sort(function (a, b) { return b - a; });
      var fallback = scores.find(function (item) { return item <= Number(s); });
      if (fallback) return { rank: toNumber(table[String(fallback)]), source: '2025辽宁物理类一分一段：按接近分数 ' + fallback + ' 分估算' };
      return { rank: 0, source: '未找到对应分数位次' };
    });
  }
  function findCenterIndex(chunks, rank) {
    var n = toNumber(rank);
    for (var i = 0; i < chunks.length; i += 1) {
      var c = chunks[i];
      if (n >= toNumber(c.minRank) && n < toNumber(c.maxRank)) return i;
    }
    return chunks.length ? chunks.length - 1 : -1;
  }
  function selectWindowChunks(chunks, rank) {
    var idx = findCenterIndex(chunks, rank);
    if (idx < 0) return [];
    var picked = [];
    [idx - 1, idx, idx + 1].forEach(function (i) {
      if (i >= 0 && i < chunks.length && picked.indexOf(i) === -1) picked.push(i);
    });
    return picked.map(function (i) { return chunks[i]; });
  }
  function loadChunk(chunk) {
    var id = chunk.id || chunk.file;
    if (chunkCache[id]) return Promise.resolve(chunkCache[id]);
    return fetchJson(baseUrl(chunk.file)).then(function (data) {
      var records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
      var payload = { id: id, meta: chunk, records: records };
      chunkCache[id] = payload;
      return payload;
    });
  }
  function summarizeRecords(records, rank) {
    var target = toNumber(rank);
    var sample = records
      .filter(function (item) { return item && item.rank2025; })
      .sort(function (a, b) { return Math.abs(toNumber(a.rank2025) - target) - Math.abs(toNumber(b.rank2025) - target); })
      .slice(0, 5)
      .map(function (item) {
        return {
          school: item.school || '',
          major: item.major || '',
          score2025: item.score2025 || '',
          rank2025: item.rank2025 || '',
          lnArea: item.lnArea || '',
          schoolNatureLabel: item.schoolNatureLabel || ''
        };
      });
    return sample;
  }
  function loadForRank(rank, options) {
    var started = now();
    var numericRank = toNumber(rank);
    return getManifest().then(function (manifest) {
      var chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
      var selected = selectWindowChunks(chunks, numericRank);
      return Promise.all(selected.map(loadChunk)).then(function (loaded) {
        var records = [];
        loaded.forEach(function (chunk) { records = records.concat(chunk.records || []); });
        window.LN_V3_DATA_CACHE = {
          rank: numericRank,
          records: records,
          chunks: selected.map(function (chunk) { return chunk.id || chunk.file; }),
          loadedAt: new Date().toISOString(),
          manifestVersion: manifest.version || ''
        };
        lastLoad = {
          ok: true,
          rank: numericRank,
          loadedRows: records.length,
          chunkIds: selected.map(function (chunk) { return chunk.id || chunk.file; }),
          chunkCount: selected.length,
          manifestVersion: manifest.version || '',
          totalRecords: manifest.totalRecords || 0,
          bothCount: manifest.bothCount || 0,
          sample: summarizeRecords(records, numericRank),
          ms: Math.round(now() - started),
          source: (options && options.source) || 'rank'
        };
        return lastLoad;
      });
    });
  }
  function loadForRankOrScore(input) {
    input = input || {};
    var rank = toNumber(input.rank);
    var score = toNumber(input.score);
    if (rank) return loadForRank(rank, { source: 'rank' }).then(function (res) { res.resolvedRankSource = '用户输入位次'; return res; });
    if (score) {
      return resolveRankByScore(score).then(function (resolved) {
        if (!resolved.rank) throw new Error('未能根据分数换算位次');
        return loadForRank(resolved.rank, { source: 'score' }).then(function (res) {
          res.resolvedRankSource = resolved.source;
          res.score = score;
          return res;
        });
      });
    }
    return Promise.reject(new Error('请先输入位次或分数'));
  }

  function ensureFromStore(options) {
    options = options || {};
    var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
    var rankState = state.rank || {};
    var cache = window.LN_V3_DATA_CACHE || {};
    if (Array.isArray(cache.records) && cache.records.length) {
      return Promise.resolve({ ok: true, hydrated: true, fromCache: true, loadedRows: cache.records.length, chunkIds: cache.chunks || [] });
    }
    var hasStoredRank = toNumber(rankState.rank) || toNumber(rankState.score);
    if (!hasStoredRank) {
      return Promise.resolve({ ok: false, hydrated: false, reason: 'no-rank-in-store' });
    }
    return loadForRankOrScore({ rank: rankState.rank, score: rankState.score }).then(function (res) {
      if (!options.silent && window.LN_V3_STORE) {
        window.LN_V3_STORE.setState({
          rank: {
            loadedRows: res.loadedRows,
            chunkIds: res.chunkIds,
            chunkCount: res.chunkCount,
            loadMs: res.ms,
            loadedAt: new Date().toISOString(),
            rankSource: res.resolvedRankSource || rankState.rankSource || '',
            sample: res.sample || []
          },
          compute: { waitDataMs: res.ms, lastReason: 'v3-debug-data-hydrate' }
        }, 'legacy-data:ensureFromStore');
      }
      return { ok: true, hydrated: true, fromCache: false, loadedRows: res.loadedRows, chunkIds: res.chunkIds, ms: res.ms };
    }).catch(function (err) {
      return { ok: false, hydrated: false, reason: err && err.message ? err.message : String(err) };
    });
  }

  window.LN_V3_LEGACY_DATA = {
    status: function () {
      var cache = window.LN_V3_DATA_CACHE || {};
      var state = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
      var rankState = state.rank || {};
      var rawRows = Array.isArray(cache.records) ? cache.records.length : 0;
      var storeRows = Number(rankState.loadedRows || 0);
      return {
        loadedRows: rawRows,
        storeLoadedRows: storeRows,
        chunkIds: cache.chunks || [],
        storeChunkIds: rankState.chunkIds || [],
        hasLegacyData: Array.isArray(cache.records),
        cacheHydrated: rawRows > 0 || !storeRows,
        needsHydration: storeRows > 0 && rawRows === 0,
        lastLoad: lastLoad,
        note: 'alpha3.fix1 已同步服务器会话并支持 debug 数据水合；Step2 只做家庭底线预览，暂不触发旧 compute 主链路。'
      };
    },
    resolveRankByScore: resolveRankByScore,
    loadForRank: loadForRank,
    loadForRankOrScore: loadForRankOrScore,
    ensureFromStore: ensureFromStore,
    _selectWindowChunks: selectWindowChunks
  };
})();
