(() => {
  const storage = (globalThis.browser ?? globalThis.chrome).storage;
  const theme = YouTweaksTheme;
  const toggle = document.getElementById('customThemeToggle');
  const editor = document.getElementById('themeEditor');
  const preview = document.getElementById('themePreview');
  const status = document.getElementById('themeStatus');
  const preset = document.getElementById('themePreset');
  const applyButton = document.getElementById('applyTheme');
  const resetButton = document.getElementById('resetTheme');
  const inputs = new Map(
    [...editor.querySelectorAll('[data-theme-color]')]
      .map((input) => [input.dataset.themeColor, input])
  );
  const channels = [...editor.querySelectorAll('[data-channel]')];
  const colorKeys = Object.keys(theme.defaults);
  const validHex = (value) => /^#[0-9a-f]{6}$/i.test(value);
  let colors = { ...theme.defaults };
  let revision = 0;
  let saveQueue = Promise.resolve();

  function selectedPreset() {
    return Object.entries(theme.presets).find(([, values]) =>
      colorKeys.every((key) => colors[key].toLowerCase() === values[key].toLowerCase())
    )?.[0] ?? 'custom';
  }

  function channelValue(key, channel) {
    const start = 1 + channel * 2;
    return parseInt(colors[key].slice(start, start + 2), 16);
  }

  function render(syncInputs = true) {
    editor.hidden = !toggle.checked;
    preset.value = selectedPreset();

    for (const key of colorKeys) {
      const input = inputs.get(key);
      if (syncInputs && input.value !== colors[key]) input.value = colors[key];
      preview.style.setProperty(`--preview-${key}`, colors[key]);
      editor.querySelector(`[data-swatch="${key}"]`).style.backgroundColor = colors[key];
    }

    for (const channel of channels) {
      const key = channel.dataset.colorKey;
      const index = Number(channel.dataset.channel);
      const value = channelValue(key, index);
      channel.value = value;
      editor.querySelector(`[data-channel-output="${key}-${index}"]`).textContent = value;
    }
  }

  function markDirty(message = 'Click Apply colors to save your changes.') {
    revision++;
    status.textContent = message;
  }

  function save(values) {
    const savedRevision = ++revision;
    status.textContent = 'Saving…';
    saveQueue = saveQueue.catch(() => {}).then(() => storage.local.set(values));
    saveQueue.then(
      () => {
        if (revision === savedRevision) status.textContent = 'Saved';
      },
      () => {
        if (revision === savedRevision) status.textContent = 'Could not save theme. Try again.';
      }
    );
  }

  storage.local.get(['customThemeEnabled', 'customThemeColors']).then((result) => {
    if (revision) return;
    toggle.checked = result.customThemeEnabled === true;
    colors = theme.normalize(result.customThemeColors);
    render();
  }).catch(() => {
    status.textContent = 'Could not load theme.';
  });

  toggle.addEventListener('change', () => {
    render();
    save({ customThemeEnabled: toggle.checked });
  });

  preset.addEventListener('change', () => {
    const selected = theme.presets[preset.value];
    if (!selected) return;
    colors = theme.normalize(selected);
    render();
    markDirty('Click Apply colors to save this scheme.');
  });

  for (const [key, input] of inputs) {
    const update = () => {
      if (!validHex(input.value)) {
        preset.value = 'custom';
        markDirty('Enter a hex color such as #ff4444, or use the sliders.');
        return;
      }
      colors = theme.normalize({ ...colors, [key]: input.value });
      render(false);
      markDirty();
    };
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  }

  for (const channel of channels) {
    channel.addEventListener('input', () => {
      const key = channel.dataset.colorKey;
      const rgb = colors[key].slice(1).match(/../g);
      rgb[Number(channel.dataset.channel)] = Number(channel.value).toString(16).padStart(2, '0');
      colors = theme.normalize({ ...colors, [key]: `#${rgb.join('')}` });
      inputs.get(key).value = colors[key];
      render(false);
      markDirty();
    });
  }

  applyButton.addEventListener('click', () => {
    const invalid = [...inputs.values()].find((input) => !validHex(input.value));
    if (invalid) {
      status.textContent = 'Enter a hex color such as #ff4444, or use the sliders.';
      invalid.focus();
      return;
    }
    colors = theme.normalize(Object.fromEntries(
      [...inputs].map(([key, input]) => [key, input.value])
    ));
    render(false);
    save({ customThemeColors: { ...colors } });
  });

  resetButton.addEventListener('click', () => {
    colors = { ...theme.defaults };
    render();
    markDirty();
  });
})();
