function thumbnailBlur() {
  const thumbnails = document.getElementById("contents").getElementsByClassName('ytCoreImageHost ytCoreImageFillParentHeight ytCoreImageFillParentWidth ytCoreImageContentModeScaleAspectFill ytCoreImageLoaded');

  for (const img of thumbnails) {
    img.style.filter = "blur(10px)";
  }
}

thumbnailBlur()

addEventListener("scroll", () => {
  thumbnailBlur();
  console.log("wo");
})

onscroll = () => { document }

// blurs on scroll but breaks on page refesh
