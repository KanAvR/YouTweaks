(() => {
  const storage = (globalThis.browser ?? globalThis.chrome).storage;
  const colorKeys = Object.keys(YouTweaksTheme.defaults);
  let enabled = false;
  let colors = { ...YouTweaksTheme.defaults };
  let revision = 0;

  function apply() {
    const root = document.documentElement;
    root.classList.toggle('ytweaks-theme', enabled);
    for (const key of colorKeys) {
      const property = `--ytweaks-theme-${key}`;
      if (enabled) root.style.setProperty(property, colors[key]);
      else root.style.removeProperty(property);
    }
  }

  storage.local.get(['customThemeEnabled', 'customThemeColors']).then((result) => {
    if (revision) return;
    enabled = result.customThemeEnabled === true;
    colors = YouTweaksTheme.normalize(result.customThemeColors);
    apply();
  }).catch(() => {});

  storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.customThemeEnabled && !changes.customThemeColors)) return;
    revision++;
    if (changes.customThemeEnabled) enabled = changes.customThemeEnabled.newValue === true;
    if (changes.customThemeColors) colors = YouTweaksTheme.normalize(changes.customThemeColors.newValue);
    apply();
  });
})();
