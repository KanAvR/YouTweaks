(() => {
  const defaults = Object.freeze({ background: '#0f0f0f', surface: '#212121', text: '#f1f1f1', accent: '#ff4444' });
  globalThis.YouTweaksTheme = Object.freeze({
    defaults,
    presets: Object.freeze({
      'rose-pine': { background: '#191724', surface: '#1f1d2e', text: '#e0def4', accent: '#ebbcba' },
      'rose-pine-moon': { background: '#232136', surface: '#2a273f', text: '#e0def4', accent: '#ea9a97' },
      'rose-pine-dawn': { background: '#faf4ed', surface: '#fffaf3', text: '#575279', accent: '#d7827e' },
      'catppuccin-mocha': { background: '#1e1e2e', surface: '#313244', text: '#cdd6f4', accent: '#cba6f7' },
      'catppuccin-macchiato': { background: '#24273a', surface: '#363a4f', text: '#cad3f5', accent: '#c6a0f6' },
      'catppuccin-frappe': { background: '#303446', surface: '#414559', text: '#c6d0f5', accent: '#ca9ee6' },
      'catppuccin-latte': { background: '#eff1f5', surface: '#ccd0da', text: '#4c4f69', accent: '#8839ef' },
      'default': defaults,
    }),
    normalize(colors) {
      return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
        key, /^#[0-9a-f]{6}$/i.test(colors?.[key]) ? colors[key] : fallback,
      ]));
    },
  });
})();
