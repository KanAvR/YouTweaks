(() => {
  const storage = (globalThis.browser || globalThis.chrome).storage;
  const key = "customPlaybackSpeed";
  const enabledKey = "customPlaybackSpeedEnabled";
  let enabled = false;
  let speed = null;
  let edited = false;
  const players = new Map();
  const valid = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0.25 && value <= 5;
  const label = (value) => `${Number(value.toFixed(2))}×`;

  function enforce(video) {
    if (enabled && speed !== null && video.playbackRate !== speed) video.playbackRate = speed;
  }

  function refresh() {
    for (const entry of players.values()) {
      enforce(entry.video);
      const value = speed ?? entry.video.playbackRate;
      entry.button.title = `Playback speed: ${label(value)}`;
      entry.button.setAttribute("aria-label", `Playback speed: ${label(value)}`);
      if (document.activeElement !== entry.number) entry.number.value = value.toFixed(2);
      entry.slider.value = value;
      entry.slider.style.setProperty("--speed-fill", `${(value - 0.25) / 4.75 * 100}%`);
      entry.decrease.disabled = value <= 0.25;
      entry.increase.disabled = value >= 5;
      entry.panel.querySelectorAll("[data-speed]").forEach((preset) => {
        preset.setAttribute("aria-pressed", String(Number(preset.dataset.speed) === value));
      });
    }
  }

  function choose(value) {
    if (!enabled || !valid(value)) return;
    edited = true;
    speed = Math.round(value * 100) / 100;
    refresh();
    storage.local.set({ [key]: speed }).catch(console.error);
  }

  function attach(player, video, controls) {
    const originalRate = video.playbackRate;
    const button = document.createElement("button");
    button.className = "ytp-button ytweaks-speed-button";
    button.type = "button";
    button.title = "YouTweaks playback speed";
    button.innerHTML = '<svg class="ytweaks-speed-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.64 18.36a9 9 0 1 1 12.72 0M12 13l4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    button.setAttribute("aria-expanded", "false");
    const panel = document.createElement("div");
    panel.className = "ytweaks-speed-panel";
    panel.hidden = true;
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "YouTweaks playback speed");
    const header = document.createElement("div");
    header.className = "ytweaks-speed-header";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "ytweaks-speed-back";
    back.setAttribute("aria-label", "Back to settings");
    back.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="m14.5 5-7 7 7 7 1.5-1.5-5.5-5.5 5.5-5.5z" fill="currentColor"/></svg>';
    const heading = document.createElement("span");
    heading.textContent = "Playback speed";
    const slider = document.createElement("input");
    slider.type = "range";
    const number = document.createElement("input");
    number.type = "number";
    for (const input of [slider, number]) {
      input.min = "0.25";
      input.max = "5";
      input.step = "0.01";
      input.setAttribute("aria-label", "Playback speed (0.25× to 5×)");
    }
    number.title = "Enter a speed from 0.25 to 5";
    const readout = document.createElement("label");
    readout.className = "ytweaks-speed-readout";
    const unit = document.createElement("span");
    unit.textContent = "x";
    readout.append(number, unit);
    const adjustment = document.createElement("div");
    adjustment.className = "ytweaks-speed-adjustment";
    const makeStep = (text, amount, name) => {
      const step = document.createElement("button");
      step.type = "button";
      step.textContent = text;
      step.setAttribute("aria-label", name);
      step.addEventListener("click", () => {
        number.setCustomValidity("");
        choose(Math.min(5, Math.max(0.25, (speed ?? video.playbackRate) + amount)));
      });
      return step;
    };

    const decrease = makeStep("−", -0.05, "Decrease playback speed");
    const increase = makeStep("+", 0.05, "Increase playback speed");
    adjustment.append(decrease, slider, increase);
    const presets = document.createElement("div");
    presets.className = "ytweaks-speed-presets";
    for (const value of [1, 1.25, 1.5, 2, 3]) {
      const item = document.createElement("div");
      const preset = document.createElement("button");
      preset.type = "button";
      preset.dataset.speed = value;
      preset.textContent = Number.isInteger(value) ? value.toFixed(1) : String(value);
      preset.setAttribute("aria-label", value === 1 ? "Normal playback speed" : `${value}x playback speed`);
      preset.addEventListener("click", () => {
        number.setCustomValidity("");
        choose(value);
      });
      item.append(preset);
      if (value === 1) {
        const normal = document.createElement("span");
        normal.textContent = "Normal";
        item.append(normal);
      }
      presets.append(item);
    }
    header.append(back, heading);
    panel.append(header, readout, adjustment, presets);
    const close = () => {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    };
    back.addEventListener("click", () => {
      close();
      const settings = player.querySelector(".ytp-settings-button");
      if (settings?.getAttribute("aria-expanded") !== "true") settings?.click();
      settings?.focus();
    });

    const open = () => {
      // Close YouTube's settings so the replacement is the only menu shown.
      const settings = player.querySelector('.ytp-settings-button[aria-expanded="true"]');
      if (settings) settings.click();
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      slider.focus();
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (panel.hidden) open();
      else close();
    });

    slider.addEventListener("input", () => choose(slider.valueAsNumber));
    number.addEventListener("input", () => {
      number.setCustomValidity(valid(number.valueAsNumber) ? "" : "Enter a speed from 0.25 to 5.");
      if (number.validity.valid) choose(number.valueAsNumber);
    });

    number.addEventListener("change", () => {
      if (!number.reportValidity()) return;
      choose(number.valueAsNumber);
    });

    // Keep typing and slider keys from triggering the player's shortcuts.
    for (const type of ["keydown", "keyup", "keypress", "click", "pointerdown"]) {
      panel.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === "keydown" && event.key === "Escape") {
          close();
          button.focus();
        }
      });
    }

    const outside = (event) => {
      if (!panel.contains(event.target) && !button.contains(event.target)) close();
    };

    document.addEventListener("pointerdown", outside);

    // Capture activation before YouTube opens its restricted speed submenu.
    const nativeSpeedMenu = (event) => {
      const row = event.target.closest?.('.ytp-menuitem');
      const title = row?.querySelector('.ytp-menuitem-label')?.textContent.trim();
      if (!title || !/^playback speed$/i.test(title)) return;
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
    };

    player.addEventListener("click", nativeSpeedMenu, true);
    player.addEventListener("keydown", nativeSpeedMenu, true);
    const rateChanged = () => {
      enforce(video);
      refresh();
    };

    for (const type of ["ratechange", "loadedmetadata", "play"]) video.addEventListener(type, rateChanged);
    controls.prepend(button);
    player.append(panel);
    players.set(player, { video, button, panel, slider, number, decrease, increase, cleanup(restoreRate = false) {
      document.removeEventListener("pointerdown", outside);
      player.removeEventListener("click", nativeSpeedMenu, true);
      player.removeEventListener("keydown", nativeSpeedMenu, true);
      for (const type of ["ratechange", "loadedmetadata", "play"]) video.removeEventListener(type, rateChanged);
      if (restoreRate && speed !== null && video.playbackRate === speed) video.playbackRate = originalRate;
      button.remove();
      panel.remove();
    } });
    refresh();
  }

  function scan() {
    for (const [player, entry] of players) {
      if (!enabled || !player.isConnected || player.querySelector("video") !== entry.video || !entry.button.isConnected) {
        entry.cleanup(!enabled);
        players.delete(player);
      }
    }
    if (!enabled) return;
    document.querySelectorAll(".html5-video-player").forEach((player) => {
      const video = player.querySelector("video");
      const controls = player.querySelector(".ytp-right-controls");
      if (video && controls && !players.has(player)) attach(player, video, controls);
    });
  }

  storage.local.get([key, enabledKey]).then((result) => {
    enabled = result[enabledKey] === true;
    if (!edited && valid(result[key])) speed = result[key];
    scan();
    refresh();
  }).catch(console.error);
  storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[enabledKey]) enabled = changes[enabledKey].newValue === true;
    if (changes[key]) speed = valid(changes[key].newValue) ? changes[key].newValue : null;
    scan();
    refresh();
  });
  let scheduled = false;

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  const start = () => {
    scan();
    new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
