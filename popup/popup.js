const blurToggle = document.getElementById("blurToggle");
browser.storage.local.get("blurEnabled").then((result) => {
  blurToggle.checked = result.blurEnabled === true;
});
blurToggle.addEventListener("change", () => {
  browser.storage.local.set({ blurEnabled: blurToggle.checked });
});

const disableShortsToggle = document.getElementById("disableShortsToggle");
browser.storage.local.get("shortsDisabled").then((result) => {
  disableShortsToggle.checked = result.shortsDisabled === true;
});
disableShortsToggle.addEventListener("change", () => {
  browser.storage.local.set({ shortsDisabled: disableShortsToggle.checked });
});
