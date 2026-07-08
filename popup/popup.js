const toggles = [
  { id: "blurToggle", key: "blurEnabled" },
  { id: "hideCreateButton", key: "createHidden" },
  { id: "hideNotificationButton", key: "notificationHidden" },
  { id: "hideMicButton", key: "micHidden" },
  { id: "hideHoverEffect", key: "hoverHidden" },
  { id: "stopAutoplay", key: "autoplayBlocked" },
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

