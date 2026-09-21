const EYE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>`;

const CAL_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 3V1h-2v2H9V1H7v2H4a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3zM5 8h14v12H5V8z"/></svg>`;

const THUMB_HOSTS = [
  "ytd-thumbnail",
  "yt-thumbnail-view-model",
  "yt-collection-thumbnail-view-model",
  ".yt-lockup-view-model__content-image",
  "a#thumbnail",
].join(", ");

const HOVER_EVENTS = [
  "pointerover",
  "pointerenter",
  "mouseover",
  "mouseenter",
];

const KEEP_VIDEO =
  "#movie_player, ytd-watch-flexy #player, ytd-miniplayer, #shorts-player, ytd-reel-video-renderer";

const PREVIEW_HOSTS = [
  "ytd-video-preview",
  "#video-preview",
  "#mouseover-overlay",
  "#mouseover-overlay-renderer",
  "ytd-moving-thumbnail-renderer",
  "ytd-inline-preview-thumbnail-renderer",
  "yt-inline-player-view-model",
].join(", ");

const SHORTS_HOSTS = [
  "ytd-guide-entry-renderer",
  "yt-guide-entry-renderer",
  "ytd-mini-guide-entry-renderer",
  "ytd-reel-item-renderer",
  "ytd-rich-grid-slim-media",
  "ytm-shorts-lockup-view-model",
  "ytm-shorts-lockup-view-model-v2",
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-rich-item-renderer",
  "yt-lockup-view-model",
  "yt-chip-cloud-chip-renderer",
  "yt-tab-shape",
].join(", ");

const GAME_NAV_HOSTS = [
  "ytd-guide-entry-renderer",
  "yt-guide-entry-renderer",
  "ytd-mini-guide-entry-renderer",
  "yt-chip-cloud-chip-renderer",
].join(", ");

const GAME_SHELF_HOSTS = [
  "ytd-rich-shelf-renderer",
  "ytd-shelf-renderer",
  "grid-shelf-view-model",
  "ytd-gaming-section-renderer",
  "ytd-rich-section-renderer",
].join(", ");

const GAME_ITEM_HOSTS = [
  "yt-game-card-view-model",
  "yt-lockup-view-model",
  "ytd-rich-item-renderer",
].join(", ");

function isPlaybackTarget(element) {
  const fullscreen = document.fullscreenElement;
  return element.closest(KEEP_VIDEO) ||
    (fullscreen && fullscreen.contains(element));
}

function thumbnailBlur(enabled) {
  document.documentElement.classList.toggle("yt-blur", enabled === true);
}

function hideShorts(enabled) {
  document.documentElement.classList.toggle("yt-no-shorts", enabled === true);
  if (!enabled) {
    document.querySelectorAll("[data-ytweaks-short]").forEach((el) => {
      el.removeAttribute("data-ytweaks-short");
    });
    return;
  }
  document
    .querySelectorAll('a[href^="/shorts"], a[href*="youtube.com/shorts/"]')
    .forEach((link) => {
      (link.closest(SHORTS_HOSTS) ?? link).setAttribute("data-ytweaks-short", "");
    });
}

const state = {
  createHidden: false,
  notificationHidden: false,
  micHidden: false,
  hoverHidden: false,
  shortsHidden: false,
  recomendationBarHidden: false,
  geminiStuffHidden: false,
  videoInfoMoved: false,
  hideProgressbarOnRecomendations: false,
  gamesHidden: false,
  merchStoreHidden: false,
};

function setButtonHidden(ariaLabel, hidden) {
  document
    .querySelectorAll(`button[aria-label="${ariaLabel}"]`)
    .forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}

function hideNotificationPanel(hidden) {
  document
    .querySelectorAll('.style-scope.ytd-notification-topbar-button-renderer')
    .forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}

function stopHoverEffects(hidden) {
  if (!hidden) return;
  document.querySelectorAll("video").forEach((v) => {
    if (isPlaybackTarget(v) || !v.closest(PREVIEW_HOSTS)) return;
    if (!v.paused) v.pause();
  });
}
function hideProgressbarOnRecomendations(hidden) {
  document
    .querySelectorAll('.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment')
    .forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });

   document
    .querySelectorAll('.ytThumbnailOverlayProgressBarHostWatchedProgressBar.ytThumbnailOverlayProgressBarHostUseLegacyBar')
    .forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}
function hideGeminiStuff(hidden) {
  document
    .querySelectorAll("yt-video-description-youchat-section-view-model")
    .forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });

  document
    .querySelectorAll("ytd-expandable-metadata-renderer")
    .forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });

  document
    .querySelectorAll("#flexible-item-buttons yt-button-view-model")
    .forEach((el) => {
      const label = el.querySelector(
        ".ytSpecButtonShapeNextButtonTextContent"
      );
      if (label && label.textContent.trim() === "Ask") {
        el.style.display = hidden ? "none" : "";
      }
    });
}

function hideGames(hidden) {
  document.documentElement.classList.toggle("yt-no-games", hidden === true);
  if (!hidden) {
    document.querySelectorAll("[data-ytweaks-game]").forEach((el) => {
      el.removeAttribute("data-ytweaks-game");
    });
    return;
  }
  document
    .querySelectorAll('a[href^="/playables"], a[href^="/gaming"], a[href*="youtube.com/playables"], a[href*="youtube.com/gaming"]')
    .forEach((link) => {
      const target = link.closest(GAME_NAV_HOSTS) ??
        link.closest(GAME_SHELF_HOSTS) ??
        link.closest(GAME_ITEM_HOSTS) ??
        link;
      target.setAttribute("data-ytweaks-game", "");
    });
  document
    .querySelectorAll("ytd-rich-section-renderer #title, ytd-rich-shelf-renderer #title, ytd-shelf-renderer #title, grid-shelf-view-model [role=heading], [aria-label='YouTube Playables']")
    .forEach((heading) => {
      const name = heading.getAttribute("aria-label") || heading.textContent.trim();
      if (!/^(youtube )?(playables|games|gaming)$/i.test(name)) return;
      const target = heading.closest(GAME_SHELF_HOSTS);
      if (target) target.setAttribute("data-ytweaks-game", "");
    });
}

function hideMerchStore(hidden) {
  document
    .querySelectorAll("ytd-merchandise-shelf-renderer")
    .forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });

  document
    .querySelectorAll("ytd-shopping-overlay-renderer")
    .forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });

  document
    .querySelectorAll("ytd-item-section-renderer:has(ytd-shopping-carousel-renderer)")
    .forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });

  document
    .querySelectorAll("ytd-merchandise-shelf-renderer, ytd-structured-description-content-renderer ytd-merchandise-shelf-renderer")
    .forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });
}

function hoverGuard(e) {
  if (!state.hoverHidden) return;
  const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
  const elements = path.filter((item) => item instanceof Element);
  if (elements.some(isPlaybackTarget)) return;
  if (elements.some((item) => item.matches(THUMB_HOSTS) || item.closest(THUMB_HOSTS))) {
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
}, { capture: true });

function hideRecomendationBar(hidden) {
  const bars = document.querySelectorAll("ytd-feed-filter-chip-bar-renderer");
  bars.forEach((bar) => {
    const header = bar.closest("#header.ytd-rich-grid-renderer");
    (header ?? bar).style.display = hidden ? "none" : "";

    const grid = bar.closest("ytd-rich-grid-renderer");
    if (grid) {
      if (hidden) {
        grid.style.setProperty("--ytd-rich-grid-chips-bar-height", "0px", "important");
        grid.style.setProperty("--ytd-rich-grid-content-offset-top", "56px", "important");
      } else {
        grid.style.removeProperty("--ytd-rich-grid-chips-bar-height");
        grid.style.removeProperty("--ytd-rich-grid-content-offset-top");
      }
    }
  });

  if (bars.length) {
    const frosted = document.querySelector("#frosted-glass");
    if (frosted) {
      if (hidden) frosted.style.setProperty("height", "56px", "important");
      else frosted.style.removeProperty("height");
    }
  }

  document.querySelectorAll(
    "ytd-watch-next-secondary-results-renderer yt-related-chip-cloud-renderer, " +
    "ytd-watch-next-secondary-results-renderer yt-chip-cloud-renderer"
  ).forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}

function applyAll() {
  document.documentElement.classList.toggle("yt-noautoplay", state.hoverHidden);
  hideShorts(state.shortsHidden);
  setButtonHidden("Create", state.createHidden);
  setButtonHidden("Notifications", state.notificationHidden);
  setButtonHidden("Search with your voice", state.micHidden);
  hideNotificationPanel(state.notificationHidden);
  stopHoverEffects(state.hoverHidden);
  hideRecomendationBar(state.recomendationBarHidden);
  hideGeminiStuff(state.geminiStuffHidden);
  hideProgressbarOnRecomendations(state.progressbarHidden);
  hideGames(state.gamesHidden);
  hideMerchStore(state.merchStoreHidden);
}

let applyScheduled = false;

function scheduleApply() {
  if (applyScheduled) return;
  applyScheduled = true;
  requestAnimationFrame(() => {
    applyScheduled = false;
    applyAll();
  });
}

browser.storage.local
  .get(["blurEnabled", "shortsHidden", "createHidden", "notificationHidden", "micHidden", "hoverHidden", "recomendationBarHidden", "geminiStuffHidden", "videoInfoMoved", "progressbarHidden", "gamesHidden", "merchStoreHidden"])
  .then((result) => {
    thumbnailBlur(result.blurEnabled === true);
    state.createHidden = result.createHidden === true;
    state.notificationHidden = result.notificationHidden === true;
    state.micHidden = result.micHidden === true;
    state.hoverHidden = result.hoverHidden === true;
    state.shortsHidden = result.shortsHidden === true;
    state.recomendationBarHidden = result.recomendationBarHidden === true;
    state.geminiStuffHidden = result.geminiStuffHidden === true;
    state.videoInfoMoved = result.videoInfoMoved === true;
    state.progressbarHidden = result.progressbarHidden === true;
    state.gamesHidden = result.gamesHidden === true;
    state.merchStoreHidden = result.merchStoreHidden === true;

    const startObserver = () => {
      applyAll();
      new MutationObserver(scheduleApply).observe(document.body, {
        childList: true,
        subtree: true,
      });
    };

    if (document.body) {
      startObserver();
    } else {
      addEventListener("DOMContentLoaded", startObserver);
    }
  });

browser.storage.onChanged.addListener((changes) => {
  if (changes.blurEnabled !== undefined) {
    thumbnailBlur(changes.blurEnabled.newValue === true);
  }
  for (const key of Object.keys(state)) {
    if (changes[key] !== undefined) {
      state[key] = changes[key].newValue === true;
    }
  }
  applyAll();
});
