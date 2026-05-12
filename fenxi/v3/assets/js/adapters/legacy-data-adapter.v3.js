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
    // RC4: align V3 data loading with old fenxi window logic.
    // Use rank * [0.84, 1.45] in normal mode, instead of only previous/current/next chunk.
    var n = toNumber(rank);
    if (!chunks || !chunks.length || !n) return [];
    var model = 'normal';
    try {
      var st = window.LN_V3_STORE ? window.LN_V3_STORE.getState() : {};
      model = (st.rank && st.rank.model) || (st.scenario && st.scenario.model) || 'normal';
    } catch (err) {}
    var pair = model === 'bold' ? [0.78, 1.42] : model === 'safe' ? [0.90, 1.55] : [0.84, 1.45];
    var minR = Math.max(0, Math.floor(n * pair[0]));
    var maxR = Math.ceil(n * pair[1]);
    return chunks.filter(function (c) {
      return !(toNumber(c.maxRank) < minR || toNumber(c.minRank) > maxR);
    });
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
  function checkRankScoreConsistency(input) {
    input = input || {};
    var rank = toNumber(input.rank);
    var score = toNumber(input.score);
    var base = {
      ok: true,
      status: 'ok',
      rawRank: rank || '',
      rawScore: score || '',
      effectiveRank: rank || '',
      effectiveScore: score || '',
      expectedRankByScore: '',
      deltaRank: 0,
      tolerance: 0,
      message: ''
    };
    if (!rank && !score) {
      base.ok = false;
      base.status = 'empty';
      base.message = '请先输入位次或分数。';
      return Promise.resolve(base);
    }
    if (rank && !score) {
      base.status = 'rank-only';
      base.message = '已按位次 ' + rank + ' 作为有效输入。';
      return Promise.resolve(base);
    }
    if (!rank && score) {
      return resolveRankByScore(score).then(function (resolved) {
        base.status = 'score-only';
        base.effectiveRank = resolved.rank || '';
        base.effectiveScore = score;
        base.expectedRankByScore = resolved.rank || '';
        base.message = resolved.rank ? ('已按 ' + score + ' 分换算参考位次 ' + resolved.rank + '。') : '未能根据分数换算位次。';
        base.ok = !!resolved.rank;
        if (!base.ok) base.status = 'score-unresolved';
        return base;
      });
    }
    return resolveRankByScore(score).then(function (resolved) {
      var expected = toNumber(resolved.rank);
      var delta = expected ? Math.abs(rank - expected) : 0;
      var tolerance = expected ? Math.max(1500, Math.round(expected * 0.08)) : 0;
      base.expectedRankByScore = expected || '';
      base.deltaRank = delta;
      base.tolerance = tolerance;
      base.effectiveRank = rank;
      base.effectiveScore = score;
      if (!expected) {
        base.ok = false;
        base.status = 'score-unresolved';
        base.message = '未能根据 ' + score + ' 分换算位次，请只填位次或重新输入。';
      } else if (delta > tolerance) {
        base.ok = false;
        base.status = 'conflict';
        base.effectiveRank = '';
        base.effectiveScore = '';
        base.message = '你输入的分数 ' + score + ' 和位次 ' + rank + ' 明显不匹配。按 2025 辽宁物理类一分一段，' + score + ' 分约对应位次 ' + expected + '，两者相差 ' + delta + ' 位。请确认后再继续。';
      } else {
        base.status = 'consistent';
        base.message = '分数和位次基本一致，系统以位次 ' + rank + ' 为准。';
      }
      return base;
    });
  }

  function loadForRankOrScore(input) {
    input = input || {};
    var rank = toNumber(input.rank);
    var score = toNumber(input.score);
    return checkRankScoreConsistency(input).then(function (guard) {
      if (!guard.ok) throw new Error(guard.message || '分数和位次需要重新确认');
      var effectiveRank = toNumber(guard.effectiveRank || rank);
      if (effectiveRank) {
        return loadForRank(effectiveRank, { source: rank ? 'rank' : 'score' }).then(function (res) {
          res.resolvedRankSource = rank ? '用户输入位次' : ('2025辽宁物理类一分一段：' + score + '分');
          res.score = score || '';
          res.inputConsistency = guard;
          return res;
        });
      }
      return Promise.reject(new Error('请先输入位次或分数'));
    });
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
        note: 'RC4 使用旧版 fenxi 位次窗口加载数据；家庭端不展示分块和调试样例。'
      };
    },
    resolveRankByScore: resolveRankByScore,
    checkRankScoreConsistency: checkRankScoreConsistency,
    loadForRank: loadForRank,
    loadForRankOrScore: loadForRankOrScore,
    ensureFromStore: ensureFromStore,
    _selectWindowChunks: selectWindowChunks
  };
})();
