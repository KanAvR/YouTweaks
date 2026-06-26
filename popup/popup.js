const toggle = document.getElementById("blurToggle");

browser.storage.local.get("blurEnabled").then((result) => {
  toggle.checked = result.blurEnabled === true;
});

toggle.addEventListener("change", () => {
  browser.storytCage.local.set({ blurEnabled: toggle.checked });
});
