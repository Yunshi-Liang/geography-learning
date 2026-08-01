/* ============================================================
 * 地理学习 App — Apple 风格极简重设 + 艾宾浩斯间隔复习
 * 三大核心区：今日推荐 / 复习日程时间线 / 学习进度统计
 * ============================================================ */

(function () {
  'use strict';

  /* --------------------------- 艾宾浩斯间隔 --------------------------- */
  const INTERVALS = [1, 2, 4, 7, 15, 30]; // 天；完成全部 6 次即“掌握”

  /* ----------------------------- 学科逻辑学习序列表（先修依赖 + 难度递进） -----------------------------
   * 依地理科学课程体系的内在逻辑排序，编码全部 141 个知识点的先修关系与依赖顺序。
   * 七阶段：① 地球与宇宙科学 → ② 大气与气候学 → ③ 海洋与水文学 →
   *         ④ 岩石圈与地貌学 → ⑤ 土壤与生物地理 → ⑥ 地理信息科学 → ⑦ 区域与人文地理
   * 前序条目是后序条目的先修基础（如：地球运动→五带→气候；气象要素→气候；气候→土壤植被；
   * 大气环流/海水性质→洋流；地形地质→风化→地貌；物理地理→区域与人文）。
   * nextToLearn() 据此推进“下一个待学习知识点”，保证衔接自然、难度递进。
   */
  /* 七阶段学科逻辑学习序列表（先修依赖 + 难度递进）。先修基础严格排在依赖项之前：
     ① 地球与宇宙（运动/圈层 → 天文星象）
     ② 大气与气候（辐射与大气环流基础 → 气象要素 → 云降水/天气系统 → 气候类型 → 区域气候系统）
     ③ 海洋水文（水循环桥接 → 各类水体 → 海水性质 → 洋流）
     ④ 岩石圈地貌（板块/地质作用 → 地貌类型 → 风化 → 典型地貌）
     ⑤ 土壤生物（气候/母质 → 土壤 → 植被 → 群落 → 生态系统）
     ⑥ GIS（空间参照 → 数据 → 获取表达 → 分析）
     ⑦ 区域人文（大洲 → 国家 → 人文要素） */
  const PHASES = [
    { key: 'earth', label: '① 地球与宇宙科学', emoji: '🌌', ids: [
      'earth-spheres', 'earth-rotation', 'obliquity', 'earth-revolution', 'five-zones', 'moon-phases', 'eclipses',
      'celestial-obs', 'constellation', 'planet-motion', 'astro-calendar', 'time-system'
    ] },
    { key: 'atmos', label: '② 大气与气候学', emoji: '🌤', ids: [
      'insolation', 'atmospheric-circulation', 'pressure-wind', 'pressure-temperature',
      'temperature', 'humidity', 'wind',
      'cloud-classification', 'precipitation-types', 'meteo-coupling', 'meteo-front',
      'rainforest', 'savanna', 'desert', 'subtropical-monsoon', 'mediterranean', 'temperate-marine', 'temperate-continental', 'polar', 'plateau', 'subarctic',
      'monsoon', 'local-circulation', 'local-wind', 'cyclone', 'enso', 'greenhouse'
    ] },
    { key: 'hydro', label: '③ 海洋与水文学', emoji: '💧', ids: [
      'hydrologic-cycle', 'river', 'lake-wetland', 'groundwater', 'glacier', 'seawater',
      'gulf-stream', 'n-atl-drift', 'kuroshio', 'oyashio', 'california', 'humboldt', 'n-equatorial', 'acc', 'conveyor', 'upwelling'
    ] },
    { key: 'litho', label: '④ 岩石圈与地貌学', emoji: '⛰', ids: [
      'plate-tectonics', 'plate-boundary', 'volcano', 'earthquake', 'fold', 'fault',
      'glacial', 'karst', 'coastal', 'aeolian',
      'physical-weathering', 'chemical-weathering', 'biological-weathering',
      'himalaya', 'andes', 'alps', 'rocky', 'qinghai', 'brazil-plateau', 'rift', 'fuji', 'yangtze', 'nile', 'amazon', 'mississippi', 'caspian', 'baikal', 'superior', 'sahara', 'gobi', 'grand-canyon', 'deadsea'
    ] },
    { key: 'biogeo', label: '⑤ 土壤与生物地理', emoji: '🌿', ids: [
      'soil-formation', 'soil-type', 'vegetation-zone', 'biome', 'ecosystem'
    ] },
    { key: 'gis', label: '⑥ 地理信息科学', emoji: '🛰', ids: [
      'projection', 'coordsys', 'vector', 'raster', 'remote-sensing', 'dem', 'spatial-analysis', 'geodatabase', 'cartography'
    ] },
    { key: 'region', label: '⑦ 区域与人文地理', emoji: '🗺', ids: [
      'asia', 'africa', 'europe', 'north-america', 'south-america', 'oceania', 'antarctica',
      'cn', 'jp', 'in', 'kr', 'th', 'id', 'sa', 'eg', 'za', 'ng', 'ke', 'et', 'us', 'ca', 'mx', 'cu', 'br', 'ar', 'pe', 'cl', 'gb', 'fr', 'de', 'it', 'es', 'ru', 'au', 'nz',
      'population', 'urbanization', 'agriculture', 'industry', 'culture'
    ] }
  ];
  const CURRICULUM = PHASES.reduce((a, p) => a.concat(p.ids), []);
  const CURRIC_INDEX = (() => { const m = {}; CURRICULUM.forEach((id, i) => { m[id] = i; }); return m; })();
  const PHASE_OF = (() => { const m = {}; PHASES.forEach((p, pi) => p.ids.forEach(id => { m[id] = pi; })); return m; })();

  /* ----------------------------- 本地存储（学习计划） ----------------------------- */
  const Spaced = {
    K: 'geo_spaced_v1',
    _d: null,
    data() {
      if (this._d) return this._d;
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(this.K)); } catch (e) { raw = null; }
      this._d = (raw && typeof raw === 'object') ? raw : { items: {}, streak: 0, lastLearn: null, history: [] };
      const d = this._d;
      if (!d.items || typeof d.items !== 'object') d.items = {};
      if (!Array.isArray(d.history)) d.history = [];
      if (typeof d.streak !== 'number') d.streak = 0;
      const today = dateStr(new Date());
      const byId = {}; ALL_ITEMS().forEach(x => { byId[x.id] = x; });
      for (const id in d.items) {
        const it = d.items[id];
        if (!it || typeof it !== 'object') { delete d.items[id]; continue; }
        if (it.learnedDate == null) it.learnedDate = today;
        if (it.lastStudy == null) it.lastStudy = it.learnedDate; // 兼容旧版缺字段数据
        if (typeof it.stage !== 'number') it.stage = 0;
        if (it.nextReview == null) it.nextReview = addDays(it.learnedDate, INTERVALS[0]);
        const meta = byId[id];
        if (it.type == null && meta) it.type = meta.type;
        if (it.name == null && meta) it.name = meta.name;
      }
      return this._d;
    },
    save() { localStorage.setItem(this.K, JSON.stringify(this.data())); },
    learn(id, type, name) {
      const d = this.data();
      if (d.items[id]) return false;
      const today = dateStr(new Date());
      d.items[id] = { type, name, learnedDate: today, lastStudy: today, stage: 0, nextReview: addDays(today, INTERVALS[0]) };
      bumpStreak(d, today);
      d.history.unshift({ kind: 'learn', id, name, ts: Date.now() });
      if (d.history.length > 60) d.history.length = 60;
      this.save();
      return true;
    },
    dueList() {
      const d = this.data(); const today = dateStr(new Date());
      return Object.keys(d.items).map(id => Object.assign({ id }, d.items[id]))
        .filter(it => it.stage < INTERVALS.length && it.nextReview <= today)
        .sort((a, b) => a.nextReview < b.nextReview ? -1 : 1);
    },
    upcoming() {
      const d = this.data(); const today = dateStr(new Date());
      return Object.keys(d.items).map(id => Object.assign({ id }, d.items[id]))
        .filter(it => it.stage < INTERVALS.length && it.nextReview > today)
        .sort((a, b) => a.nextReview < b.nextReview ? -1 : 1);
    },
    completeReview(id, passed) {
      const d = this.data(); const it = d.items[id]; if (!it) return;
      const today = dateStr(new Date());
      it.lastStudy = today;
      bumpStreak(d, today); // 复习也计入连续学习
      if (passed) {
        it.stage++;
        it.nextReview = it.stage < INTERVALS.length ? addDays(today, INTERVALS[it.stage]) : null;
      } else {
        it.nextReview = addDays(today, INTERVALS[0]); // 未通过 → 次日再复习
      }
      d.history.unshift({ kind: 'review', id, name: it.name, result: passed ? 'pass' : 'fail', ts: Date.now() });
      if (d.history.length > 60) d.history.length = 60;
      this.save();
    },
    learnedCount() { return Object.keys(this.data().items).length; },
    masteredCount() { return Object.values(this.data().items).filter(it => it.stage >= INTERVALS.length).length; },
    reset() { localStorage.removeItem(this.K); this._d = null; }
  };

  /* ----------------------------- 日期工具 ----------------------------- */
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const dateStr = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseStr = (s) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const addDays = (s, n) => { const d = parseStr(s); d.setDate(d.getDate() + n); return dateStr(d); };

  /* 连续学习天数：任意学习/复习活动都计入（按自然日去重） */
  function bumpStreak(d, today) {
    if (d.lastLearn !== today) {
      const y = addDays(today, -1);
      d.streak = (d.lastLearn === y) ? (d.streak || 0) + 1 : 1;
      d.lastLearn = today;
    }
  }

  /* ----------------------------- 全量条目 ----------------------------- */
  const TOTAL_ITEMS =
    GEO_DATA.continents.length + GEO_DATA.countries.length +
    GEO_DATA.landforms.length + GEO_DATA.climates.length +
    GEO_DATA.climateSystems.length + GEO_DATA.oceanCurrents.length +
    GEO_DATA.geology.length + GEO_DATA.gis.length +
    GEO_DATA.processPrinciples.length + GEO_DATA.earthAstro.length +
    GEO_DATA.meteo.length + GEO_DATA.astroStar.length +
    GEO_DATA.hydro.length + GEO_DATA.biogeo.length + GEO_DATA.human.length;

  function ALL_ITEMS() {
    const map = {
      continent: GEO_DATA.continents, country: GEO_DATA.countries, landform: GEO_DATA.landforms,
      climate: GEO_DATA.climates, climateSys: GEO_DATA.climateSystems, ocean: GEO_DATA.oceanCurrents,
      geology: GEO_DATA.geology, gis: GEO_DATA.gis,
      proc: GEO_DATA.processPrinciples, astro: GEO_DATA.earthAstro, meteo: GEO_DATA.meteo,
      astroStar: GEO_DATA.astroStar, hydro: GEO_DATA.hydro, biogeo: GEO_DATA.biogeo, human: GEO_DATA.human
    };
    const out = [];
    for (const t in map) map[t].forEach(it => out.push(Object.assign({}, it, { type: t })));
    return out;
  }
  function findItemById(id) { return ALL_ITEMS().find(x => x.id === id); }

  /* 下一个待学习知识点：沿学科逻辑学习序列表（CURRICULUM）推进，
     取第一个尚未学习的条目——其全部先修基础必然已完成，保证衔接自然、难度递进。 */
  function nextToLearn() {
    const learned = Spaced.data().items;
    for (let i = 0; i < CURRICULUM.length; i++) {
      if (!learned[CURRICULUM[i]]) return findItemById(CURRICULUM[i]);
    }
    return null; // 全部学完
  }

  /* 每日推荐：优先安排到期复习（守住记忆），无到期项则按学科逻辑推荐“下一个待学点” */
  function dailyRec() {
    const due = Spaced.dueList();
    if (due.length) {
      return { item: findItemById(due[0].id), kind: 'review' };
    }
    const nx = nextToLearn();
    return nx ? { item: nx, kind: 'learn' } : { item: null, kind: 'done' };
  }

  /* ----------------------------- 小工具 ----------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickDistractors = (pool, correct, n) => shuffle(pool.filter(x => x !== correct)).slice(0, n);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uniqTags = (arr) => [...new Set(arr.map(x => x.tag))];
  const wrongFrom = (arr, correct) => { const o = shuffle(arr.filter(x => x !== correct)); return o[0] !== undefined ? o[0] : correct; };
  const infoVal = (item, key) => { const o = (item.info || []).find(x => x.k === key); return o ? o.v : ''; };
  const continentOf = (loc) => /亚欧|欧亚|亚洲/.test(loc) ? '亚洲' : /非洲/.test(loc) ? '非洲' : /南美/.test(loc) ? '南美洲' : /北美/.test(loc) ? '北美洲' : /欧洲/.test(loc) ? '欧洲' : /大洋/.test(loc) ? '大洋洲' : '亚洲';
  /* 推荐学习卡片的描述：因果型条目（无 desc）回退到原理摘要，保证有可读内容 */
  const recDesc = (it) => it.desc || it.principle || it.en || it.tag || '';

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1400);
  }

  function typeEmoji(t) { return { continent: '🌍', country: '🏳', landform: '🏔', climate: '🌤', climateSys: '🌪', ocean: '🌊', geology: '⛰', gis: '🛰', proc: '⚙️', astro: '🌌', meteo: '🌦️', astroStar: '🔭', hydro: '💧', biogeo: '🌿', human: '🏙' }[t] || '📍'; }
  function typeLabel(t) { return { continent: '大洲', country: '国家', landform: '地形地貌', climate: '气候类型', climateSys: '气候系统', ocean: '海洋洋流', geology: '地质构造', gis: 'GIS 制图', proc: '地理过程原理', astro: '天文地球概论', meteo: '气象要素天气', astroStar: '天文星象', hydro: '水文', biogeo: '土壤生物', human: '人文地理' }[t] || '知识点'; }

  /* ----------------------------- 标签导航 ----------------------------- */
  function switchTab(tab) {
    $$('#tabbar .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    ['today', 'explore', 'progress'].forEach(t => $('#page-' + t).classList.toggle('on', t === tab));
    if (tab === 'today') renderToday();
    else if (tab === 'explore') { exploreDomain = null; exploreSub = null; renderExplore(); }
    else if (tab === 'progress') renderProgress();
    window.scrollTo(0, 0);
  }

  /* --------------------------- 今日视图（三大核心区） --------------------------- */
  function renderToday() {
    const d = Spaced.data();
    const rec = dailyRec();
    const learned = Spaced.learnedCount();
    const nxt = nextToLearn();

    let html = '';
    if (!rec.item || rec.kind === 'done') {
      html += `<div class="rec">
        <div class="rec-kicker">🎉 全部知识点</div>
        <div class="rec-name">已学完全部 ${TOTAL_ITEMS} 个知识点</div>
        <div class="rec-sub">坚持复习，让记忆长期保持</div>
        <div class="rec-desc">你已掌握地理科学导论的全部知识体系。到期复习仍会出现在下方「复习区域」，可在「进度」中查看掌握度与学习路径。</div>
        <div class="rec-actions"><button class="btn-ghost btn-block" id="recReviewAll">查看复习安排</button></div>
      </div>`;
    } else if (rec.kind === 'learn') {
      const it = rec.item;
      html += `<div class="rec">
        <div class="rec-kicker">今日推荐 · 学习</div>
        <div class="rec-name">${esc(it.name)}</div>
        <div class="rec-sub">${esc(typeLabel(it.type))} · ${esc(it.en || it.tag || it.enName || '')}</div>
        <div class="rec-desc">${esc(recDesc(it))}</div>
        <div class="rec-actions"><button class="btn-primary" data-open="${it.type}" data-id="${it.id}">开始学习</button></div>
      </div>`;
    } else {
      const it = rec.item;
      const st = d.items[it.id].stage;
      html += `<div class="rec">
        <div class="rec-kicker">今日复习 · 巩固</div>
        <div class="rec-name">${esc(it.name)}</div>
        <div class="rec-sub">${esc(typeLabel(it.type))} · 第 ${st + 1} 次复习</div>
        <div class="rec-desc">${esc(recDesc(it))}</div>
        <div class="rec-actions"><button class="btn-primary" id="recReview" data-id="${it.id}">开始复习</button></div>
      </div>`;
    }

    // 学习路径：始终显示“下一个待学习知识点”标记，学完一个即自动推进，并标注当前所处学科阶段
    const phaseIdx = nxt ? PHASE_OF[nxt.id] : (PHASES.length - 1);
    const phase = PHASES[phaseIdx];
    const phaseDone = phase.ids.filter(id => Spaced.data().items[id]).length;
    const phasePct = Math.round(phaseDone / phase.ids.length * 100);
    const pctLearned = Math.round(learned / TOTAL_ITEMS * 100);
    html += `<div class="path-card">
      <div class="path-top">
        <span class="path-label">📍 学习路径 · ${esc(phase.label)}</span>
        <span class="path-count">本阶段 ${phaseDone}/${phase.ids.length}</span>
      </div>
      <div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${phasePct}%"></div></div></div>
      <div class="path-next">${nxt ? ('下一站：<b>' + esc(nxt.name) + '</b> · ' + esc(typeLabel(nxt.type))) : '已抵达终点 🎉'}</div>
      <div class="path-all">整体进度 ${learned} / ${TOTAL_ITEMS}（${pctLearned}%）</div>
    </div>`;

    html += '<div class="sec-title">复习区域</div>' + renderTimeline();
    html += '<div class="sec-title">学习统计</div>' + renderStats();

    $('#page-today').innerHTML = html;
    bindOpens($('#page-today'));
    const rv = $('#recReview');
    if (rv) rv.addEventListener('click', () => startReview(rv.dataset.id));
    const rvAll = $('#recReviewAll');
    if (rvAll) rvAll.addEventListener('click', () => switchTab('progress'));
  }

  function renderTimeline() {
    const due = Spaced.dueList();
    const up = Spaced.upcoming();
    if (!due.length && !up.length) {
      return `<div class="empty"><span class="e-emoji">☀</span>还没有学习内容。<br>去「探索」里挑一个开始吧。</div>`;
    }
    let html = '';
    if (due.length) {
      html += `<div class="tl-group"><div class="tl-date"><span class="dot"></span>今天 · ${due.length} 项待复习</div>`;
      due.forEach(it => html += tlRow(it, true));
      html += '</div>';
    }
    if (up.length) {
      html += `<div class="tl-group"><div class="tl-date muted"><span class="dot"></span>即将到来</div>`;
      up.slice(0, 8).forEach(it => html += tlRow(it, false));
      html += '</div>';
    }
    return html;
  }

  function tlRow(it, isDue) {
    const stageTxt = it.stage >= INTERVALS.length ? '已掌握' : ('第 ' + (it.stage + 1) + ' 次复习');
    const dateTxt = it.nextReview ? it.nextReview : '已掌握';
    const nodeCls = it.stage >= INTERVALS.length ? 'done' : (isDue ? 'due' : '');
    let html = `<div class="tl-row"><div class="tl-rail"><div class="tl-node ${nodeCls}"></div></div>`;
    html += `<div class="tl-card"><div class="tl-top"><div class="tl-name">${esc(it.name)}</div><div class="tl-stage">${stageTxt}</div></div>`;
    html += `<div class="tl-meta">${esc(typeLabel(it.type))} · 计划 ${esc(dateTxt)}</div>`;
    if (isDue) html += `<button class="btn-ghost" data-review="${it.id}">复习</button>`;
    html += '</div></div>';
    return html;
  }

  function renderStats() {
    const d = Spaced.data();
    const learned = Spaced.learnedCount();
    const due = Spaced.dueList().length;
    const mastered = Spaced.masteredCount();
    const streak = d.streak || 0;
    const pct = Math.round(learned / TOTAL_ITEMS * 100);
    let html = `<div class="stats-grid">
      <div class="stat accent"><div class="stat-num">${learned}<small>/${TOTAL_ITEMS}</small></div><div class="stat-lbl">已学习知识点</div></div>
      <div class="stat"><div class="stat-num">${streak}<small>天</small></div><div class="stat-lbl">连续学习</div></div>
      <div class="stat"><div class="stat-num">${due}</div><div class="stat-lbl">待复习</div></div>
      <div class="stat"><div class="stat-num">${mastered}</div><div class="stat-lbl">已掌握</div></div>
    </div>`;
    html += `<div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:10px"><span>总体掌握度</span><span style="color:var(--accent)">${pct}%</span></div><div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div></div>`;
    return html;
  }

  /* --------------------------- 探索页（完整知识系统总入口） --------------------------- */
  /* 按大学「地理科学」课程体系重组为 7 个领域，每个领域下设知识子模块（避免零散） */
  const DOMAINS = [
    { key: 'earth', label: '地球与宇宙科学', emoji: '🌌', desc: '天体观测、星座体系、行星运动、天文历法与地球概论——理解我们所处宇宙环境的基础。',
      subs: [
        { key: 'astro', label: '天文地球概论', type: 'astro', data: () => GEO_DATA.earthAstro },
        { key: 'star', label: '天文星象', type: 'astroStar', data: () => GEO_DATA.astroStar }
      ] },
    { key: 'atmos', label: '大气与气候学', emoji: '🌤', desc: '大气组成与运动、天气现象、气候类型与气候系统动力学，是气象气候学的核心。',
      subs: [
        { key: 'meteo', label: '气象与天气', type: 'meteo', data: () => GEO_DATA.meteo },
        { key: 'climate', label: '气候类型', type: 'climate', data: () => GEO_DATA.climates },
        { key: 'climateSys', label: '气候系统', type: 'climateSys', data: () => GEO_DATA.climateSystems },
        { key: 'atmosProc', label: '大气过程原理', type: 'proc', data: () => GEO_DATA.processPrinciples.filter(x => ['pressure-temperature', 'local-circulation'].includes(x.id)) }
      ] },
    { key: 'hydro', label: '海洋与水文学', emoji: '💧', desc: '海洋环流、海水性质与水圈各要素（河流、湖泊、地下水、冰川），构成地球水圈。',
      subs: [
        { key: 'ocean', label: '海洋洋流', type: 'ocean', data: () => GEO_DATA.oceanCurrents },
        { key: 'hydro', label: '水文系统', type: 'hydro', data: () => GEO_DATA.hydro },
        { key: 'hydroProc', label: '水循环过程', type: 'proc', data: () => GEO_DATA.processPrinciples.filter(x => x.id === 'hydrologic-cycle') }
      ] },
    { key: 'litho', label: '岩石圈与地貌学', emoji: '⛰', desc: '板块、构造、火山等地质过程与各类地貌，以及风化的形成机制。',
      subs: [
        { key: 'geology', label: '地质构造', type: 'geology', data: () => GEO_DATA.geology },
        { key: 'landform', label: '地形地貌', type: 'landform', data: () => GEO_DATA.landforms },
        { key: 'weathering', label: '风化作用', type: 'proc', data: () => GEO_DATA.processPrinciples.filter(x => x.tag === '风化作用') }
      ] },
    { key: 'biogeo', label: '土壤与生物地理', emoji: '🌿', desc: '土壤形成与类型、植被地带性与生物群落、生态系统——自然地理的有机层。',
      subs: [
        { key: 'biogeo', label: '土壤与生物', type: 'biogeo', data: () => GEO_DATA.biogeo }
      ] },
    { key: 'gis', label: '地理信息科学', emoji: '🛰', desc: '投影、坐标系、矢量栅格、遥感、DEM 与空间分析——地理学的空间技术底座。',
      subs: [
        { key: 'gis', label: 'GIS 制图', type: 'gis', data: () => GEO_DATA.gis }
      ] },
    { key: 'region', label: '区域与人文地理', emoji: '🗺', desc: '大洲与国家区域地理，以及人口、城市、农业、工业、文化等人文地理要素。',
      subs: [
        { key: 'continent', label: '大洲', type: 'continent', data: () => GEO_DATA.continents },
        { key: 'country', label: '国家', type: 'country', data: () => GEO_DATA.countries },
        { key: 'human', label: '人文地理', type: 'human', data: () => GEO_DATA.human }
      ] }
  ];
  let exploreDomain = null;
  let exploreSub = null;
  function miniCardGeneric(item, type) {
    const sub = item.tag || item.en || item.enName || item.type || '';
    return `<div class="mini-card" data-open="${type}" data-id="${item.id}">
      <div class="m-emoji">${item.emoji || item.flag || '📍'}</div>
      <div class="m-name">${esc(item.name)}</div>
      <div class="m-sub">${esc(sub)}</div>
    </div>`;
  }
  function renderExplore() {
    if (!exploreDomain) {
      /* 一级：按大学课程体系的知识领域总览（层级结构顶层） */
      const html = `<div class="sec-title">知识领域 · 地理科学课程体系</div>
        <div class="domain-grid">` +
        DOMAINS.map(d => {
          const n = d.subs.reduce((a, s) => a + s.data().length, 0);
          return `<div class="domain-card" data-domain="${d.key}">
            <div class="d-emoji">${d.emoji}</div>
            <div class="d-main">
              <div class="d-name">${esc(d.label)}<span class="d-count">${n}</span></div>
              <div class="d-desc">${esc(d.desc)}</div>
            </div>
            <div class="d-chev">›</div>
          </div>`;
        }).join('') + `</div>`;
      $('#page-explore').innerHTML = html;
      $$('.domain-card', $('#page-explore')).forEach(el => el.addEventListener('click', () => {
        exploreDomain = el.dataset.domain;
        exploreSub = DOMAINS.find(x => x.key === exploreDomain).subs[0].key;
        renderExplore();
      }));
      return;
    }
    /* 二级：领域下钻——子模块分段 + 条目网格（层级结构下层） */
    const dom = DOMAINS.find(x => x.key === exploreDomain);
    const sub = dom.subs.find(s => s.key === exploreSub) || dom.subs[0];
    const html =
      `<div class="domain-head">
         <button class="back-btn" id="expBack">‹ 返回</button>
         <div class="dh-title">${esc(dom.label)}</div>
       </div>
       <div class="dh-desc">${esc(dom.desc)}</div>
       <div class="seg" id="expSeg">` +
        dom.subs.map(s => `<button data-seg="${s.key}" class="${exploreSub === s.key ? 'on' : ''}">${esc(s.label)}</button>`).join('') +
      `</div>
       <div class="grid">` + sub.data().map(it => miniCardGeneric(it, sub.type)).join('') + `</div>`;
    $('#page-explore').innerHTML = html;
    bindOpens($('#page-explore'));
    $('#expSeg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      exploreSub = b.dataset.seg; renderExplore();
    });
    $('#expBack').addEventListener('click', () => { exploreDomain = null; renderExplore(); });
  }

  /* --------------------------- 详情弹层（学习） --------------------------- */
  function bindOpens(root) {
    $$('[data-open]', root).forEach(el => el.addEventListener('click', () => openDetail(el.dataset.open, el.dataset.id)));
    $$('[data-review]', root).forEach(el => el.addEventListener('click', () => startReview(el.dataset.review)));
  }

  function openDetail(type, id) {
    let item, html = '';
    if (type === 'continent') { item = GEO_DATA.continents.find(c => c.id === id); html = sheetContinent(item); }
    else if (type === 'country') { item = GEO_DATA.countries.find(c => c.id === id); html = sheetCountry(item); }
    else if (type === 'landform') { item = GEO_DATA.landforms.find(c => c.id === id); html = sheetLandform(item); }
    else if (type === 'climate') { item = GEO_DATA.climates.find(c => c.id === id); html = sheetClimate(item); }
    else if (type === 'climateSys') { item = GEO_DATA.climateSystems.find(c => c.id === id); html = sheetGeneric(item, 'climateSys'); }
    else if (type === 'ocean') { item = GEO_DATA.oceanCurrents.find(c => c.id === id); html = sheetGeneric(item, 'ocean'); }
    else if (type === 'geology') { item = GEO_DATA.geology.find(c => c.id === id); html = sheetGeneric(item, 'geology'); }
    else if (type === 'gis') { item = GEO_DATA.gis.find(c => c.id === id); html = sheetGeneric(item, 'gis'); }
    else if (type === 'astroStar') { item = GEO_DATA.astroStar.find(c => c.id === id); html = sheetCausal(item, 'astroStar'); }
    else if (type === 'hydro') { item = GEO_DATA.hydro.find(c => c.id === id); html = sheetGeneric(item, 'hydro'); }
    else if (type === 'biogeo') { item = GEO_DATA.biogeo.find(c => c.id === id); html = sheetGeneric(item, 'biogeo'); }
    else if (type === 'human') { item = GEO_DATA.human.find(c => c.id === id); html = sheetGeneric(item, 'human'); }
    else if (type === 'proc') { item = GEO_DATA.processPrinciples.find(c => c.id === id); html = sheetCausal(item, 'proc'); }
    else if (type === 'astro') { item = GEO_DATA.earthAstro.find(c => c.id === id); html = sheetCausal(item, 'astro'); }
    else if (type === 'meteo') { item = GEO_DATA.meteo.find(c => c.id === id); html = sheetCausal(item, 'meteo'); }
    if (!item) return;
    const isLearned = !!Spaced.data().items[id];
    $('#sheetContent').innerHTML = `<div class="sheet-grab"></div>` + html;
    $('#sheetMask').classList.add('show');
    $('#sheet').classList.add('show');
    const btn = $('#sheetLearnedBtn');
    if (btn) {
      if (isLearned) {
        btn.classList.add('done');
        btn.textContent = '✓ 已学习 · 复习计划已排';
        btn.disabled = true;
      } else {
        btn.classList.remove('done');
        btn.textContent = '✓ 我学完了，加入复习';
        btn.disabled = false;
        btn.onclick = () => markLearned(type, id, item, btn);
      }
    }
  }

  /* 显式“学完”动作：登记学习 → 依艾宾浩斯自动排复习（移入复习区域）→ 推进下一个待学点 */
  function markLearned(type, id, item, btn) {
    const isNew = Spaced.learn(id, type, item.name);
    if (!isNew) { closeSheet(); switchTab('today'); return; }
    const nxt = nextToLearn();
    const nxtTxt = nxt ? ('下一站：' + nxt.name) : '已学完全部知识点 🎉';
    toast('已加入复习计划 · ' + nxtTxt);
    closeSheet();
    switchTab('today');
  }
  function closeSheet() { $('#sheetMask').classList.remove('show'); $('#sheet').classList.remove('show'); }
  $('#sheetMask').addEventListener('click', closeSheet);

  function sheetHero(item, emoji, en) {
    return `<div class="sheet-hero"><div class="sh-emoji">${emoji}</div><div><div class="sh-name">${esc(item.name)}</div><div class="sh-en">${en ? esc(en) : ''}</div></div></div>`;
  }
  function kv(k, v) { return `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`; }
  function learnedBtn() { return `<button class="sheet-btn" id="sheetLearnedBtn">✓ 已学习</button>`; }

  function sheetContinent(c) {
    return sheetHero(c, c.emoji, c.enName) +
      `<div class="chips"><span class="tag">${c.countries} 个国家</span><span class="tag">${esc(c.area)}</span><span class="tag">${esc(c.population)}</span></div>` +
      (c.principle ? `<div class="section-title"><span class="bar"></span>地理原理</div><div class="causal-principle">${esc(c.principle)}</div>` : '') +
      `<div class="sheet-desc">${esc(c.desc)}</div>` +
      kv('面积', c.area) + kv('人口', c.population) + kv('国家数', c.countries + ' 个') +
      `<div class="section-title"><span class="bar"></span>地理亮点</div>` +
      c.highlights.map(h => `<div class="kv"><div class="k">★</div><div class="v">${esc(h)}</div></div>`).join('') +
      `<div class="section-title"><span class="bar"></span>趣味知识</div>` +
      c.facts.map(f => `<div class="kv"><div class="k">💡</div><div class="v">${esc(f)}</div></div>`).join('') +
      (c.life ? `<div class="section-title"><span class="bar"></span>生活关联</div><div class="causal-box life">${esc(c.life)}</div>` : '') +
      learnedBtn();
  }
  function sheetCountry(c) {
    const cont = GEO_UTIL.continentName(c.continent);
    return sheetHero(c, c.flag, c.enName) +
      `<div class="chips"><span class="tag">${esc(cont)}</span><span class="tag">首都 ${esc(c.capital)}</span><span class="tag">${esc(c.climate)}</span></div>` +
      `<div class="sheet-desc">${esc(c.desc)}</div>` +
      kv('首都', c.capital) + kv('所属大洲', cont) + kv('面积', c.area) +
      kv('人口', c.population) + kv('官方语言', c.language) + kv('货币', c.currency) +
      kv('气候类型', c.climate) + kv('标志地标', c.landmark) +
      `<div class="section-title"><span class="bar"></span>趣味知识</div>` +
      c.funFacts.map(f => `<div class="kv"><div class="k">💡</div><div class="v">${esc(f)}</div></div>`).join('') +
      (c.life ? `<div class="section-title"><span class="bar"></span>生活关联</div><div class="causal-box life">${esc(c.life)}</div>` : '') +
      learnedBtn();
  }
  function sheetLandform(l) {
    return sheetHero(l, l.emoji, l.type) +
      `<div class="chips"><span class="tag">${esc(l.type)}</span><span class="tag">${esc(l.metric)}</span></div>` +
      `<div class="sheet-desc">${esc(l.desc)}</div>` +
      kv('类型', l.type) + kv('位置', l.location) + kv('规模', l.metric) + learnedBtn();
  }
  function sheetClimate(c) {
    return sheetGeneric(c, 'climate');
  }
  function sheetGeneric(item, type) {
    const chips = [item.tag].filter(Boolean).concat(item.chips || []);
    let html = sheetHero(item, item.emoji, item.en || item.enName) +
      (chips.length ? `<div class="chips">` + chips.map(c => `<span class="tag">${esc(c)}</span>`).join('') + `</div>` : '') +
      `<div class="sheet-desc">${esc(item.desc)}</div>`;
    if (item.principle) {
      html += `<div class="section-title"><span class="bar"></span>原理</div>` +
        `<div class="causal-principle">${esc(item.principle)}</div>`;
    }
    if (item.process && item.process.length) {
      html += `<div class="section-title"><span class="bar"></span>过程 · 因果链条</div><div class="causal-flow">` +
        item.process.map((p, i) => `<div class="cf-step"><div class="cf-num">${i + 1}</div><div class="cf-text">${esc(p)}</div></div>` +
          (i < item.process.length - 1 ? `<div class="cf-arrow">↓</div>` : '')).join('') + `</div>`;
    }
    if (item.info && item.info.length) html += item.info.map(o => kv(o.k, o.v)).join('');
    if (item.points && item.points.length) {
      html += `<div class="section-title"><span class="bar"></span>关键要点 · GIS 视角</div>` +
        item.points.map(p => `<div class="kv"><div class="k">•</div><div class="v">${esc(p)}</div></div>`).join('');
    }
    if (item.life) {
      html += `<div class="section-title"><span class="bar"></span>生活关联</div><div class="causal-box life">${esc(item.life)}</div>`;
    }
    html += learnedBtn();
    return html;
  }
  /* 因果链式详情：原理 → 过程（因果链条） → 现象 → 实例 */
  function sheetCausal(item, type) {
    const chips = [item.tag].filter(Boolean).concat(item.chips || []);
    let html = sheetHero(item, item.emoji, item.en) +
      (chips.length ? `<div class="chips">` + chips.map(c => `<span class="tag">${esc(c)}</span>`).join('') + `</div>` : '');
    if (item.principle) {
      html += `<div class="section-title"><span class="bar"></span>原理</div>` +
        `<div class="causal-principle">${esc(item.principle)}</div>`;
    }
    if (item.process && item.process.length) {
      html += `<div class="section-title"><span class="bar"></span>过程 · 因果链条</div><div class="causal-flow">` +
        item.process.map((p, i) => `<div class="cf-step"><div class="cf-num">${i + 1}</div><div class="cf-text">${esc(p)}</div></div>` +
          (i < item.process.length - 1 ? `<div class="cf-arrow">↓</div>` : '')).join('') + `</div>`;
    }
    if (item.phenomenon) {
      html += `<div class="section-title"><span class="bar"></span>现象</div><div class="causal-box">${esc(item.phenomenon)}</div>`;
    }
    if (item.example) {
      html += `<div class="section-title"><span class="bar"></span>实例</div><div class="causal-box example">${esc(item.example)}</div>`;
    }
    if (item.life) {
      html += `<div class="section-title"><span class="bar"></span>生活关联</div><div class="causal-box life">${esc(item.life)}</div>`;
    }
    if (item.factors && item.factors.length) {
      html += `<div class="section-title"><span class="bar"></span>速率 / 影响因素</div>` +
        item.factors.map(f => `<div class="kv"><div class="k">•</div><div class="v">${esc(f)}</div></div>`).join('');
    }
    if (item.points && item.points.length) {
      html += `<div class="section-title"><span class="bar"></span>关键要点 · GIS 视角</div>` +
        item.points.map(p => `<div class="kv"><div class="k">•</div><div class="v">${esc(p)}</div></div>`).join('');
    }
    html += learnedBtn();
    return html;
  }
  function mcQ(item, q, answer, pool) {
    return { q, sub: '选择题', type: 'mc', options: shuffle([answer].concat(pickDistractors(pool, answer, 3))), answer, accept: [answer], explain: `${item.name}：${answer}。` };
  }
  function typeArray(type) {
    const m = {
      continent: GEO_DATA.continents, country: GEO_DATA.countries, landform: GEO_DATA.landforms,
      climate: GEO_DATA.climates, climateSys: GEO_DATA.climateSystems, ocean: GEO_DATA.oceanCurrents,
      geology: GEO_DATA.geology, gis: GEO_DATA.gis, proc: GEO_DATA.processPrinciples,
      astro: GEO_DATA.earthAstro, meteo: GEO_DATA.meteo,
      astroStar: GEO_DATA.astroStar, hydro: GEO_DATA.hydro, biogeo: GEO_DATA.biogeo, human: GEO_DATA.human
    };
    return m[type];
  }
  function tagPool(type) { const a = typeArray(type); return a ? uniqTags(a) : []; }
  function reviewMC(item) {
    switch (item.type) {
      case 'continent': return mcQ(item, `${item.name} 的面积约为？`, item.area, GEO_DATA.continents.map(c => c.area));
      case 'country': return mcQ(item, `${item.name} 的首都是？`, item.capital, GEO_DATA.countries.map(c => c.capital));
      case 'landform': return mcQ(item, `${item.name} 主要位于哪个大洲？`, continentOf(infoVal(item, '位置') || ''), GEO_DATA.continents.map(c => c.name));
      case 'climate': return mcQ(item, `${item.name} 的气温特征是？`, infoVal(item, '气温'), GEO_DATA.climates.map(c => infoVal(c, '气温')));
      case 'climateSys': return mcQ(item, `${item.name} 属于下列哪一类气候系统要素？`, item.tag, uniqTags(GEO_DATA.climateSystems));
      case 'ocean': return mcQ(item, `${item.name} 主要位于哪个大洋 / 海域？`, item.ocean, ['太平洋', '大西洋', '印度洋', '北冰洋', '南大洋']);
      case 'geology': return mcQ(item, `${item.name} 属于下列哪类地质过程 / 地貌？`, item.tag, uniqTags(GEO_DATA.geology));
      case 'gis': return mcQ(item, `${item.name} 属于 GIS 中哪一类？`, item.tag, uniqTags(GEO_DATA.gis));
      default: return mcQ(item, `${item.name} 属于下列哪一类地理概念？`, item.tag, tagPool(item.type));
    }
  }
  function reviewTF(item) {
    let correct = '', wrong = '';
    switch (item.type) {
      case 'continent': correct = `${item.name} 约有 ${item.countries} 个国家。`; wrong = `${item.name} 约有 ${wrongFrom(GEO_DATA.continents.map(c => c.countries), item.countries)} 个国家。`; break;
      case 'country': correct = `${item.capital} 是 ${item.name} 的首都。`; wrong = `${wrongFrom(GEO_DATA.countries.map(c => c.capital), item.capital)} 是 ${item.name} 的首都。`; break;
      case 'landform': correct = `${item.name} 属于「${item.type}」类地貌。`; wrong = `${item.name} 属于「${wrongFrom(GEO_DATA.landforms.map(c => c.type), item.type)}」类地貌。`; break;
      case 'climate': { const d = infoVal(item, '分布'); correct = `${item.name} 主要分布在 ${d}。`; wrong = `${item.name} 主要分布在 ${wrongFrom(GEO_DATA.climates.map(c => infoVal(c, '分布')), d)}。`; break; }
      default: {
        const arrFor = typeArray(item.type);
        correct = `${item.name} 属于「${item.tag}」类。`;
        wrong = `${item.name} 属于「${wrongFrom(uniqTags(arrFor), item.tag)}」类。`;
      }
    }
    const useCorrect = Math.random() < 0.5;
    return { q: useCorrect ? correct : wrong, sub: '判断题', type: 'tf', options: ['对', '错'], answer: useCorrect ? '对' : '错', accept: [useCorrect ? '对' : '错'], explain: correct };
  }
  function reviewFill(item) {
    let q = '', answer = '';
    switch (item.type) {
      case 'continent': q = `${item.name} 约有 ____ 个国家。`; answer = String(item.countries); break;
      case 'country': q = `${item.name} 的首都是 ____。`; answer = item.capital; break;
      case 'landform': q = `${item.name} 主要位于 ____（大洲）。`; answer = continentOf(infoVal(item, '位置') || ''); break;
      case 'climate': { const t = infoVal(item, '气温'); q = `${item.name} 的气温特征是「____」。`; answer = t; break; }
      case 'climateSys': q = `${item.name} 属于「____」类气候系统要素。`; answer = item.tag; break;
      case 'ocean': q = `${item.name} 属于 ____（暖流 / 寒流 / 温盐 / 上升流）。`; answer = item.kind; break;
      case 'geology': q = `${item.name} 属于「____」类地质过程 / 地貌。`; answer = item.tag; break;
      case 'gis': q = `${item.name} 属于 GIS 中的「____」类。`; answer = item.tag; break;
      case 'proc': case 'astro': case 'meteo': case 'astroStar': case 'hydro': case 'biogeo': case 'human': q = `${item.name} 属于「____」类地理概念。`; answer = item.tag; break;
      default: q = `${item.name} 属于「____」类地理概念。`; answer = item.tag;
    }
    return { q, sub: '填空题', type: 'fill', answer, accept: [answer], explain: `${item.name}：${answer}。` };
  }
  function buildReviewQuestions(item) { return shuffle([reviewMC(item), reviewTF(item), reviewFill(item)]); }

  /* --------------------------- 复习运行器 --------------------------- */
  let quizState = null;
  function startReview(id) {
    const it = findItemById(id);
    if (!it) return;
    const qs = buildReviewQuestions(it);
    quizState = { type: 'review', reviewId: id, title: `复习 · ${it.name}`, qs, idx: 0, score: 0 };
    renderQuizQuestion();
    $('#quizOverlay').classList.add('show');
  }
  function closeQuiz() { $('#quizOverlay').classList.remove('show'); quizState = null; }

  function renderQuizQuestion() {
    const ov = $('#quizOverlay'); const st = quizState; const q = st.qs[st.idx];
    const total = st.qs.length; const pct = Math.round((st.idx / total) * 100);
    if (st.idx >= total) { renderQuizResult(); return; }

    let body = '';
    if (q.type === 'fill') {
      body = `<div class="quiz-q">${q.q}</div><div class="quiz-qsub">${q.sub} · 第 ${st.idx + 1} / ${total} 题</div>
        <input class="q-input" id="qinput" placeholder="输入答案" autocomplete="off" />
        <button class="q-submit" id="qsubmit">提交答案</button>
        <div class="q-feedback" id="qfb"></div>`;
    } else {
      const keys = q.type === 'tf' ? ['✓', '✕'] : ['A', 'B', 'C', 'D'];
      body = `<div class="quiz-q">${q.q}</div><div class="quiz-qsub">${q.sub} · 第 ${st.idx + 1} / ${total} 题</div>
        <div class="q-options">` + q.options.map((opt, i) => `<button class="q-opt" data-opt="${esc(opt)}"><span class="o-key">${keys[i]}</span><span>${esc(opt)}</span></button>`).join('') + `</div>
        <div class="q-feedback" id="qfb"></div>`;
    }
    ov.innerHTML = `<div class="quiz-head"><button class="qh-close" id="qclose">✕</button>
      <div class="qh-title">${esc(st.title)}</div><div class="qh-count">${st.idx + 1}/${total}</div></div>
      <div class="quiz-progress"><i style="width:${pct}%"></i></div>
      <div class="quiz-body">${body}</div>`;

    $('#qclose').addEventListener('click', () => { if (confirm('确定退出吗？进度将不会保存。')) closeQuiz(); });

    if (q.type === 'fill') {
      const submit = () => {
        const val = ($('#qinput').value || '').trim();
        if (!val) { toast('请输入答案'); return; }
        $('#qinput').disabled = true; $('#qsubmit').disabled = true;
        const ok = q.accept.some(a => a.toLowerCase() === val.toLowerCase());
        if (ok) st.score++;
        showFeedback(q, ok, q.answer);
      };
      $('#qsubmit').addEventListener('click', submit);
      $('#qinput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      setTimeout(() => { const el = $('#qinput'); if (el) el.focus(); }, 250);
    } else {
      $$('.q-opt', ov).forEach(btn => btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const chosen = btn.dataset.opt; const correct = chosen === q.answer;
        if (correct) st.score++;
        $$('.q-opt', ov).forEach(b => {
          b.disabled = true;
          if (b.dataset.opt === q.answer) b.classList.add('correct');
          else if (b === btn) b.classList.add('wrong');
          else b.classList.add('dim');
        });
        showFeedback(q, correct, q.answer);
      }));
    }
  }

  function showFeedback(q, correct, correctText) {
    const fb = $('#qfb');
    fb.className = 'q-feedback show ' + (correct ? 'ok' : 'no');
    fb.innerHTML = (correct ? '✅ 回答正确！' : `❌ 正确答案：${esc(correctText)}`) +
      `<br><span style="opacity:.85">${esc(q.explain)}</span>`;
    setTimeout(() => { quizState.idx++; renderQuizQuestion(); }, 1300);
  }

  function renderQuizResult() {
    const st = quizState; const total = st.qs.length; const pct = Math.round((st.score / total) * 100);
    let emoji, text;
    if (st.type === 'review') {
      const passed = pct === 100;
      Spaced.completeReview(st.reviewId, passed);
      const it = Spaced.data().items[st.reviewId];
      if (passed) {
        emoji = it && it.stage >= INTERVALS.length ? '🏆' : '✅';
        text = it && it.stage >= INTERVALS.length ? '已掌握！' : `复习完成，已安排第 ${it.stage + 1} 次复习`;
      } else { emoji = '🔁'; text = '有些生疏，明天再复习一次'; }
    } else {
      emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📚';
      text = pct >= 90 ? '太棒了！' : pct >= 70 ? '掌握得不错' : pct >= 50 ? '已有基础' : '别灰心，再练练';
    }
    $('#quizOverlay').innerHTML = `<div class="quiz-head"><button class="qh-close" id="qclose">✕</button>
      <div class="qh-title">${esc(st.title)} · 完成</div><div class="qh-count">结果</div></div>
      <div class="quiz-body"><div class="quiz-result">
        <div class="r-emoji">${emoji}</div>
        <div class="r-score">${st.score} / ${total}</div>
        <div class="r-text">${text}<br>正确率 ${pct}%</div>
        <div class="r-actions">
          <button class="btn-ghost" id="qagain">再来一次</button>
          <button class="btn-primary" id="qback">返回今日</button>
        </div>
      </div></div>`;
    $('#qclose').addEventListener('click', closeQuiz);
    $('#qagain').addEventListener('click', () => startReview(st.reviewId));
    $('#qback').addEventListener('click', () => { closeQuiz(); switchTab('today'); });
  }

  /* --------------------------- 进度页 --------------------------- */
  function renderProgress() {
    const d = Spaced.data();
    const learned = Spaced.learnedCount();
    const due = Spaced.dueList().length;
    const mastered = Spaced.masteredCount();
    const streak = d.streak || 0;
    const pct = Math.round(learned / TOTAL_ITEMS * 100);
    const reviewing = learned - mastered;
    const nx = nextToLearn();
    const byId = {}; ALL_ITEMS().forEach(x => { byId[x.id] = x; });
    const hist = d.history.slice(0, 12);
    const histHtml = hist.length ? hist.map(h => {
      const isFail = h.kind === 'review' && h.result === 'fail';
      const emoji = h.kind === 'learn' ? '📘' : '🔁';
      const res = h.kind === 'review' ? (h.result === 'pass' ? '通过' : '待巩固') : '学习';
      const color = isFail ? 'var(--bad)' : 'var(--text)';
      return `<div class="list-row"><div class="lr-emoji">${emoji}</div><div class="lr-main"><div class="lr-t">${esc(h.name)}</div><div class="lr-d">${new Date(h.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div><div class="lr-right" style="color:${color}">${res}</div></div>`;
    }).join('') : `<div class="empty"><span class="e-emoji">▤</span>还没有学习记录。</div>`;

    const rows = CURRICULUM.map(id => {
      const it = byId[id]; const rec = d.items[id];
      let status, cls;
      if (!rec) { status = '待学'; cls = 'todo'; }
      else if (rec.stage >= INTERVALS.length) { status = '已掌握'; cls = 'done'; }
      else { status = '复习中'; cls = 'review'; }
      return { name: it.name, type: it.type, status, cls,
        last: rec ? rec.lastStudy : '—',
        next: rec ? (rec.nextReview || '已掌握') : '—',
        rc: rec ? rec.stage : '—' };
    });
    const tableHtml = `<div class="ptable-wrap"><div class="ptable" id="ptable">
      <div class="pt-head"><div class="pt-c c-name">知识点</div><div class="pt-c c-st">状态</div><div class="pt-c c-d">上次学习</div><div class="pt-c c-d">下次复习</div><div class="pt-c c-n">次数</div></div>` +
      rows.map(r => `<div class="pt-row" data-st="${r.cls}">
        <div class="pt-c c-name">${typeEmoji(r.type)} ${esc(r.name)}</div>
        <div class="pt-c c-st"><span class="st st-${r.cls}">${r.status}</span></div>
        <div class="pt-c c-d">${esc(r.last)}</div>
        <div class="pt-c c-d">${esc(r.next)}</div>
        <div class="pt-c c-n">${r.rc}</div>
      </div>`).join('') + `</div></div>`;

    $('#page-progress').innerHTML = `
      <div class="sec-title">总体进度</div>
      <div class="stats-grid">
        <div class="stat accent"><div class="stat-num">${learned}<small>/${TOTAL_ITEMS}</small></div><div class="stat-lbl">已学习</div></div>
        <div class="stat"><div class="stat-num">${streak}<small>天</small></div><div class="stat-lbl">连续学习</div></div>
        <div class="stat"><div class="stat-num">${due}</div><div class="stat-lbl">待复习</div></div>
        <div class="stat"><div class="stat-num">${mastered}</div><div class="stat-lbl">已掌握</div></div>
      </div>
      <div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:10px"><span>总体掌握度</span><span style="color:var(--accent)">${pct}%</span></div><div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div></div>
      <div class="sec-title">科学学习路径</div>
      <div class="phase-strip">${PHASES.map((p, pi) => {
        const total = p.ids.length;
        const done = p.ids.filter(id => Spaced.data().items[id]).length;
        const pp = Math.round(done / total * 100);
        const active = nx && PHASE_OF[nx.id] === pi;
        return `<div class="phase ${active ? 'on' : ''}" data-phase="${pi}" role="button" tabindex="0">
          <div class="phase-top"><span class="phase-emoji">${p.emoji}</span><span class="phase-label">${esc(p.label)}</span><span class="phase-count">${done}/${total}</span></div>
          <div class="phase-track"><div class="phase-fill" style="width:${pp}%"></div></div>
        </div>`;
      }).join('')}</div>
      <div class="sec-title">学习进度表</div>
      <div class="hint" style="margin:0 4px 12px">按顺序遵循地理学科逻辑：① 地球与宇宙 → ② 大气气候 → ③ 海洋水文 → ④ 岩石圈地貌 → ⑤ 土壤生物 → ⑥ GIS → ⑦ 区域人文。状态：<b>待学</b>（未开始）/ <b>复习中</b>（已学、按艾宾浩斯复习中）/ <b>已掌握</b>（6 次复习完成）。</div>
      <div class="seg" id="ptFilter">
        <button data-f="all" class="on">全部 ${TOTAL_ITEMS}</button>
        <button data-f="todo">待学 ${TOTAL_ITEMS - learned}</button>
        <button data-f="review">复习中 ${reviewing}</button>
        <button data-f="done">已掌握 ${mastered}</button>
      </div>
      ${tableHtml}

      <div class="sec-title">数据备份</div>
      <div class="backup-row">
        <button class="btn-ghost" id="exportBtn">⬇ 导出进度</button>
        <button class="btn-ghost" id="importBtn">⬆ 导入进度</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" hidden />
      <div class="hint">导出为 JSON 文件可跨设备备份；换手机或清缓存后，用「导入进度」恢复全部学习记录与复习计划。</div>

      <div class="sec-title">近期活动</div>
      <div class="card">${histHtml}</div>
      <button class="btn-ghost btn-block" id="resetBtn" style="margin-top:18px;color:var(--bad)">清空学习记录</button>
      <div class="hint">📌 数据仅保存在本机浏览器。清空后将丢失全部学习计划与进度。</div>`;
    $('#ptFilter').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#ptFilter button').forEach(x => x.classList.toggle('on', x === b));
      const f = b.dataset.f;
      $$('#ptable .pt-row').forEach(row => {
        row.style.display = (f === 'all' || row.dataset.st === f) ? '' : 'none';
      });
    });
    $$('#page-progress .phase').forEach(el => {
      el.addEventListener('click', () => openPhaseDetail(+el.dataset.phase));
    });
    $('#resetBtn').addEventListener('click', () => {
      if (confirm('确定清空全部学习记录吗？此操作不可撤销。')) { Spaced.reset(); toast('已清空'); renderProgress(); }
    });
    $('#exportBtn').addEventListener('click', exportProgress);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) { if (confirm('导入将覆盖当前学习进度，确定继续？')) importProgress(f); }
      e.target.value = '';
    });
  }

  /* --------------------------- 阶段导览弹层 --------------------------- */
  /* 点击「科学学习路径」的某一阶段，展开该阶段全部知识点及其掌握状态；点击单条可查看详情 */
  function openPhaseDetail(pi) {
    const p = PHASES[pi];
    if (!p) return;
    const d = Spaced.data();
    const byId = {}; ALL_ITEMS().forEach(x => { byId[x.id] = x; });
    const items = p.ids.map(id => {
      const it = byId[id]; const rec = d.items[id];
      let status, cls;
      if (!rec) { status = '待学'; cls = 'todo'; }
      else if (rec.stage >= INTERVALS.length) { status = '已掌握'; cls = 'done'; }
      else { status = '复习中'; cls = 'review'; }
      return { id, name: it.name, type: it.type, status, cls,
        last: rec ? rec.lastStudy : '—',
        next: rec ? (rec.nextReview || '已掌握') : '—',
        rc: rec ? rec.stage : '—' };
    });
    const cnt = (c) => items.filter(x => x.cls === c).length;
    const listHtml = items.map(it => `<div class="pm-item" data-type="${it.type}" data-id="${it.id}">
      <div class="pm-item-main">
        <div class="pm-item-name">${typeEmoji(it.type)} ${esc(it.name)}</div>
        <div class="pm-item-meta">上次 ${esc(it.last)} · 下次 ${esc(it.next)} · 复习 ${it.rc} 次</div>
      </div>
      <div class="pm-item-right"><span class="st st-${it.cls}">${it.status}</span><span class="pm-arrow">›</span></div>
    </div>`).join('');
    $('#phaseModalContent').innerHTML = `
      <div class="pm-head">
        <button class="qh-close" id="phaseClose">✕</button>
        <div class="pm-title">${p.emoji} ${esc(p.label)}</div>
        <div class="pm-sub">共 ${p.ids.length} 个知识点 · 已掌握 ${cnt('done')} · 复习中 ${cnt('review')} · 待学 ${cnt('todo')}</div>
      </div>
      <div class="pm-list">${listHtml}</div>`;
    $('#phaseModal').classList.add('show');
    $('#phaseClose').addEventListener('click', closePhaseModal);
    $('#phaseModal').addEventListener('click', (e) => { if (e.target === $('#phaseModal')) closePhaseModal(); });
    $$('.pm-item', $('#phaseModal')).forEach(el => el.addEventListener('click', () => {
      closePhaseModal();
      openDetail(el.dataset.type, el.dataset.id);
    }));
  }
  function closePhaseModal() { $('#phaseModal').classList.remove('show'); }

  /* --------------------------- 进度导入 / 导出 --------------------------- */
  function exportProgress() {
    const raw = localStorage.getItem(Spaced.K);
    const data = raw || JSON.stringify({ items: {}, streak: 0, lastLearn: null, history: [] });
    let blobUrl = null;
    try {
      const blob = new Blob([data], { type: 'application/json' });
      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = '经纬学习进度_' + dateStr(new Date()).replace(/-/g, '') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      // 极端环境下回退：直接以文本形式下载
      const a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
      a.download = '经纬学习进度_' + dateStr(new Date()).replace(/-/g, '') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
    }
    if (blobUrl) setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch (e) {} }, 1000);
    toast('已导出学习进度');
  }
  function importProgress(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || typeof obj !== 'object' || typeof obj.items !== 'object') throw new Error('bad');
        localStorage.setItem(Spaced.K, JSON.stringify(obj));
        Spaced._d = null; // 强制下次读取重新解析（含迁移兜底）
        toast('已导入学习进度');
        switchTab('progress');
      } catch (e) {
        alert('导入失败：文件不是有效的学习进度备份。');
      }
    };
    reader.readAsText(file);
  }

  /* ----------------------------- 启动 ----------------------------- */
  $$('#tabbar .tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('#hDate').textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  switchTab('today');

  /* 注册 Service Worker：支持「安装到桌面 / 手机主屏」并离线使用 */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // 测试钩子（仅内存注入，不改动源文件）
  window.__t = {
    GEO_DATA, TOTAL_ITEMS, INTERVALS, Spaced, dailyRec, ALL_ITEMS,
    buildReviewQuestions, startReview, renderToday, switchTab, openDetail,
    markLearned, nextToLearn, curriculum: CURRICULUM, curriculumIndex: CURRIC_INDEX,
    phases: PHASES, phaseOf: (id) => PHASE_OF[id], recDesc,
    openPhaseDetail, exportProgress, importProgress, phaseModalEl: () => $('#phaseModal'),
    qs: () => quizState, findItemById
  };
})();
