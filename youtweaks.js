function thumbnailBlur() {

  const thumbnails = document.getElementById("contents").getElementsByClassName('ytCoreImageHost ytCoreImageFillParentHeight ytCoreImageFillParentWidth ytCoreImageContentModeScaleAspectFill ytCoreImageLoaded');

  for (const img of thumbnails) {
    img.style.filter = "blur(10px)";
  }
}

const observer = new MutationObserver(() => {
  thumbnailBlur();
});

observer.observe(document.body, { childList: true, subtree: true });

//works on refresh but now theres a slight dealy with blurs and sometimes it just doesnt blur
