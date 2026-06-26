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

// if thumbnails are loaded after scroll is complete then it doesnt blur them
