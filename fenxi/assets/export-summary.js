/* v2.8 导出结果摘要图
 * 用法：
 * 1. 页面引入 export-summary.css 和 export-summary.js
 * 2. 在结果按钮处调用：
 *    ZYExportSummary.mountExportSummaryButton({
 *      container: '#exportActions',
 *      getFormState: () => formState,
 *      getResults: () => filteredResults,
 *      version: 'v2.8'
 *    });
 * 3. 或直接调用：
 *    ZYExportSummary.exportSummaryAsPng(formState, filteredResults, { version: 'v2.8' });
 */
(function () {
  'use strict';

  const DEFAULT_MAX_ITEMS = 8;
  const HTML2CANVAS_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

  function text(value, fallback = '未填写') {
    if (value === null || value === undefined) return fallback;
    const s = String(value).trim();
    return s ? s : fallback;
  }

  function firstNonEmpty(...values) {
    for (const v of values) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) && v.length > 0) return v;
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'boolean') return v;
      if (v && typeof v === 'object' && Object.keys(v).length > 0) return v;
    }
    return undefined;
  }

  function arr(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
      return value
        .split(/[、,，/|\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  function formatDateTime(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  function formatDateCompact(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  function createEl(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined && content !== null) el.textContent = String(content);
    return el;
  }

  function append(parent, child) {
    if (child) parent.appendChild(child);
    return child;
  }

  function normalizeLevel(rawLevel, item) {
    const s = text(firstNonEmpty(rawLevel, item && item._level, item && item.riskLevel, item && item.tag, item && item.category), '参考');
    if (/超冲|可冲|冲|冲刺/.test(s)) return '冲';
    if (/匹配|稳妥|稳/.test(s)) return '稳';
    if (/保底|保/.test(s)) return '保';
    if (/过低|险|风险|慎/.test(s)) return '风险';
    return s === '参考' ? '参考' : s.slice(0, 4);
  }

  function levelClass(level) {
    if (level === '冲') return 'zxy-export-level-chong';
    if (level === '稳') return 'zxy-export-level-wen';
    if (level === '保') return 'zxy-export-level-bao';
    if (level === '风险') return 'zxy-export-level-risk';
    return 'zxy-export-level-ref';
  }

  function getSchoolName(item) {
    return text(firstNonEmpty(item.schoolName, item.school, item.university, item.collegeName, item.name), '未命名院校');
  }

  function getMajorName(item) {
    return text(firstNonEmpty(item.majorName, item.major, item.profession, item.specialty, item.groupName), '未填写专业');
  }

  function getNature(item) {
    return text(firstNonEmpty(item.schoolNature && item.schoolNature.label, item.schoolNature, item.nature, item.ownership, item.isPublic === true ? '公办' : undefined), '');
  }

  function hasRisk(item) {
    return !!firstNonEmpty(item.hasRisk, item.risk, item.riskFlag, Array.isArray(item.riskFlags) && item.riskFlags.length ? item.riskFlags.join('；') : undefined) || /风险|谨慎|高学费|民办|中外/.test(String(item.note || item.remark || ''));
  }

  function buildReasonText(item) {
    const existing = firstNonEmpty(item.reason, item.recommendReason, item.why, item.comment, item.aiReason, Array.isArray(item._reasons) && item._reasons.length ? item._reasons.slice(0, 2).join('；') : undefined);
    if (existing) return text(existing, '');

    if (hasRisk(item)) {
      return '存在学费、专业适配或院校属性风险，建议谨慎复核。';
    }

    const level = normalizeLevel(item.level, item);
    if (level === '稳') {
      return '位次匹配度较好，适合作为稳妥层继续核验招生计划和专业限制。';
    }
    if (level === '保') {
      return '录取安全边际相对更高，适合作为保底层保留。';
    }
    if (level === '冲') {
      return '存在一定上探空间，需重点核验近三年位次波动和招生计划变化。';
    }
    return '与当前筛选条件存在一定匹配度，建议继续结合个人偏好复核。';
  }

  function getLevelScore(level) {
    if (level === '稳') return 100;
    if (level === '保') return 90;
    if (level === '冲') return 70;
    if (level === '风险') return 35;
    return 55;
  }

  function getExportPriority(item) {
    const level = normalizeLevel(item.level, item);
    const levelScore = getLevelScore(level);
    const nature = getNature(item);
    const publicScore = nature.includes('公办') ? 20 : 0;
    const matchScore = Number(firstNonEmpty(item.matchScore, item._profile, item.score, item.priorityScore, 0)) || 0;
    const riskPenalty = hasRisk(item) ? -30 : 0;
    return levelScore + publicScore + matchScore + riskPenalty;
  }

  function buildResultStats(results) {
    const list = Array.isArray(results) ? results : [];
    const schoolSet = new Set(list.map(getSchoolName));
    return {
      schoolCount: schoolSet.size,
      majorCount: list.length,
      chongCount: list.filter(item => normalizeLevel(item.level, item) === '冲').length,
      wenCount: list.filter(item => normalizeLevel(item.level, item) === '稳').length,
      baoCount: list.filter(item => normalizeLevel(item.level, item) === '保').length,
      riskCount: list.filter(item => normalizeLevel(item.level, item) === '风险' || hasRisk(item)).length,
      priorityCount: Math.min(list.length, DEFAULT_MAX_ITEMS)
    };
  }

  function buildExportRecommendations(results, maxItems) {
    const limit = Number(maxItems || DEFAULT_MAX_ITEMS);
    const list = Array.isArray(results) ? results : [];
    return [...list]
      .sort((a, b) => getExportPriority(b) - getExportPriority(a))
      .slice(0, limit)
      .map(item => {
        const city = text(firstNonEmpty(item.schoolCity, item.lnArea, item.city, item.area, item.schoolProvince, item.province, item.location), '');
        const nature = getNature(item);
        const level = normalizeLevel(item.level, item);
        const scoreLine = firstNonEmpty(item.rankText, item.positionText, item.admissionText, item.rank2025 ? ('2025 '+item.score2025+'分 / '+item.rank2025+'位') : undefined, item.minRank, item.lowestRank, item.minScore, item.lowestScore);
        const note = firstNonEmpty(item.note, item.remark, item.warning, scoreLine ? `参考：${scoreLine}` : '');
        return {
          schoolName: getSchoolName(item),
          majorName: getMajorName(item),
          city,
          schoolNature: nature,
          level,
          reason: buildReasonText(item),
          note: text(note, '')
        };
      });
  }

  function buildFilterTags(formState) {
    const f = formState || {};
    const tags = [];

    const schoolNature = firstNonEmpty(f.schoolNature, f.natureFilter, f.publicPrivate, f.onlyPublic ? '仅公办' : undefined);
    const schoolLevel = firstNonEmpty(f.schoolLevel, f.levelFilter, f.degreeLevel, f.onlyUndergraduate ? '本科优先' : undefined);
    const region = firstNonEmpty(f.regionPreference, f.targetRegion, f.region, f.area, f.cityPreference);
    const major = firstNonEmpty(f.majorPreference, f.majorDirection, f.targetMajor, f.majorType);

    if (schoolNature) tags.push(text(schoolNature));
    if (schoolLevel) tags.push(text(schoolLevel));
    if (region) tags.push(text(region));
    if (major) tags.push(text(major));

    const avoidList = arr(firstNonEmpty(f.avoidList, f.avoid, f.exclude, f.excludeMajors));
    if (avoidList.includes('民办') || f.excludePrivate || f.onlyPublic) tags.push('排除民办');
    if (avoidList.some(x => /中外|合作/.test(x)) || f.excludeChineseForeign || f.noChineseForeign) tags.push('排除中外合作');
    if (avoidList.some(x => /医/.test(x))) tags.push('排除医学方向');

    if (f.enableBackgroundCheck || f.backgroundCheck) tags.push('背景调查已启用');
    if (f.enableZxfQuestions || f.zxfQuestions || f.enableEightQuestions) tags.push('张雪峰八连问已启用');
    if (f.keepCivilServicePath || f.civilServicePath) tags.push('保留考公路径');
    if (f.employmentFirst || f.jobFirst) tags.push('就业优先');

    return [...new Set(tags)].slice(0, 10);
  }

  function buildExportSummaryData(formState, results, options) {
    const f = formState || {};
    const list = Array.isArray(results) ? results : [];
    const opt = options || {};
    const generatedAt = opt.generatedAt || new Date();
    const maxItems = Number(opt.maxItems || DEFAULT_MAX_ITEMS);
    const avoid = arr(firstNonEmpty(f.avoidList, f.avoid, f.exclude, f.excludeMajors));
    const recommendations = buildExportRecommendations(list, maxItems);

    return {
      title: opt.title || '辽宁物理类高考志愿初选结果',
      version: opt.version || 'v2.8',
      dataScope: opt.dataScope || '2025 辽宁物理类投档数据',
      generatedAt,
      generatedAtText: formatDateTime(generatedAt),
      maxItems,
      hiddenCount: Math.max(0, list.length - recommendations.length),
      student: {
        score: text(firstNonEmpty(f.score, f.gaokaoScore, f.totalScore), '未填写'),
        rank: text(firstNonEmpty(f.rank, f.position, f.provinceRank, f.rankNo), '未填写'),
        subjectType: text(firstNonEmpty(f.subjectType, f.category, f.classType), '物理类'),
        subjects: text(firstNonEmpty(f.subjects, f.subjectCombo, f.xuanke, f.selectedSubjects), '未填写'),
        gender: text(firstNonEmpty(f.gender, f.sex), '未填写'),
        regionPreference: text(firstNonEmpty(f.regionPreference, f.targetRegion, f.region, f.area, f.cityPreference), '未设置'),
        majorPreference: text(firstNonEmpty(f.majorPreference, f.majorDirection, f.targetMajor, f.majorType), '未设置'),
        avoid: avoid.length ? avoid : ['未设置']
      },
      filters: {
        tags: buildFilterTags(f)
      },
      stats: buildResultStats(list),
      recommendations,
      tips: opt.tips || [
        '优先核验前 6 所院校的招生计划、学费、专业限制。',
        '对“冲”类结果重点查看近三年位次波动。',
        '本图为初筛摘要，不等同于最终志愿填报方案。'
      ],
      footer: opt.footer || '生成工具：辽宁物理类高考志愿初选工具 v2.8｜完整明细请导出 CSV 查看'
    };
  }

  function renderInfoGrid(root, items) {
    const grid = append(root, createEl('div', 'zxy-export-info-grid'));
    items.forEach(([label, value]) => {
      const box = createEl('div');
      append(box, createEl('span', '', label));
      append(box, createEl('strong', '', value));
      append(grid, box);
    });
  }

  function renderExportSummaryNode(data) {
    const root = createEl('div', 'zxy-export-summary-root');

    const header = append(root, createEl('section', 'zxy-export-header'));
    append(header, createEl('h1', '', data.title));
    append(header, createEl('p', '', `${data.version} 结果摘要图｜生成时间：${data.generatedAtText}`));
    append(header, createEl('p', '', `数据口径：${data.dataScope}`));

    const studentCard = append(root, createEl('section', 'zxy-export-card'));
    append(studentCard, createEl('h2', '', '考生条件'));
    renderInfoGrid(studentCard, [
      ['分数', data.student.score],
      ['位次', data.student.rank],
      ['科类', data.student.subjectType],
      ['选科', data.student.subjects],
      ['地区', data.student.regionPreference],
      ['方向', data.student.majorPreference],
      ['性别', data.student.gender],
      ['排除', data.student.avoid.join(' / ')]
    ]);

    const filterCard = append(root, createEl('section', 'zxy-export-card'));
    append(filterCard, createEl('h2', '', '本次筛选逻辑'));
    const tagList = append(filterCard, createEl('div', 'zxy-export-tag-list'));
    const tags = data.filters.tags.length ? data.filters.tags : ['未设置特殊筛选条件'];
    tags.forEach(tag => append(tagList, createEl('span', '', tag)));

    const statsCard = append(root, createEl('section', 'zxy-export-card'));
    append(statsCard, createEl('h2', '', '结果总览'));
    const stats = append(statsCard, createEl('div', 'zxy-export-stats-grid'));
    [
      [data.stats.schoolCount, '匹配院校'],
      [data.stats.majorCount, '匹配专业'],
      [data.stats.wenCount, '稳妥选择'],
      [data.stats.chongCount, '冲刺参考']
    ].forEach(([num, label]) => {
      const box = createEl('div');
      append(box, createEl('strong', '', num));
      append(box, createEl('span', '', label));
      append(stats, box);
    });

    const recCard = append(root, createEl('section', 'zxy-export-card'));
    append(recCard, createEl('h2', '', '优先查看结果'));
    if (!data.recommendations.length) {
      append(recCard, createEl('p', 'zxy-export-more-tip', '当前没有可展示的推荐结果。'));
    } else {
      data.recommendations.forEach((item, index) => {
        const card = append(recCard, createEl('div', 'zxy-export-recommend-card'));
        const top = append(card, createEl('div', 'zxy-export-recommend-top'));
        append(top, createEl('strong', '', `${index + 1}. ${item.schoolName}`));
        append(top, createEl('span', `zxy-export-level ${levelClass(item.level)}`, item.level));

        const meta = [item.majorName, item.city, item.schoolNature].filter(Boolean).join('｜');
        append(card, createEl('p', 'zxy-export-major-line', meta));
        append(card, createEl('p', 'zxy-export-reason-line', item.reason));
        if (item.note) append(card, createEl('p', 'zxy-export-note-line', item.note));
      });
    }
    if (data.hiddenCount > 0) {
      append(recCard, createEl('p', 'zxy-export-more-tip', `其余 ${data.hiddenCount} 条结果请导出 CSV 查看。`));
    }

    const tipsCard = append(root, createEl('section', 'zxy-export-card zxy-export-tips'));
    append(tipsCard, createEl('h2', '', '下一步建议'));
    data.tips.forEach((tip, index) => append(tipsCard, createEl('p', '', `${index + 1}. ${tip}`)));

    append(root, createEl('footer', 'zxy-export-footer', data.footer));

    return root;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        if (window.html2canvas) resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('html2canvas 加载失败'));
      document.head.appendChild(script);
    });
  }

  async function ensureHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    await loadScript(HTML2CANVAS_CDN);
    if (!window.html2canvas) throw new Error('html2canvas 未就绪');
    return window.html2canvas;
  }

  function buildFileName(data) {
    const score = String(data.student.score || '未填分').replace(/[\\/:*?"<>|\s]/g, '');
    const rank = String(data.student.rank || '未填位次').replace(/[\\/:*?"<>|\s]/g, '');
    return `辽宁志愿初选摘要_${score}分_${rank}位_${formatDateCompact(data.generatedAt)}.png`;
  }

  function isWeChatBrowser() {
    return /MicroMessenger/i.test(navigator.userAgent || '');
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showPreview(blob, fileName, forceTip) {
    const url = URL.createObjectURL(blob);
    const mask = createEl('div', 'zxy-export-preview-mask');
    const panel = append(mask, createEl('div', 'zxy-export-preview-panel'));
    const head = append(panel, createEl('div', 'zxy-export-preview-head'));
    append(head, createEl('strong', '', '结果摘要图已生成'));

    const actions = append(head, createEl('div'));
    const download = append(actions, createEl('a', 'zxy-export-preview-download', '下载PNG'));
    download.href = url;
    download.download = fileName;
    download.style.marginRight = '8px';
    const close = append(actions, createEl('button', '', '关闭'));

    const img = append(panel, createEl('img', 'zxy-export-preview-img'));
    img.src = url;
    img.alt = '导出结果摘要图预览';

    append(panel, createEl('p', 'zxy-export-preview-tip', forceTip || '如当前浏览器限制下载，可长按图片保存，或在系统浏览器中打开后保存。'));

    close.onclick = () => {
      document.body.removeChild(mask);
      URL.revokeObjectURL(url);
    };
    mask.addEventListener('click', (e) => {
      if (e.target === mask) close.click();
    });
    document.body.appendChild(mask);
  }

  async function exportSummaryAsPng(formState, results, options) {
    const opt = options || {};
    const list = Array.isArray(results) ? results : [];
    if (!list.length) {
      alert(opt.emptyMessage || '当前没有可导出的结果，请先完成筛选。');
      return null;
    }

    const data = buildExportSummaryData(formState, list, opt);
    const wrapper = createEl('div', 'zxy-export-hidden-wrapper');
    const node = renderExportSummaryNode(data);
    append(wrapper, node);
    document.body.appendChild(wrapper);

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 120));
      const html2canvas = await ensureHtml2Canvas();
      const canvas = await html2canvas(node, {
        backgroundColor: '#f3f6fb',
        scale: Math.min(3, window.devicePixelRatio || 2),
        useCORS: true,
        logging: false,
        width: 1080,
        windowWidth: 1080
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('图片生成失败');

      const fileName = opt.fileName || buildFileName(data);
      if (opt.preview || isWeChatBrowser()) {
        showPreview(blob, fileName, isWeChatBrowser() ? '微信内置浏览器可能限制直接下载，请长按图片保存。' : undefined);
      } else {
        downloadBlob(blob, fileName);
      }
      return { blob, fileName, data };
    } catch (err) {
      console.error('[ZYExportSummary] export failed:', err);
      alert(opt.errorMessage || '导出图片失败，请稍后重试。你也可以先导出 CSV。');
      return null;
    } finally {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }
  }

  function mountExportSummaryButton(config) {
    const cfg = config || {};
    const container = typeof cfg.container === 'string' ? document.querySelector(cfg.container) : cfg.container;
    if (!container) throw new Error('未找到导出按钮容器');

    const btn = createEl('button', 'zxy-export-button', cfg.text || '导出摘要图');
    btn.type = 'button';
    btn.onclick = async () => {
      const oldText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '生成中...';
      try {
        const formState = typeof cfg.getFormState === 'function' ? cfg.getFormState() : (cfg.formState || {});
        const results = typeof cfg.getResults === 'function' ? cfg.getResults() : (cfg.results || []);
        await exportSummaryAsPng(formState, results, cfg);
      } finally {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    };

    container.appendChild(btn);
    return btn;
  }

  window.ZYExportSummary = {
    buildExportSummaryData,
    buildResultStats,
    buildExportRecommendations,
    renderExportSummaryNode,
    exportSummaryAsPng,
    mountExportSummaryButton
  };
})();
