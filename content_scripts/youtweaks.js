function thumbnailBlur(enabled) {
  const thumbnails = document.getElementById("contents").getElementsByClassName('ytCoreImageHost ytCoreImageFillParentHeight ytCoreImageFillParentWidth ytCoreImageContentModeScaleAspectFill ytCoreImageLoaded');

  for (const img of thumbnails) {
    img.style.filter = enabled ? "blur(10px)" : "";
  }
}

addEventListener("scroll", () => {
  browser.storage.local.get("blurEnabled").then((result) => {
    thumbnailBlur(result.blurEnabled === true);
  });
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.blurEnabled !== undefined) {
    thumbnailBlur(changes.blurEnabled.newValue === true);
  }
});

function hideShortsButtons() { // this works but I think the implementation is very sloppy as the frist part is selecting an element and the other part is selecting an id
  document.querySelectorAll("ytd-guide-entry-renderer").forEach(el => {
    if (el.textContent.trim().toLowerCase().includes("shorts")) {
      el.remove();
    }
  });

  document.querySelectorAll("#endpoint").forEach(el => {
    if (el.textContent.trim().toLowerCase().includes("shorts")) {
      el.remove();
    }
  });

}

hideShortsButtons();
const observer = new MutationObserver(() => {
  hideShortsButtons()
});

observer.observe(document, {
  subtree: true,
  childList: true,
});


