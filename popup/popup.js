const toggles = [
  { id: "blurToggle",                      key: "blurEnabled" },
  { id: "hideCreateButton",                key: "createHidden" },
  { id: "hideNotificationButton",          key: "notificationHidden" },
  { id: "hideMicButton",                   key: "micHidden" },
  { id: "hideHoverEffect",                 key: "hoverHidden" },
  { id: "stopAutoplay",                    key: "autoplayBlocked" },
  { id: "hideRecomendationBar",            key: "recomendationBarHidden" },
  { id: "hideGeminiStuff",                 key: "geminiStuffHidden" },
  { id: "moveVideoInfo",                   key: "videoInfoMoved" },
  { id: "hideProgressbarOnRecomendations", key: "progressbarHidden" },
  // timeTracking handled separately below
];

for (const { id, key } of toggles) {
  const el = document.getElementById(id);
  browser.storage.local.get(key).then((result) => {
    el.checked = result[key] === true;
  });
  el.addEventListener("change", () => {
    browser.storage.local.set({ [key]: el.checked });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");

function fmtSeconds(s) {
  s = Math.max(0, Math.floor(s));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function fmtDuration(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return "0m";
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ");
}

function fmtAvg(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return "< 1 min / day";
  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "min" : "mins"}`);
  return parts.join(" ") + " / day";
}

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function isBedtimeNow(enabled, startStr, endStr) {
  if (!enabled || !startStr || !endStr) return false;
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const now  = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const startM = sh * 60 + sm;
  const endM   = eh * 60 + em;
  return startM <= endM
    ? nowM >= startM && nowM < endM
    : nowM >= startM || nowM < endM;
}

// ── Track-time toggle + conditional sections ──────────────────────────────────

const timeTrackingEl  = document.getElementById("timeTracking");
const trackingSection = document.getElementById("trackingSection");
const snoozeSection   = document.getElementById("snoozeSection");

function setTrackingVisible(on) {
  trackingSection.classList.toggle("hidden", !on);
  if (!on) snoozeSection.classList.add("hidden");
}

browser.storage.local.get("timeTrackingEnabled").then(({ timeTrackingEnabled }) => {
  timeTrackingEl.checked = timeTrackingEnabled === true;
  setTrackingVisible(timeTrackingEl.checked);
});

timeTrackingEl.addEventListener("change", () => {
  browser.storage.local.set({ timeTrackingEnabled: timeTrackingEl.checked });
  setTrackingVisible(timeTrackingEl.checked);
});

// ── Time display + snooze visibility (refreshed every second) ─────────────────

const timeDisplay = document.getElementById("timeDisplay");

function refreshUI() {
  browser.storage.local
    .get(["watchTime", "watchTimeLimit", "timeTrackingEnabled",
          "snoozeUntilMs", "bedtimeEnabled", "bedtimeTime", "bedtimeEndTime"])
    .then((r) => {
      const today   = todayKey();
      const secs    = r.watchTime?.day === today ? Number(r.watchTime.seconds) || 0 : 0;
      const limit   = Number(r.watchTimeLimit) || 0;
      const trackOn = r.timeTrackingEnabled === true;

      timeDisplay.textContent = fmtSeconds(secs);

      const limitHit   = trackOn && limit > 0 && secs >= limit;
      const bedtimeHit = trackOn && isBedtimeNow(r.bedtimeEnabled, r.bedtimeTime, r.bedtimeEndTime);
      snoozeSection.classList.toggle("hidden", !(limitHit || bedtimeHit));
    });
}

refreshUI();
setInterval(refreshUI, 1000);
browser.storage.onChanged.addListener((changes) => {
  if (changes.watchTime || changes.snoozeUntilMs) refreshUI();
});

// ── Snooze button ─────────────────────────────────────────────────────────────

document.getElementById("snoozeBtn").addEventListener("click", () => {
  const minutes = parseInt(document.getElementById("snoozeMinutes").value) || 0;
  if (minutes <= 0) return;
  browser.storage.local.set({ snoozeUntilMs: Date.now() + minutes * 60_000 });
});

// ── Daily limit ───────────────────────────────────────────────────────────────

const limitToggle  = document.getElementById("timeLimitToggle");
const limitRow     = document.getElementById("limitRow");
const limitHours   = document.getElementById("limitHours");
const limitMinutes = document.getElementById("limitMinutes");

function getLimitSecs() {
  return (parseInt(limitHours.value) || 0) * 3600 +
         (parseInt(limitMinutes.value) || 0) * 60;
}

browser.storage.local.get("watchTimeLimit").then(({ watchTimeLimit }) => {
  const secs = Number(watchTimeLimit) || 0;
  if (secs > 0) {
    limitToggle.checked = true;
    limitRow.classList.add("visible");
    limitHours.value   = Math.floor(secs / 3600);
    limitMinutes.value = Math.floor((secs % 3600) / 60);
  }
});

limitToggle.addEventListener("change", () => {
  if (limitToggle.checked) {
    limitRow.classList.add("visible");
    const secs = getLimitSecs();
    const eff  = secs > 0 ? secs : 3600;
    browser.storage.local.set({ watchTimeLimit: eff });
    if (secs === 0) { limitHours.value = 1; limitMinutes.value = 0; }
  } else {
    limitRow.classList.remove("visible");
    browser.storage.local.set({ watchTimeLimit: 0 });
  }
});

function saveLimit() {
  if (!limitToggle.checked) return;
  browser.storage.local.set({ watchTimeLimit: getLimitSecs() });
}
limitHours.addEventListener("change", saveLimit);
limitMinutes.addEventListener("change", saveLimit);

// ── Bedtime ───────────────────────────────────────────────────────────────────

const bedtimeToggle  = document.getElementById("bedtimeEnabled");
const bedtimeRow     = document.getElementById("bedtimeRow");
const bedtimeInput   = document.getElementById("bedtimeTime");
const bedtimeEndInput = document.getElementById("bedtimeEndTime");

browser.storage.local.get(["bedtimeEnabled", "bedtimeTime", "bedtimeEndTime"]).then((r) => {
  bedtimeToggle.checked = r.bedtimeEnabled === true;
  if (bedtimeToggle.checked) bedtimeRow.classList.add("visible");
  if (r.bedtimeTime)    bedtimeInput.value    = r.bedtimeTime;
  if (r.bedtimeEndTime) bedtimeEndInput.value = r.bedtimeEndTime;
});

bedtimeToggle.addEventListener("change", () => {
  browser.storage.local.set({ bedtimeEnabled: bedtimeToggle.checked });
  bedtimeToggle.checked
    ? bedtimeRow.classList.add("visible")
    : bedtimeRow.classList.remove("visible");
});

bedtimeInput.addEventListener("change", () => {
  browser.storage.local.set({ bedtimeTime: bedtimeInput.value });
});

bedtimeEndInput.addEventListener("change", () => {
  browser.storage.local.set({ bedtimeEndTime: bedtimeEndInput.value });
});

// ── Stats ─────────────────────────────────────────────────────────────────────

let currentPeriod = "week";

function renderStats() {
  const days  = currentPeriod === "week" ? 7 : 30;
  const graph = document.getElementById("barGraph");
  const avgEl = document.getElementById("statsAvg");
  const total = document.getElementById("statTotal");
  const today = todayKey();

  browser.storage.local.get(["ytHistory", "watchTime"]).then(({ ytHistory: hist = {}, watchTime }) => {
    if (watchTime?.day === today) hist[today] = Number(watchTime.seconds) || 0;

    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-CA");
      data.push({ key, seconds: hist[key] || 0, date: d, isToday: key === today, idx: days - 1 - i });
    }

    const maxSecs   = Math.max(...data.map(d => d.seconds), 60);
    const sumSecs   = data.reduce((s, d) => s + d.seconds, 0);
    const avgSecs   = sumSecs / days;
    const todaySecs = hist[today] || 0;
    const dayAbbr   = ["S", "M", "T", "W", "T", "F", "S"];

    if (total) total.textContent = fmtDuration(sumSecs);

    graph.innerHTML = data.map(({ seconds, date, isToday, idx }) => {
      const pct     = seconds > 0 ? Math.max(seconds / maxSecs * 100, 4) : 0;
      const label   = currentPeriod === "week"
        ? dayAbbr[date.getDay()]
        : (idx % 7 === 0 ? date.getDate() : "");
      // tooltip shows Xh Xm, no seconds
      const tooltip = seconds > 0
        ? `<div class="bar-tooltip">${fmtDuration(seconds)}</div>` : "";
      return `<div class="bar-col${isToday ? " bar-today" : ""}">
        ${tooltip}
        <div class="bar-fill" style="height:${pct.toFixed(1)}%"></div>
        <div class="bar-label">${label}</div>
      </div>`;
    }).join("");

    const hasData = data.some(d => d.seconds > 0);
    avgEl.textContent = hasData ? `Avg ${fmtAvg(avgSecs)}` : "No data yet";
  });
}

document.querySelectorAll(".period-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPeriod = btn.dataset.period;
    renderStats();
  });
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.watchTime || changes.ytHistory) renderStats();
});

renderStats();

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "time-tracking") renderStats();
  });
});
