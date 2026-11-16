(function () {
  'use strict';

  const {
    CATEGORIES,
    DIFFICULTIES,
    CHALLENGES,
    INTERVIEW_STRUCT_OPTIONS,
    INTERVIEW_COMPL_OPTIONS,
    CODEWARS_TRACK,
    PYTHON_CSHARP_CHEATSHEET,
    generateDailyParametricChallenge
  } = window.SINAPSE_DATA;

  const STORAGE_KEY = 'sinapse_state_v1';
  const SYNC_KEY = 'sinapse_sync_cfg_v1';

  /* ==================== UTILITÁRIOS DE DATA & HTML ==================== */
  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysToKey(dateKey, delta) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return localDateKey(new Date(y, m - 1, d + delta));
  }

  function formatDateBR(dateKey) {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-');
    return `${d}/${m}/${y}`;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightCode(code, lang) {
    const kwList =
      lang === 'python'
        ? '\\b(?:def|return|for|in|if|elif|else|while|break|continue|and|or|not|print|lambda|del|from|import|True|False|None)\\b'
        : '\\b(?:var|int|string|bool|char|void|new|for|foreach|in|if|else|while|break|return|out|is|true|false|null)\\b';
    const tokenRe = new RegExp(
      `(${lang === 'python' ? '#[^\\n]*' : '\\/\\/[^\\n]*'})|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|(${kwList})|(\\b\\d+\\b)|(\\b[a-zA-Z_]\\w*(?=\\s*\\())`,
      'g'
    );
    let out = '';
    let last = 0;
    let m;
    while ((m = tokenRe.exec(code)) !== null) {
      if (m.index > last) out += escapeHtml(code.slice(last, m.index));
      const [full, com, str, kw, num, fn] = m;
      const safe = escapeHtml(full);
      if (com) out += `<span class="tok-com">${safe}</span>`;
      else if (str) out += `<span class="tok-str">${safe}</span>`;
      else if (kw) out += `<span class="tok-kw">${safe}</span>`;
      else if (num) out += `<span class="tok-num">${safe}</span>`;
      else if (fn) out += `<span class="tok-fn">${safe}</span>`;
      else out += safe;
      last = tokenRe.lastIndex;
    }
    if (last < code.length) out += escapeHtml(code.slice(last));
    return out;
  }

  function findChallengeById(id) {
    if (!id) return null;
    if (id.startsWith('daily-gen-')) {
      return generateDailyParametricChallenge(id.slice('daily-gen-'.length));
    }
    return CHALLENGES.find((c) => c.id === id) || null;
  }

  /* ==================== ESTADO PRINCIPAL ==================== */
  function defaultState() {
    return {
      v: 2,
      theme: 'dark',
      codeLang: 'python',
      blindThink: false,
      activeTab: 'hoje',
      hojeSubtab: 'dupla', // 'dupla' | 'livecode' | 'kata'
      explorarSubtab: 'desafios', // 'desafios' | 'codewars' | 'cola'
      activeLab: 'bowl',
      exploreFilter: 'all',
      exploreStatus: 'all',
      selectedExploreId: CHALLENGES[0].id,
      cwTrackFilter: 'pending', // 'pending' | 'done' | 'all'
      selectedKataSlug: CODEWARS_TRACK[0].slug,
      colaFilter: 'Todas',
      colaSearch: '',
      liveCodeId: 'estrategia-01',
      dailyPicks: {},
      dailyChecks: {},
      attempts: {},
      labsDone: {},
      codewarsProfile: {
        username: '',
        honor: 0,
        overallRank: '',
        pythonRank: '',
        csharpRank: '',
        totalCompleted: 0,
        lastSyncAt: null,
        completedSlugs: {},
        _u: 0
      },
      kataDrafts: {},
      kataCache: {},
      bugJournal: [],
      savedAt: null
    };
  }

  function normalizeState(raw) {
    const base = defaultState();
    const s = { ...base, ...(raw || {}) };
    s.dailyPicks = s.dailyPicks && typeof s.dailyPicks === 'object' ? s.dailyPicks : {};
    s.dailyChecks = s.dailyChecks && typeof s.dailyChecks === 'object' ? s.dailyChecks : {};
    s.attempts = s.attempts && typeof s.attempts === 'object' ? s.attempts : {};
    s.labsDone = s.labsDone && typeof s.labsDone === 'object' ? s.labsDone : {};
    s.kataDrafts = s.kataDrafts && typeof s.kataDrafts === 'object' ? s.kataDrafts : {};
    s.kataCache = s.kataCache && typeof s.kataCache === 'object' ? s.kataCache : {};
    s.bugJournal = Array.isArray(s.bugJournal) ? s.bugJournal : [];
    s.codewarsProfile = {
      ...base.codewarsProfile,
      ...(s.codewarsProfile || {}),
      completedSlugs:
        s.codewarsProfile && typeof s.codewarsProfile.completedSlugs === 'object'
          ? s.codewarsProfile.completedSlugs
          : {}
    };
    return s;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch (_) {
      return defaultState();
    }
  }

  let state = loadState();

  const uiSession = {
    revealedBlind: {},
    cwLang: 'python',
    bugOutcome: 'hit',
    cwSyncBusy: false,
    cwSyncErr: '',
    kataLoadingSlug: '',
    live: {
      secondsLeft: 180,
      running: false,
      timerId: null,
      pickedStruct: null,
      pickedCompl: null,
      stage: 'prep' // 'prep' | 'quiz'
    }
  };

  function saveState(triggerSync = true) {
    state.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
    if (triggerSync) scheduleSync();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', state.theme === 'dark' ? '#0b1120' : '#f1f5f9');
    }
    const btn = el('btn-theme');
    if (btn) btn.textContent = state.theme === 'dark' ? '☀' : '🌙';
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  /* ==================== CHECK DIÁRIO, OFENSIVA & META SEMANAL ==================== */
  function ensureDayEntry(dateKey) {
    if (!state.dailyChecks[dateKey]) {
      state.dailyChecks[dateKey] = { count: 0, solvedIds: [], codewars: [], _u: Date.now() };
    }
    const d = state.dailyChecks[dateKey];
    if (!Array.isArray(d.solvedIds)) d.solvedIds = [];
    if (!Array.isArray(d.codewars)) d.codewars = [];
    return d;
  }

  function recordDailySolve(itemId, dateKey = localDateKey()) {
    const day = ensureDayEntry(dateKey);
    if (!day.solvedIds.includes(itemId)) {
      day.solvedIds.push(itemId);
      day.count = Math.max(day.count || 0, day.solvedIds.length);
      day._u = Date.now();
      return true;
    }
    return false;
  }

  function computeStreaks() {
    const today = localDateKey();
    const hasCheck = (k) => (state.dailyChecks[k]?.count || 0) >= 1;

    let current = 0;
    let cursor = hasCheck(today) ? today : addDaysToKey(today, -1);
    while (hasCheck(cursor)) {
      current++;
      cursor = addDaysToKey(cursor, -1);
    }

    const keys = Object.keys(state.dailyChecks).filter(hasCheck).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const k of keys) {
      if (prev && addDaysToKey(prev, 1) === k) run++;
      else run = 1;
      if (run > best) best = run;
      prev = k;
    }

    const doubleDays = Object.values(state.dailyChecks).filter((d) => (d?.count || 0) >= 2).length;
    return { current, best, totalCheckDays: keys.length, doubleDays };
  }

  function computeWeeklyMeta() {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7; // Segunda = 0 .. Domingo = 6
    const todayKey = localDateKey(now);
    const mondayKey = addDaysToKey(todayKey, -mondayOffset);

    let checkDays = 0;
    let katasWeek = 0;
    for (let i = 0; i < 7; i++) {
      const k = addDaysToKey(mondayKey, i);
      const d = state.dailyChecks[k];
      if ((d?.count || 0) >= 1) checkDays++;
      katasWeek += (d?.codewars || []).length;
    }
    return {
      checkDays,
      checkTarget: 5,
      katasWeek,
      kataTarget: 2,
      complete: checkDays >= 5 && katasWeek >= 2
    };
  }

  function getDueReviews() {
    const today = localDateKey();
    return CHALLENGES.filter((ch) => {
      const a = state.attempts[ch.id];
      return a && a.nextReviewDate && a.nextReviewDate <= today;
    });
  }

  /* ==================== INTEGRAÇÃO CODEWARS API ==================== */
  async function codewarsFetch(directUrl, proxyPath) {
    try {
      const r = await fetch(directUrl, { cache: 'no-store' });
      if (r.ok) return await r.json();
      if (r.status === 404) throw new Error('Não encontrado no Codewars (404).');
    } catch (e) {
      if (e.message && e.message.includes('404')) throw e;
      // Fallback para proxy da Vercel caso bloqueado por CORS/rede
      if (location.protocol !== 'file:') {
        const pr = await fetch(proxyPath, { cache: 'no-store' });
        if (pr.ok) return await pr.json();
        if (pr.status === 404) throw new Error('Não encontrado no Codewars (404).');
      }
      throw new Error('Sem resposta da API do Codewars agora.');
    }
    throw new Error('Erro ao consultar Codewars.');
  }

  function isKataDone(slug) {
    return !!state.codewarsProfile?.completedSlugs?.[slug];
  }

  function getNextTrackKata() {
    return CODEWARS_TRACK.find((k) => !isKataDone(k.slug)) || CODEWARS_TRACK[0];
  }

  async function syncCodewarsUser(rawUser, silent = false) {
    const user = (rawUser || state.codewarsProfile?.username || '').trim();
    if (!user) {
      if (!silent) showToast('Informe seu username do Codewars.');
      return;
    }
    uiSession.cwSyncBusy = true;
    uiSession.cwSyncErr = '';
    render();
    try {
      const profile = await codewarsFetch(
        `https://www.codewars.com/api/v1/users/${encodeURIComponent(user)}`,
        `/api/codewars?user=${encodeURIComponent(user)}`
      );
      const completed = await codewarsFetch(
        `https://www.codewars.com/api/v1/users/${encodeURIComponent(user)}/code-challenges/completed?page=0`,
        `/api/codewars?type=completed&user=${encodeURIComponent(user)}&page=0`
      );

      const cp = state.codewarsProfile;
      cp.username = profile.username || user;
      cp.honor = profile.honor || 0;
      cp.overallRank = profile.ranks?.overall?.name || '';
      cp.pythonRank = profile.ranks?.languages?.python?.name || '';
      cp.csharpRank = profile.ranks?.languages?.csharp?.name || '';
      cp.totalCompleted = profile.codeChallenges?.totalCompleted || 0;
      cp.lastSyncAt = new Date().toISOString();
      cp._u = Date.now();

      let newChecks = 0;
      const items = Array.isArray(completed?.data) ? completed.data : [];
      items.forEach((it) => {
        const keySlug = it.slug || it.id;
        if (!keySlug) return;
        const langs = Array.isArray(it.completedLanguages) ? it.completedLanguages : [];
        cp.completedSlugs[keySlug] = {
          name: it.name || keySlug,
          completedAt: it.completedAt || null,
          langs
        };
        if (it.completedAt) {
          const dKey = localDateKey(new Date(it.completedAt));
          const day = ensureDayEntry(dKey);
          const cwId = `cw:${keySlug}`;
          const alreadyLogged = day.codewars.some((x) => x.slug === keySlug);
          if (!alreadyLogged) {
            const pickedLang = langs.includes('python') ? 'python' : langs.includes('csharp') ? 'csharp' : (langs[0] || 'python');
            day.codewars.push({
              lang: pickedLang,
              note: it.name || keySlug,
              slug: keySlug,
              ts: Date.parse(it.completedAt) || Date.now()
            });
            day._u = Date.now();
          }
          if (recordDailySolve(cwId, dKey)) newChecks++;
        }
      });

      saveState();
      if (!silent) {
        showToast(
          newChecks > 0
            ? `⚔ Codewars sincronizado! +${newChecks} check(s) automático(s) no calendário.`
            : `⚔ Codewars sincronizado (${cp.totalCompleted} katas no perfil).`
        );
      }
    } catch (err) {
      uiSession.cwSyncErr = err.message || 'Falha ao sincronizar Codewars.';
      if (!silent) showToast(uiSession.cwSyncErr);
    } finally {
      uiSession.cwSyncBusy = false;
      render();
    }
  }

  async function fetchKataDetail(slug) {
    uiSession.kataLoadingSlug = slug;
    render();
    try {
      const data = await codewarsFetch(
        `https://www.codewars.com/api/v1/code-challenges/${encodeURIComponent(slug)}`,
        `/api/codewars?type=kata&slug=${encodeURIComponent(slug)}`
      );
      state.kataCache[slug] = {
        description: data.description || '',
        rank: data.rank?.name || '',
        url: data.url || `https://www.codewars.com/kata/${slug}`
      };
      saveState(false);
      showToast('📖 Enunciado carregado e salvo para leitura offline!');
    } catch (err) {
      showToast(err.message || 'Não foi possível carregar o enunciado.');
    } finally {
      uiSession.kataLoadingSlug = '';
      render();
    }
  }

  /* ==================== DUPLA DO DIA & RESPOSTA ==================== */
  function pickBalancedPair(excludeIds = []) {
    const excluded = new Set(excludeIds);
    const unsolved = CHALLENGES.filter((c) => !state.attempts[c.id]?.solved && !excluded.has(c.id));
    const pool = unsolved.length >= 2 ? unsolved : CHALLENGES.filter((c) => !excluded.has(c.id));

    const picks = [];
    const vovo = pool.find((c) => c.id === 'borda-01');
    if (vovo && !state.attempts['borda-01']?.solved) picks.push(vovo.id);

    const groupA = pool.filter((c) => (c.category === 'borda' || c.category === 'estrategia') && !picks.includes(c.id));
    const groupB = pool.filter((c) => (c.category === 'trace' || c.category === 'enigma') && !picks.includes(c.id));

    if (picks.length === 0 && groupA.length) picks.push(groupA[Math.floor(Math.random() * groupA.length)].id);
    if (picks.length < 2 && groupB.length) picks.push(groupB[Math.floor(Math.random() * groupB.length)].id);
    for (const c of pool) {
      if (picks.length >= 2) break;
      if (!picks.includes(c.id)) picks.push(c.id);
    }
    return picks;
  }

  function getTodayPicks() {
    const today = localDateKey();
    let list = state.dailyPicks[today];
    if (!Array.isArray(list) || list.length === 0) {
      list = pickBalancedPair();
      state.dailyPicks[today] = list;
      saveState(false);
    }
    return list.map(findChallengeById).filter(Boolean);
  }

  function swapDailyChallenge(oldId) {
    const today = localDateKey();
    const current = state.dailyPicks[today] || [];
    const unsolved = CHALLENGES.filter((c) => !state.attempts[c.id]?.solved && !current.includes(c.id));
    const pool = unsolved.length ? unsolved : CHALLENGES.filter((c) => !current.includes(c.id));
    if (!pool.length) return showToast('Todos os desafios já estão na lista!');
    const next = pool[Math.floor(Math.random() * pool.length)];
    state.dailyPicks[today] = current.map((id) => (id === oldId ? next.id : id));
    saveState();
    render();
  }

  function addExtraDailyChallenge() {
    const today = localDateKey();
    const current = state.dailyPicks[today] || [];
    const unsolved = CHALLENGES.filter((c) => !state.attempts[c.id]?.solved && !current.includes(c.id));
    const pool = unsolved.length ? unsolved : CHALLENGES.filter((c) => !current.includes(c.id));
    if (!pool.length) return showToast('Todos os 36 desafios já estão listados hoje!');
    const next = pool[Math.floor(Math.random() * pool.length)];
    state.dailyPicks[today] = [...current, next.id];
    saveState();
    render();
    showToast(`Desafio extra adicionado: ${next.title}`);
  }

  function answerChallenge(challengeId, chosenIdx) {
    const ch = findChallengeById(challengeId);
    if (!ch) return;

    const today = localDateKey();
    const prev = state.attempts[challengeId] || {
      tries: 0,
      solved: false,
      firstTryRight: false,
      lastWrong: false,
      selected: null,
      showHint: false,
      reviewStep: 0,
      nextReviewDate: null,
      _u: Date.now()
    };

    const isCorrect = chosenIdx === ch.correctIndex;
    const isDueReview = prev.nextReviewDate && prev.nextReviewDate <= today;
    prev.tries = (prev.tries || 0) + 1;
    prev.selected = chosenIdx;
    prev._u = Date.now();

    if (isCorrect) {
      if (!prev.solved && prev.tries === 1) prev.firstTryRight = true;
      prev.solved = true;
      prev.lastWrong = false;

      if (isDueReview) {
        const intervals = [1, 3, 7];
        const nextStep = (prev.reviewStep || 0) + 1;
        if (nextStep < intervals.length) {
          prev.reviewStep = nextStep;
          prev.nextReviewDate = addDaysToKey(today, intervals[nextStep]);
        } else {
          prev.reviewStep = 3;
          prev.nextReviewDate = null;
        }
      }

      const newlyCountedToday = recordDailySolve(challengeId);
      const dayCount = state.dailyChecks[today]?.count || 0;
      if (newlyCountedToday) {
        if (dayCount === 1) showToast('✅ Check Diário garantido! Mais 1 para Dose Dupla ⚡');
        else if (dayCount === 2) showToast('⚡ Dose Dupla concluída hoje! Mente afiada.');
        else showToast(`🔥 +1 resolvido hoje (${dayCount} no total)!`);
      } else {
        showToast('✅ Resposta correta!');
      }
    } else {
      prev.lastWrong = true;
      prev.reviewStep = 0;
      if (!ch.isParametric) prev.nextReviewDate = addDaysToKey(today, 1);
      showToast('Quase! Veja o conceito — revisão marcada para amanhã.');
    }

    state.attempts[challengeId] = prev;
    saveState();
    render();
  }

  function resetChallengeAttempt(challengeId) {
    const prev = state.attempts[challengeId];
    if (!prev) return;
    prev.selected = null;
    prev.lastWrong = false;
    prev._u = Date.now();
    delete uiSession.revealedBlind[challengeId];
    saveState();
    render();
  }

  function toggleHint(challengeId) {
    const prev = state.attempts[challengeId] || { tries: 0, solved: false, _u: Date.now() };
    prev.showHint = !prev.showHint;
    prev._u = Date.now();
    state.attempts[challengeId] = prev;
    saveState(false);
    render();
  }

  /* ==================== BANNER DIÁRIO ==================== */
  function renderDailyBanner() {
    const today = localDateKey();
    const day = state.dailyChecks[today] || { count: 0, codewars: [] };
    const count = day.count || 0;
    const cwToday = day.codewars || [];
    const streaks = computeStreaks();
    const weekly = computeWeeklyMeta();

    let bannerClass = 'daily-banner';
    let title = 'Falta 1 questão para garantir o Check de hoje';
    let sub = '1 acerto garante o dia · 2 completam a Dose Dupla ⚡';
    if (count === 1) {
      bannerClass += ' checked';
      title = '✅ Check Diário Garantido! (1/2)';
      sub = 'Dia salvo! Faça mais 1 para fechar a Dose Dupla ⚡';
    } else if (count >= 2) {
      bannerClass += ' checked double';
      title = `⚡ Dose Dupla Concluída! (${count} hoje)`;
      sub = 'Cérebro ligado hoje. Explore o Lab ou o Kata do Dia.';
    }

    const cells = [];
    for (let i = 13; i >= 0; i--) {
      const k = addDaysToKey(today, -i);
      const info = state.dailyChecks[k];
      const c = info?.count || 0;
      const hasCw = (info?.codewars || []).length > 0;
      let cls = 'hm-cell';
      if (i === 0) cls += ' today';
      if (c === 1) cls += ' lv1';
      else if (c >= 2) cls += ' lv2';
      if (hasCw) cls += ' has-cw';
      cells.push(`<div class="${cls}" title="${formatDateBR(k)}: ${c} check(s)${hasCw ? ' + Codewars' : ''}"></div>`);
    }

    const cwBadge = cwToday.length
      ? `<span class="pill pill-violet">⚔ CW (${cwToday.map((x) => (x.lang === 'python' ? '🐍' : '🟣')).join('')})</span>`
      : '';

    el('daily-banner').className = bannerClass;
    el('daily-banner').innerHTML = `
      <div class="daily-top">
        <div>
          <h2 class="daily-status-title">${title}</h2>
          <p class="daily-status-sub">${sub}</p>
          <span class="weekly-pill">🏆 Semana: ${weekly.checkDays}/${weekly.checkTarget} checks · ${weekly.katasWeek}/${weekly.kataTarget} katas</span>
        </div>
        <div class="streak-chip" title="Dias seguidos com Check">🔥 ${streaks.current}d</div>
      </div>
      <div class="daily-actions-row">
        <div class="progress-dots">
          <span class="dose-pip ${count >= 1 ? 'done' : ''}"></span>
          <span class="dose-pip ${count >= 2 ? 'done' : ''}"></span>
          <span>${Math.min(count, 2)}/2</span>
          ${cwBadge}
        </div>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn btn-sm" type="button" data-action="open-bug" title="Registrar hipótese de bug real do trabalho">🐛 +Bug</button>
          <button class="btn btn-sm btn-violet" type="button" data-action="open-cw">+ Codewars</button>
        </div>
      </div>
      <div class="mini-heatmap" aria-label="Consistência dos últimos 14 dias">${cells.join('')}</div>
    `;
  }

  /* ==================== COMPONENTES REUTILIZÁVEIS ==================== */
  function renderCodeBox(codePython, codeCSharp) {
    if (!codePython && !codeCSharp) return '';
    const lang = state.codeLang === 'csharp' && codeCSharp ? 'csharp' : 'python';
    const code = lang === 'csharp' ? codeCSharp : codePython;
    return `
      <div class="code-box">
        <div class="code-toolbar">
          <span class="muted-text" style="font-size:0.74rem;font-weight:600;">Rastreie mentalmente</span>
          <div class="lang-switch">
            <button type="button" class="lang-btn ${lang === 'python' ? 'active' : ''}" data-action="set-lang" data-lang="python">🐍 Python</button>
            <button type="button" class="lang-btn ${lang === 'csharp' ? 'active' : ''}" data-action="set-lang" data-lang="csharp">🟣 C#</button>
          </div>
        </div>
        <pre class="code-pre"><code>${highlightCode(code, lang)}</code></pre>
      </div>
    `;
  }

  function renderChallengeCard(ch, opts = {}) {
    const cat = CATEGORIES[ch.category];
    const diff = DIFFICULTIES[ch.difficulty];
    const att = state.attempts[ch.id] || {};
    const today = localDateKey();
    const isDueReview = att.nextReviewDate && att.nextReviewDate <= today;
    const isSolvedNow = att.solved && !isDueReview && att.selected === ch.correctIndex;
    const hasAnswered = att.selected !== null && att.selected !== undefined;

    const blindActive = !opts.forceShowOptions && state.blindThink && !hasAnswered && !uiSession.revealedBlind[ch.id];
    const letters = ['A', 'B', 'C', 'D'];
    const optionsHtml = blindActive
      ? `
        <div class="blind-box">
          <p class="muted-text" style="margin:0 0 0.65rem;">Modo <strong>Pensar sem opções</strong> ativo: tente formular sua resposta antes de olhar as alternativas.</p>
          <button type="button" class="btn btn-primary" data-action="reveal-blind" data-id="${ch.id}">Já pensei → Revelar alternativas</button>
        </div>
      `
      : `
        <div class="options-list">
          ${ch.options
            .map((opt, idx) => {
              let cls = 'option-btn';
              if (hasAnswered) {
                if (idx === ch.correctIndex && (att.selected === ch.correctIndex || att.lastWrong)) cls += ' correct';
                else if (idx === att.selected && idx !== ch.correctIndex) cls += ' wrong';
              }
              return `
                <button type="button" class="${cls}" data-action="answer" data-id="${ch.id}" data-idx="${idx}" ${hasAnswered ? 'disabled' : ''}>
                  <span class="option-letter">${letters[idx]}</span>
                  <span>${escapeHtml(opt)}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      `;

    const statusBadge = ch.isParametric
      ? `<span class="pill pill-sky">♾ Gerado Hoje</span>`
      : isDueReview
      ? `<span class="pill pill-rose">🔁 Revisão hoje</span>`
      : att.solved
      ? `<span class="pill pill-emerald">✅ Resolvida</span>`
      : '';

    const explanationHtml = hasAnswered
      ? `
        <div class="explanation-box ${att.selected !== ch.correctIndex ? 'was-wrong' : ''}">
          <strong>${att.selected === ch.correctIndex ? '✅ Boa! Raciocínio certeiro:' : '❌ Quase! O que realmente acontece:'}</strong>
          <p style="margin:0.4rem 0 0;">${escapeHtml(ch.explanation)}</p>
          <span class="concept-tag">💡 ${escapeHtml(ch.csConcept)}</span>
          ${opts.showInterviewTip && ch.interviewTip ? `<p style="margin:0.5rem 0 0;font-size:0.84rem;"><strong>🎤 Fala de Live Code:</strong> ${escapeHtml(ch.interviewTip)}</p>` : ''}
        </div>
      `
      : '';

    const hintHtml = att.showHint ? `<div class="hint-box"><strong>💡 Dica:</strong> ${escapeHtml(ch.hint)}</div>` : '';

    return `
      <article class="card">
        <div class="card-head">
          <div class="pills-row">
            <span class="pill pill-${cat.color}">${cat.icon} ${cat.label}</span>
            <span class="pill pill-${diff.color}">${diff.label}</span>
            ${statusBadge}
          </div>
          ${opts.canSwap && !isSolvedNow ? `<button type="button" class="btn btn-sm btn-ghost" data-action="swap-daily" data-id="${ch.id}">🎲 Trocar</button>` : ''}
        </div>

        <h3 class="challenge-title">${escapeHtml(ch.title)}</h3>
        <p class="challenge-story">${escapeHtml(ch.story)}</p>
        ${renderCodeBox(ch.codePython, ch.codeCSharp)}
        <p class="challenge-question">${escapeHtml(ch.question)}</p>

        <div class="blind-toggle-row">
          <button type="button" class="btn btn-sm btn-ghost" data-action="toggle-hint" data-id="${ch.id}">
            ${att.showHint ? 'Ocultar dica' : '💡 Ver dica'}
          </button>
          ${
            opts.hideBlindToggle
              ? ''
              : `<button type="button" class="btn btn-sm ${state.blindThink ? 'btn-violet' : 'btn-ghost'}" data-action="toggle-blind">
                  💭 Pensar sem opções: ${state.blindThink ? 'ON' : 'OFF'}
                </button>`
          }
        </div>

        ${hintHtml}
        ${optionsHtml}
        ${explanationHtml}

        ${
          hasAnswered
            ? `<div class="actions-row">
                <button type="button" class="btn btn-sm btn-ghost" data-action="retry-card" data-id="${ch.id}">↻ Refazer questão</button>
              </div>`
            : ''
        }
      </article>
    `;
  }

  function renderKataDetailCard(kata, badgeLabel = '⚔ Kata da Trilha') {
    const done = isKataDone(kata.slug);
    const cached = state.kataCache[kata.slug];
    const draft = state.kataDrafts[kata.slug]?.text || '';
    const loading = uiSession.kataLoadingSlug === kata.slug;
    const hasUser = !!state.codewarsProfile?.username;

    return `
      <article class="card">
        <div class="card-head">
          <div class="pills-row">
            <span class="pill pill-violet">${badgeLabel}</span>
            <span class="pill pill-amber">${escapeHtml(kata.kyu)}</span>
            <span class="pill pill-sky">${escapeHtml(kata.topic)}</span>
            ${done ? '<span class="pill pill-emerald">✅ Concluído no CW</span>' : ''}
          </div>
        </div>
        <h3 class="challenge-title">${escapeHtml(kata.title)}</h3>
        <p class="challenge-story">${escapeHtml(kata.summaryPt)}</p>
        <div class="hint-box" style="margin-top:0;margin-bottom:0.65rem;">
          <strong>💡 Dica de padrão:</strong> ${escapeHtml(kata.hintPt)}
        </div>

        <div class="actions-row" style="margin-top:0;">
          <button type="button" class="btn btn-sm" data-action="fetch-kata" data-slug="${kata.slug}" ${loading ? 'disabled' : ''}>
            ${loading ? '⏳ Buscando na API...' : cached ? '↻ Atualizar enunciado API' : '📖 Carregar enunciado completo (API)'}
          </button>
        </div>

        ${cached?.description ? `<div class="kata-desc">${escapeHtml(cached.description)}</div>` : ''}

        <label class="field-label" for="kata-draft-${kata.slug}">💭 Meu rascunho de lógica (salvo para quando abrir no PC)</label>
        <textarea id="kata-draft-${kata.slug}" class="textarea-input" rows="2" placeholder="Ex.: usar um dict/Counter para contar e filtrar..." data-kata-draft="${kata.slug}">${escapeHtml(draft)}</textarea>

        <div class="actions-row">
          <a class="btn btn-primary" href="https://www.codewars.com/kata/${kata.slug}/train/python" target="_blank" rel="noopener noreferrer">🐍 Resolver em Python</a>
          <a class="btn btn-violet" href="https://www.codewars.com/kata/${kata.slug}/train/csharp" target="_blank" rel="noopener noreferrer">🟣 Resolver em C#</a>
          ${
            hasUser
              ? `<button type="button" class="btn btn-sm" data-action="sync-cw-now" ${uiSession.cwSyncBusy ? 'disabled' : ''}>${uiSession.cwSyncBusy ? '⏳...' : '↻ Verificar na API'}</button>`
              : `<button type="button" class="btn btn-sm btn-ghost" data-action="goto-tab" data-tab="progresso">Conectar username</button>`
          }
        </div>
      </article>
    `;
  }

  /* ==================== ABA 1: HOJE (3 SUB-ABAS LIMPAS) ==================== */
  function formatTimer(sec) {
    const s = Math.max(0, sec);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function stopLiveTimer() {
    if (uiSession.live.timerId) {
      clearInterval(uiSession.live.timerId);
      uiSession.live.timerId = null;
    }
    uiSession.live.running = false;
  }

  function startLiveTimer() {
    if (uiSession.live.running) return;
    uiSession.live.running = true;
    uiSession.live.timerId = setInterval(() => {
      if (uiSession.live.secondsLeft > 0) {
        uiSession.live.secondsLeft--;
        const tv = el('live-timer-val');
        if (tv) {
          tv.textContent = formatTimer(uiSession.live.secondsLeft);
          tv.classList.toggle('urgent', uiSession.live.secondsLeft <= 30);
        }
      } else {
        stopLiveTimer();
        showToast('⏱ Tempo esgotado! Conclua sua análise.');
        render();
      }
    }, 1000);
    render();
  }

  function renderHojeLiveCode() {
    const ch = findChallengeById(state.liveCodeId) || CHALLENGES.find((c) => c.category === 'estrategia') || CHALLENGES[0];
    const lv = uiSession.live;
    const att = state.attempts[ch.id] || {};
    const hasAnswered = att.selected !== null && att.selected !== undefined;

    const prepHtml = `
      <div class="interview-step-box">
        <div style="font-weight:700;font-size:0.86rem;">1. Antes das opções, fale como em entrevista:</div>
        <div class="field-label">Estrutura / Técnica ideal</div>
        <div class="interview-chips">
          ${INTERVIEW_STRUCT_OPTIONS.map(
            (o) => `<button type="button" class="chip-btn ${lv.pickedStruct === o.id ? 'active' : ''}" data-action="live-pick-struct" data-val="${o.id}">${o.label}</button>`
          ).join('')}
        </div>
        <div class="field-label">Complexidade de Tempo alvo</div>
        <div class="interview-chips">
          ${INTERVIEW_COMPL_OPTIONS.map(
            (c) => `<button type="button" class="chip-btn ${lv.pickedCompl === c ? 'active' : ''}" data-action="live-pick-compl" data-val="${c}">${c}</button>`
          ).join('')}
        </div>
        ${
          lv.stage === 'prep' && !hasAnswered
            ? `<div class="actions-row">
                <button type="button" class="btn btn-primary" data-action="live-unlock" ${!lv.pickedStruct || !lv.pickedCompl ? 'disabled' : ''}>
                  Validar análise e abrir questão →
                </button>
              </div>`
            : `<div class="muted-text" style="margin-top:0.55rem;font-size:0.8rem;">
                Análise: Estrutura ${lv.pickedStruct === ch.interviewStruct ? '✅' : `⚠️ ideal: ${INTERVIEW_STRUCT_OPTIONS.find((x) => x.id === ch.interviewStruct)?.label}`}
                · Tempo ${lv.pickedCompl === ch.interviewCompl ? '✅' : `⚠️ ideal: ${ch.interviewCompl}`}
              </div>`
        }
      </div>
    `;

    return `
      <div class="live-timer-bar">
        <div>
          <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Simulador Live Code</div>
          <div id="live-timer-val" class="live-timer ${lv.secondsLeft <= 30 ? 'urgent' : ''}">${formatTimer(lv.secondsLeft)}</div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <button type="button" class="btn btn-sm ${lv.running ? 'btn-danger' : 'btn-primary'}" data-action="live-toggle-timer">${lv.running ? '⏸ Pausar' : '▶ Iniciar 3m'}</button>
          <button type="button" class="btn btn-sm" data-action="live-next">🎲 Outro</button>
        </div>
      </div>
      ${prepHtml}
      ${lv.stage === 'quiz' || hasAnswered ? renderChallengeCard(ch, { forceShowOptions: true, hideBlindToggle: true, showInterviewTip: true }) : `
        <article class="card">
          <div class="pills-row" style="margin-bottom:0.5rem;">
            <span class="pill pill-${CATEGORIES[ch.category].color}">${CATEGORIES[ch.category].icon} ${CATEGORIES[ch.category].label}</span>
            <span class="pill pill-${DIFFICULTIES[ch.difficulty].color}">${DIFFICULTIES[ch.difficulty].label}</span>
          </div>
          <h3 class="challenge-title">${escapeHtml(ch.title)}</h3>
          <p class="challenge-story">${escapeHtml(ch.story)}</p>
          ${renderCodeBox(ch.codePython, ch.codeCSharp)}
          <p class="challenge-question" style="margin-bottom:0;">${escapeHtml(ch.question)}</p>
        </article>
      `}
    `;
  }

  function renderHojeTab() {
    const subtabs = `
      <div class="subtabs-bar" role="tablist" aria-label="Modos de hoje">
        <button type="button" class="subtab-btn ${state.hojeSubtab === 'dupla' ? 'active' : ''}" data-action="set-hoje-sub" data-sub="dupla">🎯 Dupla</button>
        <button type="button" class="subtab-btn ${state.hojeSubtab === 'livecode' ? 'active' : ''}" data-action="set-hoje-sub" data-sub="livecode">⏱ Live Code</button>
        <button type="button" class="subtab-btn ${state.hojeSubtab === 'kata' ? 'active' : ''}" data-action="set-hoje-sub" data-sub="kata">⚔ Kata PC</button>
      </div>
    `;

    const dueReviews = getDueReviews();
    const reviewBanner =
      dueReviews.length && state.hojeSubtab === 'dupla'
        ? `
          <div class="card" style="border-color:rgba(244,63,94,0.45);">
            <div class="card-head" style="margin-bottom:0.2rem;">
              <span class="pill pill-rose">🔁 ${dueReviews.length} revisão(ões) espaçada(s) hoje</span>
              <button type="button" class="btn btn-sm btn-danger" data-action="go-reviews">Revisar</button>
            </div>
          </div>
        `
        : '';

    if (state.hojeSubtab === 'livecode') {
      return `${subtabs}${renderHojeLiveCode()}`;
    }

    if (state.hojeSubtab === 'kata') {
      const nextKata = getNextTrackKata();
      const doneCount = CODEWARS_TRACK.filter((k) => isKataDone(k.slug)).length;
      return `
        ${subtabs}
        <div class="section-head">
          <h2 class="section-title">⚔ Do Celular para o PC</h2>
          <span class="muted-text">${doneCount}/${CODEWARS_TRACK.length} na trilha</span>
        </div>
        ${renderKataDetailCard(nextKata, '⚔ Próximo Kata')}
      `;
    }

    // Padrão: Dupla do Dia + Desafio Paramétrico Gerado
    const today = localDateKey();
    const picks = getTodayPicks();
    const dailyGen = generateDailyParametricChallenge(today);
    const dayCount = state.dailyChecks[today]?.count || 0;

    return `
      ${subtabs}
      ${reviewBanner}
      <div class="section-head">
        <h2 class="section-title">⚡ Dupla do Dia</h2>
        <span class="muted-text">${dayCount >= 2 ? 'Dose Dupla fechada!' : '3–5 min'}</span>
      </div>
      ${picks.map((ch) => renderChallengeCard(ch, { canSwap: true })).join('')}
      <div class="section-head" style="margin-top:0.2rem;">
        <h2 class="section-title">♾ Desafio Inédito de Hoje</h2>
        <span class="muted-text">${formatDateBR(today)}</span>
      </div>
      ${renderChallengeCard(dailyGen)}
      <div class="card" style="text-align:center;">
        <div class="actions-row" style="justify-content:center;margin-top:0;">
          <button type="button" class="btn btn-primary" data-action="add-extra">⚡ Fazer desafio extra</button>
          <button type="button" class="btn btn-violet" data-action="goto-tab" data-tab="lab">🧪 Abrir Lab</button>
        </div>
      </div>
    `;
  }

  /* ==================== ABA 2: LABORATÓRIO INTERATIVO (6 SIMULADORES) ==================== */
  function createDerangement(names) {
    const arr = [...names];
    let ok = false;
    while (!ok) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      ok = arr.every((target, i) => target !== names[i]);
    }
    const map = {};
    names.forEach((n, i) => (map[n] = arr[i]));
    return map;
  }

  const BOWL_PEOPLE = ['Vovô', 'Ana', 'Beto', 'Carla', 'Davi', 'Lia'];
  function initBowlLab(mode = 'bowl') {
    return {
      mode,
      secretMap: createDerangement(BOWL_PEOPLE),
      remaining: [...BOWL_PEOPLE].sort(() => Math.random() - 0.5),
      turnIdx: 1,
      logs: [],
      leakPair: null,
      mpcOffset: Math.floor(Math.random() * 50) + 17,
      mpcSum: 0,
      mpcStep: 1,
      mpcSolved: false
    };
  }

  function initCoinsLab() {
    return { heavy: Math.floor(Math.random() * 8) + 1, placements: {}, weighsUsed: 0, history: [], eliminated: {}, guess: null };
  }

  function initSwitchesLab() {
    const order = ['A', 'B', 'C'].sort(() => Math.random() - 0.5);
    return { mapping: { 1: order[0], 2: order[1], 3: order[2] }, on: { A: false, B: false, C: false }, warm: { A: false, B: false, C: false }, enteredRoom: false, waited: false, guess: { 1: 'A', 2: 'B', 3: 'C' }, feedback: '' };
  }

  const ALGO_CORRECT = [
    { id: 'idem', text: '1. Checar Idempotency-Key (bloquear repetição)' },
    { id: 'begin', text: '2. Abrir transação no banco (BEGIN)' },
    { id: 'upd', text: '3. UPDATE saldo = saldo - val WHERE id = origem AND saldo >= val' },
    { id: 'check', text: '4. Se rows_affected == 0 → ROLLBACK e retornar saldo insuficiente' },
    { id: 'commit', text: '5. Creditar destino, salvar Idempotency-Key e COMMIT' }
  ];

  function initAlgoLab() {
    const shuffled = [...ALGO_CORRECT].sort(() => Math.random() - 0.5);
    if (shuffled.every((x, i) => x.id === ALGO_CORRECT[i].id)) [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    return { items: shuffled, result: null };
  }

  function initBinSearchLab() {
    return { arr: [3, 8, 12, 19, 25, 31, 42], target: 42, cond: 'le', move: 'pm1', low: 0, high: 6, mid: null, steps: 0, status: 'ready', msg: 'Escolha um alvo e regras e rode passo a passo!' };
  }

  const labState = {
    bowl: initBowlLab('bowl'),
    jugs: { j5: 0, j3: 0, steps: 0, solved: false },
    coins: initCoinsLab(),
    switches: initSwitchesLab(),
    algo: initAlgoLab(),
    binsearch: initBinSearchLab()
  };

  function markLabDone(labId, steps = null) {
    const prev = state.labsDone[labId] || { solved: false, bestSteps: null };
    prev.solved = true;
    if (steps !== null) prev.bestSteps = prev.bestSteps === null ? steps : Math.min(prev.bestSteps, steps);
    prev._u = Date.now();
    state.labsDone[labId] = prev;
    const isNewToday = recordDailySolve('lab:' + labId);
    saveState();
    if (isNewToday) showToast('🧪 Laboratório concluído! Check do dia atualizado.');
  }

  function renderLabTab() {
    const labsMeta = [
      { id: 'bowl', title: '🥣 A Tigela do Vovô', sub: 'Vazamento vs MPC' },
      { id: 'jugs', title: '💧 Jarros 5L & 3L', sub: 'Medir exatos 4L' },
      { id: 'coins', title: '⚖️ 8 Moedas', sub: 'Achar em 2 pesagens' },
      { id: 'switches', title: '💡 3 Interruptores', sub: '1 única ida à sala' },
      { id: 'algo', title: '🧱 Fluxo Atômico', sub: 'Ordenar sem Race' },
      { id: 'binsearch', title: '🎯 Busca Binária', sub: 'Caçar Off-by-One' }
    ];

    const selectorHtml = `
      <div class="lab-selector-grid">
        ${labsMeta
          .map((l) => `<button type="button" class="lab-tile ${state.activeLab === l.id ? 'active' : ''}" data-action="select-lab" data-lab="${l.id}"><div class="lab-tile-title"><span>${l.title}</span><span>${state.labsDone[l.id]?.solved ? '✅' : ''}</span></div><div class="lab-tile-sub">${l.sub}</div></button>`)
          .join('')}
      </div>
    `;

    let bodyHtml = '';
    if (state.activeLab === 'bowl') bodyHtml = renderBowlLab();
    else if (state.activeLab === 'jugs') bodyHtml = renderJugsLab();
    else if (state.activeLab === 'coins') bodyHtml = renderCoinsLab();
    else if (state.activeLab === 'switches') bodyHtml = renderSwitchesLab();
    else if (state.activeLab === 'algo') bodyHtml = renderAlgoLab();
    else if (state.activeLab === 'binsearch') bodyHtml = renderBinSearchLab();

    return `
      <div class="section-head">
        <h2 class="section-title">🧪 Laboratório Interativo</h2>
        <span class="muted-text">Manipule e descubra</span>
      </div>
      ${selectorHtml}
      ${bodyHtml}
    `;
  }

  function renderBowlLab() {
    const b = labState.bowl;
    const isBowl = b.mode === 'bowl';
    const peopleHtml = BOWL_PEOPLE.map((p, idx) => {
      let cls = 'person-chip';
      let extra = idx === 0 ? '❓ esqueceu' : 'na fila';
      if (isBowl) {
        if (idx > 0 && idx < b.turnIdx) {
          cls += idx === 5 && b.leakPair ? ' leak' : ' done';
          const logEntry = b.logs.find((l) => l.person === p);
          extra = logEntry ? `abriu ${logEntry.opened}` : 'ok';
        } else if (idx === b.turnIdx && b.turnIdx <= 5) {
          cls += ' current';
          extra = 'vez agora';
        }
      } else {
        if (idx === 0) extra = `offset K=${b.mpcOffset}`;
        else if (idx < b.mpcStep) { cls += ' done'; extra = 'somou ID'; }
        else if (idx === b.mpcStep && b.mpcStep <= 5) { cls += ' current'; extra = 'vez agora'; }
      }
      return `<div class="${cls}"><strong>${p}</strong><div style="font-size:0.7rem;color:var(--text-secondary);">${extra}</div></div>`;
    }).join('');

    if (isBowl) {
      const doneAll = b.turnIdx > 5;
      return `
        <article class="card">
          <div class="card-head">
            <span class="pill pill-amber">Simulador 1 · Amigo Invisível</span>
            <div class="lang-switch">
              <button type="button" class="lang-btn active" data-action="bowl-mode" data-mode="bowl">🥣 Tigela</button>
              <button type="button" class="lang-btn" data-action="bowl-mode" data-mode="mpc">🔐 Soma O(N)</button>
            </div>
          </div>
          <h3 class="challenge-title">A Tigela do Vovô na prática</h3>
          <p class="challenge-story">Simule cada pessoa indo à tigela até achar quem tinha tirado antes e observe o vazamento na vez da <strong>Lia (N−1)</strong>.</p>
          <div class="people-row">${peopleHtml}</div>
          <div class="bowl-box">
            <strong>Papéis na tigela (${b.remaining.length} restantes):</strong>
            <div class="paper-pills">${b.remaining.map(() => `<span class="paper-pill">📄 ?</span>`).join('')}</div>
          </div>
          ${
            b.leakPair
              ? `<div class="explanation-box was-wrong">
                  <strong>🚨 Vazamento detectado na Lia (N−1)!</strong>
                  <p style="margin:0.35rem 0 0;">Só restavam 2 papéis: <strong>${b.leakPair[0]}</strong> e <strong>${b.leakPair[1]}</strong>. Como Lia já sabia o dela (<em>${b.secretMap['Lia']}</em>), ela descobre na hora que o Vovô tirou <strong>${b.secretMap['Vovô']}</strong>! Total: <strong>${b.logs.reduce((s, x) => s + x.opened, 0)}</strong> aberturas.</p>
                </div>`
              : ''
          }
          <div class="actions-row">
            <button type="button" class="btn btn-primary" data-action="bowl-step" ${doneAll ? 'disabled' : ''}>${doneAll ? 'Simulação concluída' : `Próxima: ${BOWL_PEOPLE[b.turnIdx]} tira`}</button>
            <button type="button" class="btn btn-ghost" data-action="bowl-reset">↻ Reiniciar</button>
          </div>
        </article>
      `;
    }

    return `
      <article class="card">
        <div class="card-head">
          <span class="pill pill-emerald">Simulador 1 · Soma Secreta (MPC)</span>
          <div class="lang-switch">
            <button type="button" class="lang-btn" data-action="bowl-mode" data-mode="bowl">🥣 Tigela</button>
            <button type="button" class="lang-btn active" data-action="bowl-mode" data-mode="mpc">🔐 Soma O(N)</button>
          </div>
        </div>
        <h3 class="challenge-title">Zero vazamento em 1 passada O(N)</h3>
        <p class="challenge-story">IDs de 1..6 (soma = 21). O Vovô inicia com número secreto <strong>K = ${b.mpcOffset}</strong> e cada um soma quem tirou.</p>
        <div class="people-row">${peopleHtml}</div>
        <div class="bowl-box">
          <strong>Visor da calculadora:</strong> <span style="font-size:1.25rem;font-weight:800;color:var(--emerald);">${b.mpcOffset + b.mpcSum}</span>
        </div>
        ${
          b.mpcSolved
            ? `<div class="explanation-box"><strong>✅ Vovô descobriu sem vazar nada!</strong><p style="margin:0.35rem 0 0;">21 − (${b.mpcOffset + b.mpcSum} − ${b.mpcOffset}) = ID ${21 - b.mpcSum} (<strong>${b.secretMap['Vovô']}</strong>) em apenas 5 somas O(N).</p></div>`
            : ''
        }
        <div class="actions-row">
          <button type="button" class="btn btn-primary" data-action="mpc-step" ${b.mpcSolved ? 'disabled' : ''}>${b.mpcStep <= 5 ? `Passar para ${BOWL_PEOPLE[b.mpcStep]}` : 'Vovô revelar'}</button>
          <button type="button" class="btn btn-ghost" data-action="bowl-reset">↻ Reiniciar</button>
        </div>
      </article>
    `;
  }

  function renderJugsLab() {
    const j = labState.jugs;
    return `
      <article class="card">
        <div class="card-head"><span class="pill pill-sky">Simulador 2 · Estado</span><span class="pill pill-muted">Passos: ${j.steps}</span></div>
        <h3 class="challenge-title">Os Jarros de 5L e 3L</h3>
        <p class="challenge-story">Meta: deixar exatos <strong>4 litros</strong> no jarro de 5L.</p>
        <div class="jugs-stage">
          <div class="jug-col"><div class="jug-glass jug-5"><div class="jug-water" style="height:${Math.round((j.j5 / 5) * 100)}%"></div></div><div class="jug-label">${j.j5}L / 5L</div></div>
          <div class="jug-col"><div class="jug-glass jug-3"><div class="jug-water" style="height:${Math.round((j.j3 / 3) * 100)}%"></div></div><div class="jug-label">${j.j3}L / 3L</div></div>
        </div>
        ${j.solved ? `<div class="explanation-box"><strong>✅ Exatos 4L medidos em ${j.steps} passos!</strong></div>` : ''}
        <div class="actions-row" style="justify-content:center;">
          <button type="button" class="btn btn-sm" data-action="jug" data-op="fill5">Encher 5L</button>
          <button type="button" class="btn btn-sm" data-action="jug" data-op="fill3">Encher 3L</button>
          <button type="button" class="btn btn-sm btn-primary" data-action="jug" data-op="p53">5L → 3L</button>
          <button type="button" class="btn btn-sm btn-primary" data-action="jug" data-op="p35">3L → 5L</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="jug" data-op="empty5">Esvaziar 5L</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="jug" data-op="empty3">Esvaziar 3L</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="jug" data-op="reset">↻ Zerar</button>
        </div>
      </article>
    `;
  }

  function renderCoinsLab() {
    const c = labState.coins;
    const left = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => c.placements[n] === 'L');
    const right = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => c.placements[n] === 'R');
    const solved = c.guess === c.heavy;
    return `
      <article class="card">
        <div class="card-head"><span class="pill pill-amber">Simulador 3 · Divisão em 3</span><span class="pill ${c.weighsUsed >= 2 ? 'pill-rose' : 'pill-muted'}">Pesagens: ${c.weighsUsed}/2</span></div>
        <h3 class="challenge-title">A Balança das 8 Moedas</h3>
        <p class="challenge-story">Uma moeda é mais pesada. Toque nas moedas (Esq → Dir → Fora) e descubra em até <strong>2 pesagens</strong>.</p>
        <div class="coins-row">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<button type="button" class="coin-btn ${c.placements[n] === 'L' ? 'left' : c.placements[n] === 'R' ? 'right' : ''} ${c.eliminated[n] ? 'eliminated' : ''}" data-action="coin-cycle" data-coin="${n}">M${n}</button>`).join('')}</div>
        <div class="scale-pans">
          <div class="pan-box"><strong style="color:var(--sky);font-size:0.8rem;">Esq (${left.length})</strong><div style="margin-top:0.35rem;font-weight:700;">${left.length ? left.map((n) => 'M' + n).join(' ') : 'Vazio'}</div></div>
          <div class="pan-box"><strong style="color:var(--violet);font-size:0.8rem;">Dir (${right.length})</strong><div style="margin-top:0.35rem;font-weight:700;">${right.length ? right.map((n) => 'M' + n).join(' ') : 'Vazio'}</div></div>
        </div>
        <div class="actions-row">
          <button type="button" class="btn btn-primary" data-action="coin-weigh" ${c.weighsUsed >= 2 || !left.length || left.length !== right.length ? 'disabled' : ''}>⚖️ Pesar</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="coin-preset3">3 vs 3</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="coin-clear">Limpar</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="coin-reset">↻ Nova</button>
        </div>
        ${c.history.length ? `<div class="bowl-box">${c.history.map((h, i) => `<div><strong>${i + 1}ª:</strong> ${h}</div>`).join('')}</div>` : ''}
        <div class="coins-row">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<button type="button" class="btn btn-sm ${c.guess === n ? 'btn-violet' : ''}" data-action="coin-guess" data-coin="${n}">M${n}</button>`).join('')}</div>
        ${c.guess ? `<div class="explanation-box ${solved ? '' : 'was-wrong'}"><strong>${solved ? `✅ Era a M${c.heavy}!` : `❌ Era a M${c.heavy}.`}</strong> Pesar 3 vs 3 divide em (3, 3, 2) e garante solução em 2 pesagens.</div>` : ''}
      </article>
    `;
  }

  function renderSwitchesLab() {
    const s = labState.switches;
    const bulbStateFor = (num) => {
      const sw = s.mapping[num];
      if (s.on[sw]) return { icon: '💡', label: 'Acesa (quente)', cls: 'pill-amber' };
      if (s.warm[sw]) return { icon: '🔥', label: 'Apagada e QUENTE', cls: 'pill-rose' };
      return { icon: '🌑', label: 'Apagada e FRIA', cls: 'pill-muted' };
    };
    return `
      <article class="card">
        <div class="card-head"><span class="pill pill-amber">Simulador 4 · Canal Oculto</span><span class="pill pill-muted">${s.enteredRoom ? 'Na sala' : 'Corredor'}</span></div>
        <h3 class="challenge-title">Os 3 Interruptores e 1 Ida à Sala</h3>
        <div class="switches-grid">
          ${['A', 'B', 'C'].map((sw) => `<button type="button" class="switch-card ${s.on[sw] ? 'on' : ''}" data-action="sw-toggle" data-sw="${sw}" ${s.enteredRoom ? 'disabled' : ''}><div>${s.on[sw] ? '🔌 ON' : '⭕ OFF'}</div><strong>${sw}</strong><div style="font-size:0.72rem;color:var(--text-secondary);">${s.warm[sw] ? 'quente' : 'fria'}</div></button>`).join('')}
        </div>
        <div class="actions-row">
          <button type="button" class="btn btn-sm" data-action="sw-wait" ${s.enteredRoom ? 'disabled' : ''}>⏱ Esperar 5 min</button>
          <button type="button" class="btn btn-primary" data-action="sw-enter" ${s.enteredRoom ? 'disabled' : ''}>🚪 Entrar (1×)</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="sw-reset">↻ Reiniciar</button>
        </div>
        ${
          s.enteredRoom
            ? `<div style="margin-top:0.8rem;">
                ${[1, 2, 3].map((num) => {
                  const st = bulbStateFor(num);
                  return `<div class="bulb-card"><div><strong>Lâmpada ${num}</strong><div><span class="pill ${st.cls}">${st.icon} ${st.label}</span></div></div><select class="select-input" style="width:auto;" data-action="sw-guess" data-bulb="${num}">${['A', 'B', 'C'].map((opt) => `<option value="${opt}" ${s.guess[num] === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select></div>`;
                }).join('')}
                <button type="button" class="btn btn-violet" data-action="sw-check" style="width:100%;">Confirmar</button>
                ${s.feedback ? `<div class="explanation-box ${s.feedback.startsWith('✅') ? '' : 'was-wrong'}">${s.feedback}</div>` : ''}
              </div>`
            : ''
        }
      </article>
    `;
  }

  function renderAlgoLab() {
    const a = labState.algo;
    return `
      <article class="card">
        <div class="card-head"><span class="pill pill-emerald">Simulador 5 · Ordem Crítica</span></div>
        <h3 class="challenge-title">Transferência Segura contra Race Condition</h3>
        <div>${a.items.map((item, idx) => `<div class="algo-block"><span>${escapeHtml(item.text)}</span><div class="algo-move"><button type="button" class="btn btn-sm" data-action="algo-move" data-idx="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn btn-sm" data-action="algo-move" data-idx="${idx}" data-dir="1" ${idx === a.items.length - 1 ? 'disabled' : ''}>↓</button></div></div>`).join('')}</div>
        <div class="actions-row">
          <button type="button" class="btn btn-primary" data-action="algo-test">▶ Simular Duplo Clique</button>
          <button type="button" class="btn btn-ghost" data-action="algo-reset">↻ Embaralhar</button>
        </div>
        ${a.result ? `<div class="explanation-box ${a.result.ok ? '' : 'was-wrong'}">${a.result.msg}</div>` : ''}
      </article>
    `;
  }

  function renderBinSearchLab() {
    const b = labState.binsearch;
    return `
      <article class="card">
        <div class="card-head"><span class="pill pill-violet">Simulador 6 · Off-by-One</span><span class="pill pill-muted">Passos: ${b.steps}</span></div>
        <h3 class="challenge-title">Busca Binária Passo a Passo</h3>
        <div class="bs-array">${b.arr.map((val, idx) => `<div class="bs-cell ${idx >= b.low && idx <= b.high ? 'in-range' : ''} ${idx === b.mid ? (b.status === 'found' ? 'found' : 'is-mid') : ''}"><div style="font-size:0.65rem;color:var(--text-muted);">[${idx}]</div><strong>${val}</strong></div>`).join('')}</div>
        <div class="muted-text" style="font-size:0.8rem;">low=${b.low} · high=${b.high} · mid=${b.mid === null ? '—' : b.mid}</div>
        <div class="actions-row" style="margin-top:0.45rem;">${[3, 25, 42, 20].map((t) => `<button type="button" class="btn btn-sm ${b.target === t ? 'btn-violet' : ''}" data-action="bs-target" data-val="${t}">${t}</button>`).join('')}</div>
        <div class="actions-row" style="margin-top:0.35rem;">
          <button type="button" class="btn btn-sm ${b.cond === 'le' ? 'btn-primary' : ''}" data-action="bs-cond" data-val="le">low &lt;= high</button>
          <button type="button" class="btn btn-sm ${b.cond === 'lt' ? 'btn-primary' : ''}" data-action="bs-cond" data-val="lt">low &lt; high</button>
          <button type="button" class="btn btn-sm ${b.move === 'pm1' ? 'btn-primary' : ''}" data-action="bs-move" data-val="pm1">mid±1</button>
          <button type="button" class="btn btn-sm ${b.move === 'mid' ? 'btn-primary' : ''}" data-action="bs-move" data-val="mid">low=mid</button>
        </div>
        <div class="bowl-box">${escapeHtml(b.msg)}</div>
        <div class="actions-row">
          <button type="button" class="btn btn-primary" data-action="bs-step" ${b.status === 'found' || b.status === 'not_found' || b.status === 'infinite' ? 'disabled' : ''}>▶ 1 Passo</button>
          <button type="button" class="btn btn-ghost" data-action="bs-reset">↻ Resetar</button>
        </div>
      </article>
    `;
  }

  /* ==================== ABA 3: EXPLORAR (3 SUB-ABAS LIMPAS) ==================== */
  function renderExplorarTab() {
    const subtabs = `
      <div class="subtabs-bar" role="tablist" aria-label="Catálogo e referências">
        <button type="button" class="subtab-btn ${state.explorarSubtab === 'desafios' ? 'active' : ''}" data-action="set-exp-sub" data-sub="desafios">🧩 Desafios (${CHALLENGES.length})</button>
        <button type="button" class="subtab-btn ${state.explorarSubtab === 'codewars' ? 'active' : ''}" data-action="set-exp-sub" data-sub="codewars">⚔ Codewars (${CODEWARS_TRACK.length})</button>
        <button type="button" class="subtab-btn ${state.explorarSubtab === 'cola' ? 'active' : ''}" data-action="set-exp-sub" data-sub="cola">⚡ Py ⇄ C#</button>
      </div>
    `;

    if (state.explorarSubtab === 'codewars') {
      return `${subtabs}${renderCodewarsTrackSubtab()}`;
    }
    if (state.explorarSubtab === 'cola') {
      return `${subtabs}${renderColaSubtab()}`;
    }

    const dueIds = new Set(getDueReviews().map((c) => c.id));
    const filtered = CHALLENGES.filter((ch) => {
      if (state.exploreFilter === 'review') {
        if (!dueIds.has(ch.id)) return false;
      } else if (state.exploreFilter !== 'all' && ch.category !== state.exploreFilter) {
        return false;
      }
      const solved = !!state.attempts[ch.id]?.solved;
      if (state.exploreStatus === 'pending' && solved) return false;
      if (state.exploreStatus === 'solved' && !solved) return false;
      return true;
    });

    const selected = filtered.find((c) => c.id === state.selectedExploreId) || filtered[0] || null;
    if (selected && state.selectedExploreId !== selected.id) state.selectedExploreId = selected.id;

    const catChips = [
      { id: 'all', label: `Todas (${CHALLENGES.length})` },
      { id: 'borda', label: '🛡 Borda' },
      { id: 'trace', label: '🔍 Trace' },
      { id: 'estrategia', label: '⚡ Estratégia' },
      { id: 'enigma', label: '🧩 Enigma' },
      { id: 'review', label: `🔁 Revisão (${dueIds.size})` }
    ];

    const listHtml = filtered.length
      ? filtered
          .map((ch) => {
            const cat = CATEGORIES[ch.category];
            const att = state.attempts[ch.id];
            const iconStatus = dueIds.has(ch.id) ? '🔁' : att?.solved ? '✅' : att?.lastWrong ? '⚠' : '○';
            return `
              <button type="button" class="catalog-item ${selected && selected.id === ch.id ? 'active' : ''}" data-action="select-explore" data-id="${ch.id}">
                <div>
                  <div style="font-weight:700;font-size:0.9rem;">${escapeHtml(ch.title)}</div>
                  <div style="font-size:0.75rem;color:var(--text-secondary);">${cat.icon} ${cat.label} · ${DIFFICULTIES[ch.difficulty].label}</div>
                </div>
                <span>${iconStatus}</span>
              </button>
            `;
          })
          .join('')
      : `<div class="card muted-text">Nenhum desafio com esses filtros.</div>`;

    return `
      ${subtabs}
      <div class="chips-scroll">${catChips.map((c) => `<button type="button" class="chip-btn ${state.exploreFilter === c.id ? 'active' : ''}" data-action="filter-cat" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
      <div class="chips-scroll">${[{ id: 'all', label: 'Todos' }, { id: 'pending', label: 'Pendentes' }, { id: 'solved', label: 'Resolvidos' }].map((s) => `<button type="button" class="chip-btn ${state.exploreStatus === s.id ? 'active' : ''}" data-action="filter-status" data-st="${s.id}">${s.label}</button>`).join('')}</div>
      ${selected ? renderChallengeCard(selected) : ''}
      <div class="section-head" style="margin-top:0.5rem;"><h3 class="section-title" style="font-size:0.92rem;">Lista (${filtered.length})</h3></div>
      ${listHtml}
    `;
  }

  function renderCodewarsTrackSubtab() {
    const doneTotal = CODEWARS_TRACK.filter((k) => isKataDone(k.slug)).length;
    const list = CODEWARS_TRACK.filter((k) => {
      const done = isKataDone(k.slug);
      if (state.cwTrackFilter === 'pending') return !done;
      if (state.cwTrackFilter === 'done') return done;
      return true;
    });
    const selected = list.find((k) => k.slug === state.selectedKataSlug) || list[0] || null;
    if (selected) state.selectedKataSlug = selected.slug;

    return `
      <div class="section-head">
        <h2 class="section-title">⚔ Trilha Codewars (8 → 6 kyu)</h2>
        <span class="muted-text">${doneTotal}/${CODEWARS_TRACK.length} feitos</span>
      </div>
      <div class="chips-scroll">
        ${[
          { id: 'pending', label: `Pendentes (${CODEWARS_TRACK.length - doneTotal})` },
          { id: 'done', label: `Concluídos (${doneTotal})` },
          { id: 'all', label: 'Todos' }
        ]
          .map((f) => `<button type="button" class="chip-btn ${state.cwTrackFilter === f.id ? 'active' : ''}" data-action="cw-track-filter" data-val="${f.id}">${f.label}</button>`)
          .join('')}
      </div>
      ${selected ? renderKataDetailCard(selected, '⚔ Kata Selecionado') : '<div class="card muted-text">Todos os katas dessa trilha concluídos!</div>'}
      ${list
        .map((k) => {
          const done = isKataDone(k.slug);
          const hasDraft = !!(state.kataDrafts[k.slug]?.text || '').trim();
          return `
            <button type="button" class="catalog-item ${selected && selected.slug === k.slug ? 'active' : ''}" data-action="select-kata" data-slug="${k.slug}">
              <div>
                <div style="font-weight:700;font-size:0.9rem;">${escapeHtml(k.title)}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(k.kyu)} · ${escapeHtml(k.topic)}${hasDraft ? ' · 💭 rascunho' : ''}</div>
              </div>
              <span>${done ? '✅' : '○'}</span>
            </button>
          `;
        })
        .join('')}
    `;
  }

  function renderColaSubtab() {
    const cats = ['Todas', ...new Set(PYTHON_CSHARP_CHEATSHEET.map((x) => x.category))];
    const q = (state.colaSearch || '').trim().toLowerCase();
    const items = PYTHON_CSHARP_CHEATSHEET.filter((item) => {
      if (state.colaFilter !== 'Todas' && item.category !== state.colaFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.python.toLowerCase().includes(q) ||
        item.csharp.toLowerCase().includes(q) ||
        item.tip.toLowerCase().includes(q)
      );
    });

    return `
      <div class="section-head">
        <h2 class="section-title">⚡ Cola Rápida Python ⇄ C#</h2>
        <span class="muted-text">${items.length} padrões</span>
      </div>
      <input id="cola-search-input" class="text-input" type="search" value="${escapeHtml(state.colaSearch || '')}" placeholder="Buscar padrão (ex.: Counter, LINQ, XOR, reverse)..." style="margin-bottom:0.55rem;" />
      <div class="chips-scroll">
        ${cats.map((c) => `<button type="button" class="chip-btn ${state.colaFilter === c ? 'active' : ''}" data-action="cola-cat" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
      </div>
      ${items
        .map(
          (item) => `
            <article class="cheat-card">
              <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                <strong style="font-size:0.92rem;">${escapeHtml(item.title)}</strong>
                <span class="pill pill-muted">${escapeHtml(item.category)}</span>
              </div>
              <div class="cheat-grid">
                <div>
                  <div class="cheat-col-label">🐍 Python</div>
                  <div class="code-box" style="margin-bottom:0;"><pre class="code-pre" style="padding:0.55rem 0.65rem;font-size:0.78rem;"><code>${highlightCode(item.python, 'python')}</code></pre></div>
                </div>
                <div>
                  <div class="cheat-col-label">🟣 C# (.NET)</div>
                  <div class="code-box" style="margin-bottom:0;"><pre class="code-pre" style="padding:0.55rem 0.65rem;font-size:0.78rem;"><code>${highlightCode(item.csharp, 'csharp')}</code></pre></div>
                </div>
              </div>
              <div class="muted-text" style="font-size:0.77rem;margin-top:0.45rem;">💡 ${escapeHtml(item.tip)}</div>
            </article>
          `
        )
        .join('')}
    `;
  }

  /* ==================== ABA 4: PROGRESSO & SYNC ==================== */
  function renderProgressoTab() {
    const streaks = computeStreaks();
    const weekly = computeWeeklyMeta();
    const solvedChallenges = CHALLENGES.filter((c) => state.attempts[c.id]?.solved);
    const firstTry = solvedChallenges.filter((c) => state.attempts[c.id]?.firstTryRight).length;
    const accuracy = solvedChallenges.length ? Math.round((firstTry / solvedChallenges.length) * 100) : 0;
    const labsCompleted = Object.values(state.labsDone).filter((l) => l?.solved).length;

    let cwPython = 0;
    let cwCSharp = 0;
    const cwRecent = [];
    Object.entries(state.dailyChecks)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([dateKey, d]) => {
        (d.codewars || []).forEach((item) => {
          if (item.lang === 'python') cwPython++;
          else cwCSharp++;
          if (cwRecent.length < 6) cwRecent.push({ dateKey, ...item });
        });
      });

    const catBars = Object.values(CATEGORIES)
      .map((cat) => {
        const total = CHALLENGES.filter((c) => c.category === cat.id).length;
        const done = CHALLENGES.filter((c) => c.category === cat.id && state.attempts[c.id]?.solved).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return `<div class="cat-bar-row"><div class="cat-bar-top"><span>${cat.icon} ${cat.label}</span><strong>${done}/${total}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;
      })
      .join('');

    const today = localDateKey();
    const calCells = [];
    for (let i = 27; i >= 0; i--) {
      const k = addDaysToKey(today, -i);
      const info = state.dailyChecks[k];
      const c = info?.count || 0;
      const hasCw = (info?.codewars || []).length > 0;
      let cls = 'hm-cell';
      if (i === 0) cls += ' today';
      if (c === 1) cls += ' lv1';
      else if (c >= 2) cls += ' lv2';
      if (hasCw) cls += ' has-cw';
      calCells.push(`<div class="${cls}" title="${formatDateBR(k)}: ${c} check(s)${hasCw ? ' + Codewars' : ''}"></div>`);
    }

    const dueReviews = getDueReviews();
    const cp = state.codewarsProfile || {};
    const bugs = state.bugJournal || [];
    const bugHits = bugs.filter((b) => b.outcome === 'hit').length;
    const bugRate = bugs.length ? Math.round((bugHits / bugs.length) * 100) : 0;

    const syncHtml = syncCfg && syncCfg.token
      ? `
        <div class="bowl-box" style="margin-top:0.4rem;">
          <div><strong>Conectado a:</strong> <code>${escapeHtml(syncCfg.owner)}/${escapeHtml(syncCfg.repo)}</code> (${escapeHtml(syncCfg.branch || 'main')})</div>
          <div class="muted-text" style="font-size:0.78rem;margin-top:0.2rem;">
            Status: ${syncState === 'ok' ? '✅ Sincronizado' : syncState === 'busy' ? '↻ Sincronizando...' : syncState === 'offline' ? '📡 Offline' : '⚠ ' + escapeHtml(syncErr || 'Erro')}
            ${lastSyncAt ? ` · ${new Date(lastSyncAt).toLocaleTimeString('pt-BR')}` : ''}
          </div>
        </div>
        <div class="actions-row">
          <button type="button" class="btn btn-primary" data-action="sync-now">↻ Sincronizar agora</button>
          <button type="button" class="btn btn-sm" data-action="copy-sync-code">📋 Código p/ celular</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="disconnect-sync">Desconectar</button>
        </div>
      `
      : `
        <p class="muted-text" style="margin:0.2rem 0 0.5rem;">Salve seu histórico no repositório privado <strong>daviml/logica-dados</strong> para usar no celular e no PC.</p>
        <label class="field-label" for="sync-repo-input">Repositório privado (usuario/repo)</label>
        <input id="sync-repo-input" class="text-input" type="text" value="daviml/logica-dados" />
        <label class="field-label" for="sync-token-input">Token Fine-Grained ou Código de Conexão</label>
        <input id="sync-token-input" class="text-input" type="password" placeholder="github_pat_... ou código de outro aparelho" />
        ${syncErr ? `<p style="color:var(--rose);font-size:0.8rem;margin:0.4rem 0 0;">${escapeHtml(syncErr)}</p>` : ''}
        <div class="actions-row"><button type="button" class="btn btn-primary" data-action="connect-sync">☁ Conectar GitHub</button></div>
      `;

    return `
      <div class="section-head">
        <h2 class="section-title">📊 Progresso &amp; Sync</h2>
        <span class="muted-text">${solvedChallenges.length}/${CHALLENGES.length} desafios</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-val" style="color:var(--amber);">🔥 ${streaks.current}d</div><div class="stat-lbl">Ofensiva (recorde: ${streaks.best}d)</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--emerald);">${accuracy}%</div><div class="stat-lbl">Acerto de 1ª tentativa</div></div>
        <div class="stat-card"><div class="stat-val">${streaks.totalCheckDays}</div><div class="stat-lbl">Dias com Check (${streaks.doubleDays}⚡ duplos)</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--sky);">${labsCompleted}/6</div><div class="stat-lbl">Laboratórios concluídos</div></div>
      </div>

      <article class="card">
        <h3 class="section-title" style="margin-bottom:0.55rem;">🏆 Meta Semanal Flexível</h3>
        <div class="cat-bar-row">
          <div class="cat-bar-top"><span>📱 Checks no App</span><strong>${weekly.checkDays}/${weekly.checkTarget} dias</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, Math.round((weekly.checkDays / weekly.checkTarget) * 100))}%"></div></div>
        </div>
        <div class="cat-bar-row" style="margin-bottom:0;">
          <div class="cat-bar-top"><span>⚔ Katas Codewars (PC)</span><strong>${weekly.katasWeek}/${weekly.kataTarget} katas</strong></div>
          <div class="bar-track"><div class="bar-fill" style="background:var(--violet);width:${Math.min(100, Math.round((weekly.katasWeek / weekly.kataTarget) * 100))}%"></div></div>
        </div>
      </article>

      <article class="card">
        <div class="card-head">
          <h3 class="section-title">⚔ API do Codewars</h3>
          <button type="button" class="btn btn-sm btn-ghost" data-action="open-cw">+ Manual</button>
        </div>
        <label class="field-label" for="cw-user-input">Seu username do Codewars (sincroniza perfil, kyu e checks)</label>
        <div style="display:flex;gap:0.45rem;">
          <input id="cw-user-input" class="text-input" type="text" value="${escapeHtml(cp.username || '')}" placeholder="Ex.: daviml" />
          <button type="button" class="btn btn-violet" data-action="sync-cw-input" ${uiSession.cwSyncBusy ? 'disabled' : ''}>${uiSession.cwSyncBusy ? '⏳' : '↻ Sync'}</button>
        </div>
        ${uiSession.cwSyncErr ? `<p style="color:var(--rose);font-size:0.8rem;margin:0.4rem 0 0;">${escapeHtml(uiSession.cwSyncErr)}</p>` : ''}
        ${
          cp.username
            ? `<div class="pills-row" style="margin-top:0.6rem;">
                ${cp.overallRank ? `<span class="pill pill-amber">🏅 ${escapeHtml(cp.overallRank)} (${cp.honor} honor)</span>` : ''}
                ${cp.pythonRank ? `<span class="pill pill-emerald">🐍 ${escapeHtml(cp.pythonRank)}</span>` : ''}
                ${cp.csharpRank ? `<span class="pill pill-violet">🟣 ${escapeHtml(cp.csharpRank)}</span>` : ''}
                <span class="pill pill-muted">${cp.totalCompleted || 0} katas no perfil</span>
              </div>`
            : ''
        }
        <div class="pills-row" style="margin-top:0.6rem;margin-bottom:0.45rem;">
          <span class="pill pill-emerald">🐍 Python log: ${cwPython}</span>
          <span class="pill pill-violet">🟣 C# log: ${cwCSharp}</span>
        </div>
        ${
          cwRecent.length
            ? cwRecent.map((c) => `<div class="algo-block" style="margin-bottom:0.35rem;"><span>${c.lang === 'python' ? '🐍' : '🟣'} <strong>${formatDateBR(c.dateKey)}</strong> — ${escapeHtml(c.note || 'kata')}</span><button type="button" class="btn btn-sm btn-ghost" data-action="del-cw" data-date="${c.dateKey}" data-ts="${c.ts}">✕</button></div>`).join('')
            : '<p class="muted-text" style="margin:0;">Conecte seu username ou registre um kata manualmente.</p>'
        }
      </article>

      <article class="card">
        <div class="card-head">
          <h3 class="section-title">🐛 Hipótese × Causa Real (${bugs.length})</h3>
          <button type="button" class="btn btn-sm btn-primary" data-action="open-bug">+ Bug</button>
        </div>
        <p class="muted-text" style="margin:0 0 0.55rem;">Taxa na mosca: <strong>${bugRate}%</strong> (${bugHits}/${bugs.length}). Registrar um bug pensado antes da IA também garante o Check do dia!</p>
        ${
          bugs.length
            ? bugs.slice(0, 5).map((b) => `<div class="algo-block" style="align-items:flex-start;"><div><strong>${b.outcome === 'hit' ? '✅' : b.outcome === 'close' ? '🟨' : '❌'} ${escapeHtml(b.title)}</strong><div class="muted-text" style="font-size:0.75rem;">${formatDateBR(b.dateKey)} · Hipótese: ${escapeHtml(b.hypothesis)}${b.realCause ? ' | Real: ' + escapeHtml(b.realCause) : ''}</div></div><button type="button" class="btn btn-sm btn-ghost" data-action="del-bug" data-id="${b.id}">✕</button></div>`).join('')
            : ''
        }
      </article>

      <article class="card">
        <h3 class="section-title" style="margin-bottom:0.55rem;">Consistência (28 dias)</h3>
        <div class="mini-heatmap">${calCells.join('')}</div>
      </article>

      <article class="card">
        <h3 class="section-title" style="margin-bottom:0.65rem;">Domínio por Categoria</h3>
        ${catBars}
      </article>

      <article class="card">
        <h3 class="section-title" style="margin-bottom:0.35rem;">🔁 Revisão Espaçada (${dueReviews.length} hoje)</h3>
        <p class="muted-text" style="margin:0;">Erros voltam em 1 → 3 → 7 dias. ${dueReviews.length ? `<button type="button" class="btn btn-sm btn-danger" data-action="go-reviews">Abrir</button>` : 'Tudo em dia!'}</p>
      </article>

      <article class="card">
        <h3 class="section-title" style="margin-bottom:0.35rem;">☁ Sincronizar com GitHub</h3>
        ${syncHtml}
      </article>

      <article class="card">
        <h3 class="section-title" style="margin-bottom:0.5rem;">💾 Backup Manual</h3>
        <div class="actions-row" style="margin-top:0;">
          <button type="button" class="btn btn-sm" data-action="export-json">⬇ Exportar JSON</button>
          <label class="btn btn-sm" style="cursor:pointer;">⬆ Importar JSON<input id="import-json-input" type="file" accept="application/json" style="display:none;" /></label>
        </div>
      </article>
    `;
  }

  /* ==================== SINCRONIZAÇÃO GITHUB (PADRÃO DAVI) ==================== */
  let syncCfg = null;
  try { syncCfg = JSON.parse(localStorage.getItem(SYNC_KEY)); } catch (_) {}
  let syncState = 'off';
  let syncTimer = null;
  let syncBusy = false;
  let syncAgain = false;
  let lastSyncAt = null;
  let syncErr = '';

  function saveSyncCfg() {
    try {
      if (syncCfg) localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg));
      else localStorage.removeItem(SYNC_KEY);
    } catch (_) {}
  }

  function updateSyncPill() {
    const pill = el('btn-sync-pill');
    const lbl = el('sync-label');
    if (!pill || !lbl) return;
    pill.className = 'sync-pill ' + syncState;
    const labels = { off: 'Local', busy: 'Sync...', ok: 'GitHub ✓', offline: 'Offline', error: 'Erro Sync' };
    lbl.textContent = labels[syncState] || 'Local';
  }

  const deviceName = () => (/Android|iPhone|iPad/i.test(navigator.userAgent) ? 'celular' : 'pc');

  function b64enc(str) {
    const u = new TextEncoder().encode(str);
    let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }

  function b64dec(b) {
    const bin = atob(b.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  function ghFetch(c, path, opt = {}) {
    return fetch(`https://api.github.com/repos/${c.owner}/${c.repo}${path}`, {
      cache: 'no-store',
      ...opt,
      headers: {
        Authorization: 'Bearer ' + c.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opt.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opt.headers || {})
      }
    });
  }

  async function ghErr(r) {
    let m = '';
    try { m = (await r.json()).message || ''; } catch (_) {}
    if (r.status === 401) return 'Token inválido ou expirado (401).';
    if (r.status === 403) return 'Sem permissão (403). Use token com "Contents: Read and write". ' + m;
    if (r.status === 404) return 'Repositório ou arquivo não encontrado (404). Verifique daviml/logica-dados.';
    return `GitHub ${r.status}: ${m}`;
  }

  async function ghRead(c) {
    const r = await ghFetch(c, `/contents/${encodeURIComponent(c.path)}?ref=${encodeURIComponent(c.branch)}&_=${Date.now()}`);
    if (r.status === 404) return { data: null, sha: null };
    if (!r.ok) throw new Error(await ghErr(r));
    const j = await r.json();
    let txt;
    if (j.content) txt = b64dec(j.content);
    else {
      const raw = await ghFetch(c, `/contents/${encodeURIComponent(c.path)}?ref=${encodeURIComponent(c.branch)}`, {
        headers: { Accept: 'application/vnd.github.raw+json' }
      });
      if (!raw.ok) throw new Error(await ghErr(raw));
      txt = await raw.text();
    }
    return { data: JSON.parse(txt), sha: j.sha };
  }

  function mergeData(L, R) {
    if (!R || typeof R !== 'object') return normalizeState(L);
    const out = normalizeState(L);
    const rNorm = normalizeState(R);

    const lTime = Date.parse(out.savedAt || 0) || 0;
    const rTime = Date.parse(rNorm.savedAt || 0) || 0;
    if (rTime > lTime) {
      out.theme = rNorm.theme;
      out.codeLang = rNorm.codeLang;
      out.blindThink = rNorm.blindThink;
    }

    out.dailyPicks = { ...rNorm.dailyPicks, ...out.dailyPicks };

    const allDays = new Set([...Object.keys(out.dailyChecks), ...Object.keys(rNorm.dailyChecks)]);
    allDays.forEach((day) => {
      const a = out.dailyChecks[day];
      const b = rNorm.dailyChecks[day];
      if (!a) out.dailyChecks[day] = b;
      else if (b) {
        const solvedSet = new Set([...(a.solvedIds || []), ...(b.solvedIds || [])]);
        const cwMap = new Map();
        [...(a.codewars || []), ...(b.codewars || [])].forEach((cw) => cwMap.set(String(cw.ts) + (cw.slug || ''), cw));
        out.dailyChecks[day] = {
          count: Math.max(a.count || 0, b.count || 0, solvedSet.size),
          solvedIds: Array.from(solvedSet),
          codewars: Array.from(cwMap.values()).sort((x, y) => x.ts - y.ts),
          _u: Math.max(a._u || 0, b._u || 0)
        };
      }
    });

    new Set([...Object.keys(out.attempts), ...Object.keys(rNorm.attempts)]).forEach((id) => {
      const a = out.attempts[id];
      const b = rNorm.attempts[id];
      if (!a || (b && (b._u || 0) > (a._u || 0))) out.attempts[id] = b;
    });

    new Set([...Object.keys(out.labsDone), ...Object.keys(rNorm.labsDone)]).forEach((id) => {
      const a = out.labsDone[id];
      const b = rNorm.labsDone[id];
      if (!a) out.labsDone[id] = b;
      else if (b) {
        const best = a.bestSteps != null && b.bestSteps != null ? Math.min(a.bestSteps, b.bestSteps) : a.bestSteps ?? b.bestSteps ?? null;
        out.labsDone[id] = { solved: !!(a.solved || b.solved), bestSteps: best, _u: Math.max(a._u || 0, b._u || 0) };
      }
    });

    // Merge Codewars profile + completedSlugs + drafts + bugJournal
    const cpA = out.codewarsProfile;
    const cpB = rNorm.codewarsProfile;
    const winnerCp = (cpB._u || 0) > (cpA._u || 0) ? cpB : cpA;
    out.codewarsProfile = {
      ...winnerCp,
      completedSlugs: { ...(cpB.completedSlugs || {}), ...(cpA.completedSlugs || {}) }
    };

    new Set([...Object.keys(out.kataDrafts), ...Object.keys(rNorm.kataDrafts)]).forEach((slug) => {
      const a = out.kataDrafts[slug];
      const b = rNorm.kataDrafts[slug];
      if (!a || (b && (b._u || 0) > (a._u || 0))) out.kataDrafts[slug] = b;
    });

    const bugMap = new Map();
    [...rNorm.bugJournal, ...out.bugJournal].forEach((b) => bugMap.set(b.id, b));
    out.bugJournal = Array.from(bugMap.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));

    return out;
  }

  function syncSnapshot(d) {
    const { savedAt, activeTab, hojeSubtab, explorarSubtab, activeLab, exploreFilter, exploreStatus, selectedExploreId, cwTrackFilter, selectedKataSlug, colaFilter, colaSearch, kataCache, ...rest } = d;
    return JSON.stringify(rest);
  }

  function scheduleSync(ms = 2200) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, ms);
  }

  async function sync() {
    if (!syncCfg || !syncCfg.token) return;
    if (syncBusy) { syncAgain = true; return; }
    if (!navigator.onLine) { syncState = 'offline'; updateSyncPill(); return; }
    syncBusy = true;
    syncState = 'busy';
    updateSyncPill();
    try {
      let done = false;
      for (let attempt = 0; attempt < 4 && !done; attempt++) {
        const { data: remote, sha } = await ghRead(syncCfg);
        const merged = remote ? mergeData(state, remote) : normalizeState(state);
        if (syncSnapshot(merged) !== syncSnapshot(state)) {
          state = merged;
          saveState(false);
          applyTheme();
          render();
        }
        if (!remote || syncSnapshot(merged) !== syncSnapshot(remote)) {
          const { kataCache, ...cloudSafe } = merged; // não inflar dados.json com cache HTML/MD da API
          const body = { ...cloudSafe, savedAt: new Date().toISOString() };
          const put = await ghFetch(syncCfg, `/contents/${encodeURIComponent(syncCfg.path)}`, {
            method: 'PUT',
            body: JSON.stringify({
              message: `Check pelo ${deviceName()} em ${new Date().toLocaleString('pt-BR')}`,
              content: b64enc(JSON.stringify(body, null, 2)),
              branch: syncCfg.branch,
              ...(sha ? { sha } : {})
            })
          });
          if (put.status === 409 || put.status === 422) {
            await new Promise((r) => setTimeout(r, 400 + attempt * 500));
            continue;
          }
          if (!put.ok) throw new Error(await ghErr(put));
        }
        done = true;
      }
      if (!done) throw new Error('Conflito de gravação simultânea.');
      syncState = 'ok';
      lastSyncAt = Date.now();
      syncErr = '';
    } catch (e) {
      syncState = navigator.onLine ? 'error' : 'offline';
      syncErr = e.message || String(e);
    } finally {
      syncBusy = false;
      updateSyncPill();
      if (state.activeTab === 'progresso') render();
      if (syncAgain) { syncAgain = false; scheduleSync(300); }
    }
  }

  function parseSyncInput(repoTxt, tokenTxt) {
    const t = (tokenTxt || '').trim();
    if (t && !/^(github_pat_|ghp_)/.test(t)) {
      try {
        const d = JSON.parse(atob(t));
        if (d.t) return { owner: d.o, repo: d.r, branch: d.b, path: d.p || 'dados.json', token: d.t };
      } catch (_) {}
    }
    const parts = (repoTxt || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length < 2) throw new Error('Informe usuario/repositorio (ex.: daviml/logica-dados).');
    if (!t) throw new Error('Cole o token do GitHub (github_pat_...) ou o código de conexão.');
    return { owner: parts[0], repo: parts[1], branch: '', path: 'dados.json', token: t };
  }

  async function connectSync(repoTxt, tokenTxt) {
    const cfg = parseSyncInput(repoTxt, tokenTxt);
    const r = await ghFetch(cfg, '');
    if (!r.ok) throw new Error(await ghErr(r));
    const j = await r.json();
    if (j.permissions && j.permissions.push === false) throw new Error('O token precisa de "Contents: Read and write".');
    cfg.branch = cfg.branch || j.default_branch || 'main';
    syncCfg = cfg;
    saveSyncCfg();
    await sync();
    if (syncState === 'error') {
      const err = syncErr;
      syncCfg = null;
      saveSyncCfg();
      syncState = 'off';
      updateSyncPill();
      throw new Error(err);
    }
    showToast('☁ Sincronizado com o GitHub!');
  }

  /* ==================== RENDER PRINCIPAL & EVENTOS ==================== */
  function render() {
    renderDailyBanner();
    updateSyncPill();
    document.querySelectorAll('.nav-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === state.activeTab));

    const container = el('app-content');
    if (state.activeTab === 'hoje') container.innerHTML = renderHojeTab();
    else if (state.activeTab === 'lab') container.innerHTML = renderLabTab();
    else if (state.activeTab === 'explorar') container.innerHTML = renderExplorarTab();
    else container.innerHTML = renderProgressoTab();
  }

  function handleAction(action, target) {
    if (action === 'set-lang') {
      state.codeLang = target.dataset.lang;
      saveState(false);
      render();
    } else if (action === 'set-hoje-sub') {
      state.hojeSubtab = target.dataset.sub;
      if (state.hojeSubtab !== 'livecode') stopLiveTimer();
      saveState(false);
      render();
    } else if (action === 'set-exp-sub') {
      state.explorarSubtab = target.dataset.sub;
      saveState(false);
      render();
    } else if (action === 'toggle-blind') {
      state.blindThink = !state.blindThink;
      saveState(false);
      render();
    } else if (action === 'reveal-blind') {
      uiSession.revealedBlind[target.dataset.id] = true;
      render();
    } else if (action === 'toggle-hint') {
      toggleHint(target.dataset.id);
    } else if (action === 'answer') {
      answerChallenge(target.dataset.id, Number(target.dataset.idx));
    } else if (action === 'retry-card') {
      resetChallengeAttempt(target.dataset.id);
    } else if (action === 'swap-daily') {
      swapDailyChallenge(target.dataset.id);
    } else if (action === 'add-extra') {
      addExtraDailyChallenge();
    } else if (action === 'goto-tab') {
      state.activeTab = target.dataset.tab;
      saveState(false);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'go-reviews') {
      state.activeTab = 'explorar';
      state.explorarSubtab = 'desafios';
      state.exploreFilter = 'review';
      state.exploreStatus = 'all';
      saveState(false);
      render();
    } else if (action === 'filter-cat') {
      state.exploreFilter = target.dataset.cat;
      saveState(false);
      render();
    } else if (action === 'filter-status') {
      state.exploreStatus = target.dataset.st;
      saveState(false);
      render();
    } else if (action === 'select-explore') {
      state.selectedExploreId = target.dataset.id;
      saveState(false);
      render();
      window.scrollTo({ top: 140, behavior: 'smooth' });
    } else if (action === 'cw-track-filter') {
      state.cwTrackFilter = target.dataset.val;
      saveState(false);
      render();
    } else if (action === 'select-kata') {
      state.selectedKataSlug = target.dataset.slug;
      saveState(false);
      render();
      window.scrollTo({ top: 140, behavior: 'smooth' });
    } else if (action === 'fetch-kata') {
      fetchKataDetail(target.dataset.slug);
    } else if (action === 'cola-cat') {
      state.colaFilter = target.dataset.cat;
      saveState(false);
      render();
    } else if (action === 'live-pick-struct') {
      uiSession.live.pickedStruct = target.dataset.val;
      render();
    } else if (action === 'live-pick-compl') {
      uiSession.live.pickedCompl = target.dataset.val;
      render();
    } else if (action === 'live-unlock') {
      uiSession.live.stage = 'quiz';
      render();
    } else if (action === 'live-toggle-timer') {
      if (uiSession.live.running) { stopLiveTimer(); render(); }
      else startLiveTimer();
    } else if (action === 'live-next') {
      stopLiveTimer();
      const pool = CHALLENGES.filter((c) => c.id !== state.liveCodeId);
      const next = pool[Math.floor(Math.random() * pool.length)];
      state.liveCodeId = next.id;
      uiSession.live = { secondsLeft: 180, running: false, timerId: null, pickedStruct: null, pickedCompl: null, stage: 'prep' };
      saveState(false);
      render();
    } else if (action === 'select-lab') {
      state.activeLab = target.dataset.lab;
      saveState(false);
      render();
    } else if (action === 'open-cw') {
      el('modal-codewars').classList.remove('hidden');
      el('cw-note-input').value = '';
    } else if (action === 'open-bug') {
      el('modal-bug').classList.remove('hidden');
      el('bug-title-input').value = '';
      el('bug-hyp-input').value = '';
      el('bug-real-input').value = '';
    } else if (action === 'sync-cw-input') {
      syncCodewarsUser(el('cw-user-input')?.value);
    } else if (action === 'sync-cw-now') {
      syncCodewarsUser(state.codewarsProfile?.username);
    } else if (action === 'del-cw') {
      const dk = target.dataset.date;
      const ts = Number(target.dataset.ts);
      const d = state.dailyChecks[dk];
      if (d && Array.isArray(d.codewars)) {
        d.codewars = d.codewars.filter((x) => x.ts !== ts);
        d._u = Date.now();
        saveState();
        render();
      }
    } else if (action === 'del-bug') {
      const bid = target.dataset.id;
      state.bugJournal = state.bugJournal.filter((b) => b.id !== bid);
      saveState();
      render();
    } else if (action === 'connect-sync') {
      connectSync(el('sync-repo-input')?.value, el('sync-token-input')?.value).catch((err) => {
        syncErr = err.message;
        render();
      });
    } else if (action === 'sync-now') {
      sync();
    } else if (action === 'copy-sync-code') {
      if (!syncCfg) return;
      const code = btoa(JSON.stringify({ o: syncCfg.owner, r: syncCfg.repo, b: syncCfg.branch, p: syncCfg.path, t: syncCfg.token }));
      navigator.clipboard?.writeText(code).then(() => showToast('📋 Código copiado!')).catch(() => showToast(code));
    } else if (action === 'disconnect-sync') {
      syncCfg = null;
      saveSyncCfg();
      syncState = 'off';
      syncErr = '';
      updateSyncPill();
      render();
    } else if (action === 'export-json') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sinapse-backup-${localDateKey()}.json`;
      a.click();
    } else {
      handleLabAction(action, target);
    }
  }

  function handleLabAction(action, target) {
    if (action === 'bowl-mode') {
      labState.bowl.mode = target.dataset.mode;
      render();
    } else if (action === 'bowl-reset') {
      labState.bowl = initBowlLab(labState.bowl.mode);
      render();
    } else if (action === 'bowl-step') {
      const b = labState.bowl;
      if (b.turnIdx > 5) return;
      const person = BOWL_PEOPLE[b.turnIdx];
      const targetName = b.secretMap[person];
      const shuffled = [...b.remaining].sort(() => Math.random() - 0.5);
      const opened = shuffled.indexOf(targetName) + 1;
      if (b.turnIdx === 5) b.leakPair = [...b.remaining];
      b.remaining = b.remaining.filter((n) => n !== targetName);
      b.logs.push({ person, opened });
      b.turnIdx++;
      render();
    } else if (action === 'mpc-step') {
      const b = labState.bowl;
      if (b.mpcStep <= 5) {
        const person = BOWL_PEOPLE[b.mpcStep];
        b.mpcSum += BOWL_PEOPLE.indexOf(b.secretMap[person]) + 1;
        b.mpcStep++;
      } else {
        b.mpcSolved = true;
        markLabDone('bowl');
      }
      render();
    } else if (action === 'jug') {
      const j = labState.jugs;
      const op = target.dataset.op;
      if (op === 'reset') labState.jugs = { j5: 0, j3: 0, steps: 0, solved: false };
      else if (!j.solved) {
        if (op === 'fill5') j.j5 = 5;
        else if (op === 'fill3') j.j3 = 3;
        else if (op === 'empty5') j.j5 = 0;
        else if (op === 'empty3') j.j3 = 0;
        else if (op === 'p53') { const m = Math.min(j.j5, 3 - j.j3); j.j5 -= m; j.j3 += m; }
        else if (op === 'p35') { const m = Math.min(j.j3, 5 - j.j5); j.j3 -= m; j.j5 += m; }
        j.steps++;
        if (j.j5 === 4) { j.solved = true; markLabDone('jugs', j.steps); }
      }
      render();
    } else if (action === 'coin-cycle') {
      const n = Number(target.dataset.coin);
      const cur = labState.coins.placements[n];
      if (!cur) labState.coins.placements[n] = 'L';
      else if (cur === 'L') labState.coins.placements[n] = 'R';
      else delete labState.coins.placements[n];
      render();
    } else if (action === 'coin-preset3') {
      labState.coins.placements = { 1: 'L', 2: 'L', 3: 'L', 4: 'R', 5: 'R', 6: 'R' };
      render();
    } else if (action === 'coin-clear') {
      labState.coins.placements = {};
      render();
    } else if (action === 'coin-reset') {
      labState.coins = initCoinsLab();
      render();
    } else if (action === 'coin-weigh') {
      const c = labState.coins;
      const left = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => c.placements[n] === 'L');
      const right = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => c.placements[n] === 'R');
      if (!left.length || left.length !== right.length || c.weighsUsed >= 2) return;
      c.weighsUsed++;
      if (left.includes(c.heavy)) {
        c.history.push(`[${left.map((n) => 'M' + n).join(',')}] > [${right.map((n) => 'M' + n).join(',')}] (Esq pesada)`);
        [1, 2, 3, 4, 5, 6, 7, 8].forEach((n) => { if (!left.includes(n)) c.eliminated[n] = true; });
      } else if (right.includes(c.heavy)) {
        c.history.push(`[${left.map((n) => 'M' + n).join(',')}] < [${right.map((n) => 'M' + n).join(',')}] (Dir pesada)`);
        [1, 2, 3, 4, 5, 6, 7, 8].forEach((n) => { if (!right.includes(n)) c.eliminated[n] = true; });
      } else {
        c.history.push(`[${left.map((n) => 'M' + n).join(',')}] = [${right.map((n) => 'M' + n).join(',')}] (Falsa está fora)`);
        [...left, ...right].forEach((n) => (c.eliminated[n] = true));
      }
      c.placements = {};
      render();
    } else if (action === 'coin-guess') {
      const c = labState.coins;
      c.guess = Number(target.dataset.coin);
      if (c.guess === c.heavy) markLabDone('coins', c.weighsUsed);
      render();
    } else if (action === 'sw-toggle') {
      const s = labState.switches;
      s.on[target.dataset.sw] = !s.on[target.dataset.sw];
      render();
    } else if (action === 'sw-wait') {
      const s = labState.switches;
      ['A', 'B', 'C'].forEach((sw) => { if (s.on[sw]) s.warm[sw] = true; });
      s.waited = true;
      showToast('⏱ 5 min passaram: lâmpadas ligadas aqueceram!');
      render();
    } else if (action === 'sw-enter') {
      labState.switches.enteredRoom = true;
      render();
    } else if (action === 'sw-reset') {
      labState.switches = initSwitchesLab();
      render();
    } else if (action === 'sw-check') {
      const s = labState.switches;
      const ok = s.guess[1] === s.mapping[1] && s.guess[2] === s.mapping[2] && s.guess[3] === s.mapping[3];
      if (ok) {
        s.feedback = '✅ Perfeito! Acesa = ligada agora; Apagada e Quente = ligada 5m e desligada; Apagada e Fria = nunca ligada.';
        markLabDone('switches');
      } else {
        s.feedback = '❌ Alguma não bateu. Tente novamente!';
      }
      render();
    } else if (action === 'algo-move') {
      const idx = Number(target.dataset.idx);
      const next = idx + Number(target.dataset.dir);
      const items = labState.algo.items;
      if (next >= 0 && next < items.length) {
        [items[idx], items[next]] = [items[next], items[idx]];
        labState.algo.result = null;
        render();
      }
    } else if (action === 'algo-reset') {
      labState.algo = initAlgoLab();
      render();
    } else if (action === 'algo-test') {
      const order = labState.algo.items.map((x) => x.id);
      const expected = ['idem', 'begin', 'upd', 'check', 'commit'];
      const ok = order.every((id, i) => id === expected[i]);
      if (ok) {
        labState.algo.result = { ok: true, msg: '✅ Duplo clique neutralizado! Ordem transacional e idempotente perfeita.' };
        markLabDone('algo');
      } else {
        labState.algo.result = { ok: false, msg: '❌ Ordem vulnerável a corrida ou perda de consistência. Revise BEGIN / UPDATE / rows_affected / COMMIT.' };
      }
      render();
    } else if (action === 'bs-target') {
      labState.binsearch.target = Number(target.dataset.val);
      handleLabAction('bs-reset', target);
    } else if (action === 'bs-cond') {
      labState.binsearch.cond = target.dataset.val;
      handleLabAction('bs-reset', target);
    } else if (action === 'bs-move') {
      labState.binsearch.move = target.dataset.val;
      handleLabAction('bs-reset', target);
    } else if (action === 'bs-reset') {
      const b = labState.binsearch;
      b.low = 0; b.high = b.arr.length - 1; b.mid = null; b.steps = 0; b.status = 'ready';
      b.msg = 'Pronto! Clique em ▶ 1 Passo.';
      render();
    } else if (action === 'bs-step') {
      const b = labState.binsearch;
      const condOk = b.cond === 'le' ? b.low <= b.high : b.low < b.high;
      if (!condOk) {
        b.status = 'not_found';
        b.msg = b.arr.includes(b.target)
          ? `🚨 Bug off-by-one! Parou porque low (${b.low}) == high (${b.high}) com "low < high" e pulou ${b.target}!`
          : `Busca terminada: ${b.target} não existe no array (${b.steps} passos).`;
        render();
        return;
      }
      if (b.steps > 12) {
        b.status = 'infinite';
        b.msg = '🔁 LOOP INFINITO! Com "low = mid", o ponteiro trava quando restam 2 itens.';
        render();
        return;
      }
      b.steps++;
      b.mid = Math.floor((b.low + b.high) / 2);
      const val = b.arr[b.mid];
      if (val === b.target) {
        b.status = 'found';
        b.msg = `✅ Encontrou ${b.target} em [${b.mid}] em ${b.steps} passos!`;
        if (b.cond === 'le' && b.move === 'pm1') markLabDone('binsearch', b.steps);
      } else if (val < b.target) {
        b.low = b.move === 'pm1' ? b.mid + 1 : b.mid;
        b.msg = `arr[${b.mid}] = ${val} < ${b.target} → low = ${b.low}.`;
      } else {
        b.high = b.move === 'pm1' ? b.mid - 1 : b.mid;
        b.msg = `arr[${b.mid}] = ${val} > ${b.target} → high = ${b.high}.`;
      }
      render();
    }
  }

  /* ==================== EVENT LISTENERS GLOBAIS ==================== */
  document.addEventListener('click', (ev) => {
    const actionEl = ev.target.closest('[data-action]');
    if (actionEl) { handleAction(actionEl.dataset.action, actionEl); return; }

    const navEl = ev.target.closest('.nav-tab');
    if (navEl) {
      state.activeTab = navEl.dataset.tab;
      if (state.activeTab !== 'hoje') stopLiveTimer();
      saveState(false);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cwLangBtn = ev.target.closest('[data-cw-lang]');
    if (cwLangBtn) {
      uiSession.cwLang = cwLangBtn.dataset.cwLang;
      document.querySelectorAll('[data-cw-lang]').forEach((b) => b.classList.toggle('active', b === cwLangBtn));
      return;
    }

    const bugBtn = ev.target.closest('[data-bug-outcome]');
    if (bugBtn) {
      uiSession.bugOutcome = bugBtn.dataset.bugOutcome;
      document.querySelectorAll('[data-bug-outcome]').forEach((b) => b.classList.toggle('active', b === bugBtn));
    }
  });

  document.addEventListener('input', (ev) => {
    if (ev.target.dataset.kataDraft) {
      const slug = ev.target.dataset.kataDraft;
      state.kataDrafts[slug] = { text: ev.target.value, _u: Date.now() };
      saveState();
    } else if (ev.target.id === 'cola-search-input') {
      state.colaSearch = ev.target.value;
      const pos = ev.target.selectionStart;
      render();
      const restored = el('cola-search-input');
      if (restored) { restored.focus(); restored.setSelectionRange(pos, pos); }
    }
  });

  document.addEventListener('change', (ev) => {
    if (ev.target.dataset.action === 'sw-guess') {
      labState.switches.guess[Number(ev.target.dataset.bulb)] = ev.target.value;
    } else if (ev.target.id === 'import-json-input') {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          state = mergeData(state, JSON.parse(String(reader.result)));
          saveState();
          applyTheme();
          render();
          showToast('⬆ Backup importado!');
        } catch (_) {
          showToast('Arquivo JSON inválido.');
        }
      };
      reader.readAsText(file);
    }
  });

  el('btn-theme')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState(false);
    applyTheme();
  });

  el('btn-sync-pill')?.addEventListener('click', () => {
    if (syncCfg && syncCfg.token) sync();
    else { state.activeTab = 'progresso'; saveState(false); render(); }
  });

  el('btn-cw-close')?.addEventListener('click', () => el('modal-codewars').classList.add('hidden'));
  el('btn-cw-cancel')?.addEventListener('click', () => el('modal-codewars').classList.add('hidden'));
  el('btn-cw-save')?.addEventListener('click', () => {
    const today = localDateKey();
    const day = ensureDayEntry(today);
    const note = (el('cw-note-input')?.value || '').trim();
    day.codewars.push({ lang: uiSession.cwLang, note, ts: Date.now() });
    day._u = Date.now();
    saveState();
    el('modal-codewars').classList.add('hidden');
    render();
    showToast(`⚔ Kata de ${uiSession.cwLang === 'python' ? 'Python' : 'C#'} registrado!`);
  });

  el('btn-bug-close')?.addEventListener('click', () => el('modal-bug').classList.add('hidden'));
  el('btn-bug-cancel')?.addEventListener('click', () => el('modal-bug').classList.add('hidden'));
  el('btn-bug-save')?.addEventListener('click', () => {
    const title = (el('bug-title-input')?.value || '').trim();
    const hypothesis = (el('bug-hyp-input')?.value || '').trim();
    const realCause = (el('bug-real-input')?.value || '').trim();
    if (!title || !hypothesis) {
      showToast('Preencha o sintoma do bug e a sua hipótese antes.');
      return;
    }
    const today = localDateKey();
    const id = 'bug-' + Date.now();
    state.bugJournal.unshift({ id, dateKey: today, title, hypothesis, realCause, outcome: uiSession.bugOutcome, ts: Date.now() });
    recordDailySolve('bug:' + id, today);
    saveState();
    el('modal-bug').classList.add('hidden');
    render();
    showToast('🐛 Hipótese registrada e Check de hoje garantido ✅');
  });

  applyTheme();
  render();
  if (syncCfg && syncCfg.token) sync();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
