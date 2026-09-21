(() => {
  const storage = (globalThis.browser || globalThis.chrome).storage;
  const toggle = document.getElementById('customThemeToggle');
  const editor = document.getElementById('themeEditor');
  const preview = document.getElementById('themePreview');
  const status = document.getElementById('themeStatus');
  const preset = document.getElementById('themePreset');
  let colors = { ...YouTweaksTheme.defaults };
  let revision = 0;
  const inputs = [...editor.querySelectorAll('[data-theme-color]')];
  const channels = [...editor.querySelectorAll('[data-channel]')];
  const validHex = value => /^#[0-9a-f]{6}$/i.test(value);
  function render(syncInputs = true) {
    editor.hidden = !toggle.checked;
    preset.value = Object.keys(YouTweaksTheme.presets).find(key =>
      Object.keys(colors).every(color => colors[color].toLowerCase() === YouTweaksTheme.presets[key][color])
    ) || 'custom';
    for (const input of inputs) {
      const key = input.dataset.themeColor;
      if (syncInputs && input.value !== colors[key]) input.value = colors[key];
      preview.style.setProperty(`--preview-${key}`, colors[key]);
      editor.querySelector(`[data-swatch="${key}"]`).style.backgroundColor = colors[key];
    }
    for (const channel of channels) {
      const value = parseInt(colors[channel.dataset.colorKey].slice(1 + Number(channel.dataset.channel) * 2, 3 + Number(channel.dataset.channel) * 2), 16);
      channel.value = value;
      editor.querySelector(`[data-channel-output="${channel.dataset.colorKey}-${channel.dataset.channel}"]`).textContent = value;
    }
  }
  let pending = Promise.resolve();
  function save(values) {
    const savedRevision = ++revision;
    status.textContent = 'Saving…';
    pending = pending.then(() => storage.local.set(values)).then(() => {
      if (revision === savedRevision) status.textContent = 'Saved';
    }).catch(() => { status.textContent = 'Could not save theme. Try again.'; });
  }
  storage.local.get(['customThemeEnabled', 'customThemeColors']).then((result) => {
    if (revision) return;
    toggle.checked = result.customThemeEnabled === true;
    colors = YouTweaksTheme.normalize(result.customThemeColors);
    render();
  }).catch(() => { status.textContent = 'Could not load theme.'; });
  toggle.addEventListener('change', () => {
    render();
    save({ customThemeEnabled: toggle.checked });
  });
  preset.addEventListener('change', () => {
    const selected = YouTweaksTheme.presets[preset.value];
    if (!selected) return;
    colors = { ...selected };
    revision++;
    render();
    status.textContent = 'Click Apply colors to save this scheme.';
  });
  for (const input of inputs) {
    const updatePreview = () => {
      revision++;
      if (!validHex(input.value)) {
        preset.value = 'custom';
        status.textContent = 'Enter a hex color such as #ff4444, or use the sliders.';
        return;
      }
      colors = YouTweaksTheme.normalize({ ...colors, [input.dataset.themeColor]: input.value });
      render(false);
      status.textContent = 'Click Apply colors to save your changes.';
    };
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  }
  for (const channel of channels) channel.addEventListener('input', () => {
    const key = channel.dataset.colorKey;
    const rgb = colors[key].slice(1).match(/../g);
    rgb[Number(channel.dataset.channel)] = Number(channel.value).toString(16).padStart(2, '0');
    colors[key] = `#${rgb.join('')}`;
    inputs.find(input => input.dataset.themeColor === key).value = colors[key];
    revision++;
    render(false);
    status.textContent = 'Click Apply colors to save your changes.';
  });
  document.getElementById('applyTheme').addEventListener('click', () => {
    const invalid = inputs.find(input => !validHex(input.value));
    if (invalid) {
      status.textContent = 'Enter a hex color such as #ff4444, or use the sliders.';
      invalid.focus();
      return;
    }
    colors = YouTweaksTheme.normalize(Object.fromEntries(inputs.map(input => [input.dataset.themeColor, input.value])));
    render(false);
    save({ customThemeColors: { ...colors } });
  });
  document.getElementById('resetTheme').addEventListener('click', () => {
    colors = { ...YouTweaksTheme.defaults };
    render();
    status.textContent = 'Click Apply colors to save your changes.';
    revision++;
  });
})();
