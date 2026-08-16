// timeTracker.js — masthead badge + daily limit/bedtime blocking.
// Self-starting IIFE — add to manifest content_scripts, nothing else needed.
(() => {
  "use strict";

  const ext = globalThis.browser ?? globalThis.chrome;

  const BADGE_ID        = "youtweaks-time-badge";
  const BLOCK_ID        = "youtweaks-time-block";
  const STORAGE_KEY     = "watchTime";
  const HISTORY_KEY     = "ytHistory";
  const ENABLED_KEY     = "timeTrackingEnabled";
  const LIMIT_KEY       = "watchTimeLimit";      // seconds; 0 = disabled
  const BEDTIME_EN_KEY  = "bedtimeEnabled";
  const BEDTIME_KEY     = "bedtimeTime";         // "HH:MM" start
  const BEDTIME_END_KEY = "bedtimeEndTime";      // "HH:MM" end
  const SNOOZE_UNTIL_KEY = "snoozeUntilMs";      // ms timestamp set by popup

  const TICK_MS    = 1000;
  const FLUSH_MS   = 5000;
  const MAX_GAP_MS = 5000;

  const COUNT_ONLY_WHILE_PLAYING = false;
  const PLAYERS =
    "ytd-watch-flexy #player video, #shorts-player video, ytd-reel-video-renderer video";

  let enabled        = false;
  let badgeEl        = null;
  let blockEl        = null;
  let currentDay     = dayKey();
  let storedSeconds  = 0;
  let pendingMs      = 0;
  let limitSeconds   = 0;
  let bedtimeEnabled  = false;
  let bedtimeTime     = "";  // block start "HH:MM"
  let bedtimeEndTime  = "";  // block end   "HH:MM"
  let snoozeUntil    = 0;   // ms timestamp; 0 = not snoozed
  let lastSampleAt   = 0;
  let lastFlushAt    = 0;
  let tickHandle     = null;
  let inFlight       = Promise.resolve();

  function dayKey() {
    return new Date().toLocaleDateString("en-CA");
  }

  function formatTime(s) {
    const pad = (n) => String(n).padStart(2, "0");
    s = Math.max(0, Math.floor(s));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }

  function totalSeconds() {
    return storedSeconds + Math.floor(pendingMs / 1000);
  }

  function limitStyle(used, limit) {
    if (!limit) return null;
    const pct = used / limit;
    if (pct >= 1.00) return { bg: "rgba(239,68,68,0.18)",  color: "#ef4444" };
    if (pct >= 0.90) return { bg: "rgba(249,115,22,0.14)", color: "#f97316" };
    if (pct >= 0.75) return { bg: "rgba(234,179,8,0.13)",  color: "#eab308" };
    if (pct >= 0.50) return { bg: "rgba(234,179,8,0.07)",  color: "#ca8a04" };
    return null;
  }

  function isBedtime() {
    if (!bedtimeEnabled || !bedtimeTime || !bedtimeEndTime) return false;
    const [sh, sm] = bedtimeTime.split(":").map(Number);
    const [eh, em] = bedtimeEndTime.split(":").map(Number);
    const now  = new Date();
    const nowM = now.getHours() * 60 + now.getMinutes();
    const startM = sh * 60 + sm;
    const endM   = eh * 60 + em;
    // handles both same-day (14:00–18:00) and overnight (22:00–08:00) ranges
    return startM <= endM
      ? nowM >= startM && nowM < endM
      : nowM >= startM || nowM < endM;
  }

  // ── Badge ──────────────────────────────────────────────────────────────────

  function findLogoElement() {
    const light = document.querySelector("ytd-masthead ytd-topbar-logo-renderer");
    if (light) return light;
    const masthead = document.querySelector("ytd-masthead");
    if (masthead?.shadowRoot)
      return masthead.shadowRoot.querySelector("ytd-topbar-logo-renderer");
    return null;
  }

  function ensureBadge() {
    if (!enabled) return;
    if (!badgeEl?.isConnected) {
      badgeEl = null;
      const logo = findLogoElement();
      if (!logo || !logo.parentElement) return;
      badgeEl = document.createElement("div");
      badgeEl.id = BADGE_ID;
      badgeEl.title = "Time on YouTube today";
      const slot = logo.getAttribute("slot");
      if (slot) badgeEl.setAttribute("slot", slot);
      Object.assign(badgeEl.style, {
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "center",
        marginLeft: "10px",
        padding: "3px 10px",
        borderRadius: "6px",
        fontFamily: '"Roboto Mono", monospace',
        fontSize: "12px",
        lineHeight: "18px",
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "background 0.4s, color 0.4s",
      });
      logo.insertAdjacentElement("afterend", badgeEl);
    }
    const text = formatTime(totalSeconds());
    if (badgeEl.textContent !== text) badgeEl.textContent = text;
    const s = limitStyle(totalSeconds(), limitSeconds);
    badgeEl.style.background = s?.bg    ?? "var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1))";
    badgeEl.style.color      = s?.color ?? "var(--yt-spec-text-secondary, #aaa)";
  }

  function removeBadge() {
    if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  }

  // ── Block overlay ──────────────────────────────────────────────────────────

  function pauseVideos() {
    document.querySelectorAll("video").forEach((v) => {
      if (!v.paused) v.pause();
    });
  }

  function buildBlockPage(reason) {
    const heading = reason === "bedtime"
      ? "It's past your YouTube bedtime."
      : "You've reached your daily YouTube limit.";

    blockEl = document.createElement("div");
    blockEl.id = BLOCK_ID;
    Object.assign(blockEl.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      background: "#0f0f0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Roboto, Arial, sans-serif",
      WebkitFontSmoothing: "antialiased",
    });

    blockEl.innerHTML = `
      <svg width="96" height="96" viewBox="0 0 24 24" fill="none"
           style="margin-bottom:32px">
        <circle cx="12" cy="12" r="10.25" stroke="#ef4444" stroke-width="1.25"/>
        <path d="M12 7v5l2.5 2.5" stroke="#ef4444" stroke-width="1.25"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h1 style="font-size:20px;font-weight:600;color:#e0e0e0;margin:0;
                 font-family:Roboto,Arial,sans-serif;text-align:center;
                 max-width:300px;line-height:1.45;letter-spacing:-0.1px">
        ${heading}
      </h1>
    `;
  }

  function showBlock(reason = "limit") {
    if (blockEl?.isConnected) return;
    pauseVideos();
    removeBadge(); // hide badge behind the block overlay — re-shown on next tick after snooze
    if (document.body) document.body.style.overflow = "hidden";
    buildBlockPage(reason);
    document.documentElement.append(blockEl);
  }

  function hideBlock() {
    if (blockEl) { blockEl.remove(); blockEl = null; }
    if (document.body) document.body.style.overflow = "";
  }

  function checkBlock() {
    if (snoozeUntil > Date.now()) {
      if (blockEl?.isConnected) hideBlock();
      return;
    }
    const limitHit   = limitSeconds > 0 && totalSeconds() >= limitSeconds;
    const bedtimeHit = isBedtime();
    if (limitHit || bedtimeHit) {
      if (!blockEl?.isConnected) showBlock(limitHit ? "limit" : "bedtime");
    } else {
      if (blockEl?.isConnected) hideBlock();
    }
  }

  // ── Core tracking ──────────────────────────────────────────────────────────

  function isCounting() {
    if (blockEl?.isConnected) return false; // don't count while blocked
    if (document.visibilityState !== "visible") return false;
    if (!document.hasFocus()) return false;
    if (!COUNT_ONLY_WHILE_PLAYING) return true;
    return [...document.querySelectorAll(PLAYERS)].some(
      (v) => !v.paused && !v.ended && v.readyState >= 2
    );
  }

  async function load() {
    try {
      const r = await ext.storage.local.get([
        STORAGE_KEY, LIMIT_KEY, BEDTIME_EN_KEY, BEDTIME_KEY, BEDTIME_END_KEY, SNOOZE_UNTIL_KEY,
      ]);
      currentDay     = dayKey();
      const wt       = r[STORAGE_KEY];
      storedSeconds  = wt && wt.day === currentDay ? Number(wt.seconds) || 0 : 0;
      limitSeconds   = Number(r[LIMIT_KEY]) || 0;
      bedtimeEnabled = r[BEDTIME_EN_KEY] === true;
      bedtimeTime    = r[BEDTIME_KEY] || "";
      bedtimeEndTime = r[BEDTIME_END_KEY] || "";
      snoozeUntil    = Number(r[SNOOZE_UNTIL_KEY]) || 0;
    } catch {
      storedSeconds = 0;
    }
  }

  async function flush() {
    lastFlushAt = Date.now();
    const carry = Math.floor(pendingMs / 1000);
    if (carry <= 0) return;
    pendingMs -= carry * 1000;
    try {
      const r    = await ext.storage.local.get([STORAGE_KEY, HISTORY_KEY]);
      const wt   = r[STORAGE_KEY];
      const base = wt && wt.day === currentDay ? Number(wt.seconds) || 0 : 0;
      storedSeconds = Math.max(storedSeconds, base) + carry;

      const hist = r[HISTORY_KEY] || {};
      hist[currentDay] = storedSeconds;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 31);
      const cutoffKey = cutoff.toLocaleDateString("en-CA");
      for (const k of Object.keys(hist)) {
        if (k < cutoffKey) delete hist[k];
      }

      await ext.storage.local.set({
        [STORAGE_KEY]: { day: currentDay, seconds: storedSeconds },
        [HISTORY_KEY]: hist,
      });
    } catch {
      pendingMs += carry * 1000;
    }
  }

  function flushSync() {
    const carry = Math.floor(pendingMs / 1000);
    if (carry <= 0) return;
    pendingMs     -= carry * 1000;
    storedSeconds += carry;
    ext.storage.local
      .set({ [STORAGE_KEY]: { day: currentDay, seconds: storedSeconds } })
      .catch(() => {});
  }

  function rollover() {
    currentDay    = dayKey();
    storedSeconds = 0;
    pendingMs     = 0;
    snoozeUntil   = 0;
    lastFlushAt   = Date.now();
    hideBlock();
    ext.storage.local
      .set({ [STORAGE_KEY]: { day: currentDay, seconds: 0 } })
      .catch(() => {});
  }

  function tick() {
    const now  = Date.now();
    const prev = lastSampleAt;
    lastSampleAt = now;

    if (dayKey() !== currentDay) rollover();

    const delta = now - prev;
    if (prev && isCounting() && delta > 0 && delta <= MAX_GAP_MS) {
      pendingMs += delta;
    }

    ensureBadge();
    checkBlock();
    if (now - lastFlushAt >= FLUSH_MS) flush();
  }

  async function start() {
    if (enabled) return;
    enabled = true;
    await inFlight;
    await load();
    if (!enabled) return;
    lastSampleAt = Date.now();
    lastFlushAt  = Date.now();
    ensureBadge();
    checkBlock();
    tickHandle = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (!enabled) return;
    enabled = false;
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    lastSampleAt = 0;
    inFlight = flush();
    removeBadge();
    hideBlock();
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  document.addEventListener("visibilitychange", () => {
    lastSampleAt = Date.now();
    if (document.visibilityState !== "visible") flush();
  });
  window.addEventListener("blur",  () => { lastSampleAt = Date.now(); flush(); });
  window.addEventListener("focus", () => { lastSampleAt = Date.now(); });
  window.addEventListener("pagehide", flushSync);
  window.addEventListener("yt-navigate-finish", () => { ensureBadge(); checkBlock(); });

  ext.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes[ENABLED_KEY]) {
      changes[ENABLED_KEY].newValue === true ? start() : stop();
    }
    if (changes[LIMIT_KEY] !== undefined) {
      limitSeconds = Number(changes[LIMIT_KEY].newValue) || 0;
      ensureBadge(); checkBlock();
    }
    if (changes[BEDTIME_EN_KEY] !== undefined) {
      bedtimeEnabled = changes[BEDTIME_EN_KEY].newValue === true;
      checkBlock();
    }
    if (changes[BEDTIME_KEY] !== undefined) {
      bedtimeTime = changes[BEDTIME_KEY].newValue || "";
      checkBlock();
    }
    if (changes[BEDTIME_END_KEY] !== undefined) {
      bedtimeEndTime = changes[BEDTIME_END_KEY].newValue || "";
      checkBlock();
    }
    // Snooze set by popup — apply immediately.
    if (changes[SNOOZE_UNTIL_KEY] !== undefined) {
      snoozeUntil = Number(changes[SNOOZE_UNTIL_KEY].newValue) || 0;
      checkBlock();
    }

    const wt = changes[STORAGE_KEY];
    if (!wt?.newValue || wt.newValue.day !== currentDay) return;
    const seconds = Number(wt.newValue.seconds) || 0;
    if (seconds > storedSeconds) {
      storedSeconds = seconds;
    } else if (seconds === 0) {
      storedSeconds = 0;
      pendingMs     = 0;
    }
    ensureBadge();
    checkBlock();
  });

  async function boot() {
    try {
      const { [ENABLED_KEY]: on } = await ext.storage.local.get(ENABLED_KEY);
      if (on === true) start();
    } catch {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  globalThis.YouTweaksTime = {
    start, stop, flush, ensureBadge,
    get enabled()  { return enabled; },
    get seconds()  { return totalSeconds(); },
    get limit()    { return limitSeconds; },
    get snoozed()  { return snoozeUntil > Date.now(); },
  };
})();
