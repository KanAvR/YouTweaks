const toggles = [
  { id: "blurToggle", key: "blurEnabled" },
  { id: "hideCreateButton", key: "createHidden" },
  { id: "hideNotificationButton", key: "notificationHidden" },
  { id: "hideMicButton", key: "micHidden" },
  { id: "hideHoverEffect", key: "hoverHidden" },
  { id: "stopAutoplay", key: "autoplayBlocked" },
  { id: "hideRecomendationBar", key: "recomendationBarHidden" },
  { id: "hideGeminiStuff", key: "geminiStuffHidden" },
];

for (const { id, key } of toggles) {
  const el = document.getElementById(id);

  browser.storage.local.get(key).then((result) => {
    el.checked = result[key] === true;
  });

  el.addEventListener("change", () => {
    browser.storage.local.set({ [key]: el.checked });
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
 
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

