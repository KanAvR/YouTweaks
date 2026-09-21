(() => {
  const storage = (globalThis.browser || globalThis.chrome).storage;
  let enabled = false;
  let colors = YouTweaksTheme.defaults;
  let revision = 0;

  function apply() {
    const root = document.documentElement;
    if (!root) return;
    root.classList.toggle('ytweaks-theme', enabled);

    for (const [key, value] of Object.entries(colors)) {

      if (enabled) root.style.setProperty(`--ytweaks-theme-${key}`, value);

      else root.style.removeProperty(`--ytweaks-theme-${key}`);
    }
  }

  storage.local.get(['customThemeEnabled', 'customThemeColors']).then((result) => {
    if (revision)
      return;

    enabled = result.customThemeEnabled === true;
    colors = YouTweaksTheme.normalize(result.customThemeColors);

    apply();
  }).catch(console.error);

  storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.customThemeEnabled && !changes.customThemeColors))
      return; revision++;

    if (changes.customThemeEnabled) enabled = changes.customThemeEnabled.newValue === true;
    if (changes.customThemeColors) colors = YouTweaksTheme.normalize(changes.customThemeColors.newValue);

    apply();
  });
  document.addEventListener('DOMContentLoaded', apply, { once: true });
})();
