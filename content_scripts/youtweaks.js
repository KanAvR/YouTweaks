const style = document.createElement("style");
style.textContent = `
 html.yt-blur .ytCoreImageHost:not(.ytSpecAvatarShapeImage):not(yt-avatar-shape .ytCoreImageHost) {
  filter: blur(10px) !important;
 }
`;
document.documentElement.appendChild(style);

function thumbnailBlur(enabled) {
  document.documentElement.classList.toggle("yt-blur", enabled === true);
}

const state = {
  createHidden: false,
  notificationHidden: false,
  micHidden: false,
  hoverHidden: false,
  autoplayBlocked: false,
};

function setButtonHidden(ariaLabel, hidden) {
  document.querySelectorAll(`button[aria-label="${ariaLabel}"]`).forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}

function hideNotificationPanel(hidden) {
  document.querySelectorAll('.style-scope.ytd-notification-topbar-button-renderer').forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}

function stopHoverEffect(hidden) {
  document.querySelectorAll(".ytSpecTouchFeedbackShapeHoverEffect").forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });

}
// could make one function for hideNotificationPanel and stopHoverEffect since its the same thing 
function stopAutoplayOnHover(hidden) {

}

function applyAll() {
  setButtonHidden("Create", state.createHidden);
  setButtonHidden("Notifications", state.notificationHidden);
  setButtonHidden("Search with your voice", state.micHidden);
  hideNotificationPanel(state.notificationHidden);
  stopHoverEffect(state.hoverHidden);
  stopAutoplayOnHover(state.autoplayBlocked);
}

browser.storage.local
  .get(["blurEnabled", "createHidden", "notificationHidden", "micHidden"])
  .then((result) => {
    thumbnailBlur(result.blurEnabled === true);
    state.createHidden = result.createHidden === true;
    state.notificationHidden = result.notificationHidden === true;
    state.micHidden = result.micHidden === true;
    state.hoverHidden = result.hoverHidden === true;
    state.autoplayBlocked = result.autoplayBlocked === true;

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
