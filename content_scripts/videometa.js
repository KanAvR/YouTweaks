(() => {
  "use strict";

  const ext = globalThis.browser ?? globalThis.chrome;
  const ENABLED_KEY  = "videoInfoMoved";
  const WRAPPER_ID   = "youtweaks-pills-wrapper";
  const VIEWS_ID     = "youtweaks-views-pill";
  const DATE_ID      = "youtweaks-date-pill";

  const EYE_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0">
    <path d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0
    11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>
  </svg>`;

  const CAL_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0">
    <path d="M17 3V1h-2v2H9V1H7v2H4a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h16a1 1 0 0
    0 1-1V4a1 1 0 0 0-1-1h-3zM5 8h14v12H5V8z"/>
  </svg>`;

  let enabled    = false;
  let retryTimer = null;

  function isWatch() {
    return window.location.pathname === "/watch";
  }

  function currentVideoId() {
    return new URLSearchParams(window.location.search).get("v") || "";
  }


  function getStructuredData() {
    const vid = currentVideoId();
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(el.textContent);
        if (data["@type"] !== "VideoObject") continue;
        const urls = [data.embedUrl, data.url, data["@id"]].filter(Boolean).join(" ");
        if (vid && urls && !urls.includes(vid)) continue;
        const viewCount = Number(
          data.interactionStatistic?.userInteractionCount ??
          data.interactionCount ?? 0
        );
        return {
          uploadDate: data.uploadDate || null,
          viewCount:  viewCount || null,
        };
      } catch {}
    }
    return null;
  }


  function getExactTooltipData() {
    const tip = document.querySelector("ytd-watch-info-text tp-yt-paper-tooltip");
    if (!tip) return null;
    const text = tip.textContent.trim();
    if (!text) return null;
    const parts = text.split("•").map(p => p.trim()).filter(Boolean);
    let viewsExact = null, dateExact = null;
    for (const part of parts) {
      if (/views?/i.test(part)) viewsExact = part;
      else if (/[a-z]/i.test(part)) dateExact = part;
    }
    return { viewsExact, dateExact };
  }


  function extractFromDOM() {
    const infoEl =
      document.querySelector("ytd-watch-info-text #info") ||
      document.querySelector("ytd-watch-info-text yt-formatted-string");
    if (!infoEl) return null;

    const full = infoEl.textContent.trim();
    const parts = full.split("•").map(p => p.trim()).filter(Boolean);

    let viewsRaw = null, dateRaw = null;
    for (const part of parts) {
      if (/views?/i.test(part)) {
        viewsRaw = part.replace(/views?/gi, "").trim();
      } else if (/ago|premiere|stream|live/i.test(part) || /[a-z]/i.test(part)) {
        dateRaw = part;
      }
    }
    return { viewsRaw, dateRaw };
  }

  function parseViewCount(str) {
    const m = str.match(/([\d.,]+)\s*([KMB])?/i);
    if (!m) return null;
    let n = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(n)) return null;
    const suffix = (m[2] || "").toUpperCase();
    if (suffix === "K") n *= 1e3;
    else if (suffix === "M") n *= 1e6;
    else if (suffix === "B") n *= 1e9;
    return Math.round(n);
  }


  function compactViews(n) {
    if (n >= 1e9) return +(n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return +(n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return +(n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function relativeDate(iso) {
    const ms    = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(ms / 60_000);
    const hrs   = Math.floor(mins / 60);
    const days  = Math.floor(hrs / 24);
    const weeks = Math.floor(days / 7);
    const mons  = Math.floor(days / 30.44);
    const yrs   = Math.floor(days / 365.25);

    if (yrs   >= 1) return `${yrs} ${yrs === 1 ? "year" : "years"} ago`;
    if (mons  >= 1) return `${mons} ${mons === 1 ? "month" : "months"} ago`;
    if (weeks >= 1) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    if (days  >= 1) return `${days} ${days === 1 ? "day" : "days"} ago`;
    if (hrs   >= 1) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
    if (mins  >= 1) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
    return "just now";
  }

  function exactDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  }


  function findTarget() {
    const inner =
      document.querySelector("ytd-watch-metadata #actions ytd-menu-renderer #top-level-buttons-computed") ||
      document.querySelector("#actions #top-level-buttons-computed");
    if (inner) return { el: inner, mode: "prepend" };

    const actions =
      document.querySelector("ytd-watch-metadata #actions") ||
      document.querySelector("#above-the-fold #actions");
    if (actions) return { el: actions, mode: "prepend" };

    return null;
  }

  const TIP_CLASS = "youtweaks-pill-tip";

  function attachTooltip(pill, text) {
    let tip = null;
    pill.addEventListener("mouseenter", () => {
      tip?.remove();
      tip = document.createElement("div");
      tip.className = TIP_CLASS;
      tip.textContent = text;
      const r = pill.getBoundingClientRect();
      Object.assign(tip.style, {
        position:      "fixed",
        top:           `${r.bottom + 8}px`,
        left:          `${r.left + r.width / 2}px`,
        transform:     "translateX(-50%)",
        background:    "rgba(97, 97, 97, 0.92)",
        color:         "#fff",
        fontSize:      "12px",
        fontWeight:    "400",
        fontFamily:    '"Roboto","Arial",sans-serif',
        lineHeight:    "1.4",
        padding:       "6px 8px",
        borderRadius:  "4px",
        whiteSpace:    "nowrap",
        zIndex:        "2147483646",
        pointerEvents: "none",
      });
      document.body.append(tip);
    });
    pill.addEventListener("mouseleave", () => { tip?.remove(); tip = null; });
  }

  function nativeButtonHeight() {
    const btn = document.querySelector(
      "ytd-watch-metadata #actions button, #actions button"
    );
    const h = btn?.getBoundingClientRect().height;
    return h && h >= 24 ? Math.round(h) : 36;
  }

  function makePill(id, svg, label, tooltip, heightPx) {
    const el = document.createElement("div");
    el.id = id;
    Object.assign(el.style, {
      display:       "inline-flex",
      alignItems:    "center",
      gap:           "6px",
      padding:       "0 16px",
      height:        `${heightPx}px`,
      position:      "relative",
      zIndex:        "1",
      background:    "var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1))",
      borderRadius:  `${Math.ceil(heightPx / 2)}px`,
      fontSize:      "14px",
      fontWeight:    "500",
      fontFamily:    '"Roboto","Arial",sans-serif',
      color:         "var(--yt-spec-text-primary, #f1f1f1)",
      whiteSpace:    "nowrap",
      cursor:        "default",
      userSelect:    "none",
      flexShrink:    "0",
      boxSizing:     "border-box",
    });
    el.innerHTML = svg + `<span>${label}</span>`;
    if (tooltip) attachTooltip(el, tooltip);
    return el;
  }


  function removePills() {
    document.getElementById(WRAPPER_ID)?.remove();
    document.querySelectorAll("." + TIP_CLASS).forEach((el) => el.remove());
  }


  function inject() {
    if (!enabled || !isWatch()) { removePills(); return; }
    if (document.getElementById(WRAPPER_ID)) return;

    const target = findTarget();
    if (!target) return;

    let viewsLabel = null, viewsTooltip = null;
    let dateLabel  = null, dateTooltip  = null;

    const sd    = getStructuredData();
    const exact = getExactTooltipData();
    const fb    = extractFromDOM();

    if (sd?.viewCount) {
      viewsLabel   = compactViews(sd.viewCount);
      viewsTooltip = sd.viewCount.toLocaleString() + " views";
    } else if (exact?.viewsExact) {
      const n = parseViewCount(exact.viewsExact);
      if (n !== null) {
        viewsLabel   = compactViews(n);
        viewsTooltip = n.toLocaleString() + " views";
      }
    } else if (fb?.viewsRaw) {
      const n = parseViewCount(fb.viewsRaw);
      if (n !== null) {
        viewsLabel   = compactViews(n);
        viewsTooltip = n.toLocaleString() + " views";
      }
    }

    if (sd?.uploadDate) {
      dateLabel   = relativeDate(sd.uploadDate);
      dateTooltip = exactDate(sd.uploadDate);
    } else if (fb?.dateRaw) {
      dateLabel   = fb.dateRaw;
      dateTooltip = exact?.dateExact || null;
    }

    if (!viewsLabel && !dateLabel) return;

    const wrapper = document.createElement("div");
    wrapper.id = WRAPPER_ID;
    Object.assign(wrapper.style, {
      display:     "flex",
      alignItems:  "center",
      gap:         "8px",
      marginRight: "8px",
      flexShrink:  "0",
    });

    const h = nativeButtonHeight();
    if (viewsLabel) wrapper.append(makePill(VIEWS_ID, EYE_SVG, viewsLabel, viewsTooltip, h));
    if (dateLabel)  wrapper.append(makePill(DATE_ID,  CAL_SVG, dateLabel,  dateTooltip, h));

    target.el.prepend(wrapper);
  }


  function scheduleRetry(attempt = 0) {
    clearTimeout(retryTimer);
    if (!enabled || !isWatch()) return;
    const delays = [300, 800, 1500, 3000, 6000];
    if (attempt >= delays.length) return;
    retryTimer = setTimeout(() => {
      inject();
      scheduleRetry(attempt + 1);
    }, delays[attempt]);
  }

  function run() {
    removePills();
    inject();
    scheduleRetry();
  }


  window.addEventListener("yt-navigate-finish", () => {
    enabled ? run() : removePills();
  });

  ext.storage.local.get(ENABLED_KEY).then(({ [ENABLED_KEY]: on }) => {
    enabled = on === true;
    if (enabled && isWatch()) run();
  });

  ext.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || changes[ENABLED_KEY] === undefined) return;
    enabled = changes[ENABLED_KEY].newValue === true;
    enabled && isWatch() ? run() : removePills();
  });
})();
