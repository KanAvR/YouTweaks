const state = {
  blurEnabled: false,
  createHidden: false,
  notificationHidden: false,
};

function thumbnailBlur(enabled) {
  const thumbnails = document.getElementsByClassName(
    "ytCoreImageHost ytCoreImageFillParentHeight ytCoreImageFillParentWidth ytCoreImageContentModeScaleAspectFill ytCoreImageLoaded",
  );
  for (const img of thumbnails) {
    img.style.filter = enabled ? "blur(10px)" : "";
  }
}

function setButtonHidden(ariaLabel, hidden) {
  document.querySelectorAll(`button[aria-label="${ariaLabel}"]`).forEach((el) => {
    el.style.display = hidden ? "none" : "";
  });
}

function applyAll() {
  thumbnailBlur(state.blurEnabled);
  setButtonHidden("Create", state.createHidden);
  setButtonHidden("Notifications", state.notificationHidden);
}

browser.storage.local
  .get(["blurEnabled", "createHidden", "notificationHidden"])
  .then((result) => {
    state.blurEnabled = result.blurEnabled === true;
    state.createHidden = result.createHidden === true;
    state.notificationHidden = result.notificationHidden === true;
    applyAll();

    new MutationObserver(applyAll).observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

browser.storage.onChanged.addListener((changes) => {
  for (const key of Object.keys(state)) {
    if (changes[key] !== undefined) {
      state[key] = changes[key].newValue === true;
    }
  }
  applyAll();
});
