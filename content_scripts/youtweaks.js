const style = document.createElement("style");
style.textContent = `
  html.yt-blur ytd-thumbnail img.ytCoreImageHost,
  html.yt-blur yt-thumbnail-view-model img.ytCoreImageHost,
  html.yt-blur ytd-playlist-thumbnail img.ytCoreImageHost,
  html.yt-blur .ytp-videowall-still-image,
  html.yt-blur ytd-moving-thumbnail-renderer img {
    filter: blur(10px) !important;
  }
`; document.documentElement.appendChild(style);

function thumbnailBlur(enabled) {
  document
    .documentElement.classList
    .toggle("yt-blur", enabled === true);
}

const state = {
  createHidden: false,
  notificationHidden: false,
  micHidden: false,
  hoverHidden: false,
  autoplayBlocked: false,
  recomendationBarHidden: false,
  geminiStuffHidden: false,
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

function stopHoverEffect(hidden) { // title color still changes, doesnt work on shorts
  document
    .querySelectorAll(".ytSpecTouchFeedbackShapeHoverEffect")
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
// autoplay works on chanel page also blur, blurs the th
// could make one function for hideNotificationPanel and stopHoverEffect since its the same thing
function stopAutoplayOnHover(hidden) {
  if (!hidden) return;
  document
    .querySelectorAll(
    'ytd-video-preview, #video-preview, ytd-moving-thumbnail-renderer, ' +
    '#inline-preview-player, ytd-inline-preview-thumbnail-renderer, yt-inline-player-view-model'
  ).forEach(el => {
    el.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
    el.remove();
  });
}

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
  setButtonHidden("Create", state.createHidden);
  setButtonHidden("Notifications", state.notificationHidden);
  setButtonHidden("Search with your voice", state.micHidden);
  hideNotificationPanel(state.notificationHidden);
  stopHoverEffect(state.hoverHidden);
  stopAutoplayOnHover(state.autoplayBlocked);
  hideRecomendationBar(state.recomendationBarHidden);
  hideGeminiStuff(state.geminiStuffHidden);
}

browser.storage.local
  .get(["blurEnabled", "createHidden", "notificationHidden", "micHidden", "hoverHidden", "autoplayBlocked", "recomendationBarHidden", "geminiStuffHidden"])
  .then((result) => {
    thumbnailBlur(result.blurEnabled === true);
    state.createHidden = result.createHidden === true;
    state.notificationHidden = result.notificationHidden === true;
    state.micHidden = result.micHidden === true;
    state.hoverHidden = result.hoverHidden === true;
    state.autoplayBlocked = result.autoplayBlocked === true;
    state.recomendationBarHidden = result.recomendationBarHidden === true;
    state.geminiStuffHidden = result.geminiStuffHidden === true;

    const startObserver = () => {
      applyAll();
      new MutationObserver(applyAll).observe(document.body, {
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

// TODO: stuff before shipping
// 1. polish the whole project; bug fixes 
// 2. add video speed changes
// block the store, yt games 
// add a timer to track how long you are on yt for 
