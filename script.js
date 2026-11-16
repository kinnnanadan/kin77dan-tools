document.addEventListener("DOMContentLoaded", () => {
  const htmlEl = document.documentElement;
  const themeButtons = document.querySelectorAll(".theme-btn");
  const sizeButtons = document.querySelectorAll(".size-btn");
  const menuToggleBtn = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toolLinks = document.querySelectorAll(".tool-link");
  const toolPanels = document.querySelectorAll(".tool-panel");
  const sidebarHomeLink = document.getElementById("sidebar-home-link");
  const mobileHomeLink = document.getElementById("mobile-home-link");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function fallbackCopy(text, onSuccess) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand("copy")) onSuccess();
    } catch {
      // ignore
    }
    ta.remove();
  }

  function copyToClipboard(text, btn, defaultLabel, doneLabel = "完了") {
    const onSuccess = () => {
      if (!btn) return;
      btn.textContent = doneLabel;
      clearTimeout(btn._copyTimer);
      btn._copyTimer = setTimeout(() => {
        btn.textContent = defaultLabel;
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
    } else {
      fallbackCopy(text, onSuccess);
    }
  }

  function calcMedianHz(intervals) {
    if (intervals.length < 3) return null;
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median <= 0) return null;
    return Math.round(1000 / median);
  }

  // ==========================================
  // 1. テーマ・文字サイズ設定
  // ==========================================
  const savedTheme = localStorage.getItem("kin77dan-tools-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (prefersDark ? "blue" : "light");

  function applyTheme(theme) {
    htmlEl.setAttribute("data-theme", theme);
    localStorage.setItem("kin77dan-tools-theme", theme);
    themeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.themeVal === theme);
    });
  }
  applyTheme(initialTheme);

  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.themeVal));
  });

  const sizeMap = { small: "14px", medium: "16px", large: "18px" };
  const savedSize = localStorage.getItem("kin77dan-tools-fontsize") || "medium";

  function applyFontSize(sizeKey) {
    htmlEl.style.setProperty("--font-size-base", sizeMap[sizeKey] || sizeMap.medium);
    localStorage.setItem("kin77dan-tools-fontsize", sizeKey);
    sizeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.size === sizeKey);
    });
  }
  applyFontSize(savedSize);

  sizeButtons.forEach((btn) => {
    btn.addEventListener("click", () => applyFontSize(btn.dataset.size));
  });

  // ==========================================
  // 2. ツール切り替え＆バックグラウンド制御
  // ==========================================
  let currentTool = "home";
  const mvBgPlayCheck = document.getElementById("mv-bg-play");
  const tgBgPlayCheck = document.getElementById("tg-bg-play");

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }

  menuToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });
  overlay.addEventListener("click", closeSidebar);

  function switchTool(toolId) {
    if (currentTool === "multivideo" && toolId !== "multivideo" && !mvBgPlayCheck.checked) {
      pauseAllMultiVideos();
    }
    if (currentTool === "tonegen" && toolId !== "tonegen" && !tgBgPlayCheck.checked) {
      stopAllToneGen();
    }
    if (currentTool === "keymouse" && toolId !== "keymouse") {
      clearActiveKeyMouse();
    }
    if (currentTool === "bpm" && toolId !== "bpm") {
      bpmTapBtn.classList.remove("pressed");
    }
    if (currentTool === "gamepad" && toolId !== "gamepad") {
      stopGamepadHzTimer();
    }
    if (currentTool === "clock" && toolId !== "clock" && !alarmBgCheck.checked && isAlarmRinging()) {
      stopAlarmSoundOnly();
    }
    if (currentTool === "scanner" && toolId !== "scanner") {
      stopScannerCamera();
    }
    if (currentTool === "spectrum" && toolId !== "spectrum") {
      stopSpectrumMic();
    }
    if (currentTool === "monitor" && toolId !== "monitor") {
      stopMonitorLoop();
    }

    currentTool = toolId;
    toolLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.tool === toolId);
    });
    toolPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `panel-${toolId}`);
    });
    if (toolId === "device") {
      renderDeviceSpecs();
    }
    if (toolId === "gamepad") {
      refreshGamepadList();
      startGamepadHzTimer();
    }
    if (toolId === "monitor") {
      startMonitorLoop();
    }
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  function navigateToTool(toolId) {
    if (location.hash !== `#${toolId}`) {
      history.pushState(null, "", `#${toolId}`);
    }
    switchTool(toolId);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  [sidebarHomeLink, mobileHomeLink].forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToTool("home");
    });
  });

  toolLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToTool(link.dataset.tool);
    });
  });

  const allToolIds = [
    "home", "clock", "calc", "stopwatch", "bpm", "base", "led", "rc",
    "multivideo", "tonegen", "keymouse", "gamepad", "device", "hash", "charcount", "barcode",
    "scanner", "color", "mojibake", "ytthumb", "roulette", "spectrum",
    "imgtool", "monitor", "diff", "pwgen", "unit"
  ];

  // ==========================================
  // 0. TOPページ（検索＆カード遷移）
  // ==========================================
  const homeSearchInput = document.getElementById("home-search-input");
  const homeSearchClear = document.getElementById("home-search-clear");
  const homeToolCards = document.querySelectorAll("#home-tools-grid .tool-card");
  const homeNoResult = document.getElementById("home-no-result");

  function filterHomeTools() {
    const q = homeSearchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    homeToolCards.forEach((card) => {
      const text = (card.textContent + " " + (card.dataset.keywords || "")).toLowerCase();
      const match = q === "" || text.includes(q);
      card.classList.toggle("hidden", !match);
      if (match) visibleCount++;
    });

    homeNoResult.classList.toggle("hidden", visibleCount > 0);
  }

  homeSearchInput.addEventListener("input", filterHomeTools);

  homeSearchClear.addEventListener("click", () => {
    homeSearchInput.value = "";
    filterHomeTools();
    homeSearchInput.focus();
  });

  homeToolCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToTool(card.dataset.tool);
    });
  });

  // ==========================================
  // 3. 時計（デジタル / アナログ / 世界時計 / アラーム）
  // ==========================================
  const clockDateEl = document.getElementById("clock-date");
  const clockTimeEl = document.getElementById("clock-time");
  const clockUnixEl = document.getElementById("clock-unix");
  const clockBox = document.getElementById("clock-display-box");
  const fullscreenBtn = document.getElementById("clock-fullscreen-btn");
  const exitFsBtn = document.getElementById("clock-exit-fs-btn");
  const copyUnixBtn = document.getElementById("copy-unix-btn");
  const clockDetailArea = document.getElementById("clock-detail-area");
  const worldClockGrid = document.getElementById("world-clock-grid");
  const clockModeBtns = document.querySelectorAll(".clock-mode-btn");
  const clockFaceBtns = document.querySelectorAll(".clock-face-btn");
  const clockAnalogWrap = document.getElementById("clock-analog-wrap");
  const clockDigitalWrap = document.getElementById("clock-digital-wrap");
  const clockTicksGroup = document.getElementById("clock-ticks");
  const clockHandHour = document.getElementById("clock-hand-hour");
  const clockHandMin = document.getElementById("clock-hand-min");
  const clockHandSec = document.getElementById("clock-hand-sec");
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  let clockDetailOpen = false;
  let clockFaceMode = localStorage.getItem("kin77dan-tools-clock-face") || "digital";

  // アナログ時計の目盛りを生成
  for (let i = 0; i < 60; i++) {
    const isMajor = i % 5 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const rOuter = 104;
    const rInner = isMajor ? 92 : 98;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", (120 + rInner * Math.sin(angle)).toFixed(2));
    line.setAttribute("y1", (120 - rInner * Math.cos(angle)).toFixed(2));
    line.setAttribute("x2", (120 + rOuter * Math.sin(angle)).toFixed(2));
    line.setAttribute("y2", (120 - rOuter * Math.cos(angle)).toFixed(2));
    line.setAttribute("class", isMajor ? "clock-tick major" : "clock-tick");
    clockTicksGroup.appendChild(line);
  }

  function applyClockFace(face) {
    clockFaceMode = ["digital", "analog", "both"].includes(face) ? face : "digital";
    localStorage.setItem("kin77dan-tools-clock-face", clockFaceMode);
    clockAnalogWrap.classList.toggle("hidden", clockFaceMode === "digital");
    clockDigitalWrap.classList.toggle("hidden", clockFaceMode === "analog");
    clockFaceBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.clockFace === clockFaceMode);
    });
  }
  applyClockFace(clockFaceMode);

  clockFaceBtns.forEach((btn) => {
    btn.addEventListener("click", () => applyClockFace(btn.dataset.clockFace));
  });

  const worldCities = [
    { name: "UTC（協定世界時）", tz: "UTC" },
    { name: "ロンドン", tz: "Europe/London" },
    { name: "ニューヨーク", tz: "America/New_York" },
    { name: "ロサンゼルス", tz: "America/Los_Angeles" },
    { name: "台北 / 北京", tz: "Asia/Taipei" },
    { name: "シドニー", tz: "Australia/Sydney" }
  ];

  worldCities.forEach((city, idx) => {
    const div = document.createElement("div");
    div.className = "world-clock-item";
    div.innerHTML = `
      <div class="wc-city"><span>${city.name}</span></div>
      <div class="wc-time" id="wc-time-${idx}">--:--:--</div>
      <div class="wc-date" id="wc-date-${idx}">----/--/--</div>
    `;
    worldClockGrid.appendChild(div);
  });

  clockModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.clockMode;
      clockDetailOpen = mode === "detail";
      clockDetailArea.classList.toggle("open", clockDetailOpen);
      clockModeBtns.forEach((b) => b.classList.toggle("active", b === btn));
      if (clockDetailOpen) {
        const now = new Date();
        clockUnixEl.textContent = Math.floor(now.getTime() / 1000);
        renderWorldClocks(now);
      }
    });
  });

  function renderWorldClocks(now) {
    worldCities.forEach((city, idx) => {
      const timeFmt = new Intl.DateTimeFormat("ja-JP", {
        timeZone: city.tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const dateFmt = new Intl.DateTimeFormat("ja-JP", {
        timeZone: city.tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
      });
      document.getElementById(`wc-time-${idx}`).textContent = timeFmt.format(now);
      document.getElementById(`wc-date-${idx}`).textContent = dateFmt.format(now);
    });
  }

  function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const w = weekDays[now.getDay()];
    const hours = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();
    const hh = pad(hours);
    const mm = pad(mins);
    const ss = pad(secs);

    clockDateEl.textContent = `${y}/${m}/${d} (${w})`;
    clockTimeEl.textContent = `${hh}:${mm}:${ss}`;

    const secDeg = secs * 6;
    const minDeg = (mins + secs / 60) * 6;
    const hourDeg = ((hours % 12) + mins / 60 + secs / 3600) * 30;
    clockHandSec.setAttribute("transform", `rotate(${secDeg} 120 120)`);
    clockHandMin.setAttribute("transform", `rotate(${minDeg} 120 120)`);
    clockHandHour.setAttribute("transform", `rotate(${hourDeg} 120 120)`);

    if (clockDetailOpen) {
      clockUnixEl.textContent = Math.floor(now.getTime() / 1000);
      renderWorldClocks(now);
    }

    setTimeout(updateClock, 1000 - now.getMilliseconds());
  }
  updateClock();

  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      clockBox.requestFullscreen().catch(() => {});
    }
  });

  exitFsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  });

  copyUnixBtn.addEventListener("click", () => {
    copyToClipboard(clockUnixEl.textContent, copyUnixBtn, "コピー");
  });

  // --- アラーム機能 ---
  const alarmBgCheck = document.getElementById("alarm-bg-check");
  const alarmMasterCheck = document.getElementById("alarm-master-check");
  const alarmSettingsBody = document.getElementById("alarm-settings-body");
  const alarmTimeInput = document.getElementById("alarm-time-input");
  const alarmLabelInput = document.getElementById("alarm-label-input");
  const alarmRepeatSelect = document.getElementById("alarm-repeat-select");
  const alarmAddBtn = document.getElementById("alarm-add-btn");
  const alarmSoundType = document.getElementById("alarm-sound-type");
  const alarmFileGroup = document.getElementById("alarm-file-group");
  const alarmAudioInput = document.getElementById("alarm-audio-input");
  const alarmAudioName = document.getElementById("alarm-audio-name");
  const alarmVolSlider = document.getElementById("alarm-vol-slider");
  const alarmVolVal = document.getElementById("alarm-vol-val");
  const alarmTestBtn = document.getElementById("alarm-test-btn");
  const alarmListEl = document.getElementById("alarm-list");
  const alarmRingingBanner = document.getElementById("alarm-ringing-banner");
  const alarmRingingTitle = document.getElementById("alarm-ringing-title");
  const alarmRingingSub = document.getElementById("alarm-ringing-sub");
  const alarmSnoozeBtn = document.getElementById("alarm-snooze-btn");
  const alarmStopBtn = document.getElementById("alarm-stop-btn");

  const defaultDocTitle = document.title;
  let alarmAudioCtx = null;
  let alarmPatternTimer = null;
  let customAlarmAudio = new Audio();
  customAlarmAudio.loop = true;
  let customAlarmUrl = null;
  let customAlarmName = "";
  let activeRingingAlarm = null;
  let alarmTesting = false;
  let nextAlarmId = 1;

  let alarms = [];
  try {
    const savedAlarms = JSON.parse(localStorage.getItem("kin77dan-tools-alarms") || "[]");
    if (Array.isArray(savedAlarms)) {
      alarms = savedAlarms.map((a) => ({
        id: nextAlarmId++,
        time: String(a.time || "07:00"),
        label: String(a.label || ""),
        repeat: a.repeat === "once" ? "once" : "daily",
        enabled: Boolean(a.enabled),
        lastTriggeredKey: ""
      }));
    }
  } catch {
    alarms = [];
  }

  const savedAlarmBg = localStorage.getItem("kin77dan-tools-alarm-bg");
  if (savedAlarmBg !== null) alarmBgCheck.checked = savedAlarmBg === "1";

  const savedAlarmMaster = localStorage.getItem("kin77dan-tools-alarm-master");
  if (savedAlarmMaster !== null) alarmMasterCheck.checked = savedAlarmMaster === "1";

  const savedAlarmSound = localStorage.getItem("kin77dan-tools-alarm-sound");
  if (savedAlarmSound && ["beep", "chime", "custom"].includes(savedAlarmSound)) {
    alarmSoundType.value = savedAlarmSound;
  }

  const savedAlarmVol = localStorage.getItem("kin77dan-tools-alarm-vol");
  if (savedAlarmVol !== null) {
    alarmVolSlider.value = savedAlarmVol;
    alarmVolVal.textContent = `${savedAlarmVol}%`;
  }

  function unlockAlarmAudioContext() {
    if (!alarmAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) alarmAudioCtx = new Ctx();
    }
    if (alarmAudioCtx && alarmAudioCtx.state === "suspended") {
      alarmAudioCtx.resume().catch(() => {});
    }
  }

  function saveAlarms() {
    try {
      localStorage.setItem(
        "kin77dan-tools-alarms",
        JSON.stringify(alarms.map(({ time, label, repeat, enabled }) => ({ time, label, repeat, enabled })))
      );
    } catch {
      // ignore storage quota errors
    }
  }

  function updateAlarmUiState() {
    const masterOn = alarmMasterCheck.checked;
    alarmSettingsBody.style.opacity = masterOn ? "1" : "0.55";
    alarmFileGroup.classList.toggle("hidden", alarmSoundType.value !== "custom");
  }
  updateAlarmUiState();

  function isAlarmRinging() {
    return activeRingingAlarm !== null;
  }

  function playAlarmTone(freq, startOffset, dur, gainVal, type = "sine") {
    if (!alarmAudioCtx) return;
    const t0 = alarmAudioCtx.currentTime + startOffset;
    const osc = alarmAudioCtx.createOscillator();
    const g = alarmAudioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainVal), t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(alarmAudioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function startAlarmSoundLoop() {
    stopAlarmSoundOnly();
    const vol = (Number(alarmVolSlider.value) || 0) / 100;
    const soundType = alarmSoundType.value;

    if (soundType === "custom" && customAlarmUrl) {
      customAlarmAudio.volume = vol;
      customAlarmAudio.currentTime = 0;
      customAlarmAudio.play().catch(() => {
        // 再生不可の場合は電子音へフォールバック
        startSynthAlarmLoop("beep");
      });
      return;
    }

    startSynthAlarmLoop(soundType === "chime" ? "chime" : "beep");
  }

  function startSynthAlarmLoop(mode) {
    unlockAlarmAudioContext();
    const playOnce = () => {
      const vol = ((Number(alarmVolSlider.value) || 0) / 100) * 0.45;
      if (vol <= 0 || !alarmAudioCtx) return;
      if (mode === "chime") {
        playAlarmTone(523.25, 0.0, 0.25, vol, "triangle");
        playAlarmTone(659.25, 0.22, 0.25, vol, "triangle");
        playAlarmTone(783.99, 0.44, 0.45, vol, "triangle");
      } else {
        playAlarmTone(880, 0.0, 0.14, vol, "square");
        playAlarmTone(880, 0.2, 0.14, vol, "square");
        playAlarmTone(880, 0.4, 0.14, vol, "square");
      }
    };
    playOnce();
    alarmPatternTimer = setInterval(playOnce, mode === "chime" ? 1500 : 1000);
  }

  function stopAlarmSoundOnly() {
    clearInterval(alarmPatternTimer);
    alarmPatternTimer = null;
    customAlarmAudio.pause();
    customAlarmAudio.currentTime = 0;
    alarmTesting = false;
    alarmTestBtn.textContent = "🔊 テスト再生";
  }

  function stopRingingAlarm() {
    stopAlarmSoundOnly();
    activeRingingAlarm = null;
    alarmRingingBanner.classList.add("hidden");
    document.title = defaultDocTitle;
  }

  function triggerAlarmRing(alarm) {
    activeRingingAlarm = alarm;
    alarmRingingTitle.textContent = alarm.label ? `アラーム: ${alarm.label}` : "アラーム鳴動中";
    alarmRingingSub.textContent = `設定時刻 ${alarm.time}`;
    alarmRingingBanner.classList.remove("hidden");
    document.title = `🔔 ${alarm.time} アラーム鳴動中! - kin77dan Tools`;
    startAlarmSoundLoop();
  }

  function renderAlarms() {
    alarmListEl.innerHTML = "";
    if (alarms.length === 0) {
      alarmListEl.innerHTML = '<li class="empty-msg">アラームは登録されていません</li>';
      return;
    }

    const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
    sorted.forEach((alarm) => {
      const li = document.createElement("li");
      li.className = "alarm-item" + (alarm.enabled ? "" : " disabled");

      const left = document.createElement("div");
      left.className = "alarm-item-left";

      const timeEl = document.createElement("span");
      timeEl.className = "alarm-item-time mono";
      timeEl.textContent = alarm.time;

      const repeatBadge = document.createElement("span");
      repeatBadge.className = "tag";
      repeatBadge.textContent = alarm.repeat === "daily" ? "毎日" : "1回";

      left.append(timeEl, repeatBadge);

      if (alarm.label) {
        const labelEl = document.createElement("span");
        labelEl.className = "alarm-item-label";
        labelEl.textContent = alarm.label;
        left.appendChild(labelEl);
      }

      const right = document.createElement("div");
      right.className = "alarm-item-right";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "toggle-chip";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = alarm.enabled;
      const chkText = document.createElement("span");
      chkText.textContent = alarm.enabled ? "ON" : "OFF";
      chk.addEventListener("change", () => {
        unlockAlarmAudioContext();
        alarm.enabled = chk.checked;
        alarm.lastTriggeredKey = "";
        saveAlarms();
        renderAlarms();
      });
      toggleLabel.append(chk, chkText);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "mini-btn";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        alarms = alarms.filter((a) => a.id !== alarm.id);
        saveAlarms();
        renderAlarms();
      });

      right.append(toggleLabel, delBtn);
      li.append(left, right);
      alarmListEl.appendChild(li);
    });
  }
  renderAlarms();

  alarmAddBtn.addEventListener("click", () => {
    const timeVal = alarmTimeInput.value;
    if (!timeVal) return;
    unlockAlarmAudioContext();
    alarms.push({
      id: nextAlarmId++,
      time: timeVal,
      label: alarmLabelInput.value.trim(),
      repeat: alarmRepeatSelect.value === "once" ? "once" : "daily",
      enabled: true,
      lastTriggeredKey: ""
    });
    alarmLabelInput.value = "";
    saveAlarms();
    renderAlarms();
  });

  alarmBgCheck.addEventListener("change", () => {
    localStorage.setItem("kin77dan-tools-alarm-bg", alarmBgCheck.checked ? "1" : "0");
    if (!alarmBgCheck.checked && currentTool !== "clock" && isAlarmRinging()) {
      stopRingingAlarm();
    }
  });

  alarmMasterCheck.addEventListener("change", () => {
    unlockAlarmAudioContext();
    localStorage.setItem("kin77dan-tools-alarm-master", alarmMasterCheck.checked ? "1" : "0");
    updateAlarmUiState();
    if (!alarmMasterCheck.checked && isAlarmRinging()) {
      stopRingingAlarm();
    }
  });

  alarmSoundType.addEventListener("change", () => {
    localStorage.setItem("kin77dan-tools-alarm-sound", alarmSoundType.value);
    updateAlarmUiState();
    if (alarmTesting || isAlarmRinging()) {
      startAlarmSoundLoop();
    }
  });

  alarmAudioInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (customAlarmUrl) URL.revokeObjectURL(customAlarmUrl);
    customAlarmUrl = URL.createObjectURL(file);
    customAlarmName = file.name;
    customAlarmAudio.src = customAlarmUrl;
    alarmAudioName.textContent = customAlarmName;
    alarmSoundType.value = "custom";
    localStorage.setItem("kin77dan-tools-alarm-sound", "custom");
    updateAlarmUiState();
  });

  alarmVolSlider.addEventListener("input", () => {
    const pct = Number(alarmVolSlider.value);
    alarmVolVal.textContent = `${pct}%`;
    customAlarmAudio.volume = pct / 100;
    localStorage.setItem("kin77dan-tools-alarm-vol", String(pct));
  });

  alarmTestBtn.addEventListener("click", () => {
    unlockAlarmAudioContext();
    if (alarmTesting) {
      stopAlarmSoundOnly();
      return;
    }
    alarmTesting = true;
    startAlarmSoundLoop();
    alarmTesting = true;
    alarmTestBtn.textContent = "⏹ テスト停止";
  });

  alarmStopBtn.addEventListener("click", stopRingingAlarm);

  alarmSnoozeBtn.addEventListener("click", () => {
    const prevLabel = activeRingingAlarm && activeRingingAlarm.label ? activeRingingAlarm.label : "アラーム";
    stopRingingAlarm();
    const target = new Date(Date.now() + 5 * 60 * 1000);
    const snoozeTime = `${pad(target.getHours())}:${pad(target.getMinutes())}`;
    alarms.push({
      id: nextAlarmId++,
      time: snoozeTime,
      label: `${prevLabel} (スヌーズ)`,
      repeat: "once",
      enabled: true,
      lastTriggeredKey: ""
    });
    saveAlarms();
    renderAlarms();
  });

  setInterval(() => {
    if (!alarmMasterCheck.checked) return;
    if (!alarmBgCheck.checked && currentTool !== "clock") return;

    const now = new Date();
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const minuteKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${hhmm}`;

    let changed = false;
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      if (alarm.time === hhmm && alarm.lastTriggeredKey !== minuteKey) {
        alarm.lastTriggeredKey = minuteKey;
        if (alarm.repeat === "once") {
          alarm.enabled = false;
          changed = true;
        }
        triggerAlarmRing(alarm);
        break;
      }
    }
    if (changed) {
      saveAlarms();
      renderAlarms();
    }
  }, 500);

  // ==========================================
  // 4. 電卓（シンプル / 関数電卓 / 関数電卓・多機能）
  // ==========================================
  const calcCard = document.getElementById("calc-card");
  const calcInput = document.getElementById("calc-input");
  const calcExpr = document.getElementById("calc-expr");
  const calcFracSub = document.getElementById("calc-frac-sub");
  const calcHistoryEl = document.getElementById("calc-history");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const calcModeBtns = document.querySelectorAll(".calc-mode-btn");
  const calcAngleBtn = document.getElementById("calc-angle-btn");

  const varXInput = document.getElementById("var-x");
  const varYInput = document.getElementById("var-y");
  const varZInput = document.getElementById("var-z");

  const calcBuilder = document.getElementById("calc-builder");
  const builderTitle = document.getElementById("builder-title");
  const builderBody = document.getElementById("builder-body");
  const builderCloseBtn = document.getElementById("builder-close-btn");
  const builderInsertBtn = document.getElementById("builder-insert-btn");
  const builderEvalBtn = document.getElementById("builder-eval-btn");

  let justEvaluated = false;
  let angleUnit = "DEG";
  let activeBuilderType = null;

  calcModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.calcMode;
      calcCard.classList.toggle("sci-mode", mode === "sci");
      calcCard.classList.toggle("adv-mode", mode === "adv");
      calcAngleBtn.classList.toggle("hidden", mode === "simple");
      if (mode !== "adv") calcBuilder.classList.add("hidden");
      calcModeBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  calcAngleBtn.addEventListener("click", () => {
    angleUnit = angleUnit === "DEG" ? "RAD" : "DEG";
    calcAngleBtn.textContent = angleUnit;
  });

  function openBuilder(type) {
    activeBuilderType = type;
    calcBuilder.classList.remove("hidden");

    if (type === "frac") {
      builderTitle.textContent = "分数入力（分子 / 分母）";
      builderBody.innerHTML = `
        <input type="text" id="b-num" placeholder="分子 (■)">
        <span>/</span>
        <input type="text" id="b-den" placeholder="分母 (□)">
      `;
    } else if (type === "diff") {
      builderTitle.textContent = "微分計算（d/dx ■）";
      builderBody.innerHTML = `
        <span>d/dx (</span>
        <input type="text" id="b-fn" class="wide" placeholder="式 例: x^2">
        <span>) で x =</span>
        <input type="text" id="b-val" placeholder="値 例: 3">
      `;
    } else if (type === "int") {
      builderTitle.textContent = "定積分計算（∫ □～□ ■ dx）";
      builderBody.innerHTML = `
        <span>下端:</span>
        <input type="text" id="b-a" placeholder="下端 (□)">
        <span>上端:</span>
        <input type="text" id="b-b" placeholder="上端 (□)">
        <span>式:</span>
        <input type="text" id="b-fn" class="wide" placeholder="式 (■) 例: x^2">
      `;
    } else if (type === "solve") {
      builderTitle.textContent = "方程式（左辺 = 右辺）";
      builderBody.innerHTML = `
        <input type="text" id="b-lhs" placeholder="左辺 例: x^2-2">
        <span>=</span>
        <input type="text" id="b-rhs" value="0" placeholder="右辺">
        <span>初期値:</span>
        <input type="text" id="b-init" value="1">
      `;
    }
    const firstInput = builderBody.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function buildExpressionFromForm() {
    if (activeBuilderType === "frac") {
      const num = document.getElementById("b-num").value.trim() || "0";
      const den = document.getElementById("b-den").value.trim() || "1";
      return `frac(${num},${den})`;
    }
    if (activeBuilderType === "diff") {
      const fn = document.getElementById("b-fn").value.trim() || "x";
      const val = document.getElementById("b-val").value.trim() || "0";
      return `d/dx(${fn},${val})`;
    }
    if (activeBuilderType === "int") {
      const a = document.getElementById("b-a").value.trim() || "0";
      const b = document.getElementById("b-b").value.trim() || "1";
      const fn = document.getElementById("b-fn").value.trim() || "x";
      return `∫(${fn},${a},${b})`;
    }
    if (activeBuilderType === "solve") {
      const lhs = document.getElementById("b-lhs").value.trim() || "x";
      const rhs = document.getElementById("b-rhs").value.trim() || "0";
      const init = document.getElementById("b-init").value.trim() || "1";
      return `solve(${lhs}=${rhs},${init})`;
    }
    return "";
  }

  document.querySelectorAll("[data-builder]").forEach((btn) => {
    btn.addEventListener("click", () => openBuilder(btn.dataset.builder));
  });

  builderCloseBtn.addEventListener("click", () => {
    calcBuilder.classList.add("hidden");
  });

  builderInsertBtn.addEventListener("click", () => {
    const built = buildExpressionFromForm();
    if (!built) return;
    if (calcInput.value === "0" || calcInput.value === "エラー" || justEvaluated) {
      calcInput.value = built;
    } else {
      calcInput.value += built;
    }
    justEvaluated = false;
    calcBuilder.classList.add("hidden");
  });

  builderEvalBtn.addEventListener("click", () => {
    const built = buildExpressionFromForm();
    if (!built) return;
    calcInput.value = built;
    calcBuilder.classList.add("hidden");
    handleCalcAction("EVAL");
  });

  calcBuilder.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      builderEvalBtn.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      calcBuilder.classList.add("hidden");
    }
  });

  function autoCloseParens(expr) {
    let openCount = 0;
    for (const ch of expr) {
      if (ch === "(") openCount++;
      else if (ch === ")") openCount--;
    }
    if (openCount > 0) {
      return expr + ")".repeat(openCount);
    }
    return expr;
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("Fact");
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  function perm(n, r) {
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) throw new Error("Perm");
    let res = 1;
    for (let i = 0; i < r; i++) res *= (n - i);
    return res;
  }

  function comb(n, r) {
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) throw new Error("Comb");
    if (r > n - r) r = n - r;
    let res = 1;
    for (let i = 0; i < r; i++) {
      res = (res * (n - i)) / (i + 1);
    }
    return Math.round(res);
  }

  function toFractionString(num) {
    if (!Number.isFinite(num) || Number.isInteger(num)) return "";
    const sign = num < 0 ? "-" : "";
    const val = Math.abs(num);
    if (val > 1e6 || val < 1e-6) return "";

    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = val;
    for (let i = 0; i < 20; i++) {
      const a = Math.floor(b);
      const h = a * h1 + h2;
      const k = a * k1 + k2;
      if (k > 10000) break;
      h2 = h1; h1 = h;
      k2 = k1; k1 = k;
      if (Math.abs(val - h1 / k1) < 1e-9) break;
      const rem = b - a;
      if (rem < 1e-12) break;
      b = 1 / rem;
    }
    if (k1 > 1 && k1 <= 10000 && Math.abs(val - h1 / k1) < 1e-8) {
      return `= ${sign}${h1}/${k1}`;
    }
    return "";
  }

  function splitTopLevelArgs(str) {
    const args = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === "(") depth++;
      else if (str[i] === ")") {
        depth--;
        if (depth < 0) throw new Error("Paren");
      } else if (str[i] === "," && depth === 0) {
        args.push(str.slice(start, i));
        start = i + 1;
      }
    }
    if (depth !== 0) throw new Error("Paren");
    args.push(str.slice(start));
    return args;
  }

  function findMatchingParen(str, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === "(") depth++;
      else if (str[i] === ")") {
        depth--;
        if (depth === 0) return i;
      }
    }
    throw new Error("Paren");
  }

  function getCurrentVars() {
    return {
      x: varXInput.value !== "" ? Number(varXInput.value) : null,
      y: varYInput.value !== "" ? Number(varYInput.value) : null,
      z: varZInput.value !== "" ? Number(varZInput.value) : null
    };
  }

  function formatCalcResult(num) {
    if (num === 0) return "0";
    if (Math.abs(num) < 1e-6) {
      return num.toFixed(10).replace(/\.?0+$/, "");
    }
    return String(num);
  }

  function insertImplicitMult(str) {
    const fnOpenRe = /^(asin|acos|atan|sin|cos|tan|log|ln|sqrt|abs|frac|diff|int|solve)\(/;
    const numRe = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]\d{2,})?/;
    const tokens = [];
    let i = 0;

    while (i < str.length) {
      const rest = str.slice(i);
      const fnMatch = rest.match(fnOpenRe);
      if (fnMatch) {
        tokens.push({ type: "funcOpen", text: fnMatch[0] });
        i += fnMatch[0].length;
        continue;
      }
      const numMatch = rest.match(numRe);
      if (numMatch) {
        tokens.push({ type: "num", text: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }
      const ch = str[i];
      if ("πexyz".includes(ch)) {
        tokens.push({ type: "constOrVar", text: ch });
      } else if (ch === "(") {
        tokens.push({ type: "lparen", text: ch });
      } else if (ch === ")") {
        tokens.push({ type: "rparen", text: ch });
      } else if (ch === "!") {
        tokens.push({ type: "fact", text: ch });
      } else if ("+-*/^,PC=".includes(ch)) {
        tokens.push({ type: "op", text: ch });
      } else {
        throw new Error("Syntax");
      }
      i++;
    }

    let out = "";
    for (let idx = 0; idx < tokens.length; idx++) {
      const prev = tokens[idx - 1];
      const curr = tokens[idx];
      if (
        prev &&
        (prev.type === "num" || prev.type === "constOrVar" || prev.type === "rparen" || prev.type === "fact") &&
        (curr.type === "num" || curr.type === "constOrVar" || curr.type === "lparen" || curr.type === "funcOpen")
      ) {
        out += "*";
      }
      out += curr.text;
    }
    return out;
  }

  function safeEvaluate(expr, vars = getCurrentVars()) {
    let cleaned = autoCloseParens(expr)
      .replace(/\s+/g, "")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/√\(/g, "sqrt(")
      .replace(/d\/dx\(/g, "diff(")
      .replace(/∫\(/g, "int(");

    cleaned = insertImplicitMult(cleaned);

    let pos = 0;

    function parseExpr() {
      let val = parseTerm();
      while (cleaned[pos] === "+" || cleaned[pos] === "-") {
        const op = cleaned[pos++];
        const right = parseTerm();
        val = op === "+" ? val + right : val - right;
      }
      return val;
    }

    function parseTerm() {
      let val = parseCombPerm();
      while (cleaned[pos] === "*" || cleaned[pos] === "/") {
        const op = cleaned[pos++];
        const right = parseCombPerm();
        if (op === "/" && right === 0) throw new Error("ZeroDiv");
        val = op === "*" ? val * right : val / right;
      }
      return val;
    }

    function parseCombPerm() {
      let val = parseUnary();
      while (cleaned[pos] === "P" || cleaned[pos] === "C") {
        const op = cleaned[pos++];
        const right = parseUnary();
        val = op === "P" ? perm(val, right) : comb(val, right);
      }
      return val;
    }

    function parseUnary() {
      if (cleaned[pos] === "+") { pos++; return parseUnary(); }
      if (cleaned[pos] === "-") { pos++; return -parseUnary(); }
      return parsePower();
    }

    function parsePower() {
      let base = parsePostfix();
      if (cleaned[pos] === "^") {
        pos++;
        const exp = parseUnary();
        base = Math.pow(base, exp);
      }
      return base;
    }

    function parsePostfix() {
      let val = parsePrimary();
      while (cleaned[pos] === "!") {
        pos++;
        val = factorial(val);
      }
      return val;
    }

    function parsePrimary() {
      if (cleaned[pos] === "(") {
        pos++;
        const val = parseExpr();
        if (cleaned[pos++] !== ")") throw new Error("Paren");
        return val;
      }
      if (cleaned[pos] === "π") { pos++; return Math.PI; }
      if (cleaned[pos] === "e") { pos++; return Math.E; }
      if (cleaned[pos] === "x" || cleaned[pos] === "y" || cleaned[pos] === "z") {
        const vName = cleaned[pos];
        if (vars[vName] === null || Number.isNaN(vars[vName])) throw new Error("UnboundVar");
        pos++;
        return vars[vName];
      }

      const multiFnMatch = cleaned.slice(pos).match(/^(frac|diff|int|solve)\(/);
      if (multiFnMatch) {
        const fnName = multiFnMatch[1];
        const openIdx = pos + fnName.length;
        const closeIdx = findMatchingParen(cleaned, openIdx);
        const inner = cleaned.slice(openIdx + 1, closeIdx);
        pos = closeIdx + 1;

        const args = splitTopLevelArgs(inner);

        if (fnName === "frac") {
          if (args.length !== 2) throw new Error("Args");
          const num = safeEvaluate(args[0], vars);
          const den = safeEvaluate(args[1], vars);
          if (den === 0) throw new Error("ZeroDiv");
          return num / den;
        }

        if (fnName === "diff") {
          if (args.length !== 2) throw new Error("Args");
          const x0 = safeEvaluate(args[1], vars);
          const h = 1e-6;
          const fPlus = safeEvaluate(args[0], { ...vars, x: x0 + h });
          const fMinus = safeEvaluate(args[0], { ...vars, x: x0 - h });
          return (fPlus - fMinus) / (2 * h);
        }

        if (fnName === "int") {
          if (args.length !== 3) throw new Error("Args");
          const a = safeEvaluate(args[1], vars);
          const b = safeEvaluate(args[2], vars);
          if (a === b) return 0;
          const n = 1000;
          const h = (b - a) / n;
          let sum = safeEvaluate(args[0], { ...vars, x: a }) + safeEvaluate(args[0], { ...vars, x: b });
          for (let i = 1; i < n; i++) {
            const xi = a + i * h;
            sum += (i % 2 === 0 ? 2 : 4) * safeEvaluate(args[0], { ...vars, x: xi });
          }
          return (sum * h) / 3;
        }

        if (fnName === "solve") {
          if (args.length < 1 || args.length > 2) throw new Error("Args");
          let eqStr = args[0];
          const eqParts = eqStr.split("=");
          if (eqParts.length === 2) {
            eqStr = `(${eqParts[0]})-(${eqParts[1]})`;
          } else if (eqParts.length > 2) {
            throw new Error("EqSyntax");
          }

          let x = args.length === 2 ? safeEvaluate(args[1], vars) : 1;
          const h = 1e-7;
          for (let iter = 0; iter < 100; iter++) {
            const fx = safeEvaluate(eqStr, { ...vars, x });
            if (Math.abs(fx) < 1e-11) return x;
            const dfx = (safeEvaluate(eqStr, { ...vars, x: x + h }) - safeEvaluate(eqStr, { ...vars, x: x - h })) / (2 * h);
            if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) {
              x += 0.1;
              continue;
            }
            const step = fx / dfx;
            x -= step;
            if (Math.abs(step) < 1e-12) return x;
          }
          if (Math.abs(safeEvaluate(eqStr, { ...vars, x })) < 1e-5) return x;
          throw new Error("NoRoot");
        }
      }

      const fnMatch = cleaned.slice(pos).match(/^(asin|acos|atan|sin|cos|tan|log|ln|sqrt|abs)\(/);
      if (fnMatch) {
        const fnName = fnMatch[1];
        pos += fnName.length + 1;
        const arg = parseExpr();
        if (cleaned[pos++] !== ")") throw new Error("Paren");

        const toRad = (v) => (angleUnit === "DEG" ? (v * Math.PI) / 180 : v);
        const fromRad = (v) => (angleUnit === "DEG" ? (v * 180) / Math.PI : v);

        switch (fnName) {
          case "sin": return Math.sin(toRad(arg));
          case "cos": return Math.cos(toRad(arg));
          case "tan":
            if (angleUnit === "DEG" && Math.abs(arg % 180) === 90) throw new Error("TanInf");
            return Math.tan(toRad(arg));
          case "asin":
            if (arg < -1 || arg > 1) throw new Error("Domain");
            return fromRad(Math.asin(arg));
          case "acos":
            if (arg < -1 || arg > 1) throw new Error("Domain");
            return fromRad(Math.acos(arg));
          case "atan":
            return fromRad(Math.atan(arg));
          case "log":
            if (arg <= 0) throw new Error("Domain");
            return Math.log10(arg);
          case "ln":
            if (arg <= 0) throw new Error("Domain");
            return Math.log(arg);
          case "sqrt":
            if (arg < 0) throw new Error("Domain");
            return Math.sqrt(arg);
          case "abs":
            return Math.abs(arg);
        }
      }

      const numMatch = cleaned.slice(pos).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]\d{2,})?/);
      if (!numMatch) throw new Error("Num");
      pos += numMatch[0].length;
      const num = Number(numMatch[0]);
      if (Number.isNaN(num)) throw new Error("NaN");
      return num;
    }

    const res = parseExpr();
    if (pos !== cleaned.length || !Number.isFinite(res)) throw new Error("Syntax");
    const rounded = Math.abs(res) < 1e15 ? Math.round(res * 1e10) / 1e10 : res;
    return rounded === 0 ? 0 : rounded;
  }

  function addHistory(expression, resultStr, fracText) {
    const empty = calcHistoryEl.querySelector(".empty-msg");
    if (empty) empty.remove();

    const li = document.createElement("li");
    li.textContent = fracText ? `${expression} = ${resultStr} (${fracText.replace("= ", "")})` : `${expression} = ${resultStr}`;
    li.addEventListener("click", () => {
      calcInput.value = resultStr;
      calcFracSub.textContent = fracText;
      justEvaluated = true;
    });
    calcHistoryEl.prepend(li);
  }

  function handleCalcAction(val) {
    if (!val) return;
    if (val === "CLEAR") {
      calcInput.value = "0";
      calcExpr.textContent = "";
      calcFracSub.textContent = "";
      justEvaluated = false;
      return;
    }
    if (val === "BS") {
      if (calcInput.value.length <= 1 || calcInput.value === "エラー") {
        calcInput.value = "0";
      } else {
        calcInput.value = calcInput.value.slice(0, -1);
      }
      calcFracSub.textContent = "";
      justEvaluated = false;
      return;
    }
    if (val === "EVAL") {
      const completed = autoCloseParens(calcInput.value);
      try {
        const result = safeEvaluate(completed);
        const resultStr = formatCalcResult(result);
        const fracText = toFractionString(result);
        calcExpr.textContent = `${completed} =`;
        calcInput.value = resultStr;
        calcFracSub.textContent = fracText;
        addHistory(completed, resultStr, fracText);
        justEvaluated = true;
      } catch {
        calcInput.value = "エラー";
        calcFracSub.textContent = "";
        justEvaluated = true;
      }
      return;
    }

    if (calcInput.value === "エラー") {
      calcInput.value = val;
      calcFracSub.textContent = "";
      justEvaluated = false;
      return;
    }

    const isStartToken = /^[0-9.(πexyz]|^(asin|acos|atan|sin|cos|tan|log|ln|√|abs|frac|d\/dx|∫|solve)\(/.test(val);
    if ((justEvaluated && isStartToken) || (calcInput.value === "0" && isStartToken && val !== ".")) {
      calcInput.value = val;
    } else {
      calcInput.value += val;
    }
    calcFracSub.textContent = "";
    justEvaluated = false;
  }

  document.querySelectorAll(".calc-btn[data-val]").forEach((btn) => {
    btn.addEventListener("click", () => handleCalcAction(btn.dataset.val));
  });

  calcInput.addEventListener("input", () => {
    justEvaluated = false;
    calcFracSub.textContent = "";
  });

  calcInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCalcAction("EVAL");
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCalcAction("CLEAR");
    }
  });

  clearHistoryBtn.addEventListener("click", () => {
    calcHistoryEl.innerHTML = '<li class="empty-msg">履歴はありません</li>';
  });

  // ==========================================
  // 5. ストップウォッチ
  // ==========================================
  const swDisplay = document.getElementById("sw-display");
  const swStartBtn = document.getElementById("sw-start-btn");
  const swLapBtn = document.getElementById("sw-lap-btn");
  const swResetBtn = document.getElementById("sw-reset-btn");
  const swLaps = document.getElementById("sw-laps");

  let swRunning = false;
  let swStartTime = 0;
  let swElapsed = 0;
  let swTimerId = null;
  let lapCount = 0;

  function formatSw(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = pad(totalCs % 100);
    const totalSec = Math.floor(totalCs / 100);
    const sec = pad(totalSec % 60);
    const min = pad(Math.floor(totalSec / 60));
    return `${min}:${sec}.${cs}`;
  }

  function tickSw() {
    const current = swElapsed + (performance.now() - swStartTime);
    swDisplay.textContent = formatSw(current);
    swTimerId = requestAnimationFrame(tickSw);
  }

  swStartBtn.addEventListener("click", () => {
    if (!swRunning) {
      swRunning = true;
      swStartTime = performance.now();
      swStartBtn.textContent = "一時停止";
      swLapBtn.disabled = false;
      tickSw();
    } else {
      swRunning = false;
      swElapsed += performance.now() - swStartTime;
      cancelAnimationFrame(swTimerId);
      swStartBtn.textContent = "再開";
      swLapBtn.disabled = true;
    }
  });

  swLapBtn.addEventListener("click", () => {
    if (!swRunning) return;
    lapCount++;
    const current = swElapsed + (performance.now() - swStartTime);
    const li = document.createElement("li");
    li.innerHTML = `<span>Lap ${lapCount}</span><strong>${formatSw(current)}</strong>`;
    swLaps.prepend(li);
  });

  swResetBtn.addEventListener("click", () => {
    swRunning = false;
    cancelAnimationFrame(swTimerId);
    swElapsed = 0;
    lapCount = 0;
    swDisplay.textContent = "00:00.00";
    swStartBtn.textContent = "スタート";
    swLapBtn.disabled = true;
    swLaps.innerHTML = "";
  });

  // ==========================================
  // 6. BPM測定（タップテンポ）
  // ==========================================
  const bpmValueEl = document.getElementById("bpm-value");
  const bpmInstantEl = document.getElementById("bpm-instant");
  const bpmIntervalEl = document.getElementById("bpm-interval");
  const bpmCountEl = document.getElementById("bpm-count");
  const bpmIndicatorEl = document.getElementById("bpm-indicator");
  const bpmTapBtn = document.getElementById("bpm-tap-btn");
  const bpmResetBtn = document.getElementById("bpm-reset-btn");
  const bpmAutoResetCheck = document.getElementById("bpm-auto-reset");

  let tapTimes = [];
  let flashTimer = null;

  function resetBpm() {
    tapTimes = [];
    bpmValueEl.textContent = "---";
    bpmInstantEl.textContent = "---";
    bpmIntervalEl.textContent = "--- ms";
    bpmCountEl.textContent = "0";
  }

  function triggerBpmTap() {
    const now = performance.now();

    if (bpmAutoResetCheck.checked && tapTimes.length > 0) {
      if (now - tapTimes[tapTimes.length - 1] > 2000) {
        tapTimes = [];
      }
    }

    tapTimes.push(now);

    bpmIndicatorEl.classList.add("flash");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => bpmIndicatorEl.classList.remove("flash"), 90);

    bpmCountEl.textContent = String(tapTimes.length);

    if (tapTimes.length >= 2) {
      const lastDiff = tapTimes[tapTimes.length - 1] - tapTimes[tapTimes.length - 2];
      const instantBpm = 60000 / lastDiff;

      const totalSpan = tapTimes[tapTimes.length - 1] - tapTimes[0];
      const avgInterval = totalSpan / (tapTimes.length - 1);
      const avgBpm = 60000 / avgInterval;

      bpmValueEl.textContent = avgBpm.toFixed(1);
      bpmInstantEl.textContent = instantBpm.toFixed(1);
      bpmIntervalEl.textContent = `${Math.round(avgInterval)} ms`;
    } else {
      bpmValueEl.textContent = "計測中...";
    }
  }

  bpmTapBtn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    triggerBpmTap();
  });

  bpmResetBtn.addEventListener("click", resetBpm);

  document.addEventListener("keydown", (e) => {
    if (currentTool !== "bpm") return;
    if (e.repeat) return;

    if (e.code === "Space") {
      e.preventDefault();
      bpmTapBtn.classList.add("pressed");
      triggerBpmTap();
    } else if (e.key === "r" || e.key === "R" || e.key === "Escape") {
      e.preventDefault();
      resetBpm();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      bpmTapBtn.classList.remove("pressed");
    }
  });

  // ==========================================
  // 7. 2・8・10・16進数変換
  // ==========================================
  const baseInputs = {
    bin: document.getElementById("base-bin"),
    oct: document.getElementById("base-oct"),
    dec: document.getElementById("base-dec"),
    hex: document.getElementById("base-hex")
  };
  const baseErrorEl = document.getElementById("base-error");
  const baseClearBtn = document.getElementById("base-clear-btn");
  const baseRefBody = document.querySelector("#base-ref-table tbody");

  for (let i = 0; i <= 15; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i}</td>
      <td>${i.toString(16).toUpperCase()}</td>
      <td>${i.toString(2).padStart(4, "0")}</td>
      <td>${i.toString(8)}</td>
    `;
    baseRefBody.appendChild(tr);
  }

  function parseBigIntByRadix(str, radix) {
    const validChars = {
      2: /^[01]+$/,
      8: /^[0-7]+$/,
      10: /^[0-9]+$/,
      16: /^[0-9a-fA-F]+$/
    }[radix];
    if (!validChars.test(str)) return null;

    let result = 0n;
    const base = BigInt(radix);
    for (const ch of str) {
      const digit = BigInt(parseInt(ch, radix));
      result = result * base + digit;
    }
    return result;
  }

  function handleBaseInput(sourceKey) {
    let raw = baseInputs[sourceKey].value.trim().replace(/\s+/g, "");
    if (sourceKey === "hex") raw = raw.replace(/^0x/i, "");
    if (sourceKey === "bin") raw = raw.replace(/^0b/i, "");
    if (sourceKey === "oct") raw = raw.replace(/^0o/i, "");

    if (raw === "") {
      Object.entries(baseInputs).forEach(([k, el]) => {
        if (k !== sourceKey) el.value = "";
      });
      baseErrorEl.textContent = "";
      return;
    }

    const radixMap = { bin: 2, oct: 8, dec: 10, hex: 16 };
    const val = parseBigIntByRadix(raw, radixMap[sourceKey]);

    if (val === null) {
      baseErrorEl.textContent = "その進数で使えない文字が含まれています。";
      return;
    }

    baseErrorEl.textContent = "";
    if (sourceKey !== "bin") baseInputs.bin.value = val.toString(2);
    if (sourceKey !== "oct") baseInputs.oct.value = val.toString(8);
    if (sourceKey !== "dec") baseInputs.dec.value = val.toString(10);
    if (sourceKey !== "hex") baseInputs.hex.value = val.toString(16).toUpperCase();
  }

  Object.keys(baseInputs).forEach((key) => {
    baseInputs[key].addEventListener("input", () => handleBaseInput(key));
  });

  baseClearBtn.addEventListener("click", () => {
    Object.values(baseInputs).forEach((el) => (el.value = ""));
    baseErrorEl.textContent = "";
  });

  // ==========================================
  // 8. LED 電流制限抵抗計算
  // ==========================================
  const ledVccEl = document.getElementById("led-vcc");
  const ledVfEl = document.getElementById("led-vf");
  const ledIfEl = document.getElementById("led-if");
  const ledCountEl = document.getElementById("led-count");
  const ledResOhmEl = document.getElementById("led-res-ohm");
  const ledResE24El = document.getElementById("led-res-e24");
  const ledResWattEl = document.getElementById("led-res-watt");
  const ledErrorEl = document.getElementById("led-error");
  const ledClearBtn = document.getElementById("led-clear-btn");

  const e24Bases = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

  function findNearestE24(ohms) {
    if (ohms <= 0 || !Number.isFinite(ohms)) return "---";
    const exp = Math.floor(Math.log10(ohms));
    let best = ohms;
    let minDiff = Infinity;
    for (let e = exp - 1; e <= exp + 1; e++) {
      const mult = Math.pow(10, e);
      for (const b of e24Bases) {
        const candidate = b * mult;
        const diff = Math.abs(candidate - ohms);
        if (diff < minDiff) {
          minDiff = diff;
          best = candidate;
        }
      }
    }
    const rounded = Math.round(best * 100) / 100;
    return rounded >= 1000 ? `${(rounded / 1000).toFixed(2)} kΩ (${rounded} Ω)` : `${rounded} Ω`;
  }

  function resetLedResults() {
    ledResOhmEl.textContent = "--- Ω";
    ledResE24El.textContent = "---";
    ledResWattEl.textContent = "--- mW";
  }

  function calculateLedResistor() {
    const vcc = parseFloat(ledVccEl.value);
    const vf = parseFloat(ledVfEl.value);
    const ifMa = parseFloat(ledIfEl.value);
    const countRaw = parseInt(ledCountEl.value, 10);
    const count = ledCountEl.value.trim() === "" ? 1 : countRaw;

    if (Number.isNaN(vcc) || Number.isNaN(vf) || Number.isNaN(ifMa)) {
      resetLedResults();
      ledErrorEl.textContent = "";
      return;
    }

    if (vcc <= 0 || vf < 0 || ifMa <= 0 || Number.isNaN(count) || count < 1) {
      resetLedResults();
      ledErrorEl.textContent = "電源電圧・電流・個数は正の数値を入力してください（Vfは0以上）。";
      return;
    }

    const vDrop = vcc - vf * count;
    if (vDrop <= 0) {
      ledResOhmEl.textContent = "点灯不可";
      ledResE24El.textContent = "---";
      ledResWattEl.textContent = "--- mW";
      ledErrorEl.textContent = `電源電圧 (${vcc}V) がLEDの合計順方向電圧 (${(vf * count).toFixed(2)}V) 以下です。`;
      return;
    }

    ledErrorEl.textContent = "";
    const currentA = ifMa / 1000;
    const r = vDrop / currentA;
    const wattMw = vDrop * ifMa;

    ledResOhmEl.textContent = r >= 1000 ? `${(r / 1000).toFixed(3)} kΩ (${r.toFixed(1)} Ω)` : `${r.toFixed(1)} Ω`;
    ledResE24El.textContent = findNearestE24(r);
    ledResWattEl.textContent = `${wattMw.toFixed(1)} mW`;
  }

  [ledVccEl, ledVfEl, ledIfEl, ledCountEl].forEach((el) => {
    el.addEventListener("input", calculateLedResistor);
  });

  document.querySelectorAll(".led-vcc-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      ledVccEl.value = btn.dataset.vcc;
      calculateLedResistor();
    });
  });

  document.querySelectorAll(".led-vf-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      ledVfEl.value = btn.dataset.vf;
      calculateLedResistor();
    });
  });

  ledClearBtn.addEventListener("click", () => {
    ledVccEl.value = "";
    ledVfEl.value = "";
    ledIfEl.value = "";
    ledCountEl.value = "1";
    calculateLedResistor();
  });

  // ==========================================
  // 9. RCフィルター計算（3値のうち2入力で自動算出）
  // ==========================================
  const rcFields = {
    r: { input: document.getElementById("rc-r"), unit: document.getElementById("rc-r-unit") },
    c: { input: document.getElementById("rc-c"), unit: document.getElementById("rc-c-unit") },
    fc: { input: document.getElementById("rc-fc"), unit: document.getElementById("rc-fc-unit") }
  };
  const rcTauEl = document.getElementById("rc-tau");
  const rcClearBtn = document.getElementById("rc-clear-btn");

  let rcEditedOrder = [];

  function formatTau(sec) {
    if (!Number.isFinite(sec) || sec <= 0) return "---";
    if (sec >= 1) return `${sec.toPrecision(4)} s`;
    if (sec >= 1e-3) return `${(sec * 1e3).toPrecision(4)} ms`;
    if (sec >= 1e-6) return `${(sec * 1e6).toPrecision(4)} μs`;
    return `${(sec * 1e9).toPrecision(4)} ns`;
  }

  function updateRcFilter() {
    rcEditedOrder = rcEditedOrder.filter((k) => {
      const v = parseFloat(rcFields[k].input.value);
      return !Number.isNaN(v) && v > 0;
    });

    Object.values(rcFields).forEach((f) => f.input.classList.remove("computed"));

    if (rcEditedOrder.length < 2) {
      rcTauEl.textContent = "---";
      return;
    }

    const [k1, k2] = rcEditedOrder.slice(-2);
    const targetKey = ["r", "c", "fc"].find((k) => k !== k1 && k !== k2);

    const getBaseVal = (k) => parseFloat(rcFields[k].input.value) * parseFloat(rcFields[k].unit.value);
    const setScaledVal = (k, baseVal) => {
      const scaled = baseVal / parseFloat(rcFields[k].unit.value);
      rcFields[k].input.value = String(Number(scaled.toPrecision(5)));
      rcFields[k].input.classList.add("computed");
    };

    let rOhm, cFarad;

    if (targetKey === "fc") {
      rOhm = getBaseVal("r");
      cFarad = getBaseVal("c");
      const fcHz = 1 / (2 * Math.PI * rOhm * cFarad);
      setScaledVal("fc", fcHz);
    } else if (targetKey === "r") {
      cFarad = getBaseVal("c");
      const fcHz = getBaseVal("fc");
      rOhm = 1 / (2 * Math.PI * fcHz * cFarad);
      setScaledVal("r", rOhm);
    } else if (targetKey === "c") {
      rOhm = getBaseVal("r");
      const fcHz = getBaseVal("fc");
      cFarad = 1 / (2 * Math.PI * fcHz * rOhm);
      setScaledVal("c", cFarad);
    }

    rcTauEl.textContent = formatTau(rOhm * cFarad);
  }

  Object.keys(rcFields).forEach((key) => {
    rcFields[key].input.addEventListener("input", () => {
      rcEditedOrder = rcEditedOrder.filter((k) => k !== key);
      rcEditedOrder.push(key);
      if (rcEditedOrder.length > 2) rcEditedOrder.shift();
      updateRcFilter();
    });

    rcFields[key].unit.addEventListener("change", () => {
      updateRcFilter();
    });
  });

  rcClearBtn.addEventListener("click", () => {
    rcEditedOrder = [];
    Object.values(rcFields).forEach((f) => {
      f.input.value = "";
      f.input.classList.remove("computed");
    });
    rcTauEl.textContent = "---";
  });

  // ==========================================
  // 10. 複数動画同時再生
  // ==========================================
  const mvFileInput = document.getElementById("mv-file-input");
  const mvClearAllBtn = document.getElementById("mv-clear-all-btn");
  const mvPlayAllBtn = document.getElementById("mv-play-all");
  const mvPauseAllBtn = document.getElementById("mv-pause-all");
  const mvSyncBtn = document.getElementById("mv-sync-btn");
  const mvSpeedSelect = document.getElementById("mv-speed-select");
  const mvColsSelect = document.getElementById("mv-cols-select");
  const mvGrid = document.getElementById("mv-grid");
  const mvEmptyMsg = document.getElementById("mv-empty-msg");

  let mvItems = [];

  function updateMvEmptyState() {
    mvEmptyMsg.classList.toggle("hidden", mvItems.length > 0);
  }

  function pauseAllMultiVideos() {
    mvItems.forEach((item) => item.video.pause());
  }

  mvFileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const speed = parseFloat(mvSpeedSelect.value) || 1;

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const card = document.createElement("div");
      card.className = "mv-item";

      const header = document.createElement("div");
      header.className = "mv-item-header";

      const title = document.createElement("span");
      title.className = "mv-title";
      title.textContent = file.name;
      title.title = file.name;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "mini-btn";
      removeBtn.textContent = "削除";

      header.append(title, removeBtn);

      const video = document.createElement("video");
      video.className = "mv-video";
      video.src = url;
      video.controls = true;
      video.playsInline = true;
      video.playbackRate = speed;

      const controls = document.createElement("div");
      controls.className = "mv-item-controls";
      controls.innerHTML = `
        <div>
          <button type="button" class="mini-btn mv-step-back" title="約1フレーム戻す">-0.03s</button>
          <button type="button" class="mini-btn mv-step-fwd" title="約1フレーム進める">+0.03s</button>
        </div>
        <button type="button" class="mini-btn mv-mute-btn">🔊 音声ON</button>
      `;

      const stepBackBtn = controls.querySelector(".mv-step-back");
      const stepFwdBtn = controls.querySelector(".mv-step-fwd");
      const muteBtn = controls.querySelector(".mv-mute-btn");

      stepBackBtn.addEventListener("click", () => {
        video.pause();
        video.currentTime = Math.max(0, video.currentTime - 0.033);
      });

      stepFwdBtn.addEventListener("click", () => {
        video.pause();
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 0.033);
      });

      muteBtn.addEventListener("click", () => {
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? "🔇 ミュート" : "🔊 音声ON";
      });

      removeBtn.addEventListener("click", () => {
        video.pause();
        URL.revokeObjectURL(url);
        card.remove();
        mvItems = mvItems.filter((item) => item.url !== url);
        updateMvEmptyState();
      });

      card.append(header, video, controls);
      mvGrid.appendChild(card);
      mvItems.push({ url, card, video });
    });

    mvFileInput.value = "";
    updateMvEmptyState();
  });

  mvPlayAllBtn.addEventListener("click", () => {
    mvItems.forEach((item) => item.video.play().catch(() => {}));
  });

  mvPauseAllBtn.addEventListener("click", pauseAllMultiVideos);

  mvSyncBtn.addEventListener("click", () => {
    mvItems.forEach((item) => {
      item.video.currentTime = 0;
    });
  });

  mvSpeedSelect.addEventListener("change", () => {
    const rate = parseFloat(mvSpeedSelect.value) || 1;
    mvItems.forEach((item) => {
      item.video.playbackRate = rate;
    });
  });

  mvColsSelect.addEventListener("change", () => {
    mvGrid.classList.remove("cols-1", "cols-2");
    if (mvColsSelect.value === "1") mvGrid.classList.add("cols-1");
    if (mvColsSelect.value === "2") mvGrid.classList.add("cols-2");
  });

  mvClearAllBtn.addEventListener("click", () => {
    mvItems.forEach((item) => {
      item.video.pause();
      URL.revokeObjectURL(item.url);
      item.card.remove();
    });
    mvItems = [];
    updateMvEmptyState();
  });

  // ==========================================
  // 11. 周波数ジェネレーター（複数音同時出力・音階プリセット対応）
  // ==========================================
  const tgChannelsEl = document.getElementById("tg-channels");
  const tgAddBtn = document.getElementById("tg-add-btn");
  const tgToggleBtn = document.getElementById("tg-toggle-btn");
  const tgVolSlider = document.getElementById("tg-vol-slider");
  const tgVolVal = document.getElementById("tg-vol-val");

  let audioCtx = null;
  let masterGain = null;
  let tgPlaying = false;
  let nextChannelId = 1;
  let selectedChannelId = null;
  let tgChannels = [];

  function sliderToFreq(val) {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const freq = Math.pow(10, minLog + ((maxLog - minLog) * val) / 1000);
    return Math.round(freq * 10) / 10;
  }

  function freqToSlider(freq) {
    const clamped = Math.min(20000, Math.max(20, freq));
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    return Math.round(((Math.log10(clamped) - minLog) / (maxLog - minLog)) * 1000);
  }

  function syncAudioNodes() {
    if (!tgPlaying || !audioCtx || !masterGain) return;
    const activeCount = tgChannels.filter((c) => c.enabled).length;
    const perGain = activeCount > 0 ? 1 / activeCount : 0;

    tgChannels.forEach((ch) => {
      if (ch.enabled) {
        if (!ch.osc) {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = ch.wave;
          osc.frequency.setValueAtTime(ch.freq, audioCtx.currentTime);
          g.gain.setValueAtTime(perGain, audioCtx.currentTime);
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          ch.osc = osc;
          ch.gain = g;
        } else {
          ch.osc.type = ch.wave;
          ch.osc.frequency.setValueAtTime(ch.freq, audioCtx.currentTime);
          ch.gain.gain.setValueAtTime(perGain, audioCtx.currentTime);
        }
      } else if (ch.osc) {
        ch.osc.stop();
        ch.osc.disconnect();
        ch.osc = null;
        ch.gain = null;
      }
    });
  }

  function stopAllToneGen() {
    stopTgSweep();
    tgChannels.forEach((ch) => {
      if (ch.osc) {
        ch.osc.stop();
        ch.osc.disconnect();
        ch.osc = null;
        ch.gain = null;
      }
    });
    tgPlaying = false;
    tgToggleBtn.textContent = "▶ すべて再生";
  }

  function updateTgSelectionUI() {
    const cards = tgChannelsEl.querySelectorAll(".tg-channel-card");
    cards.forEach((card, idx) => {
      const ch = tgChannels[idx];
      if (!ch) return;
      const isSelected = ch.id === selectedChannelId;
      card.classList.toggle("selected", isSelected);
      const titleEl = card.querySelector(".tg-ch-title");
      if (titleEl) {
        titleEl.textContent = `音 ${idx + 1} ${isSelected ? "（選択中）" : ""}`;
      }
    });
  }

  function renderTgChannels() {
    tgChannelsEl.innerHTML = "";
    tgChannels.forEach((ch, idx) => {
      const card = document.createElement("div");
      card.className = "tg-channel-card" + (ch.id === selectedChannelId ? " selected" : "");

      card.innerHTML = `
        <div class="tg-ch-top">
          <span class="tg-ch-title">音 ${idx + 1} ${ch.id === selectedChannelId ? "（選択中）" : ""}</span>
          <div class="header-controls">
            <button type="button" class="mini-btn ch-mute-btn">${ch.enabled ? "🔊 ON" : "🔇 ミュート"}</button>
            ${tgChannels.length > 1 ? '<button type="button" class="mini-btn ch-del-btn">削除</button>' : ""}
          </div>
        </div>
        <div class="tg-ch-controls">
          <div class="tg-freq-box">
            <input type="number" class="tg-freq-num ch-freq-input" min="1" max="22000" step="0.01" value="${ch.freq}">
            <span>Hz</span>
          </div>
          <input type="range" class="tg-slider tg-ch-slider ch-slider" min="0" max="1000" value="${freqToSlider(ch.freq)}">
          <select class="unit-select ch-wave-select">
            <option value="sine" ${ch.wave === "sine" ? "selected" : ""}>正弦波 (Sine)</option>
            <option value="square" ${ch.wave === "square" ? "selected" : ""}>矩形波 (Square)</option>
            <option value="triangle" ${ch.wave === "triangle" ? "selected" : ""}>三角波 (Triangle)</option>
            <option value="sawtooth" ${ch.wave === "sawtooth" ? "selected" : ""}>ノコギリ波 (Saw)</option>
          </select>
        </div>
      `;

      card.addEventListener("pointerdown", () => {
        if (selectedChannelId !== ch.id) {
          selectedChannelId = ch.id;
          updateTgSelectionUI();
        }
      });

      const freqInput = card.querySelector(".ch-freq-input");
      const sliderInput = card.querySelector(".ch-slider");
      const waveSelect = card.querySelector(".ch-wave-select");
      const muteBtn = card.querySelector(".ch-mute-btn");
      const delBtn = card.querySelector(".ch-del-btn");

      freqInput.addEventListener("input", () => {
        ch.freq = Math.min(22000, Math.max(1, parseFloat(freqInput.value) || 440));
        sliderInput.value = freqToSlider(ch.freq);
        syncAudioNodes();
      });

      sliderInput.addEventListener("input", () => {
        ch.freq = sliderToFreq(Number(sliderInput.value));
        freqInput.value = ch.freq;
        syncAudioNodes();
      });

      waveSelect.addEventListener("change", () => {
        ch.wave = waveSelect.value;
        syncAudioNodes();
      });

      muteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        ch.enabled = !ch.enabled;
        muteBtn.textContent = ch.enabled ? "🔊 ON" : "🔇 ミュート";
        syncAudioNodes();
      });

      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (ch.osc) {
            ch.osc.stop();
            ch.osc.disconnect();
          }
          tgChannels = tgChannels.filter((item) => item.id !== ch.id);
          if (selectedChannelId === ch.id && tgChannels.length > 0) {
            selectedChannelId = tgChannels[0].id;
          }
          renderTgChannels();
          syncAudioNodes();
        });
      }

      tgChannelsEl.appendChild(card);
    });
  }

  function addTgChannel(freq = 440, wave = "sine") {
    const id = nextChannelId++;
    tgChannels.push({ id, freq, wave, enabled: true, osc: null, gain: null });
    selectedChannelId = id;
    renderTgChannels();
    syncAudioNodes();
  }

  addTgChannel(440, "sine");

  tgAddBtn.addEventListener("click", () => {
    const defaultNotes = [440, 523.25, 659.25, 783.99];
    const freq = defaultNotes[tgChannels.length % defaultNotes.length];
    addTgChannel(freq, "sine");
  });

  document.querySelectorAll(".tg-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = tgChannels.find((c) => c.id === selectedChannelId) || tgChannels[0];
      if (!target) return;
      target.freq = parseFloat(btn.dataset.freq);
      renderTgChannels();
      syncAudioNodes();
    });
  });

  tgVolSlider.addEventListener("input", () => {
    const pct = Number(tgVolSlider.value);
    tgVolVal.textContent = `${pct}%`;
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(pct / 100, audioCtx.currentTime);
    }
  });

  function startToneGen() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    masterGain.gain.setValueAtTime(Number(tgVolSlider.value) / 100, audioCtx.currentTime);
    tgPlaying = true;
    syncAudioNodes();
    tgToggleBtn.textContent = "⏹ すべて停止";
  }

  tgToggleBtn.addEventListener("click", () => {
    if (!tgPlaying) {
      startToneGen();
    } else {
      stopAllToneGen();
    }
  });

  // --- スイープ機能 ---
  const tgSweepBtn = document.getElementById("tg-sweep-btn");
  const tgSweepStartInput = document.getElementById("tg-sweep-start");
  const tgSweepEndInput = document.getElementById("tg-sweep-end");
  const tgSweepDurInput = document.getElementById("tg-sweep-dur");
  const tgSweepCurveSelect = document.getElementById("tg-sweep-curve");
  const tgSweepModeSelect = document.getElementById("tg-sweep-mode");
  const tgSweepStatusEl = document.getElementById("tg-sweep-status");
  const tgSweepBarEl = document.getElementById("tg-sweep-bar");

  let tgSweepTimer = null;
  let tgSweepStartTime = 0;

  function stopTgSweep(statusText = "待機中") {
    if (tgSweepTimer !== null) {
      clearInterval(tgSweepTimer);
      tgSweepTimer = null;
    }
    tgSweepBtn.textContent = "▶ スイープ開始";
    tgSweepStatusEl.textContent = statusText;
    if (statusText === "待機中") {
      tgSweepBarEl.style.width = "0%";
    }
  }

  function applySweepFreqToSelected(freq) {
    const idx = tgChannels.findIndex((c) => c.id === selectedChannelId);
    const targetIdx = idx >= 0 ? idx : 0;
    const target = tgChannels[targetIdx];
    if (!target) return;

    target.freq = freq;
    if (target.osc && audioCtx) {
      target.osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    }
    const card = tgChannelsEl.children[targetIdx];
    if (card) {
      const freqInput = card.querySelector(".ch-freq-input");
      const sliderInput = card.querySelector(".ch-slider");
      if (freqInput && document.activeElement !== freqInput) {
        freqInput.value = freq;
      }
      if (sliderInput) {
        sliderInput.value = freqToSlider(freq);
      }
    }
  }

  function startTgSweep() {
    const fStart = Math.min(22000, Math.max(1, parseFloat(tgSweepStartInput.value) || 100));
    const fEnd = Math.min(22000, Math.max(1, parseFloat(tgSweepEndInput.value) || 2000));
    const durSec = Math.max(0.1, parseFloat(tgSweepDurInput.value) || 5);
    const curve = tgSweepCurveSelect.value;
    const mode = tgSweepModeSelect.value;

    tgSweepStartInput.value = fStart;
    tgSweepEndInput.value = fEnd;
    tgSweepDurInput.value = durSec;

    const target = tgChannels.find((c) => c.id === selectedChannelId) || tgChannels[0];
    if (target && !target.enabled) {
      target.enabled = true;
      renderTgChannels();
    }
    if (!tgPlaying) {
      startToneGen();
    } else {
      syncAudioNodes();
    }

    tgSweepStartTime = performance.now();
    tgSweepBtn.textContent = "⏹ スイープ停止";

    const updateSweep = () => {
      const elapsedSec = (performance.now() - tgSweepStartTime) / 1000;
      let progress = 0;
      let finished = false;

      if (mode === "once") {
        progress = Math.min(1, elapsedSec / durSec);
        if (progress >= 1) finished = true;
      } else if (mode === "loop") {
        progress = (elapsedSec % durSec) / durSec;
      } else {
        const cycle = (elapsedSec % (durSec * 2)) / durSec;
        progress = cycle <= 1 ? cycle : 2 - cycle;
      }

      let freq;
      if (curve === "log") {
        freq = fStart * Math.pow(fEnd / fStart, progress);
      } else {
        freq = fStart + (fEnd - fStart) * progress;
      }
      freq = Math.round(freq * 10) / 10;

      applySweepFreqToSelected(freq);
      tgSweepBarEl.style.width = `${(progress * 100).toFixed(1)}%`;

      if (finished) {
        stopTgSweep(`完了 (${freq.toFixed(1)} Hz)`);
      } else {
        tgSweepStatusEl.textContent = `${freq.toFixed(1)} Hz (${Math.round(progress * 100)}%)`;
      }
    };

    updateSweep();
    tgSweepTimer = setInterval(updateSweep, 20);
  }

  tgSweepBtn.addEventListener("click", () => {
    if (tgSweepTimer !== null) {
      stopTgSweep();
    } else {
      startTgSweep();
    }
  });

  // ==========================================
  // 12. キーボード・マウス動作確認（ポーリングレート計測付き）
  // ==========================================
  const kbVisualEl = document.getElementById("kb-visual");
  const kmPreventCheck = document.getElementById("km-prevent-default");
  const kmActiveCountEl = document.getElementById("km-active-count");
  const kmTestedCountEl = document.getElementById("km-tested-count");
  const kmLastKeyEl = document.getElementById("km-last-key");
  const kmLastIntervalEl = document.getElementById("km-last-interval");
  const kmHistoryEl = document.getElementById("km-history");
  const kmClearBtn = document.getElementById("km-clear-btn");

  const kmMousePad = document.getElementById("km-mouse-pad");
  const kmMousePosEl = document.getElementById("km-mouse-pos");
  const kmWheelCountEl = document.getElementById("km-wheel-count");
  const kmMouseHzEl = document.getElementById("km-mouse-hz");
  const kmMouseMaxHzEl = document.getElementById("km-mouse-max-hz");
  const mbtnWheelEl = document.getElementById("mbtn-wheel");

  const kbLayoutRows = [
    [
      { code: "Escape", label: "Esc", w: 1.2 }, { spacer: 0.5 },
      { code: "F1", label: "F1" }, { code: "F2", label: "F2" }, { code: "F3", label: "F3" }, { code: "F4", label: "F4" }, { spacer: 0.3 },
      { code: "F5", label: "F5" }, { code: "F6", label: "F6" }, { code: "F7", label: "F7" }, { code: "F8", label: "F8" }, { spacer: 0.3 },
      { code: "F9", label: "F9" }, { code: "F10", label: "F10" }, { code: "F11", label: "F11" }, { code: "F12", label: "F12" }, { spacer: 0.3 },
      { code: "PrintScreen", label: "PrtSc" }, { code: "ScrollLock", label: "ScrLk" }, { code: "Pause", label: "Pause" }
    ],
    [
      { code: "Backquote", label: "半/全" },
      { code: "Digit1", label: "1" }, { code: "Digit2", label: "2" }, { code: "Digit3", label: "3" }, { code: "Digit4", label: "4" },
      { code: "Digit5", label: "5" }, { code: "Digit6", label: "6" }, { code: "Digit7", label: "7" }, { code: "Digit8", label: "8" },
      { code: "Digit9", label: "9" }, { code: "Digit0", label: "0" }, { code: "Minus", label: "-" }, { code: "Equal", label: "^ / =" },
      { code: "IntlYen", label: "¥" }, { code: "Backspace", label: "BS", w: 1.6 }, { spacer: 0.3 },
      { code: "Insert", label: "Ins" }, { code: "Home", label: "Home" }, { code: "PageUp", label: "PgUp" }
    ],
    [
      { code: "Tab", label: "Tab", w: 1.4 },
      { code: "KeyQ", label: "Q" }, { code: "KeyW", label: "W" }, { code: "KeyE", label: "E" }, { code: "KeyR", label: "R" },
      { code: "KeyT", label: "T" }, { code: "KeyY", label: "Y" }, { code: "KeyU", label: "U" }, { code: "KeyI", label: "I" },
      { code: "KeyO", label: "O" }, { code: "KeyP", label: "P" }, { code: "BracketLeft", label: "@ / [" }, { code: "BracketRight", label: "[ / ]" },
      { code: "Enter", label: "Enter", w: 1.6 }, { spacer: 0.3 },
      { code: "Delete", label: "Del" }, { code: "End", label: "End" }, { code: "PageDown", label: "PgDn" }
    ],
    [
      { code: "CapsLock", label: "Caps", w: 1.7 },
      { code: "KeyA", label: "A" }, { code: "KeyS", label: "S" }, { code: "KeyD", label: "D" }, { code: "KeyF", label: "F" },
      { code: "KeyG", label: "G" }, { code: "KeyH", label: "H" }, { code: "KeyJ", label: "J" }, { code: "KeyK", label: "K" },
      { code: "KeyL", label: "L" }, { code: "Semicolon", label: ";" }, { code: "Quote", label: ": / '" }, { code: "Backslash", label: "] / \\" },
      { spacer: 1.3 }, { spacer: 0.3 }, { spacer: 3.1 }
    ],
    [
      { code: "ShiftLeft", label: "Shift", w: 2.1 },
      { code: "KeyZ", label: "Z" }, { code: "KeyX", label: "X" }, { code: "KeyC", label: "C" }, { code: "KeyV", label: "V" },
      { code: "KeyB", label: "B" }, { code: "KeyN", label: "N" }, { code: "KeyM", label: "M" }, { code: "Comma", label: "," },
      { code: "Period", label: "." }, { code: "Slash", label: "/" }, { code: "IntlRo", label: "ろ" },
      { code: "ShiftRight", label: "R-Shift", w: 1.9 }, { spacer: 0.3 },
      { spacer: 1 }, { code: "ArrowUp", label: "↑" }, { spacer: 1 }
    ],
    [
      { code: "ControlLeft", label: "Ctrl", w: 1.3 }, { code: "MetaLeft", label: "Win", w: 1.2 }, { code: "AltLeft", label: "Alt", w: 1.2 },
      { code: "NonConvert", label: "無変換", w: 1.3 }, { code: "Space", label: "Space", w: 4.2 }, { code: "Convert", label: "変換", w: 1.3 },
      { code: "KanaMode", label: "かな", w: 1.2 }, { code: "AltRight", label: "Alt", w: 1.1 }, { code: "ContextMenu", label: "Menu", w: 1.1 },
      { code: "ControlRight", label: "Ctrl", w: 1.3 }, { spacer: 0.3 },
      { code: "ArrowLeft", label: "←" }, { code: "ArrowDown", label: "↓" }, { code: "ArrowRight", label: "→" }
    ]
  ];

  const keyDomMap = new Map();
  kbLayoutRows.forEach((row) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "kb-row";
    row.forEach((item) => {
      const kDiv = document.createElement("div");
      if (item.spacer) {
        kDiv.className = "kb-key spacer";
        kDiv.style.setProperty("--w", item.spacer);
      } else {
        kDiv.className = "kb-key";
        kDiv.style.setProperty("--w", item.w || 1);
        kDiv.textContent = item.label;
        kDiv.title = item.code;
        keyDomMap.set(item.code, kDiv);
      }
      rowDiv.appendChild(kDiv);
    });
    kbVisualEl.appendChild(rowDiv);
  });

  const activeKeyCodes = new Set();
  const testedKeyCodes = new Set();
  const lastKeyDownTime = new Map();
  let wheelTotal = 0;

  function normalizeKeyCode(e) {
    if (e.code === "ShiftRight" || (e.key === "Shift" && e.location === 2)) return "ShiftRight";
    if (e.code === "ControlRight" || (e.key === "Control" && e.location === 2)) return "ControlRight";
    if (e.code === "AltRight" || (e.key === "Alt" && e.location === 2)) return "AltRight";
    if (
      e.code === "CapsLock" ||
      e.key === "CapsLock" ||
      e.key === "Alphanumeric" ||
      e.keyCode === 20 ||
      e.keyCode === 240
    ) {
      return "CapsLock";
    }
    if (e.code === "PrintScreen" || e.key === "PrintScreen" || e.keyCode === 44) return "PrintScreen";
    if (e.code) return e.code;
    return e.key;
  }

  function updateKeyCounts() {
    kmActiveCountEl.textContent = String(activeKeyCodes.size);
    kmTestedCountEl.textContent = String(testedKeyCodes.size);
  }

  function recordKeyPress(e, code) {
    const now = performance.now();
    const displayKey = e.key === " " ? "Space" : e.key;

    activeKeyCodes.add(code);
    testedKeyCodes.add(code);
    updateKeyCounts();

    const keyEl = keyDomMap.get(code);
    if (keyEl) {
      keyEl.classList.add("active", "tested");
    }

    kmLastKeyEl.textContent = `${displayKey} (${code})`;

    if (lastKeyDownTime.has(code)) {
      const diff = now - lastKeyDownTime.get(code);
      kmLastIntervalEl.textContent = `${diff.toFixed(1)} ms`;
    } else {
      kmLastIntervalEl.textContent = "初回";
    }
    lastKeyDownTime.set(code, now);

    const chip = document.createElement("span");
    chip.className = "key-hist-chip";
    chip.textContent = `${displayKey} [${code}]`;
    kmHistoryEl.prepend(chip);
    if (kmHistoryEl.children.length > 40) {
      kmHistoryEl.lastChild.remove();
    }
  }

  function releaseKey(code) {
    activeKeyCodes.delete(code);
    updateKeyCounts();
    const keyEl = keyDomMap.get(code);
    if (keyEl) {
      keyEl.classList.remove("active");
    }
  }

  window.addEventListener("keydown", (e) => {
    if (currentTool !== "keymouse") return;
    if (kmPreventCheck.checked) e.preventDefault();
    if (e.repeat) return;

    const code = normalizeKeyCode(e);
    recordKeyPress(e, code);

    if (code === "CapsLock") {
      setTimeout(() => releaseKey("CapsLock"), 160);
    }
  }, true);

  window.addEventListener("keyup", (e) => {
    if (currentTool !== "keymouse") return;
    if (kmPreventCheck.checked) e.preventDefault();

    const code = normalizeKeyCode(e);

    if (!activeKeyCodes.has(code)) {
      recordKeyPress(e, code);
      setTimeout(() => releaseKey(code), 160);
      return;
    }

    releaseKey(code);
  }, true);

  function clearActiveKeyMouse() {
    activeKeyCodes.forEach((code) => {
      const keyEl = keyDomMap.get(code);
      if (keyEl) keyEl.classList.remove("active");
    });
    activeKeyCodes.clear();
    updateKeyCounts();
    document.querySelectorAll(".mouse-btn-item, .m-part").forEach((el) => el.classList.remove("active"));
  }

  window.addEventListener("blur", clearActiveKeyMouse);

  let lastMouseTs = 0;
  let mouseIntervals = [];
  let maxMouseHz = 0;
  let mouseIdleTimer = null;

  kmMousePad.addEventListener("pointermove", (e) => {
    const rect = kmMousePad.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    kmMousePosEl.textContent = `X: ${x}, Y: ${y}`;

    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      const ts = ev.timeStamp;
      if (lastMouseTs > 0) {
        const diff = ts - lastMouseTs;
        if (diff >= 0.1 && diff <= 50) {
          mouseIntervals.push(diff);
          if (mouseIntervals.length > 60) mouseIntervals.shift();
        }
      }
      lastMouseTs = ts;
    }

    const hz = calcMedianHz(mouseIntervals);
    if (hz) {
      kmMouseHzEl.textContent = `${hz} Hz`;
      if (hz > maxMouseHz) {
        maxMouseHz = hz;
        kmMouseMaxHzEl.textContent = `${maxMouseHz} Hz`;
      }
    }

    clearTimeout(mouseIdleTimer);
    mouseIdleTimer = setTimeout(() => {
      kmMouseHzEl.textContent = "待機中";
      lastMouseTs = 0;
      mouseIntervals = [];
    }, 400);
  });

  kmMousePad.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const box = document.getElementById(`mbtn-${e.button}`);
    const svgPart = document.getElementById(`msvg-${e.button}`);
    if (box) box.classList.add("active", "tested");
    if (svgPart) svgPart.classList.add("active", "tested");
  });

  document.addEventListener("mouseup", (e) => {
    if (currentTool === "keymouse" && (e.button === 3 || e.button === 4)) {
      e.preventDefault();
    }
    const box = document.getElementById(`mbtn-${e.button}`);
    const svgPart = document.getElementById(`msvg-${e.button}`);
    if (box) box.classList.remove("active");
    if (svgPart) svgPart.classList.remove("active");
  });

  kmMousePad.addEventListener("auxclick", (e) => e.preventDefault());
  kmMousePad.addEventListener("contextmenu", (e) => e.preventDefault());

  kmMousePad.addEventListener("wheel", (e) => {
    e.preventDefault();
    wheelTotal += Math.round(e.deltaY);
    kmWheelCountEl.textContent = String(wheelTotal);
    mbtnWheelEl.textContent = e.deltaY < 0 ? "ホイール: ↑ 上回転" : "ホイール: ↓ 下回転";
    mbtnWheelEl.classList.add("active", "tested");
    const wheelSvg = document.getElementById("msvg-1");
    if (wheelSvg) wheelSvg.classList.add("tested");

    clearTimeout(mbtnWheelEl._timer);
    mbtnWheelEl._timer = setTimeout(() => {
      mbtnWheelEl.classList.remove("active");
    }, 180);
  }, { passive: false });

  kmClearBtn.addEventListener("click", () => {
    activeKeyCodes.clear();
    testedKeyCodes.clear();
    lastKeyDownTime.clear();
    keyDomMap.forEach((el) => el.classList.remove("active", "tested"));
    document.querySelectorAll(".mouse-btn-item, .m-part").forEach((el) => el.classList.remove("active", "tested"));
    updateKeyCounts();
    kmHistoryEl.innerHTML = "";
    kmLastKeyEl.textContent = "---";
    kmLastIntervalEl.textContent = "--- ms";
    wheelTotal = 0;
    kmWheelCountEl.textContent = "0";
    mbtnWheelEl.textContent = "ホイール: 待機中";
    maxMouseHz = 0;
    mouseIntervals = [];
    lastMouseTs = 0;
    kmMouseHzEl.textContent = "--- Hz";
    kmMouseMaxHzEl.textContent = "--- Hz";
  });

  // ==========================================
  // 13. コントローラー動作確認（DualSenseビジュアル・ドリフト診断・ポーリングレート）
  // ==========================================
  const gpSelect = document.getElementById("gp-select");
  const gpRescanBtn = document.getElementById("gp-rescan-btn");
  const gpVibrateBtn = document.getElementById("gp-vibrate-btn");
  const gpEmptyCard = document.getElementById("gp-empty-card");
  const gpEnvStatusEl = document.getElementById("gp-env-status");
  const gpActiveArea = document.getElementById("gp-active-area");
  const gpNameEl = document.getElementById("gp-name");
  const gpHzEl = document.getElementById("gp-hz");
  const gpMaxHzEl = document.getElementById("gp-max-hz");
  const gpMappingEl = document.getElementById("gp-mapping");

  const gpTestModeCheck = document.getElementById("gp-test-mode");
  const gpResetTestBtn = document.getElementById("gp-reset-test-btn");
  const gpClearTrailBtn = document.getElementById("gp-clear-trail-btn");

  const gpL2ValEl = document.getElementById("gp-l2-val");
  const gpL2BarEl = document.getElementById("gp-l2-bar");
  const gpR2ValEl = document.getElementById("gp-r2-val");
  const gpR2BarEl = document.getElementById("gp-r2-bar");

  const gpCanvasL = document.getElementById("gp-canvas-l");
  const gpCanvasR = document.getElementById("gp-canvas-r");
  const gpStickLValEl = document.getElementById("gp-stick-l-val");
  const gpStickRValEl = document.getElementById("gp-stick-r-val");
  const gpOffsetLEl = document.getElementById("gp-offset-l");
  const gpOffsetREl = document.getElementById("gp-offset-r");
  const gpMaxLEl = document.getElementById("gp-max-l");
  const gpMaxREl = document.getElementById("gp-max-r");
  const gpDiagLEl = document.getElementById("gp-diag-l");
  const gpDiagREl = document.getElementById("gp-diag-r");

  const gpAxesGrid = document.getElementById("gp-axes-grid");
  const gpButtonsGrid = document.getElementById("gp-buttons-grid");

  const psBtnNames = [
    "B0 (× / A)", "B1 (○ / B)", "B2 (□ / X)", "B3 (△ / Y)",
    "B4 (L1)", "B5 (R1)", "B6 (L2)", "B7 (R2)",
    "B8 (Create / Share)", "B9 (Options)", "B10 (L3)", "B11 (R3)",
    "B12 (十字 上)", "B13 (十字 下)", "B14 (十字 左)", "B15 (十字 右)",
    "B16 (PS / Home)", "B17 (タッチパッド)"
  ];

  let renderedBtnCount = 0;
  let renderedAxesCount = 0;
  const gpTestedButtons = new Set();
  const rawDualSenseRyPads = new Set();

  let trailL = [];
  let trailR = [];
  let maxReachL = 0;
  let maxReachR = 0;

  function formatSigned(val) {
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(5)}`;
  }

  function getConnectedPads() {
    if (!navigator.getGamepads) return [];
    const list = navigator.getGamepads();
    const result = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i]) result.push(list[i]);
    }
    return result;
  }

  function updateGpEnvStatus(padCount) {
    const secure = window.isSecureContext ? "HTTPS/安全コンテキストOK" : "非HTTPS（API制限の可能性）";
    const api = navigator.getGamepads ? "Gamepad API対応" : "Gamepad API非対応";
    gpEnvStatusEl.textContent = `${api} / ${secure} / 現在の検出数: ${padCount}台`;
  }

  function refreshGamepadList() {
    const pads = getConnectedPads();
    updateGpEnvStatus(pads.length);
    const prevVal = gpSelect.value;

    gpSelect.innerHTML = "";
    if (pads.length === 0) {
      gpSelect.innerHTML = '<option value="">未接続（ボタンを押して認識）</option>';
      gpEmptyCard.classList.remove("hidden");
      gpActiveArea.classList.add("hidden");
      gpVibrateBtn.disabled = true;
      return;
    }

    pads.forEach((pad) => {
      const opt = document.createElement("option");
      opt.value = String(pad.index);
      opt.textContent = `[#${pad.index}] ${pad.id}`;
      gpSelect.appendChild(opt);
    });

    if (pads.some((p) => String(p.index) === prevVal)) {
      gpSelect.value = prevVal;
    }
    gpEmptyCard.classList.add("hidden");
    gpActiveArea.classList.remove("hidden");
  }

  updateGpEnvStatus(0);
  window.addEventListener("gamepadconnected", refreshGamepadList);
  window.addEventListener("gamepaddisconnected", (e) => {
    if (e.gamepad) rawDualSenseRyPads.delete(e.gamepad.index);
    refreshGamepadList();
  });
  gpRescanBtn.addEventListener("click", refreshGamepadList);
  gpSelect.addEventListener("change", () => {
    lastPadTs = 0;
    padIntervals = [];
    maxPadHz = 0;
    padIdleCount = 0;
    gpHzEl.textContent = "--- Hz";
    gpMaxHzEl.textContent = "--- Hz";
  });

  gpResetTestBtn.addEventListener("click", () => {
    gpTestedButtons.clear();
    document.querySelectorAll(".gp-svg-part").forEach((el) => el.classList.remove("tested"));
  });

  gpTestModeCheck.addEventListener("change", () => {
    if (!gpTestModeCheck.checked) {
      document.querySelectorAll(".gp-svg-part").forEach((el) => el.classList.remove("tested"));
    } else {
      gpTestedButtons.forEach((idx) => {
        const el = document.getElementById(`gpsvg-${idx}`);
        if (el) el.classList.add("tested");
      });
    }
  });

  gpClearTrailBtn.addEventListener("click", () => {
    trailL = [];
    trailR = [];
    maxReachL = 0;
    maxReachR = 0;
  });

  function drawStickCanvas(canvas, x, y, trail) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 78;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    if (trail.length > 1) {
      ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((pt, i) => {
        const px = cx + pt.x * radius;
        const py = cy + pt.y * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    const curX = cx + x * radius;
    const curY = cy + y * radius;
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateDriftDiagnosis(x, y, offsetEl, maxEl, diagEl, currentMax) {
    const dist = Math.hypot(x, y);
    const newMax = Math.max(currentMax, dist);

    offsetEl.textContent = dist.toFixed(5);
    maxEl.textContent = `${Math.min(100, newMax * 100).toFixed(1)}%`;

    if (dist < 0.10) {
      diagEl.textContent = "診断: 良好（一般的なデッドゾーン内）";
      diagEl.className = "drift-badge ok";
    } else if (dist < 0.18) {
      diagEl.textContent = "診断: わずかな中心ズレ（デッドゾーン調整推奨）";
      diagEl.className = "drift-badge warn";
    } else {
      diagEl.textContent = "診断: 中心ズレ大（ドリフトの可能性あり）";
      diagEl.className = "drift-badge bad";
    }
    return newMax;
  }

  function pollGamepads() {
    if (currentTool === "gamepad") {
      const pads = getConnectedPads();
      if (pads.length > 0 && (gpSelect.value === "" || gpSelect.options.length !== pads.length)) {
        refreshGamepadList();
      } else if (pads.length === 0 && gpSelect.value !== "") {
        refreshGamepadList();
      }

      const selectedIdx = parseInt(gpSelect.value, 10);
      const pad = pads.find((p) => p.index === selectedIdx) || pads[0];

      if (pad) {
        gpEmptyCard.classList.add("hidden");
        gpActiveArea.classList.remove("hidden");
        gpNameEl.textContent = pad.id;
        gpMappingEl.textContent = pad.mapping || "non-standard (Raw HID)";
        gpVibrateBtn.disabled = !pad.vibrationActuator;

        const lx = pad.axes[0] || 0;
        const ly = pad.axes[1] || 0;
        const rx = pad.axes[2] || 0;
        if (
          pad.mapping !== "standard" &&
          pad.axes.length >= 6 &&
          Math.abs(pad.axes[3]) > 0.8 &&
          Math.abs(pad.axes[4]) > 0.8 &&
          Math.abs(pad.axes[5]) < 0.5
        ) {
          rawDualSenseRyPads.add(pad.index);
        }
        const ry = rawDualSenseRyPads.has(pad.index) ? (pad.axes[5] || 0) : (pad.axes[3] || 0);

        const lastL = trailL[trailL.length - 1];
        if (!lastL || Math.hypot(lx - lastL.x, ly - lastL.y) > 0.005) {
          trailL.push({ x: lx, y: ly });
          if (trailL.length > 1500) trailL.shift();
        }
        const lastR = trailR[trailR.length - 1];
        if (!lastR || Math.hypot(rx - lastR.x, ry - lastR.y) > 0.005) {
          trailR.push({ x: rx, y: ry });
          if (trailR.length > 1500) trailR.shift();
        }

        drawStickCanvas(gpCanvasL, lx, ly, trailL);
        drawStickCanvas(gpCanvasR, rx, ry, trailR);

        gpStickLValEl.textContent = `X: ${formatSigned(lx)} / Y: ${formatSigned(ly)}`;
        gpStickRValEl.textContent = `X: ${formatSigned(rx)} / Y: ${formatSigned(ry)}`;

        maxReachL = updateDriftDiagnosis(lx, ly, gpOffsetLEl, gpMaxLEl, gpDiagLEl, maxReachL);
        maxReachR = updateDriftDiagnosis(rx, ry, gpOffsetREl, gpMaxREl, gpDiagREl, maxReachR);

        const l2Val = pad.buttons[6] ? pad.buttons[6].value : 0;
        const r2Val = pad.buttons[7] ? pad.buttons[7].value : 0;
        gpL2ValEl.textContent = `${(l2Val * 100).toFixed(1)}% (${l2Val.toFixed(5)})`;
        gpL2BarEl.style.width = `${l2Val * 100}%`;
        gpR2ValEl.textContent = `${(r2Val * 100).toFixed(1)}% (${r2Val.toFixed(5)})`;
        gpR2BarEl.style.width = `${r2Val * 100}%`;

        pad.buttons.forEach((btn, idx) => {
          const isPressed = btn.pressed || btn.value > 0.05;
          const svgEl = document.getElementById(`gpsvg-${idx}`);
          if (svgEl) {
            svgEl.classList.toggle("active", isPressed);
            if (isPressed) {
              gpTestedButtons.add(idx);
              if (gpTestModeCheck.checked) {
                svgEl.classList.add("tested");
              }
            }
          }
        });

        if (renderedAxesCount !== pad.axes.length) {
          renderedAxesCount = pad.axes.length;
          gpAxesGrid.innerHTML = "";
          pad.axes.forEach((_, idx) => {
            const div = document.createElement("div");
            div.className = "gp-axis-cell";
            div.innerHTML = `<span>Axis ${idx}</span><strong class="mono" id="gp-axis-val-${idx}">+0.00000</strong>`;
            gpAxesGrid.appendChild(div);
          });
        }
        pad.axes.forEach((val, idx) => {
          const el = document.getElementById(`gp-axis-val-${idx}`);
          if (el) el.textContent = formatSigned(val);
        });

        if (renderedBtnCount !== pad.buttons.length) {
          renderedBtnCount = pad.buttons.length;
          gpButtonsGrid.innerHTML = "";
          pad.buttons.forEach((_, idx) => {
            const cell = document.createElement("div");
            cell.className = "gp-btn-cell";
            cell.id = `gp-btn-cell-${idx}`;
            const label = psBtnNames[idx] || `Button ${idx}`;
            cell.innerHTML = `
              <div class="gp-btn-top">
                <span>${label}</span>
                <span class="mono" id="gp-btn-val-${idx}">0.00000</span>
              </div>
              <div class="gp-btn-bar-bg">
                <div class="gp-btn-bar-fill" id="gp-btn-bar-${idx}"></div>
              </div>
            `;
            gpButtonsGrid.appendChild(cell);
          });
        }

        pad.buttons.forEach((btn, idx) => {
          const cell = document.getElementById(`gp-btn-cell-${idx}`);
          const valEl = document.getElementById(`gp-btn-val-${idx}`);
          const barEl = document.getElementById(`gp-btn-bar-${idx}`);
          if (!cell) return;

          cell.classList.toggle("pressed", btn.pressed || btn.value > 0.05);
          valEl.textContent = btn.value.toFixed(5);
          barEl.style.width = `${btn.value * 100}%`;
        });
      }
    }
    requestAnimationFrame(pollGamepads);
  }
  requestAnimationFrame(pollGamepads);

  let lastPadTs = 0;
  let padIntervals = [];
  let maxPadHz = 0;
  let padIdleCount = 0;
  let gpHzTimerId = null;

  function sampleGamepadRate() {
    if (currentTool !== "gamepad") return;
    const pads = getConnectedPads();
    const selectedIdx = parseInt(gpSelect.value, 10);
    const pad = pads.find((p) => p.index === selectedIdx) || pads[0];
    if (!pad) return;

    if (pad.timestamp && pad.timestamp !== lastPadTs) {
      if (lastPadTs > 0) {
        const diff = pad.timestamp - lastPadTs;
        if (diff >= 0.2 && diff <= 50) {
          padIntervals.push(diff);
          if (padIntervals.length > 60) padIntervals.shift();
        }
      }
      lastPadTs = pad.timestamp;
      padIdleCount = 0;

      const hz = calcMedianHz(padIntervals);
      if (hz) {
        gpHzEl.textContent = `${hz} Hz`;
        if (hz > maxPadHz) {
          maxPadHz = hz;
          gpMaxHzEl.textContent = `${maxPadHz} Hz`;
        }
      }
    } else {
      padIdleCount++;
      if (padIdleCount > 120) {
        gpHzEl.textContent = "入力待ち";
        padIntervals = [];
        lastPadTs = 0;
      }
    }
  }

  function startGamepadHzTimer() {
    if (gpHzTimerId !== null) return;
    gpHzTimerId = setInterval(sampleGamepadRate, 4);
  }

  function stopGamepadHzTimer() {
    if (gpHzTimerId !== null) {
      clearInterval(gpHzTimerId);
      gpHzTimerId = null;
    }
  }

  gpVibrateBtn.addEventListener("click", () => {
    const pads = getConnectedPads();
    const selectedIdx = parseInt(gpSelect.value, 10);
    const pad = pads.find((p) => p.index === selectedIdx) || pads[0];
    if (pad && pad.vibrationActuator) {
      pad.vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: 400,
        weakMagnitude: 0.7,
        strongMagnitude: 0.7
      }).catch(() => {});
    }
  });

  // ==========================================
  // 14. 端末スペック表示（PC・スマホ対応）
  // ==========================================
  const specGridEl = document.getElementById("device-spec-grid");
  const deviceUaEl = document.getElementById("device-ua");
  const deviceRefreshBtn = document.getElementById("device-refresh-btn");
  const deviceCopyBtn = document.getElementById("device-copy-btn");
  let latestSpecText = "";

  function detectOS(ua) {
    if (/Windows NT 10\.0/.test(ua)) return "Windows 10 / 11";
    if (/Windows NT/.test(ua)) return "Windows";
    if (/Android/.test(ua)) {
      const m = ua.match(/Android\s([0-9.]+)/);
      return m ? `Android ${m[1]}` : "Android";
    }
    if (/iPhone|iPad|iPod/.test(ua)) {
      const m = ua.match(/OS\s([0-9_]+)/);
      return m ? `iOS / iPadOS ${m[1].replace(/_/g, ".")}` : "iOS / iPadOS";
    }
    if (/Mac OS X/.test(ua)) {
      const m = ua.match(/Mac OS X\s([0-9_]+)/);
      return m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
    }
    if (/CrOS/.test(ua)) return "ChromeOS";
    if (/Linux/.test(ua)) return "Linux";
    return "不明";
  }

  function detectDeviceType(ua) {
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "タブレット";
    if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "スマートフォン";
    return "PC / デスクトップ";
  }

  function detectBrowser(ua) {
    let m;
    if ((m = ua.match(/Edg(?:A|iOS)?\/([0-9.]+)/))) return `Microsoft Edge ${m[1]}`;
    if ((m = ua.match(/OPR\/([0-9.]+)/))) return `Opera ${m[1]}`;
    if ((m = ua.match(/(?:Chrome|CriOS)\/([0-9.]+)/))) return `Google Chrome ${m[1]}`;
    if ((m = ua.match(/(?:Firefox|FxiOS)\/([0-9.]+)/))) return `Mozilla Firefox ${m[1]}`;
    if ((m = ua.match(/Version\/([0-9.]+).*Safari/))) return `Safari ${m[1]}`;
    return "不明";
  }

  function getGpuInfo() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return { vendor: "非対応", renderer: "WebGL非対応" };
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      let vendor = "非公開";
      let renderer = gl.getParameter(gl.RENDERER) || "不明";
      if (debugInfo) {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
      }
      const loseExt = gl.getExtension("WEBGL_lose_context");
      if (loseExt) loseExt.loseContext();
      return { vendor, renderer };
    } catch {
      return { vendor: "取得エラー", renderer: "取得エラー" };
    }
  }

  async function renderDeviceSpecs() {
    const ua = navigator.userAgent;
    const gpu = getGpuInfo();
    const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} スレッド (論理コア)` : "非公開 / 不明";
    const ram = navigator.deviceMemory ? `約 ${navigator.deviceMemory} GB (ブラウザ上限値含む)` : "非公開（Safari/Firefox等は非対応）";
    const dpr = window.devicePixelRatio || 1;
    const physW = Math.round(screen.width * dpr);
    const physH = Math.round(screen.height * dpr);
    const touchPoints = navigator.maxTouchPoints || 0;

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const netType = conn ? `${conn.effectiveType || "不明"} (下り推定: ${conn.downlink ? conn.downlink + " Mbps" : "不明"})` : (navigator.onLine ? "オンライン（詳細非対応）" : "オフライン");

    let batteryStr = "非対応（ブラウザ制限）";
    if (navigator.getBattery) {
      try {
        const bat = await navigator.getBattery();
        const pct = Math.round(bat.level * 100);
        batteryStr = `${pct}%（${bat.charging ? "充電中" : "バッテリー駆動"}）`;
      } catch {
        batteryStr = "取得不可";
      }
    }

    const categories = [
      {
        title: "システム・ブラウザ",
        items: [
          ["デバイス種別", detectDeviceType(ua)],
          ["OS", detectOS(ua)],
          ["ブラウザ", detectBrowser(ua)],
          ["言語 / タイムゾーン", `${navigator.language} / ${Intl.DateTimeFormat().resolvedOptions().timeZone}`]
        ]
      },
      {
        title: "CPU・メモリ・GPU",
        items: [
          ["CPU論理コア数", cores],
          ["メモリ (RAM)", ram],
          ["GPUレンダラー", gpu.renderer],
          ["GPUベンダー", gpu.vendor]
        ]
      },
      {
        title: "画面・ディスプレイ",
        items: [
          ["論理画面解像度", `${screen.width} × ${screen.height} px`],
          ["物理解像度 (換算)", `${physW} × ${physH} px (倍率 ${dpr}x)`],
          ["ブラウザ表示領域", `${window.innerWidth} × ${window.innerHeight} px`],
          ["色深度 / タッチ入力", `${screen.colorDepth} bit / ${touchPoints > 0 ? `対応 (${touchPoints}点)` : "非対応"}`]
        ]
      },
      {
        title: "通信・電源状態",
        items: [
          ["オンライン状態", navigator.onLine ? "オンライン" : "オフライン"],
          ["回線種別・速度目安", netType],
          ["バッテリー", batteryStr],
          ["Cookie / Storage", navigator.cookieEnabled ? "有効" : "無効"]
        ]
      }
    ];

    specGridEl.innerHTML = "";
    const textLines = [];

    categories.forEach((cat) => {
      const card = document.createElement("div");
      card.className = "spec-card";
      const h2 = document.createElement("h2");
      h2.textContent = cat.title;
      card.appendChild(h2);

      const ul = document.createElement("ul");
      ul.className = "spec-list";
      textLines.push(`[${cat.title}]`);

      cat.items.forEach(([k, v]) => {
        const li = document.createElement("li");
        const keySpan = document.createElement("span");
        keySpan.className = "spec-key";
        keySpan.textContent = k;
        const valSpan = document.createElement("span");
        valSpan.className = "spec-val";
        valSpan.textContent = v;
        li.append(keySpan, valSpan);
        ul.appendChild(li);
        textLines.push(`${k}: ${v}`);
      });

      textLines.push("");
      card.appendChild(ul);
      specGridEl.appendChild(card);
    });

    deviceUaEl.textContent = ua;
    textLines.push(`[User-Agent]\n${ua}`);
    latestSpecText = textLines.join("\n");
  }

  renderDeviceSpecs();
  deviceRefreshBtn.addEventListener("click", renderDeviceSpecs);
  window.addEventListener("resize", () => {
    if (currentTool === "device") renderDeviceSpecs();
  });

  deviceCopyBtn.addEventListener("click", () => {
    copyToClipboard(latestSpecText, deviceCopyBtn, "情報をコピー", "コピー完了");
  });

  // ==========================================
  // 15. ハッシュ値計算・比較（MD5 / SHA-1 / SHA-256 / SHA-512 / SHA-3 / CRC32）
  // ==========================================
  const hashDropZone = document.getElementById("hash-drop-zone");
  const hashFileInput = document.getElementById("hash-file-input");
  const hashClearBtn = document.getElementById("hash-clear-btn");
  const hashVerifyInput = document.getElementById("hash-verify-input");
  const hashVerifyStatus = document.getElementById("hash-verify-status");
  const hashFileListEl = document.getElementById("hash-file-list");
  const hashTextInput = document.getElementById("hash-text-input");
  const hashTextResultsEl = document.getElementById("hash-text-results");

  const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  function updateCrc32(crc, uint8Arr) {
    let c = crc ^ 0xFFFFFFFF;
    for (let i = 0; i < uint8Arr.length; i++) {
      c = crc32Table[(c ^ uint8Arr[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  let hashedFiles = [];
  let nextHashFileId = 1;

  async function computeFileHashes(file) {
    const chunkSize = 2 * 1024 * 1024;
    let crc = 0;
    const md5 = CryptoJS.algo.MD5.create();
    const sha1 = CryptoJS.algo.SHA1.create();
    const sha256 = CryptoJS.algo.SHA256.create();
    const sha512 = CryptoJS.algo.SHA512.create();
    const sha3_256 = CryptoJS.algo.SHA3.create({ outputLength: 256 });
    const sha3_512 = CryptoJS.algo.SHA3.create({ outputLength: 512 });

    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const slice = file.slice(offset, offset + chunkSize);
      const buf = await slice.arrayBuffer();
      const u8 = new Uint8Array(buf);
      crc = updateCrc32(crc, u8);

      const wa = CryptoJS.lib.WordArray.create(u8);
      md5.update(wa);
      sha1.update(wa);
      sha256.update(wa);
      sha512.update(wa);
      sha3_256.update(wa);
      sha3_512.update(wa);
    }

    return {
      CRC32: crc.toString(16).padStart(8, "0").toLowerCase(),
      MD5: md5.finalize().toString(CryptoJS.enc.Hex),
      "SHA-1": sha1.finalize().toString(CryptoJS.enc.Hex),
      "SHA-256": sha256.finalize().toString(CryptoJS.enc.Hex),
      "SHA-512": sha512.finalize().toString(CryptoJS.enc.Hex),
      "SHA3-256": sha3_256.finalize().toString(CryptoJS.enc.Hex),
      "SHA3-512": sha3_512.finalize().toString(CryptoJS.enc.Hex)
    };
  }

  function renderHashFileList() {
    hashFileListEl.innerHTML = "";
    const verifyTarget = hashVerifyInput.value.trim().toLowerCase();
    let verifyHitCount = 0;

    const countMap = new Map();
    hashedFiles.forEach((f) => {
      const key = f.hashes["SHA-256"];
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });

    const groupColorMap = new Map();
    let groupIdx = 0;
    countMap.forEach((cnt, key) => {
      if (cnt >= 2) {
        groupColorMap.set(key, groupIdx++);
      }
    });

    hashedFiles.forEach((item) => {
      const sha256 = item.hashes["SHA-256"];
      const matchGroup = groupColorMap.get(sha256);
      const card = document.createElement("div");
      card.className = "hash-file-card" + (matchGroup !== undefined ? ` match-g${matchGroup % 4}` : "");

      const header = document.createElement("div");
      header.className = "history-header";

      const titleWrap = document.createElement("div");
      const nameEl = document.createElement("strong");
      nameEl.textContent = item.name;
      const sizeEl = document.createElement("span");
      sizeEl.className = "hint-text";
      sizeEl.textContent = ` (${formatFileSize(item.size)}) `;
      titleWrap.append(nameEl, sizeEl);

      if (matchGroup !== undefined) {
        const badge = document.createElement("span");
        badge.className = "match-badge";
        badge.textContent = `一致グループ #${matchGroup + 1}（${countMap.get(sha256)}ファイル一致）`;
        titleWrap.appendChild(badge);
      }

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "mini-btn hash-del-btn";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        hashedFiles = hashedFiles.filter((f) => f.id !== item.id);
        renderHashFileList();
      });

      header.append(titleWrap, delBtn);

      const kvList = document.createElement("div");
      kvList.className = "hash-kv-list";
      Object.entries(item.hashes).forEach(([algo, val]) => {
        const isVerifyMatch = verifyTarget !== "" && val.toLowerCase() === verifyTarget;
        if (isVerifyMatch) verifyHitCount++;
        const row = document.createElement("div");
        row.className = `hash-kv-row${isVerifyMatch ? " verified-match" : ""}`;

        const algoEl = document.createElement("span");
        algoEl.className = "hash-algo";
        algoEl.textContent = algo;

        const valEl = document.createElement("span");
        valEl.className = "hash-val";
        valEl.textContent = val;

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "mini-btn hash-copy-btn";
        copyBtn.textContent = "コピー";
        copyBtn.addEventListener("click", () => {
          copyToClipboard(val, copyBtn, "コピー");
        });

        row.append(algoEl, valEl, copyBtn);
        kvList.appendChild(row);
      });

      card.append(header, kvList);
      hashFileListEl.appendChild(card);
    });

    if (verifyTarget === "") {
      hashVerifyStatus.textContent = "";
    } else if (hashedFiles.length === 0) {
      hashVerifyStatus.textContent = "まずファイルを読み込んでください。";
      hashVerifyStatus.style.color = "var(--text-muted)";
    } else if (verifyHitCount > 0) {
      hashVerifyStatus.textContent = `✅ 照合一致: ${verifyHitCount} 件のハッシュ値と完全に一致しました！`;
      hashVerifyStatus.style.color = "#10b981";
    } else {
      hashVerifyStatus.textContent = "❌ 一致するハッシュ値は見つかりませんでした。";
      hashVerifyStatus.style.color = "#ef4444";
    }
  }

  async function processIncomingFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const titleEl = hashDropZone.querySelector(".drop-zone-title");
    if (typeof CryptoJS === "undefined") {
      hashVerifyStatus.textContent = "ハッシュ計算ライブラリ (CryptoJS) の読み込みに失敗しました。";
      hashVerifyStatus.style.color = "#ef4444";
      return;
    }

    titleEl.textContent = "ハッシュ値を計算中...";
    try {
      for (const file of files) {
        const hashes = await computeFileHashes(file);
        hashedFiles.push({
          id: nextHashFileId++,
          name: file.name,
          size: file.size,
          hashes
        });
      }
    } catch (err) {
      hashVerifyStatus.textContent = `読み込みエラー: ${err.message}`;
      hashVerifyStatus.style.color = "#ef4444";
    } finally {
      titleEl.textContent = "ここにファイルをドラッグ＆ドロップ（複数ファイル対応）";
      renderHashFileList();
    }
  }

  hashDropZone.addEventListener("click", () => hashFileInput.click());
  hashFileInput.addEventListener("change", (e) => {
    processIncomingFiles(e.target.files);
    hashFileInput.value = "";
  });

  hashDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    hashDropZone.classList.add("dragover");
  });

  hashDropZone.addEventListener("dragleave", () => {
    hashDropZone.classList.remove("dragover");
  });

  hashDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    hashDropZone.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files) {
      processIncomingFiles(e.dataTransfer.files);
    }
  });

  hashVerifyInput.addEventListener("input", renderHashFileList);

  hashClearBtn.addEventListener("click", () => {
    hashedFiles = [];
    hashVerifyInput.value = "";
    hashTextInput.value = "";
    hashTextResultsEl.innerHTML = "";
    renderHashFileList();
  });

  hashTextInput.addEventListener("input", () => {
    const txt = hashTextInput.value;
    if (txt === "") {
      hashTextResultsEl.innerHTML = "";
      return;
    }
    if (typeof CryptoJS === "undefined") {
      hashTextResultsEl.innerHTML = '<div class="form-error">ハッシュ計算ライブラリ (CryptoJS) の読み込みに失敗しました。</div>';
      return;
    }
    const u8 = new TextEncoder().encode(txt);
    const crc = updateCrc32(0, u8).toString(16).padStart(8, "0").toLowerCase();
    const results = {
      CRC32: crc,
      MD5: CryptoJS.MD5(txt).toString(),
      "SHA-1": CryptoJS.SHA1(txt).toString(),
      "SHA-256": CryptoJS.SHA256(txt).toString(),
      "SHA-512": CryptoJS.SHA512(txt).toString(),
      "SHA3-256": CryptoJS.SHA3(txt, { outputLength: 256 }).toString(),
      "SHA3-512": CryptoJS.SHA3(txt, { outputLength: 512 }).toString()
    };

    hashTextResultsEl.innerHTML = "";
    Object.entries(results).forEach(([algo, val]) => {
      const row = document.createElement("div");
      row.className = "hash-kv-row";
      row.innerHTML = `
        <span class="hash-algo">${algo}</span>
        <span class="hash-val">${val}</span>
        <button type="button" class="mini-btn">コピー</button>
      `;
      const copyBtn = row.querySelector("button");
      copyBtn.addEventListener("click", () => {
        copyToClipboard(val, copyBtn, "コピー");
      });
      hashTextResultsEl.appendChild(row);
    });
  });

  // ==========================================
  // 16. 文字数カウント
  // ==========================================
  const ccTextarea = document.getElementById("cc-textarea");
  const ccTotalEl = document.getElementById("cc-total");
  const ccNoSpaceEl = document.getElementById("cc-no-space");
  const ccNoNewlineEl = document.getElementById("cc-no-newline");
  const ccLinesEl = document.getElementById("cc-lines");
  const ccWordsEl = document.getElementById("cc-words");
  const ccBytesEl = document.getElementById("cc-bytes");
  const ccTrimBtn = document.getElementById("cc-trim-btn");
  const ccCopyBtn = document.getElementById("cc-copy-btn");
  const ccClearBtn = document.getElementById("cc-clear-btn");

  function updateCharCount() {
    const text = ccTextarea.value;
    const total = Array.from(text).length;
    const noSpace = Array.from(text.replace(/\s/g, "")).length;
    const noNewline = Array.from(text.replace(/\r?\n/g, "")).length;
    const lines = text === "" ? 0 : text.split(/\r\n|\r|\n/).length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const utf8Bytes = new TextEncoder().encode(text).length;
    const genkou = Math.ceil(noNewline / 400);

    ccTotalEl.textContent = `${total.toLocaleString()} 文字`;
    ccNoSpaceEl.textContent = `${noSpace.toLocaleString()} 文字`;
    ccNoNewlineEl.textContent = `${noNewline.toLocaleString()} 文字`;
    ccLinesEl.textContent = `${lines.toLocaleString()} 行`;
    ccWordsEl.textContent = `${words.toLocaleString()} 語`;
    ccBytesEl.textContent = `${utf8Bytes.toLocaleString()} B / ${genkou} 枚`;
  }

  ccTextarea.addEventListener("input", updateCharCount);

  ccTrimBtn.addEventListener("click", () => {
    ccTextarea.value = ccTextarea.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .join("\n")
      .trim();
    updateCharCount();
  });

  ccCopyBtn.addEventListener("click", () => {
    copyToClipboard(ccTextarea.value, ccCopyBtn, "テキストコピー", "コピー完了");
  });

  ccClearBtn.addEventListener("click", () => {
    ccTextarea.value = "";
    updateCharCount();
    ccTextarea.focus();
  });

  updateCharCount();

  // ==========================================
  // 17. 1次元・2次元コード生成（bwip-js）
  // ==========================================
  const bcTypeSelect = document.getElementById("bc-type");
  const bcTypeGroup = document.getElementById("bc-type-group");
  const bcTextInput = document.getElementById("bc-text");
  const bcEccSelect = document.getElementById("bc-ecc");
  const bcScaleSelect = document.getElementById("bc-scale");
  const bcIncludeTextCheck = document.getElementById("bc-include-text");
  const bcCanvas = document.getElementById("bc-canvas");
  const bcErrorEl = document.getElementById("bc-error");
  const bcInfoText = document.getElementById("bc-info-text");
  const bcDownloadBtn = document.getElementById("bc-download-btn");
  const bcBatchToggle = document.getElementById("bc-batch-toggle");
  const bcLayout = document.getElementById("bc-layout");
  const bcPreviewCard = document.getElementById("bc-preview-card");
  const bcBatchSection = document.getElementById("bc-batch-section");
  const bcBatchSummary = document.getElementById("bc-batch-summary");
  const bcBatchGrid = document.getElementById("bc-batch-grid");

  const twoDimTypes = new Set([
    "qrcode", "microqrcode", "rectangularmicroqrcode",
    "datamatrix", "azteccode", "pdf417", "micropdf417",
    "hanxin", "dotcode", "maxicode"
  ]);
  const eccSupportedTypes = new Set([
    "qrcode", "microqrcode", "rectangularmicroqrcode", "pdf417", "micropdf417"
  ]);
  const allBarcodeSpecs = Array.from(bcTypeSelect.options).map((opt) => ({
    bcid: opt.value,
    label: opt.textContent
  }));

  let bcHasValidImage = false;
  let bcBatchTimer = null;

  function clearBarcodeCanvas() {
    const ctx = bcCanvas.getContext("2d");
    ctx.clearRect(0, 0, bcCanvas.width, bcCanvas.height);
    bcHasValidImage = false;
    bcDownloadBtn.disabled = true;
  }

  function buildBarcodeOpts(bcid, text, scale, ecc) {
    const is2D = twoDimTypes.has(bcid);
    const opts = {
      bcid,
      text,
      scale,
      includetext: !is2D && bcIncludeTextCheck.checked,
      textxalign: "center",
      backgroundcolor: "ffffff",
      paddingwidth: 4,
      paddingheight: 4
    };
    if (!is2D) {
      opts.height = 14;
    }
    if (is2D && ecc !== "auto") {
      if (["qrcode", "microqrcode", "rectangularmicroqrcode"].includes(bcid) && ["L", "M", "Q", "H"].includes(ecc)) {
        opts.eclevel = ecc;
      } else if (["pdf417", "micropdf417"].includes(bcid) && /^[0-8]$/.test(ecc)) {
        opts.eclevel = parseInt(ecc, 10);
      }
    }
    return opts;
  }

  function generateBatchBarcodes(text, scale, ecc) {
    bcBatchGrid.innerHTML = "";
    if (!text) {
      bcBatchSummary.textContent = "データを入力すると生成可能なすべてのコードを表示します";
      return;
    }
    if (typeof bwipjs === "undefined") {
      bcBatchSummary.textContent = "バーコード生成ライブラリ (bwip-js) の読み込みに失敗しました";
      return;
    }

    let okCount = 0;
    allBarcodeSpecs.forEach((spec) => {
      const tempCanvas = document.createElement("canvas");
      const opts = buildBarcodeOpts(spec.bcid, text, scale, ecc);
      try {
        bwipjs.toCanvas(tempCanvas, opts);
      } catch {
        return;
      }
      okCount++;

      const card = document.createElement("div");
      card.className = "bc-batch-card";

      const top = document.createElement("div");
      top.className = "bc-batch-card-top";
      const titleEl = document.createElement("span");
      titleEl.textContent = spec.label;
      const tagEl = document.createElement("span");
      tagEl.className = "tag";
      tagEl.textContent = spec.bcid;
      top.append(titleEl, tagEl);

      const wrap = document.createElement("div");
      wrap.className = "bc-canvas-wrap";
      tempCanvas.style.maxWidth = "100%";
      tempCanvas.style.height = "auto";
      wrap.appendChild(tempCanvas);

      const foot = document.createElement("div");
      foot.className = "bc-batch-card-foot";
      const sizeEl = document.createElement("span");
      sizeEl.className = "hint-text mono";
      sizeEl.textContent = `${tempCanvas.width} × ${tempCanvas.height} px`;

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "mini-btn";
      saveBtn.textContent = "PNG保存";
      saveBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.download = `${spec.bcid}_${Date.now()}.png`;
        link.href = tempCanvas.toDataURL("image/png");
        link.click();
      });

      foot.append(sizeEl, saveBtn);
      card.append(top, wrap, foot);
      bcBatchGrid.appendChild(card);
    });

    bcBatchSummary.textContent = `生成可能: ${okCount} / ${allBarcodeSpecs.length} 規格`;
  }

  function generateBarcode() {
    const batchOn = bcBatchToggle.checked;
    const bcid = bcTypeSelect.value;
    const text = bcTextInput.value;
    const scale = parseInt(bcScaleSelect.value, 10) || 3;
    const ecc = bcEccSelect.value;
    const is2D = twoDimTypes.has(bcid);

    bcLayout.classList.toggle("batch-mode", batchOn);
    bcPreviewCard.classList.toggle("hidden", batchOn);
    bcTypeGroup.classList.toggle("hidden", batchOn);
    bcDownloadBtn.classList.toggle("hidden", batchOn);
    bcBatchSection.classList.toggle("hidden", !batchOn);

    if (batchOn) {
      bcEccSelect.disabled = false;
      bcIncludeTextCheck.disabled = false;
      bcErrorEl.textContent = "";
      generateBatchBarcodes(text, scale, ecc);
      return;
    }

    bcEccSelect.disabled = !eccSupportedTypes.has(bcid);
    bcIncludeTextCheck.disabled = is2D;
    bcErrorEl.textContent = "";

    if (!text) {
      clearBarcodeCanvas();
      bcInfoText.textContent = "データを入力してください";
      return;
    }

    const opts = buildBarcodeOpts(bcid, text, scale, ecc);
    try {
      bwipjs.toCanvas(bcCanvas, opts);
      bcHasValidImage = true;
      bcDownloadBtn.disabled = false;
      bcInfoText.textContent = `規格: ${bcid} ／ サイズ: ${bcCanvas.width} × ${bcCanvas.height} px`;
    } catch (err) {
      clearBarcodeCanvas();
      bcInfoText.textContent = `規格: ${bcid}`;
      bcErrorEl.textContent = `生成エラー（入力文字種や桁数を確認してください）: ${err.message}`;
    }
  }

  function scheduleBarcodeUpdate() {
    if (bcBatchToggle.checked) {
      clearTimeout(bcBatchTimer);
      bcBatchTimer = setTimeout(generateBarcode, 100);
    } else {
      generateBarcode();
    }
  }

  [bcTypeSelect, bcEccSelect, bcScaleSelect, bcIncludeTextCheck, bcBatchToggle].forEach((el) => {
    el.addEventListener("change", generateBarcode);
  });
  bcTextInput.addEventListener("input", scheduleBarcodeUpdate);

  bcDownloadBtn.addEventListener("click", () => {
    if (!bcHasValidImage || !bcTextInput.value) return;
    const link = document.createElement("a");
    link.download = `${bcTypeSelect.value}_${Date.now()}.png`;
    link.href = bcCanvas.toDataURL("image/png");
    link.click();
  });

  generateBarcode();

  // ==========================================
  // 18. カラーコード変換（HEX / RGB / HSL / HSV / CMYK / WCAGコントラスト）
  // ==========================================
  const colorPickerEl = document.getElementById("color-picker");
  const colorPreviewFillEl = document.getElementById("color-preview-fill");
  const colorParseInput = document.getElementById("color-parse-input");
  const colorErrorEl = document.getElementById("color-error");
  const colorRandomBtn = document.getElementById("color-random-btn");
  const colorResetBtn = document.getElementById("color-reset-btn");

  const colorRSlider = document.getElementById("color-r-slider");
  const colorGSlider = document.getElementById("color-g-slider");
  const colorBSlider = document.getElementById("color-b-slider");
  const colorASlider = document.getElementById("color-a-slider");
  const colorRNum = document.getElementById("color-r-num");
  const colorGNum = document.getElementById("color-g-num");
  const colorBNum = document.getElementById("color-b-num");
  const colorANum = document.getElementById("color-a-num");

  const colorOutHex = document.getElementById("color-out-hex");
  const colorOutRgb = document.getElementById("color-out-rgb");
  const colorOutHsl = document.getElementById("color-out-hsl");
  const colorOutHsv = document.getElementById("color-out-hsv");
  const colorOutCmyk = document.getElementById("color-out-cmyk");
  const colorOutInt = document.getElementById("color-out-int");

  const colorWhiteSample = document.getElementById("color-contrast-white-sample");
  const colorWhiteRatio = document.getElementById("color-contrast-white-ratio");
  const colorWhiteBadge = document.getElementById("color-contrast-white-badge");
  const colorBlackSample = document.getElementById("color-contrast-black-sample");
  const colorBlackRatio = document.getElementById("color-contrast-black-ratio");
  const colorBlackBadge = document.getElementById("color-contrast-black-badge");
  const colorPaletteRow = document.getElementById("color-palette-row");

  let colorState = { r: 37, g: 99, b: 235, a: 1 };

  function clampInt(v, min, max) {
    return Math.min(max, Math.max(min, Math.round(v)));
  }

  function toHexByte(n) {
    return clampInt(n, 0, 255).toString(16).padStart(2, "0").toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    const hn = ((h % 360) + 360) % 360;
    const sn = Math.min(100, Math.max(0, s)) / 100;
    const ln = Math.min(100, Math.max(0, l)) / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
    const m = ln - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (hn < 60) { r1 = c; g1 = x; }
    else if (hn < 120) { r1 = x; g1 = c; }
    else if (hn < 180) { g1 = c; b1 = x; }
    else if (hn < 240) { g1 = x; b1 = c; }
    else if (hn < 300) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  function rgbToCmyk(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const k = 1 - Math.max(rn, gn, bn);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
    const c = (1 - rn - k) / (1 - k);
    const m = (1 - gn - k) / (1 - k);
    const y = (1 - bn - k) / (1 - k);
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  }

  function relativeLuminance(r, g, b) {
    const conv = (ch) => {
      const s = ch / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
  }

  function contrastRatio(fg, bg) {
    const a = fg.a;
    const r = Math.round(fg.r * a + bg.r * (1 - a));
    const g = Math.round(fg.g * a + bg.g * (1 - a));
    const b = Math.round(fg.b * a + bg.b * (1 - a));
    const l1 = relativeLuminance(r, g, b);
    const l2 = relativeLuminance(bg.r, bg.g, bg.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function formatContrastBadge(ratio, el) {
    if (ratio >= 7) {
      el.textContent = "AAA 合格";
      el.className = "contrast-badge aaa";
    } else if (ratio >= 4.5) {
      el.textContent = "AA 合格";
      el.className = "contrast-badge aa";
    } else if (ratio >= 3) {
      el.textContent = "AA (大文字)";
      el.className = "contrast-badge aa";
    } else {
      el.textContent = "基準未満";
      el.className = "contrast-badge fail";
    }
  }

  function parseAlphaToken(tok) {
    if (tok === undefined) return 1;
    const t = tok.trim();
    if (t.endsWith("%")) {
      const p = parseFloat(t.slice(0, -1));
      return Number.isNaN(p) ? null : Math.min(1, Math.max(0, p / 100));
    }
    const n = parseFloat(t);
    return Number.isNaN(n) ? null : Math.min(1, Math.max(0, n));
  }

  function parseColorString(raw) {
    const s = raw.trim();
    if (!s) return null;

    const hexMatch = s.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    if (hexMatch) {
      let h = hexMatch[1];
      if (h.length === 3 || h.length === 4) {
        h = h.split("").map((ch) => ch + ch).join("");
      }
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100 : 1;
      return { r, g, b, a };
    }

    const rgbMatch = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.%]+))?\s*\)$/i);
    if (rgbMatch) {
      const r = clampInt(parseFloat(rgbMatch[1]), 0, 255);
      const g = clampInt(parseFloat(rgbMatch[2]), 0, 255);
      const b = clampInt(parseFloat(rgbMatch[3]), 0, 255);
      const a = parseAlphaToken(rgbMatch[4]);
      if (a === null) return null;
      return { r, g, b, a };
    }

    const hslMatch = s.match(/^hsla?\(\s*(-?[0-9.]+)(?:deg)?\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*([0-9.%]+))?\s*\)$/i);
    if (hslMatch) {
      const h = parseFloat(hslMatch[1]);
      const sat = parseFloat(hslMatch[2]);
      const l = parseFloat(hslMatch[3]);
      const a = parseAlphaToken(hslMatch[4]);
      if (a === null) return null;
      const rgb = hslToRgb(h, sat, l);
      return { ...rgb, a };
    }

    return null;
  }

  function renderColorState(sourceEl = null) {
    const { r, g, b, a } = colorState;
    const hexBase = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
    const hexOut = a < 1 ? `${hexBase}${toHexByte(Math.round(a * 255))}` : hexBase;
    const alphaPct = Math.round(a * 100);
    const alphaDec = Number(a.toFixed(2));
    const rgbStr = a < 1 ? `rgba(${r}, ${g}, ${b}, ${alphaDec})` : `rgb(${r}, ${g}, ${b})`;
    const hsl = rgbToHsl(r, g, b);
    const hslStr = a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alphaDec})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    const hsv = rgbToHsv(r, g, b);
    const hsvStr = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
    const cmyk = rgbToCmyk(r, g, b);
    const cmykStr = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
    const intHexStr = `0x${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;

    colorPreviewFillEl.style.backgroundColor = rgbStr;
    if (sourceEl !== colorPickerEl) colorPickerEl.value = hexBase.toLowerCase();

    colorRSlider.value = r;
    colorGSlider.value = g;
    colorBSlider.value = b;
    colorASlider.value = alphaPct;
    if (sourceEl !== colorRNum) colorRNum.value = r;
    if (sourceEl !== colorGNum) colorGNum.value = g;
    if (sourceEl !== colorBNum) colorBNum.value = b;
    if (sourceEl !== colorANum) colorANum.value = alphaPct;

    if (sourceEl !== colorOutHex) colorOutHex.value = hexOut;
    if (sourceEl !== colorOutRgb) colorOutRgb.value = rgbStr;
    if (sourceEl !== colorOutHsl) colorOutHsl.value = hslStr;
    colorOutHsv.value = hsvStr;
    colorOutCmyk.value = cmykStr;
    colorOutInt.value = intHexStr;

    const wRatio = contrastRatio(colorState, { r: 255, g: 255, b: 255 });
    const bRatio = contrastRatio(colorState, { r: 0, g: 0, b: 0 });
    colorWhiteSample.style.color = rgbStr;
    colorWhiteRatio.textContent = `${wRatio.toFixed(2)}:1`;
    formatContrastBadge(wRatio, colorWhiteBadge);

    colorBlackSample.style.color = rgbStr;
    colorBlackRatio.textContent = `${bRatio.toFixed(2)}:1`;
    formatContrastBadge(bRatio, colorBlackBadge);

    const swatches = [
      { label: "明 +2", ...hslToRgb(hsl.h, hsl.s, Math.min(95, hsl.l + 24)) },
      { label: "明 +1", ...hslToRgb(hsl.h, hsl.s, Math.min(90, hsl.l + 12)) },
      { label: "現在色", r, g, b },
      { label: "暗 -1", ...hslToRgb(hsl.h, hsl.s, Math.max(10, hsl.l - 12)) },
      { label: "暗 -2", ...hslToRgb(hsl.h, hsl.s, Math.max(5, hsl.l - 24)) },
      { label: "類似色-", ...hslToRgb((hsl.h + 330) % 360, hsl.s, hsl.l) },
      { label: "類似色+", ...hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l) },
      { label: "補色", ...hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l) }
    ];

    colorPaletteRow.innerHTML = "";
    swatches.forEach((sw) => {
      const hex = `#${toHexByte(sw.r)}${toHexByte(sw.g)}${toHexByte(sw.b)}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-swatch-btn";
      btn.title = `${sw.label}: ${hex}`;
      btn.innerHTML = `<div class="color-swatch-chip" style="background:${hex}"></div><span class="mono">${hex}</span>`;
      btn.addEventListener("click", () => {
        colorState = { r: sw.r, g: sw.g, b: sw.b, a: colorState.a };
        colorErrorEl.textContent = "";
        renderColorState();
      });
      colorPaletteRow.appendChild(btn);
    });
  }

  colorPickerEl.addEventListener("input", () => {
    const parsed = parseColorString(colorPickerEl.value);
    if (parsed) {
      colorState = { ...parsed, a: colorState.a };
      colorErrorEl.textContent = "";
      renderColorState(colorPickerEl);
    }
  });

  [
    [colorRSlider, "r", 255],
    [colorGSlider, "g", 255],
    [colorBSlider, "b", 255],
    [colorRNum, "r", 255],
    [colorGNum, "g", 255],
    [colorBNum, "b", 255]
  ].forEach(([el, key, max]) => {
    el.addEventListener("input", () => {
      const val = parseFloat(el.value);
      if (Number.isNaN(val)) return;
      colorState[key] = clampInt(val, 0, max);
      colorErrorEl.textContent = "";
      renderColorState(el);
    });
  });

  [colorASlider, colorANum].forEach((el) => {
    el.addEventListener("input", () => {
      const val = parseFloat(el.value);
      if (Number.isNaN(val)) return;
      colorState.a = Math.min(100, Math.max(0, val)) / 100;
      colorErrorEl.textContent = "";
      renderColorState(el);
    });
  });

  [colorParseInput, colorOutHex, colorOutRgb, colorOutHsl].forEach((inputEl) => {
    inputEl.addEventListener("input", () => {
      const val = inputEl.value.trim();
      if (val === "") {
        colorErrorEl.textContent = "";
        return;
      }
      const parsed = parseColorString(val);
      if (!parsed) {
        if (inputEl === colorParseInput) {
          colorErrorEl.textContent = "解釈できないカラー形式です（例: #2563eb / rgb(37,99,235) / hsl(221,83%,53%)）";
        }
        return;
      }
      colorErrorEl.textContent = "";
      colorState = parsed;
      renderColorState(inputEl);
    });
  });

  document.querySelectorAll(".color-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) copyToClipboard(target.value, btn, "コピー");
    });
  });

  colorRandomBtn.addEventListener("click", () => {
    colorState = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
      a: 1
    };
    colorParseInput.value = "";
    colorErrorEl.textContent = "";
    renderColorState();
  });

  colorResetBtn.addEventListener("click", () => {
    colorState = { r: 37, g: 99, b: 235, a: 1 };
    colorParseInput.value = "";
    colorErrorEl.textContent = "";
    renderColorState();
  });

  renderColorState();

  // ==========================================
  // 19. 1次元・2次元コード読み取り（カメラ / 画像）
  // ==========================================
  const scanCameraSelect = document.getElementById("scan-camera-select");
  const scanCamBtn = document.getElementById("scan-cam-btn");
  const scanEngineBadge = document.getElementById("scan-engine-badge");
  const scanCamWrap = document.getElementById("scan-cam-wrap");
  const scanVideo = document.getElementById("scan-video");
  const scanDropZone = document.getElementById("scan-drop-zone");
  const scanFileInput = document.getElementById("scan-file-input");
  const scanImagePreviewWrap = document.getElementById("scan-image-preview-wrap");
  const scanImagePreview = document.getElementById("scan-image-preview");
  const scanErrorEl = document.getElementById("scan-error");
  const scanFormatEl = document.getElementById("scan-result-format");
  const scanTextEl = document.getElementById("scan-result-text");
  const scanCopyBtn = document.getElementById("scan-copy-btn");
  const scanOpenUrlEl = document.getElementById("scan-open-url");
  const scanHistoryEl = document.getElementById("scan-history");
  const scanClearHistBtn = document.getElementById("scan-clear-hist-btn");

  const hasNativeBarcodeDetector = typeof window.BarcodeDetector === "function";
  let nativeDetector = null;
  let zxingReader = null;
  let scanStream = null;
  let scanCamRunning = false;
  let scanCamTimer = null;
  let lastScannedText = "";
  let lastScannedAt = 0;

  async function initScannerEngine() {
    if (hasNativeBarcodeDetector) {
      try {
        const fmts = typeof BarcodeDetector.getSupportedFormats === "function"
          ? await BarcodeDetector.getSupportedFormats()
          : ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "data_matrix", "aztec", "pdf417", "itf", "codabar"];
        nativeDetector = new BarcodeDetector({ formats: fmts });
      } catch {
        nativeDetector = null;
      }
    }
    if (typeof ZXing !== "undefined") {
      try {
        zxingReader = new ZXing.BrowserMultiFormatReader();
      } catch {
        zxingReader = null;
      }
    }

    if (nativeDetector && zxingReader) {
      scanEngineBadge.textContent = "BarcodeDetector + ZXing";
    } else if (nativeDetector) {
      scanEngineBadge.textContent = "BarcodeDetector (標準API)";
    } else if (zxingReader) {
      scanEngineBadge.textContent = "ZXing ライブラリ";
    } else {
      scanEngineBadge.textContent = "読取エンジン未読込";
    }
  }
  initScannerEngine();

  function showScanResult(format, text) {
    scanErrorEl.textContent = "";
    scanFormatEl.textContent = format || "UNKNOWN";
    scanTextEl.value = text;
    scanCopyBtn.disabled = false;

    if (/^https?:\/\/\S+/i.test(text.trim())) {
      scanOpenUrlEl.href = text.trim();
      scanOpenUrlEl.classList.remove("hidden");
    } else {
      scanOpenUrlEl.classList.add("hidden");
    }

    const now = Date.now();
    if (text === lastScannedText && now - lastScannedAt < 1500) return;
    lastScannedText = text;
    lastScannedAt = now;

    const empty = scanHistoryEl.querySelector(".empty-msg");
    if (empty) empty.remove();

    const li = document.createElement("li");
    li.textContent = `[${format || "CODE"}] ${text}`;
    li.addEventListener("click", () => {
      scanFormatEl.textContent = format || "UNKNOWN";
      scanTextEl.value = text;
      scanCopyBtn.disabled = false;
      if (/^https?:\/\/\S+/i.test(text.trim())) {
        scanOpenUrlEl.href = text.trim();
        scanOpenUrlEl.classList.remove("hidden");
      } else {
        scanOpenUrlEl.classList.add("hidden");
      }
    });
    scanHistoryEl.prepend(li);
  }

  async function populateCameraList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      const prev = scanCameraSelect.value;
      scanCameraSelect.innerHTML = '<option value="">カメラ自動選択</option>';
      cams.forEach((cam, idx) => {
        const opt = document.createElement("option");
        opt.value = cam.deviceId;
        opt.textContent = cam.label || `カメラ ${idx + 1}`;
        scanCameraSelect.appendChild(opt);
      });
      if (cams.some((c) => c.deviceId === prev)) {
        scanCameraSelect.value = prev;
      }
    } catch {
      // ignore
    }
  }

  function stopScannerCamera() {
    scanCamRunning = false;
    if (scanCamTimer !== null) {
      clearInterval(scanCamTimer);
      scanCamTimer = null;
    }
    if (zxingReader) {
      try {
        zxingReader.reset();
      } catch {
        // ignore
      }
    }
    if (scanStream) {
      scanStream.getTracks().forEach((t) => t.stop());
      scanStream = null;
    }
    scanVideo.srcObject = null;
    scanCamWrap.classList.add("hidden");
    scanCamBtn.textContent = "📷 カメラで読取";
  }

  async function startScannerCamera() {
    scanErrorEl.textContent = "";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      scanErrorEl.textContent = "この環境ではカメラAPIが利用できません（HTTPS接続が必要です）。";
      return;
    }
    if (!nativeDetector && !zxingReader) {
      await initScannerEngine();
    }
    if (!nativeDetector && !zxingReader) {
      scanErrorEl.textContent = "コード読み取りライブラリを読み込めませんでした。";
      return;
    }

    stopScannerCamera();
    const deviceId = scanCameraSelect.value;

    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" },
        audio: false
      };
      scanStream = await navigator.mediaDevices.getUserMedia(constraints);
      scanVideo.srcObject = scanStream;
      await scanVideo.play();
      await populateCameraList();

      scanCamRunning = true;
      scanCamWrap.classList.remove("hidden");
      scanCamBtn.textContent = "⏹ カメラ停止";

      if (nativeDetector) {
        let busy = false;
        scanCamTimer = setInterval(async () => {
          if (!scanCamRunning || busy || scanVideo.readyState < 2) return;
          busy = true;
          try {
            const codes = await nativeDetector.detect(scanVideo);
            if (codes && codes.length > 0) {
              showScanResult(String(codes[0].format || "CODE").toUpperCase(), codes[0].rawValue);
            }
          } catch {
            // ignore frame detection error
          } finally {
            busy = false;
          }
        }, 160);
      } else if (zxingReader) {
        const offCanvas = document.createElement("canvas");
        const offCtx = offCanvas.getContext("2d");
        let busy = false;
        scanCamTimer = setInterval(async () => {
          if (!scanCamRunning || busy || scanVideo.readyState < 2 || !scanVideo.videoWidth) return;
          busy = true;
          try {
            offCanvas.width = scanVideo.videoWidth;
            offCanvas.height = scanVideo.videoHeight;
            offCtx.drawImage(scanVideo, 0, 0);
            const res = await zxingReader.decodeFromImageUrl(offCanvas.toDataURL("image/png"));
            if (res) {
              showScanResult(String(res.getBarcodeFormat()), res.getText());
            }
          } catch {
            // ignore NotFoundException
          } finally {
            busy = false;
          }
        }, 250);
      }
    } catch (err) {
      stopScannerCamera();
      scanErrorEl.textContent = `カメラを起動できませんでした: ${err.message}`;
    }
  }

  scanCamBtn.addEventListener("click", () => {
    if (scanCamRunning) stopScannerCamera();
    else startScannerCamera();
  });

  scanCameraSelect.addEventListener("change", () => {
    if (scanCamRunning) startScannerCamera();
  });

  async function decodeImageFile(file) {
    if (!file) return;
    scanErrorEl.textContent = "";
    if (!nativeDetector && !zxingReader) {
      await initScannerEngine();
    }

    const url = URL.createObjectURL(file);
    scanImagePreview.src = url;
    scanImagePreviewWrap.classList.remove("hidden");

    try {
      await new Promise((resolve, reject) => {
        scanImagePreview.onload = resolve;
        scanImagePreview.onerror = reject;
      });

      if (nativeDetector) {
        try {
          const codes = await nativeDetector.detect(scanImagePreview);
          if (codes && codes.length > 0) {
            showScanResult(String(codes[0].format || "CODE").toUpperCase(), codes[0].rawValue);
            return;
          }
        } catch {
          // fallback to ZXing
        }
      }

      if (zxingReader) {
        try {
          const res = await zxingReader.decodeFromImageElement(scanImagePreview);
          if (res) {
            showScanResult(String(res.getBarcodeFormat()), res.getText());
            return;
          }
        } catch {
          // not found
        }
      }

      scanErrorEl.textContent = "画像からバーコード／2次元コードを検出できませんでした。ピントや解像度をご確認ください。";
    } catch {
      scanErrorEl.textContent = "画像の読み込みに失敗しました。";
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  scanDropZone.addEventListener("click", () => scanFileInput.click());
  scanFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) decodeImageFile(file);
    scanFileInput.value = "";
  });

  scanDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    scanDropZone.classList.add("dragover");
  });
  scanDropZone.addEventListener("dragleave", () => scanDropZone.classList.remove("dragover"));
  scanDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    scanDropZone.classList.remove("dragover");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) decodeImageFile(file);
  });

  window.addEventListener("paste", (e) => {
    if (currentTool !== "scanner") return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) decodeImageFile(file);
        break;
      }
    }
  });

  scanCopyBtn.addEventListener("click", () => {
    if (!scanTextEl.value) return;
    copyToClipboard(scanTextEl.value, scanCopyBtn, "コピー");
  });

  scanClearHistBtn.addEventListener("click", () => {
    scanHistoryEl.innerHTML = '<li class="empty-msg">履歴はありません</li>';
  });

  // ==========================================
  // 20. 文字化け相互変換
  // ==========================================
  const mbFromEncSelect = document.getElementById("mb-from-enc");
  const mbToEncSelect = document.getElementById("mb-to-enc");
  const mbSwapBtn = document.getElementById("mb-swap-btn");
  const mbInput = document.getElementById("mb-input");
  const mbOutput = document.getElementById("mb-output");
  const mbErrorEl = document.getElementById("mb-error");
  const mbSampleBtn = document.getElementById("mb-sample-btn");
  const mbClearBtn = document.getElementById("mb-clear-btn");
  const mbApplyOutBtn = document.getElementById("mb-apply-out-btn");
  const mbCopyBtn = document.getElementById("mb-copy-btn");
  const mbCandidatesList = document.getElementById("mb-candidates-list");

  const win1252ToByte = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85],
    [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88], [0x2030, 0x89], [0x0160, 0x8A],
    [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92],
    [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B], [0x0153, 0x9C],
    [0x017E, 0x9E], [0x0178, 0x9F]
  ]);

  const textDecoderLabelMap = {
    UTF8: "utf-8",
    SJIS: "shift_jis",
    EUCJP: "euc-jp",
    JIS: "iso-2022-jp",
    WIN1252: "windows-1252",
    LATIN1: "iso-8859-1"
  };

  function encodeStringToBytes(str, enc) {
    if (enc === "LATIN1" || enc === "WIN1252") {
      const arr = [];
      for (const ch of str) {
        const cp = ch.codePointAt(0);
        if (cp <= 0xFF) {
          arr.push(cp);
        } else if (enc === "WIN1252" && win1252ToByte.has(cp)) {
          arr.push(win1252ToByte.get(cp));
        } else {
          arr.push(0x3F);
        }
      }
      return new Uint8Array(arr);
    }
    if (typeof Encoding === "undefined") {
      if (enc === "UTF8") return new TextEncoder().encode(str);
      throw new Error("Encodingライブラリが読み込まれていません");
    }
    const unicodeCodes = Encoding.stringToCode(str);
    const converted = Encoding.convert(unicodeCodes, { to: enc, from: "UNICODE" });
    return new Uint8Array(converted);
  }

  function decodeBytesToString(bytes, enc) {
    try {
      const dec = new TextDecoder(textDecoderLabelMap[enc] || "utf-8", { fatal: false });
      return dec.decode(bytes);
    } catch {
      if (typeof Encoding !== "undefined") {
        const unicodeCodes = Encoding.convert(Array.from(bytes), { to: "UNICODE", from: enc });
        return Encoding.codeToString(unicodeCodes);
      }
      throw new Error("文字コードのデコードに対応していません");
    }
  }

  function convertMojibake(str, fromEnc, toEnc) {
    if (!str) return "";
    const bytes = encodeStringToBytes(str, fromEnc);
    return decodeBytesToString(bytes, toEnc);
  }

  const mojibakePairs = [
    ["SJIS", "UTF8", "Shift_JIS解釈 → UTF-8復元"],
    ["UTF8", "SJIS", "UTF-8解釈 → Shift_JIS復元"],
    ["WIN1252", "UTF8", "Windows-1252解釈 → UTF-8復元"],
    ["LATIN1", "UTF8", "Latin-1解釈 → UTF-8復元"],
    ["EUCJP", "UTF8", "EUC-JP解釈 → UTF-8復元"],
    ["UTF8", "EUCJP", "UTF-8解釈 → EUC-JP復元"],
    ["SJIS", "EUCJP", "Shift_JIS解釈 → EUC-JP復元"],
    ["EUCJP", "SJIS", "EUC-JP解釈 → Shift_JIS復元"],
    ["WIN1252", "SJIS", "Windows-1252解釈 → Shift_JIS復元"],
    ["JIS", "UTF8", "JIS (ISO-2022-JP) → UTF-8復元"]
  ];

  function updateMojibake() {
    const text = mbInput.value;
    mbErrorEl.textContent = "";

    if (!text) {
      mbOutput.value = "";
      mbCandidatesList.innerHTML = '<p class="hint-text">テキストを入力すると候補が自動で表示されます。</p>';
      return;
    }

    try {
      mbOutput.value = convertMojibake(text, mbFromEncSelect.value, mbToEncSelect.value);
    } catch (err) {
      mbOutput.value = "";
      mbErrorEl.textContent = err.message;
    }

    mbCandidatesList.innerHTML = "";
    const extraCandidates = [];

    if (/%[0-9A-Fa-f]{2}/.test(text)) {
      try {
        extraCandidates.push(["URLデコード", decodeURIComponent(text)]);
      } catch {
        // ignore malformed percent encoding
      }
    }
    if (/\\u[0-9A-Fa-f]{4}/.test(text)) {
      try {
        const unescaped = text.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        extraCandidates.push(["Unicodeエスケープ解除 (\\uXXXX)", unescaped]);
      } catch {
        // ignore
      }
    }

    mojibakePairs.forEach(([fromE, toE, title]) => {
      try {
        const res = convertMojibake(text, fromE, toE);
        if (res && res !== text) {
          extraCandidates.push([title, res]);
        }
      } catch {
        // ignore unsupported pair
      }
    });

    if (extraCandidates.length === 0) {
      mbCandidatesList.innerHTML = '<p class="hint-text">変換可能な別候補が見つかりませんでした。</p>';
      return;
    }

    extraCandidates.forEach(([label, val]) => {
      const row = document.createElement("div");
      row.className = "mb-candidate-row";

      const labelEl = document.createElement("span");
      labelEl.className = "mb-candidate-label";
      labelEl.textContent = label;

      const textEl = document.createElement("span");
      textEl.className = "mb-candidate-text";
      textEl.textContent = val;

      const actions = document.createElement("div");
      actions.className = "header-controls";

      const useBtn = document.createElement("button");
      useBtn.type = "button";
      useBtn.className = "mini-btn";
      useBtn.textContent = "適用";
      useBtn.addEventListener("click", () => {
        mbOutput.value = val;
      });

      const cpBtn = document.createElement("button");
      cpBtn.type = "button";
      cpBtn.className = "mini-btn";
      cpBtn.textContent = "コピー";
      cpBtn.addEventListener("click", () => copyToClipboard(val, cpBtn, "コピー"));

      actions.append(useBtn, cpBtn);
      row.append(labelEl, textEl, actions);
      mbCandidatesList.appendChild(row);
    });
  }

  [mbInput, mbFromEncSelect, mbToEncSelect].forEach((el) => {
    el.addEventListener("input", updateMojibake);
    el.addEventListener("change", updateMojibake);
  });

  mbSwapBtn.addEventListener("click", () => {
    const tmp = mbFromEncSelect.value;
    mbFromEncSelect.value = mbToEncSelect.value;
    mbToEncSelect.value = tmp;
    updateMojibake();
  });

  mbApplyOutBtn.addEventListener("click", () => {
    if (!mbOutput.value) return;
    mbInput.value = mbOutput.value;
    updateMojibake();
  });

  mbCopyBtn.addEventListener("click", () => {
    if (!mbOutput.value) return;
    copyToClipboard(mbOutput.value, mbCopyBtn, "コピー");
  });

  mbSampleBtn.addEventListener("click", () => {
    mbFromEncSelect.value = "SJIS";
    mbToEncSelect.value = "UTF8";
    try {
      mbInput.value = convertMojibake("文字化けテスト：日本語サンプル！", "UTF8", "SJIS");
    } catch {
      mbInput.value = "æ–‡å­—åŒ–ã ‘ãƒ†ã‚¹ãƒˆ";
      mbFromEncSelect.value = "WIN1252";
    }
    updateMojibake();
  });

  mbClearBtn.addEventListener("click", () => {
    mbInput.value = "";
    updateMojibake();
  });

  // ==========================================
  // 21. YouTubeサムネ取得
  // ==========================================
  const ytUrlInput = document.getElementById("yt-url-input");
  const ytFetchBtn = document.getElementById("yt-fetch-btn");
  const ytClearBtn = document.getElementById("yt-clear-btn");
  const ytErrorEl = document.getElementById("yt-error");
  const ytVideoMetaEl = document.getElementById("yt-video-meta");
  const ytVideoIdEl = document.getElementById("yt-video-id");
  const ytThumbGrid = document.getElementById("yt-thumb-grid");

  function extractYoutubeVideoId(input) {
    const s = input.trim();
    if (!s) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

    try {
      const url = new URL(s.startsWith("http") ? s : `https://${s}`);
      if (url.hostname.includes("youtu.be")) {
        const seg = url.pathname.replace(/^\//, "").split("/")[0];
        return /^[A-Za-z0-9_-]{11}$/.test(seg) ? seg : null;
      }
      if (url.searchParams.has("v")) {
        const v = url.searchParams.get("v");
        return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
      }
      const pathMatch = url.pathname.match(/\/(?:shorts|live|embed|v)\/([A-Za-z0-9_-]{11})/);
      if (pathMatch) return pathMatch[1];
    } catch {
      // fall through
    }
    const fallbackMatch = s.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:[&?#]|$)/);
    return fallbackMatch ? fallbackMatch[1] : null;
  }

  const ytThumbPresets = [
    { key: "maxresdefault.jpg", label: "最高画質 (MaxRes)", expected: "1280 × 720" },
    { key: "sddefault.jpg", label: "高画質 (SD)", expected: "640 × 480" },
    { key: "hqdefault.jpg", label: "高品質 (HQ)", expected: "480 × 360" },
    { key: "mqdefault.jpg", label: "中品質 (MQ)", expected: "320 × 180" },
    { key: "default.jpg", label: "標準 (Default)", expected: "120 × 90" }
  ];

  async function downloadImageUrl(url, filename) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function renderYoutubeThumbs() {
    const id = extractYoutubeVideoId(ytUrlInput.value);
    ytThumbGrid.innerHTML = "";

    if (!ytUrlInput.value.trim()) {
      ytErrorEl.textContent = "";
      ytVideoMetaEl.classList.add("hidden");
      return;
    }

    if (!id) {
      ytErrorEl.textContent = "有効なYouTube URLまたは11文字の動画IDを入力してください。";
      ytVideoMetaEl.classList.add("hidden");
      return;
    }

    ytErrorEl.textContent = "";
    ytVideoIdEl.textContent = id;
    ytVideoMetaEl.classList.remove("hidden");

    ytThumbPresets.forEach((preset) => {
      const imgUrl = `https://i.ytimg.com/vi/${id}/${preset.key}`;
      const card = document.createElement("div");
      card.className = "yt-thumb-card";

      const head = document.createElement("div");
      head.className = "yt-thumb-head";
      const titleEl = document.createElement("span");
      titleEl.textContent = preset.label;
      const sizeBadge = document.createElement("span");
      sizeBadge.className = "tag mono";
      sizeBadge.textContent = preset.expected;
      head.append(titleEl, sizeBadge);

      const imgWrap = document.createElement("div");
      imgWrap.className = "yt-thumb-img-wrap";
      const img = document.createElement("img");
      img.className = "yt-thumb-img";
      img.alt = `${id} ${preset.label}`;
      img.loading = "lazy";
      img.src = imgUrl;
      img.addEventListener("load", () => {
        if (preset.key !== "default.jpg" && img.naturalWidth <= 120) {
          sizeBadge.textContent = `${img.naturalWidth}×${img.naturalHeight} (未提供)`;
        } else {
          sizeBadge.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        }
      });
      img.addEventListener("error", () => {
        sizeBadge.textContent = "取得不可";
      });
      imgWrap.appendChild(img);

      const actions = document.createElement("div");
      actions.className = "yt-thumb-actions";

      const copyUrlBtn = document.createElement("button");
      copyUrlBtn.type = "button";
      copyUrlBtn.className = "mini-btn";
      copyUrlBtn.textContent = "URLコピー";
      copyUrlBtn.addEventListener("click", () => copyToClipboard(imgUrl, copyUrlBtn, "URLコピー"));

      const openLink = document.createElement("a");
      openLink.href = imgUrl;
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      openLink.className = "mini-btn";
      openLink.style.textDecoration = "none";
      openLink.textContent = "開く";

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "mini-btn primary-mini";
      saveBtn.textContent = "保存";
      saveBtn.addEventListener("click", () => downloadImageUrl(imgUrl, `yt_${id}_${preset.key}`));

      actions.append(copyUrlBtn, openLink, saveBtn);
      card.append(head, imgWrap, actions);
      ytThumbGrid.appendChild(card);
    });
  }

  ytFetchBtn.addEventListener("click", renderYoutubeThumbs);
  ytUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      renderYoutubeThumbs();
    }
  });
  ytClearBtn.addEventListener("click", () => {
    ytUrlInput.value = "";
    renderYoutubeThumbs();
  });

  // ==========================================
  // 22. ルーレット
  // ==========================================
  const rlCanvas = document.getElementById("rl-canvas");
  const rlSpinBtn = document.getElementById("rl-spin-btn");
  const rlItemsInput = document.getElementById("rl-items-input");
  const rlDurationSelect = document.getElementById("rl-duration-select");
  const rlSoundCheck = document.getElementById("rl-sound-check");
  const rlRemoveWinnerCheck = document.getElementById("rl-remove-winner-check");
  const rlResultText = document.getElementById("rl-result-text");
  const rlHistoryEl = document.getElementById("rl-history");
  const rlClearHistBtn = document.getElementById("rl-clear-hist-btn");

  const rlColors = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
  ];
  const rlPresets = {
    lunch: "ラーメン\nカレー\n寿司\nパスタ\n焼肉\nうどん",
    dice: "1\n2\n3\n4\n5\n6",
    yesno: "はい\nいいえ",
    abcd: "A\nB\nC\nD"
  };

  let rlAngle = 0;
  let rlSpinning = false;
  let rlAudioCtx = null;

  function getRouletteItems() {
    return rlItemsInput.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  function playRouletteTick(isWin = false) {
    if (!rlSoundCheck.checked) return;
    try {
      if (!rlAudioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) rlAudioCtx = new Ctx();
      }
      if (!rlAudioCtx) return;
      if (rlAudioCtx.state === "suspended") rlAudioCtx.resume();
      const now = rlAudioCtx.currentTime;
      if (isWin) {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = rlAudioCtx.createOscillator();
          const g = rlAudioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          g.gain.setValueAtTime(0.18, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(g);
          g.connect(rlAudioCtx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.36);
        });
      } else {
        const osc = rlAudioCtx.createOscillator();
        const g = rlAudioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(920, now);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(g);
        g.connect(rlAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // ignore audio error
    }
  }

  function drawRouletteWheel() {
    const items = getRouletteItems();
    const ctx = rlCanvas.getContext("2d");
    const w = rlCanvas.width;
    const h = rlCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, w, h);

    if (items.length === 0) {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("項目を入力してください", cx, cy);
      return;
    }

    const sliceAngle = (Math.PI * 2) / items.length;

    items.forEach((label, idx) => {
      const startA = rlAngle + idx * sliceAngle;
      const endA = startA + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = rlColors[idx % rlColors.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + sliceAngle / 2);
      ctx.fillStyle = "#ffffff";
      const fontSize = items.length > 14 ? 12 : items.length > 8 ? 14 : 16;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 3;
      const maxChars = items.length > 12 ? 9 : 14;
      const displayLabel = label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
      ctx.fillText(displayLabel, radius - 16, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();
  }

  function getWinnerIndex(angle, count) {
    const sliceAngle = (Math.PI * 2) / count;
    const pointerAngle = -Math.PI / 2;
    let rel = (pointerAngle - angle) % (Math.PI * 2);
    if (rel < 0) rel += Math.PI * 2;
    return Math.floor(rel / sliceAngle) % count;
  }

  rlSpinBtn.addEventListener("click", () => {
    if (rlSpinning) return;
    const items = getRouletteItems();
    if (items.length === 0) {
      rlResultText.textContent = "項目を1つ以上入力してください";
      return;
    }

    rlSpinning = true;
    rlSpinBtn.disabled = true;
    rlResultText.textContent = "抽選中...";

    const duration = parseInt(rlDurationSelect.value, 10) || 4500;
    const startAngle = rlAngle;
    const extraTurns = (5 + Math.random() * 4) * Math.PI * 2;
    const totalDelta = extraTurns + Math.random() * Math.PI * 2;
    const startTime = performance.now();
    let lastSliceIdx = getWinnerIndex(rlAngle, items.length);

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      rlAngle = startAngle + totalDelta * eased;
      drawRouletteWheel();

      const curSliceIdx = getWinnerIndex(rlAngle, items.length);
      if (curSliceIdx !== lastSliceIdx) {
        lastSliceIdx = curSliceIdx;
        playRouletteTick(false);
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        rlSpinning = false;
        rlSpinBtn.disabled = false;
        const winIdx = getWinnerIndex(rlAngle, items.length);
        const winner = items[winIdx];
        rlResultText.textContent = `🎉 ${winner}`;
        playRouletteTick(true);

        const empty = rlHistoryEl.querySelector(".empty-msg");
        if (empty) empty.remove();
        const li = document.createElement("li");
        li.textContent = winner;
        rlHistoryEl.prepend(li);

        if (rlRemoveWinnerCheck.checked) {
          const remaining = items.filter((_, i) => i !== winIdx);
          rlItemsInput.value = remaining.join("\n");
          drawRouletteWheel();
        }
      }
    }

    requestAnimationFrame(step);
  });

  rlItemsInput.addEventListener("input", () => {
    if (!rlSpinning) drawRouletteWheel();
  });

  document.querySelectorAll(".rl-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (rlSpinning) return;
      rlItemsInput.value = rlPresets[btn.dataset.preset] || "";
      drawRouletteWheel();
    });
  });

  rlClearHistBtn.addEventListener("click", () => {
    rlHistoryEl.innerHTML = '<li class="empty-msg">履歴はありません</li>';
  });

  drawRouletteWheel();

  // ==========================================
  // 23. 音声スペクトル表示（ファイル再生 & マイクリアルタイム）
  // ==========================================
  const spFileInput = document.getElementById("sp-file-input");
  const spMicBtn = document.getElementById("sp-mic-btn");
  const spStopBtn = document.getElementById("sp-stop-btn");
  const spAudioEl = document.getElementById("sp-audio");
  const spSourceLabel = document.getElementById("sp-source-label");
  const spViewMode = document.getElementById("sp-view-mode");
  const spScaleMode = document.getElementById("sp-scale-mode");
  const spFftSize = document.getElementById("sp-fft-size");
  const spSmoothing = document.getElementById("sp-smoothing");
  const spSmoothingVal = document.getElementById("sp-smoothing-val");
  const spDropZone = document.getElementById("sp-drop-zone");
  const spCanvas = document.getElementById("sp-canvas");
  const spPeakFreqEl = document.getElementById("sp-peak-freq");
  const spPeakNoteEl = document.getElementById("sp-peak-note");
  const spLevelEl = document.getElementById("sp-level");
  const spErrorEl = document.getElementById("sp-error");

  let spAudioCtx = null;
  let spAnalyser = null;
  let spMediaSrc = null;
  let spAudioConnected = false;
  let spMicStream = null;
  let spMicSrc = null;
  let spAudioUrl = null;
  let spRafId = null;
  let spPeakHold = null;

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function freqToNoteName(freq) {
    if (!Number.isFinite(freq) || freq < 20) return "---";
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const name = noteNames[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
  }

  function ensureSpectrumAnalyser() {
    if (!spAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      spAudioCtx = new Ctx();
      spAnalyser = spAudioCtx.createAnalyser();
    }
    if (spAudioCtx.state === "suspended") {
      spAudioCtx.resume().catch(() => {});
    }
    spAnalyser.fftSize = parseInt(spFftSize.value, 10) || 2048;
    spAnalyser.smoothingTimeConstant = parseFloat(spSmoothing.value) || 0.8;
    return spAnalyser;
  }

  function stopSpectrumMic() {
    if (spMicSrc) {
      spMicSrc.disconnect();
      spMicSrc = null;
    }
    if (spMicStream) {
      spMicStream.getTracks().forEach((t) => t.stop());
      spMicStream = null;
    }
    spMicBtn.textContent = "🎤 マイク入力";
  }

  function stopSpectrumAll() {
    stopSpectrumMic();
    spAudioEl.pause();
    spAudioEl.currentTime = 0;
  }

  function startSpectrumLoop() {
    if (spRafId !== null) return;
    const ctx = spCanvas.getContext("2d");

    function drawFrame() {
      spRafId = requestAnimationFrame(drawFrame);
      if (currentTool !== "spectrum" || !spAnalyser || !spAudioCtx) return;

      const w = spCanvas.width;
      const h = spCanvas.height;
      const mode = spViewMode.value;
      const scale = spScaleMode.value;
      const binCount = spAnalyser.frequencyBinCount;
      const freqData = new Uint8Array(binCount);
      const timeData = new Uint8Array(spAnalyser.fftSize);
      spAnalyser.getByteFrequencyData(freqData);
      spAnalyser.getByteTimeDomainData(timeData);

      // ピーク周波数・音量算出
      let maxVal = 0;
      let maxIdx = 0;
      for (let i = 1; i < binCount; i++) {
        if (freqData[i] > maxVal) {
          maxVal = freqData[i];
          maxIdx = i;
        }
      }
      const nyquist = spAudioCtx.sampleRate / 2;
      const peakFreq = maxVal > 12 ? (maxIdx * nyquist) / binCount : 0;
      spPeakFreqEl.textContent = peakFreq > 0 ? `${peakFreq.toFixed(1)} Hz` : "--- Hz";
      spPeakNoteEl.textContent = peakFreq > 0 ? freqToNoteName(peakFreq) : "---";

      let rms = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        rms += v * v;
      }
      rms = Math.sqrt(rms / timeData.length);
      const db = rms > 1e-5 ? 20 * Math.log10(rms) : -100;
      spLevelEl.textContent = `${db.toFixed(1)} dB / ${spAudioCtx.sampleRate} Hz`;

      if (mode === "spectrogram") {
        // 既存画像を左に2pxシフトして右端に縦1ライン描画
        const img = ctx.getImageData(2, 0, w - 2, h);
        ctx.putImageData(img, 0, 0);
        for (let y = 0; y < h; y++) {
          const norm = 1 - y / h;
          const idx = scale === "log"
            ? Math.min(binCount - 1, Math.floor(Math.pow(binCount, norm)) - 1)
            : Math.min(binCount - 1, Math.floor(norm * binCount));
          const v = freqData[Math.max(0, idx)];
          const hue = 240 - (v / 255) * 240;
          const light = v > 8 ? 12 + (v / 255) * 55 : 6;
          ctx.fillStyle = `hsl(${hue}, 90%, ${light}%)`;
          ctx.fillRect(w - 2, y, 2, 1);
        }
        return;
      }

      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, w, h);

      // グリッド線
      ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach((r) => {
        ctx.beginPath();
        ctx.moveTo(0, h * r);
        ctx.lineTo(w, h * r);
        ctx.stroke();
      });

      if (mode === "bars" || mode === "both") {
        const barAreaH = mode === "both" ? h * 0.62 : h;
        const barAreaTop = mode === "both" ? h * 0.38 : 0;
        const bars = 96;
        if (!spPeakHold || spPeakHold.length !== bars) {
          spPeakHold = new Float32Array(bars);
        }
        const barW = w / bars;

        for (let i = 0; i < bars; i++) {
          let binStart, binEnd;
          if (scale === "log") {
            const fMin = 20;
            const fMax = Math.min(20000, nyquist);
            const f1 = fMin * Math.pow(fMax / fMin, i / bars);
            const f2 = fMin * Math.pow(fMax / fMin, (i + 1) / bars);
            binStart = Math.max(1, Math.floor((f1 / nyquist) * binCount));
            binEnd = Math.max(binStart + 1, Math.min(binCount, Math.ceil((f2 / nyquist) * binCount)));
          } else {
            binStart = Math.floor((i / bars) * binCount);
            binEnd = Math.max(binStart + 1, Math.floor(((i + 1) / bars) * binCount));
          }

          let val = 0;
          for (let b = binStart; b < binEnd; b++) {
            if (freqData[b] > val) val = freqData[b];
          }
          const norm = val / 255;
          const barH = norm * (barAreaH - 8);
          if (barH > spPeakHold[i]) spPeakHold[i] = barH;
          else spPeakHold[i] = Math.max(0, spPeakHold[i] - 0.9);

          const x = i * barW;
          const y = barAreaTop + barAreaH - barH;
          const hue = 205 - norm * 165;
          ctx.fillStyle = `hsl(${hue}, 88%, 58%)`;
          ctx.fillRect(x + 1, y, Math.max(1, barW - 2), barH);

          if (spPeakHold[i] > 2) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(x + 1, barAreaTop + barAreaH - spPeakHold[i] - 2, Math.max(1, barW - 2), 2);
          }
        }
      }

      if (mode === "wave" || mode === "both") {
        const waveH = mode === "both" ? h * 0.34 : h;
        const waveMid = waveH / 2;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sliceW = w / timeData.length;
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128;
          const x = i * sliceW;
          const y = waveMid + v * (waveH * 0.44);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    drawFrame();
  }

  function connectSpectrumForAudio() {
    stopSpectrumMic();
    const analyser = ensureSpectrumAnalyser();
    if (!spMediaSrc) {
      spMediaSrc = spAudioCtx.createMediaElementSource(spAudioEl);
    }
    if (!spAudioConnected) {
      spMediaSrc.connect(analyser);
      analyser.connect(spAudioCtx.destination);
      spAudioConnected = true;
    }
  }

  function loadSpectrumAudioFile(file) {
    if (!file) return;
    spErrorEl.textContent = "";
    connectSpectrumForAudio();

    if (spAudioUrl) URL.revokeObjectURL(spAudioUrl);
    spAudioUrl = URL.createObjectURL(file);
    spAudioEl.src = spAudioUrl;
    spSourceLabel.textContent = `読み込み: ${file.name}`;
    spAudioEl.play().catch(() => {});
    startSpectrumLoop();
  }

  spAudioEl.addEventListener("play", () => {
    connectSpectrumForAudio();
    startSpectrumLoop();
  });

  spFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadSpectrumAudioFile(file);
    spFileInput.value = "";
  });

  spDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  spDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadSpectrumAudioFile(file);
  });

  spMicBtn.addEventListener("click", async () => {
    spErrorEl.textContent = "";
    if (spMicStream) {
      stopSpectrumMic();
      spSourceLabel.textContent = "マイク入力を停止しました";
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      spErrorEl.textContent = "この環境ではマイク入力が利用できません（HTTPS接続が必要です）。";
      return;
    }
    try {
      spAudioEl.pause();
      const analyser = ensureSpectrumAnalyser();
      if (spAudioConnected && spMediaSrc) {
        try {
          spMediaSrc.disconnect();
        } catch {
          // ignore
        }
        try {
          analyser.disconnect();
        } catch {
          // ignore
        }
        spAudioConnected = false;
      }
      spMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      spMicSrc = spAudioCtx.createMediaStreamSource(spMicStream);
      spMicSrc.connect(analyser);
      spMicBtn.textContent = "⏹ マイク停止";
      spSourceLabel.textContent = "リアルタイム入力: マイク";
      startSpectrumLoop();
    } catch (err) {
      stopSpectrumMic();
      spErrorEl.textContent = `マイクを使用できませんでした: ${err.message}`;
    }
  });

  spStopBtn.addEventListener("click", () => {
    stopSpectrumAll();
    spSourceLabel.textContent = "停止しました";
  });

  spFftSize.addEventListener("change", () => {
    if (spAnalyser) {
      spAnalyser.fftSize = parseInt(spFftSize.value, 10) || 2048;
    }
  });

  spSmoothing.addEventListener("input", () => {
    const val = parseFloat(spSmoothing.value) || 0;
    spSmoothingVal.textContent = val.toFixed(2);
    if (spAnalyser) {
      spAnalyser.smoothingTimeConstant = val;
    }
  });

  spViewMode.addEventListener("change", () => {
    if (spViewMode.value === "spectrogram") {
      const ctx = spCanvas.getContext("2d");
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, spCanvas.width, spCanvas.height);
    }
  });

  // ==========================================
  // 24. 画像変換・圧縮・リサイズ（EXIF削除）
  // ==========================================
  const imgDropZone = document.getElementById("img-drop-zone");
  const imgFileInput = document.getElementById("img-file-input");
  const imgFormatSelect = document.getElementById("img-format-select");
  const imgQualitySlider = document.getElementById("img-quality-slider");
  const imgQualityVal = document.getElementById("img-quality-val");
  const imgWidthInput = document.getElementById("img-width-input");
  const imgHeightInput = document.getElementById("img-height-input");
  const imgKeepRatioCheck = document.getElementById("img-keep-ratio");
  const imgRotateBtn = document.getElementById("img-rotate-btn");
  const imgFlipBtn = document.getElementById("img-flip-btn");
  const imgOrigInfo = document.getElementById("img-orig-info");
  const imgNewInfo = document.getElementById("img-new-info");
  const imgDimLabel = document.getElementById("img-dim-label");
  const imgCanvas = document.getElementById("img-canvas");
  const imgDownloadBtn = document.getElementById("img-download-btn");
  const imgResetBtn = document.getElementById("img-reset-btn");
  const imgErrorEl = document.getElementById("img-error");

  let loadedImg = null;
  let origImgBytes = 0;
  let origImgName = "converted";
  let imgRotateDeg = 0;
  let imgFlipX = false;
  let outputImgBlob = null;

  function getOrientedDimensions() {
    if (!loadedImg) return { w: 0, h: 0 };
    const swap = imgRotateDeg % 180 !== 0;
    return {
      w: swap ? loadedImg.naturalHeight : loadedImg.naturalWidth,
      h: swap ? loadedImg.naturalWidth : loadedImg.naturalHeight
    };
  }

  function renderConvertedImage() {
    if (!loadedImg) return;
    imgErrorEl.textContent = "";

    const fmt = imgFormatSelect.value;
    imgQualitySlider.disabled = fmt === "image/png";
    const quality = (Number(imgQualitySlider.value) || 85) / 100;

    const targetW = Math.max(1, Math.min(16384, parseInt(imgWidthInput.value, 10) || getOrientedDimensions().w));
    const targetH = Math.max(1, Math.min(16384, parseInt(imgHeightInput.value, 10) || getOrientedDimensions().h));

    imgCanvas.width = targetW;
    imgCanvas.height = targetH;
    const ctx = imgCanvas.getContext("2d");
    ctx.clearRect(0, 0, targetW, targetH);

    if (fmt === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
    }

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    if (imgFlipX) ctx.scale(-1, 1);
    ctx.rotate((imgRotateDeg * Math.PI) / 180);
    const drawW = imgRotateDeg % 180 !== 0 ? targetH : targetW;
    const drawH = imgRotateDeg % 180 !== 0 ? targetW : targetH;
    ctx.drawImage(loadedImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    imgDimLabel.textContent = `${targetW} × ${targetH} px`;

    imgCanvas.toBlob(
      (blob) => {
        if (!blob) {
          imgErrorEl.textContent = "この形式への変換はブラウザでサポートされていません。";
          imgDownloadBtn.disabled = true;
          return;
        }
        outputImgBlob = blob;
        imgDownloadBtn.disabled = false;
        const diffPct = origImgBytes > 0 ? Math.round(((blob.size - origImgBytes) / origImgBytes) * 100) : 0;
        const sign = diffPct > 0 ? "+" : "";
        imgNewInfo.textContent = `${formatFileSize(blob.size)} (${sign}${diffPct}%)`;
      },
      fmt,
      quality
    );
  }

  function loadImageToolFile(file) {
    if (!file) return;
    imgErrorEl.textContent = "";
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      loadedImg = img;
      origImgBytes = file.size;
      origImgName = file.name.replace(/\.[^.]+$/, "") || "image";
      imgRotateDeg = 0;
      imgFlipX = false;
      imgWidthInput.value = img.naturalWidth;
      imgHeightInput.value = img.naturalHeight;
      imgOrigInfo.textContent = `${img.naturalWidth}×${img.naturalHeight} / ${formatFileSize(file.size)}`;
      renderConvertedImage();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      imgErrorEl.textContent = "画像を読み込めませんでした。";
    };
    img.src = url;
  }

  imgDropZone.addEventListener("click", () => imgFileInput.click());
  imgFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImageToolFile(file);
    imgFileInput.value = "";
  });
  imgDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    imgDropZone.classList.add("dragover");
  });
  imgDropZone.addEventListener("dragleave", () => imgDropZone.classList.remove("dragover"));
  imgDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    imgDropZone.classList.remove("dragover");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadImageToolFile(file);
  });

  window.addEventListener("paste", (e) => {
    if (currentTool !== "imgtool") return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) loadImageToolFile(file);
        break;
      }
    }
  });

  imgFormatSelect.addEventListener("change", renderConvertedImage);
  imgQualitySlider.addEventListener("input", () => {
    imgQualityVal.textContent = `${imgQualitySlider.value}%`;
    renderConvertedImage();
  });

  imgWidthInput.addEventListener("input", () => {
    if (!loadedImg) return;
    const w = parseInt(imgWidthInput.value, 10);
    if (w > 0 && imgKeepRatioCheck.checked) {
      const dim = getOrientedDimensions();
      imgHeightInput.value = Math.max(1, Math.round((w * dim.h) / dim.w));
    }
    renderConvertedImage();
  });

  imgHeightInput.addEventListener("input", () => {
    if (!loadedImg) return;
    const h = parseInt(imgHeightInput.value, 10);
    if (h > 0 && imgKeepRatioCheck.checked) {
      const dim = getOrientedDimensions();
      imgWidthInput.value = Math.max(1, Math.round((h * dim.w) / dim.h));
    }
    renderConvertedImage();
  });

  document.querySelectorAll(".img-scale-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!loadedImg) return;
      const s = parseFloat(btn.dataset.scale);
      const dim = getOrientedDimensions();
      imgWidthInput.value = Math.max(1, Math.round(dim.w * s));
      imgHeightInput.value = Math.max(1, Math.round(dim.h * s));
      renderConvertedImage();
    });
  });

  imgRotateBtn.addEventListener("click", () => {
    if (!loadedImg) return;
    imgRotateDeg = (imgRotateDeg + 90) % 360;
    const oldW = imgWidthInput.value;
    imgWidthInput.value = imgHeightInput.value;
    imgHeightInput.value = oldW;
    renderConvertedImage();
  });

  imgFlipBtn.addEventListener("click", () => {
    if (!loadedImg) return;
    imgFlipX = !imgFlipX;
    renderConvertedImage();
  });

  imgDownloadBtn.addEventListener("click", () => {
    if (!outputImgBlob) return;
    const extMap = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
    const ext = extMap[imgFormatSelect.value] || "png";
    const url = URL.createObjectURL(outputImgBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${origImgName}_converted.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  imgResetBtn.addEventListener("click", () => {
    loadedImg = null;
    outputImgBlob = null;
    origImgBytes = 0;
    imgRotateDeg = 0;
    imgFlipX = false;
    imgWidthInput.value = "";
    imgHeightInput.value = "";
    imgOrigInfo.textContent = "---";
    imgNewInfo.textContent = "---";
    imgDimLabel.textContent = "---";
    imgErrorEl.textContent = "";
    imgDownloadBtn.disabled = true;
    const ctx = imgCanvas.getContext("2d");
    ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
  });

  // ==========================================
  // 25. モニター・リフレッシュレート確認
  // ==========================================
  const monHzValEl = document.getElementById("mon-hz-val");
  const monFrameMsEl = document.getElementById("mon-frame-ms");
  const monResValEl = document.getElementById("mon-res-val");
  const monFullscreenBtn = document.getElementById("mon-fullscreen-btn");
  const monExitFsBtn = document.getElementById("mon-exit-fs-btn");
  const monStage = document.getElementById("mon-stage");
  const monPatternLabel = document.getElementById("mon-pattern-label");
  const monGhostCanvas = document.getElementById("mon-ghost-canvas");
  const monPatternBtns = document.querySelectorAll(".mon-pattern-btn");

  const monPatterns = [
    { id: "black", label: "黒 (光漏れ/輝点)", bg: "#000000" },
    { id: "white", label: "白 (黒点/色ムラ)", bg: "#ffffff" },
    { id: "red", label: "赤 (R)", bg: "#ff0000" },
    { id: "green", label: "緑 (G)", bg: "#00ff00" },
    { id: "blue", label: "青 (B)", bg: "#0000ff" },
    { id: "gray50", label: "灰 50%", bg: "#808080" },
    { id: "gradient", label: "階調グラデーション", bg: "linear-gradient(90deg, #000000 0%, #ffffff 100%)" },
    { id: "ghost", label: "残像テスト (移動バー)", bg: "#0f172a" }
  ];

  let monPatternIdx = 0;
  let monRafId = null;
  let monLastTs = 0;
  let monDeltas = [];
  let monGhostX = 0;

  function applyMonitorPattern(idx) {
    monPatternIdx = (idx + monPatterns.length) % monPatterns.length;
    const pat = monPatterns[monPatternIdx];
    monStage.style.background = pat.bg;
    monPatternLabel.textContent = pat.label;
    monGhostCanvas.classList.toggle("hidden", pat.id !== "ghost");
    monPatternBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.pattern === pat.id);
    });
  }
  applyMonitorPattern(0);

  monPatternBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => applyMonitorPattern(idx));
  });

  monStage.addEventListener("click", (e) => {
    if (e.target === monExitFsBtn) return;
    applyMonitorPattern(monPatternIdx + 1);
  });

  monFullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      monStage.requestFullscreen().catch(() => {});
    }
  });

  monExitFsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener("keydown", (e) => {
    if (currentTool !== "monitor") return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      applyMonitorPattern(monPatternIdx + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      applyMonitorPattern(monPatternIdx - 1);
    }
  });

  function startMonitorLoop() {
    if (monRafId !== null) return;
    monLastTs = 0;
    monDeltas = [];
    const dpr = window.devicePixelRatio || 1;
    monResValEl.textContent = `${screen.width}×${screen.height} (${dpr}x)`;

    function tick(ts) {
      monRafId = requestAnimationFrame(tick);
      if (currentTool !== "monitor") return;

      if (monLastTs > 0) {
        const dt = ts - monLastTs;
        if (dt > 1 && dt < 200) {
          monDeltas.push(dt);
          if (monDeltas.length > 60) monDeltas.shift();
          const sorted = [...monDeltas].sort((a, b) => a - b);
          const med = sorted[Math.floor(sorted.length / 2)];
          if (med > 0) {
            monHzValEl.textContent = `${(1000 / med).toFixed(1)} Hz`;
            monFrameMsEl.textContent = `${med.toFixed(2)} ms`;
          }
        }
      }
      monLastTs = ts;

      if (monPatterns[monPatternIdx].id === "ghost") {
        const ctx = monGhostCanvas.getContext("2d");
        const w = monGhostCanvas.width;
        const h = monGhostCanvas.height;
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);

        monGhostX = (monGhostX + 8) % (w + 60);
        const bx = monGhostX - 60;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx, 20, 18, 60);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(bx, 90, 18, 60);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(bx, 160, 18, 60);
      }
    }

    monRafId = requestAnimationFrame(tick);
  }

  function stopMonitorLoop() {
    if (monRafId !== null) {
      cancelAnimationFrame(monRafId);
      monRafId = null;
    }
  }

  // ==========================================
  // 26. テキスト差分比較 (Diff)
  // ==========================================
  const diffLeftEl = document.getElementById("diff-left");
  const diffRightEl = document.getElementById("diff-right");
  const diffIgnoreWsCheck = document.getElementById("diff-ignore-ws");
  const diffIgnoreCaseCheck = document.getElementById("diff-ignore-case");
  const diffSwapBtn = document.getElementById("diff-swap-btn");
  const diffClearBtn = document.getElementById("diff-clear-btn");
  const diffSummaryEl = document.getElementById("diff-summary");
  const diffOutputEl = document.getElementById("diff-output");

  function computeLineDiff(linesA, linesB, normFn) {
    const m = linesA.length;
    const n = linesB.length;
    const normA = linesA.map(normFn);
    const normB = linesB.map(normFn);

    // 長大な入力では行セットベースの簡易比較にフォールバック
    if (m * n > 400000) {
      const res = [];
      const setB = new Set(normB);
      const setA = new Set(normA);
      let i = 0, j = 0;
      while (i < m || j < n) {
        if (i < m && j < n && normA[i] === normB[j]) {
          res.push({ type: "same", aLine: i + 1, bLine: j + 1, text: linesB[j] });
          i++; j++;
        } else if (i < m && !setB.has(normA[i])) {
          res.push({ type: "del", aLine: i + 1, bLine: "", text: linesA[i] });
          i++;
        } else if (j < n && !setA.has(normB[j])) {
          res.push({ type: "add", aLine: "", bLine: j + 1, text: linesB[j] });
          j++;
        } else if (i < m) {
          res.push({ type: "del", aLine: i + 1, bLine: "", text: linesA[i] });
          i++;
        } else {
          res.push({ type: "add", aLine: "", bLine: j + 1, text: linesB[j] });
          j++;
        }
      }
      return res;
    }

    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (normA[i] === normB[j]) {
          dp[i][j] = dp[i + 1][j + 1] + 1;
        } else {
          dp[i][j] = dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1];
        }
      }
    }

    const out = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (normA[i] === normB[j]) {
        out.push({ type: "same", aLine: i + 1, bLine: j + 1, text: linesB[j] });
        i++; j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        out.push({ type: "del", aLine: i + 1, bLine: "", text: linesA[i] });
        i++;
      } else {
        out.push({ type: "add", aLine: "", bLine: j + 1, text: linesB[j] });
        j++;
      }
    }
    while (i < m) {
      out.push({ type: "del", aLine: i + 1, bLine: "", text: linesA[i] });
      i++;
    }
    while (j < n) {
      out.push({ type: "add", aLine: "", bLine: j + 1, text: linesB[j] });
      j++;
    }
    return out;
  }

  function updateDiffView() {
    const left = diffLeftEl.value;
    const right = diffRightEl.value;
    diffOutputEl.innerHTML = "";

    if (left === "" && right === "") {
      diffSummaryEl.textContent = "2つのテキストを入力すると行単位で差分を表示します";
      return;
    }

    const linesA = left.split(/\r?\n/);
    const linesB = right.split(/\r?\n/);
    const ignoreWs = diffIgnoreWsCheck.checked;
    const ignoreCase = diffIgnoreCaseCheck.checked;

    const normFn = (s) => {
      let t = ignoreWs ? s.trim() : s;
      if (ignoreCase) t = t.toLowerCase();
      return t;
    };

    const ops = computeLineDiff(linesA, linesB, normFn);
    let addCount = 0;
    let delCount = 0;
    let sameCount = 0;

    const frag = document.createDocumentFragment();
    ops.forEach((op) => {
      if (op.type === "add") addCount++;
      else if (op.type === "del") delCount++;
      else sameCount++;

      const row = document.createElement("div");
      row.className = `diff-line ${op.type}`;

      const lnA = document.createElement("span");
      lnA.className = "diff-ln";
      lnA.textContent = op.aLine;

      const lnB = document.createElement("span");
      lnB.className = "diff-ln";
      lnB.textContent = op.bLine;

      const sign = document.createElement("span");
      sign.className = "diff-sign";
      sign.textContent = op.type === "add" ? "+" : op.type === "del" ? "-" : " ";

      const txt = document.createElement("span");
      txt.textContent = op.text;

      row.append(lnA, lnB, sign, txt);
      frag.appendChild(row);
    });

    diffOutputEl.appendChild(frag);
    diffSummaryEl.textContent = `追加: +${addCount} 行 ／ 削除: -${delCount} 行 ／ 一致: ${sameCount} 行`;
  }

  [diffLeftEl, diffRightEl, diffIgnoreWsCheck, diffIgnoreCaseCheck].forEach((el) => {
    el.addEventListener("input", updateDiffView);
    el.addEventListener("change", updateDiffView);
  });

  diffSwapBtn.addEventListener("click", () => {
    const tmp = diffLeftEl.value;
    diffLeftEl.value = diffRightEl.value;
    diffRightEl.value = tmp;
    updateDiffView();
  });

  diffClearBtn.addEventListener("click", () => {
    diffLeftEl.value = "";
    diffRightEl.value = "";
    updateDiffView();
  });

  // ==========================================
  // 27. パスワード・乱数生成
  // ==========================================
  const pwModeBtns = document.querySelectorAll(".pw-mode-btn");
  const pwGenBtn = document.getElementById("pw-gen-btn");
  const pwLenGroup = document.getElementById("pw-len-group");
  const pwLenSlider = document.getElementById("pw-len-slider");
  const pwLenVal = document.getElementById("pw-len-val");
  const pwCountSelect = document.getElementById("pw-count-select");
  const pwCharsetBar = document.getElementById("pw-charset-bar");
  const pwUpperCheck = document.getElementById("pw-upper");
  const pwLowerCheck = document.getElementById("pw-lower");
  const pwDigitsCheck = document.getElementById("pw-digits");
  const pwSymbolsCheck = document.getElementById("pw-symbols");
  const pwNoAmbigCheck = document.getElementById("pw-no-ambig");
  const pwStrengthBadge = document.getElementById("pw-strength-badge");
  const pwResultsList = document.getElementById("pw-results-list");

  let pwMode = "password";

  function secureRandomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    while (true) {
      crypto.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % max;
    }
  }

  function generateUuidV4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function renderGeneratedPasswords() {
    const len = parseInt(pwLenSlider.value, 10) || 16;
    const count = parseInt(pwCountSelect.value, 10) || 5;
    pwLenVal.textContent = String(len);
    pwResultsList.innerHTML = "";

    let charset = "";
    let entropyBits = 0;

    if (pwMode === "password") {
      if (pwUpperCheck.checked) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (pwLowerCheck.checked) charset += "abcdefghijklmnopqrstuvwxyz";
      if (pwDigitsCheck.checked) charset += "0123456789";
      if (pwSymbolsCheck.checked) charset += "!@#$%^&*()-_=+[]{};:,.<>/?";
      if (pwNoAmbigCheck.checked) {
        charset = charset.replace(/[0OIl1]/g, "");
      }
      if (!charset) {
        pwStrengthBadge.textContent = "文字種を1つ以上選択してください";
        return;
      }
      entropyBits = Math.round(len * Math.log2(charset.length));
    } else if (pwMode === "pin") {
      charset = "0123456789";
      entropyBits = Math.round(len * Math.log2(10));
    } else if (pwMode === "hex") {
      entropyBits = len * 4;
    } else {
      entropyBits = 122;
    }

    const strengthLabel = entropyBits >= 80 ? "非常に強力" : entropyBits >= 60 ? "強力" : entropyBits >= 40 ? "普通" : "弱め";
    pwStrengthBadge.textContent = `エントロピー: 約 ${entropyBits} bit (${strengthLabel})`;

    for (let i = 0; i < count; i++) {
      let val = "";
      if (pwMode === "uuid") {
        val = generateUuidV4();
      } else if (pwMode === "hex") {
        const bytes = new Uint8Array(Math.ceil(len / 2));
        crypto.getRandomValues(bytes);
        val = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
      } else {
        for (let c = 0; c < len; c++) {
          val += charset[secureRandomInt(charset.length)];
        }
      }

      const row = document.createElement("div");
      row.className = "hash-kv-row";

      const idxEl = document.createElement("span");
      idxEl.className = "hash-algo";
      idxEl.textContent = `#${i + 1}`;

      const valEl = document.createElement("span");
      valEl.className = "hash-val";
      valEl.textContent = val;

      const cpBtn = document.createElement("button");
      cpBtn.type = "button";
      cpBtn.className = "mini-btn";
      cpBtn.textContent = "コピー";
      cpBtn.addEventListener("click", () => copyToClipboard(val, cpBtn, "コピー"));

      row.append(idxEl, valEl, cpBtn);
      pwResultsList.appendChild(row);
    }
  }

  pwModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      pwMode = btn.dataset.pwMode;
      pwModeBtns.forEach((b) => b.classList.toggle("active", b === btn));
      pwCharsetBar.classList.toggle("hidden", pwMode !== "password");
      pwLenGroup.classList.toggle("hidden", pwMode === "uuid");
      if (pwMode === "pin" && Number(pwLenSlider.value) > 12) {
        pwLenSlider.value = "6";
      }
      renderGeneratedPasswords();
    });
  });

  [pwLenSlider, pwCountSelect, pwUpperCheck, pwLowerCheck, pwDigitsCheck, pwSymbolsCheck, pwNoAmbigCheck].forEach((el) => {
    el.addEventListener("input", renderGeneratedPasswords);
    el.addEventListener("change", renderGeneratedPasswords);
  });
  pwGenBtn.addEventListener("click", renderGeneratedPasswords);
  renderGeneratedPasswords();

  // ==========================================
  // 28. 単位変換
  // ==========================================
  const unitCatBtns = document.querySelectorAll(".unit-cat-btn");
  const unitValInput = document.getElementById("unit-val-input");
  const unitFromSelect = document.getElementById("unit-from-select");
  const unitResultsGrid = document.getElementById("unit-results-grid");
  const unitClearBtn = document.getElementById("unit-clear-btn");

  const unitCategories = {
    data: [
      { key: "bit", label: "ビット (bit)", factor: 1 / 8 },
      { key: "B", label: "バイト (Byte)", factor: 1 },
      { key: "KB", label: "キロバイト (KB / 10³)", factor: 1e3 },
      { key: "KiB", label: "キビバイト (KiB / 2¹⁰)", factor: 1024 },
      { key: "MB", label: "メガバイト (MB / 10⁶)", factor: 1e6 },
      { key: "MiB", label: "メビバイト (MiB / 2²⁰)", factor: 1024 ** 2 },
      { key: "GB", label: "ギガバイト (GB / 10⁹)", factor: 1e9 },
      { key: "GiB", label: "ギビバイト (GiB / 2³⁰)", factor: 1024 ** 3 },
      { key: "TB", label: "テラバイト (TB / 10¹²)", factor: 1e12 },
      { key: "TiB", label: "テビバイト (TiB / 2⁴⁰)", factor: 1024 ** 4 }
    ],
    bitrate: [
      { key: "bps", label: "bps", factor: 1 },
      { key: "Kbps", label: "Kbps (10³ bps)", factor: 1e3 },
      { key: "Mbps", label: "Mbps (10⁶ bps)", factor: 1e6 },
      { key: "Gbps", label: "Gbps (10⁹ bps)", factor: 1e9 },
      { key: "Bs", label: "B/s (Byte/秒)", factor: 8 },
      { key: "KBs", label: "KB/s (10³ B/s)", factor: 8e3 },
      { key: "MBs", label: "MB/s (10⁶ B/s)", factor: 8e6 },
      { key: "GBs", label: "GB/s (10⁹ B/s)", factor: 8e9 }
    ],
    length: [
      { key: "mm", label: "ミリメートル (mm)", factor: 0.001 },
      { key: "cm", label: "センチメートル (cm)", factor: 0.01 },
      { key: "m", label: "メートル (m)", factor: 1 },
      { key: "km", label: "キロメートル (km)", factor: 1000 },
      { key: "inch", label: "インチ (inch)", factor: 0.0254 },
      { key: "ft", label: "フィート (ft)", factor: 0.3048 },
      { key: "yd", label: "ヤード (yd)", factor: 0.9144 },
      { key: "mile", label: "マイル (mile)", factor: 1609.344 }
    ],
    mass: [
      { key: "mg", label: "ミリグラム (mg)", factor: 1e-6 },
      { key: "g", label: "グラム (g)", factor: 0.001 },
      { key: "kg", label: "キログラム (kg)", factor: 1 },
      { key: "t", label: "トン (t)", factor: 1000 },
      { key: "oz", label: "オンス (oz)", factor: 0.028349523125 },
      { key: "lb", label: "ポンド (lb)", factor: 0.45359237 }
    ],
    temp: [
      { key: "C", label: "摂氏 (°C)" },
      { key: "F", label: "華氏 (°F)" },
      { key: "K", label: "絶対温度 (K)" }
    ]
  };

  let currentUnitCat = "data";

  function formatUnitValue(num) {
    if (!Number.isFinite(num)) return "---";
    if (num === 0) return "0";
    const abs = Math.abs(num);
    if (abs >= 1e12 || abs < 1e-6) {
      return num.toExponential(6).replace(/\.?0+e/, "e");
    }
    return Number(num.toPrecision(8)).toLocaleString("en-US", { maximumFractionDigits: 8 });
  }

  function populateUnitSelect(cat) {
    currentUnitCat = cat;
    const list = unitCategories[cat];
    unitFromSelect.innerHTML = "";
    list.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.key;
      opt.textContent = u.label;
      unitFromSelect.appendChild(opt);
    });
    if (cat === "data") unitFromSelect.value = "GiB";
    else if (cat === "bitrate") unitFromSelect.value = "Mbps";
    else if (cat === "length") unitFromSelect.value = "inch";
    else if (cat === "mass") unitFromSelect.value = "kg";
    else unitFromSelect.value = "C";
  }

  function renderUnitConversions() {
    const val = parseFloat(unitValInput.value);
    const fromKey = unitFromSelect.value;
    const list = unitCategories[currentUnitCat];
    unitResultsGrid.innerHTML = "";

    const valid = !Number.isNaN(val);
    let baseVal = 0;

    if (valid) {
      if (currentUnitCat === "temp") {
        if (fromKey === "C") baseVal = val;
        else if (fromKey === "F") baseVal = (val - 32) * (5 / 9);
        else baseVal = val - 273.15;
      } else {
        const src = list.find((u) => u.key === fromKey) || list[0];
        baseVal = val * src.factor;
      }
    }

    list.forEach((u) => {
      let converted = NaN;
      if (valid) {
        if (currentUnitCat === "temp") {
          if (u.key === "C") converted = baseVal;
          else if (u.key === "F") converted = baseVal * (9 / 5) + 32;
          else converted = baseVal + 273.15;
        } else {
          converted = baseVal / u.factor;
        }
      }

      const displayStr = valid ? formatUnitValue(converted) : "---";
      const card = document.createElement("div");
      card.className = "unit-result-card" + (u.key === fromKey ? " active" : "");

      const top = document.createElement("div");
      top.className = "unit-result-top";
      const labelEl = document.createElement("span");
      labelEl.textContent = u.label;
      const cpBtn = document.createElement("button");
      cpBtn.type = "button";
      cpBtn.className = "mini-btn";
      cpBtn.textContent = "コピー";
      cpBtn.addEventListener("click", () => {
        if (valid) copyToClipboard(displayStr.replace(/,/g, ""), cpBtn, "コピー");
      });
      top.append(labelEl, cpBtn);

      const valEl = document.createElement("div");
      valEl.className = "unit-result-val mono";
      valEl.textContent = displayStr;

      card.append(top, valEl);
      unitResultsGrid.appendChild(card);
    });
  }

  unitCatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      unitCatBtns.forEach((b) => b.classList.toggle("active", b === btn));
      populateUnitSelect(btn.dataset.unitCat);
      renderUnitConversions();
    });
  });

  unitValInput.addEventListener("input", renderUnitConversions);
  unitFromSelect.addEventListener("change", renderUnitConversions);
  unitClearBtn.addEventListener("click", () => {
    unitValInput.value = "";
    renderUnitConversions();
    unitValInput.focus();
  });

  populateUnitSelect("data");
  renderUnitConversions();

  // 初期表示とハッシュ変更によるツール切り替え
  function syncToolFromHash() {
    const hashId = location.hash.replace("#", "");
    switchTool(allToolIds.includes(hashId) ? hashId : "home");
  }
  window.addEventListener("hashchange", syncToolFromHash);
  syncToolFromHash();
});
// === END OF SCRIPT.JS ===
