// todo remove youtube getElementsByTagName
console.log("extension loaded");
// Blurs thumbnail images for now lol

function thumbnail_blur() {

  var home_contents = document.getElementById("contents");

  var thumbnails = home_contents.querySelectorAll(
    'img:not(.ytSpecAvatarShapeImageOverlays):not(.ytSpecAvatarShapeImage)'
  );

  for (const img of thumbnails) {
    img.style.filter = "blur(10px)"; // only works on home page  
  }
}
thumbnail_blur()

const observer = new MutationObserver(() => {
  thumbnail_blur();
});

observer.observe(document.body, { childList: true, subtree: true });
const target = document.getElementById("contents") || document.body;
observer.observe(target, config);

// working for home page and scroll; make it work on the videos page refresh still broken 
