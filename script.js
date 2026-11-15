document.addEventListener("DOMContentLoaded", () => {
  const htmlEl = document.documentElement;
  const themeButtons = document.querySelectorAll(".theme-btn");
  const sizeButtons = document.querySelectorAll(".size-btn");
  const menuToggleBtn = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toolLinks = document.querySelectorAll(".tool-link");
  const toolPanels = document.querySelectorAll(".tool-panel");

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
  // 2. ツール切り替え＆モバイルメニュー
  // ==========================================
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
    toolLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.tool === toolId);
    });
    toolPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `panel-${toolId}`);
    });
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  toolLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.dataset.tool;
      history.replaceState(null, "", `#${id}`);
      switchTool(id);
    });
  });

  const initialHash = location.hash.replace("#", "");
  if (["clock", "calc", "stopwatch"].includes(initialHash)) {
    switchTool(initialHash);
  }

  // ==========================================
  // 3. デジタル時計
  // ==========================================
  const clockDateEl = document.getElementById("clock-date");
  const clockTimeEl = document.getElementById("clock-time");
  const clockUnixEl = document.getElementById("clock-unix");
  const clockBox = document.getElementById("clock-display-box");
  const fullscreenBtn = document.getElementById("clock-fullscreen-btn");
  const copyUnixBtn = document.getElementById("copy-unix-btn");
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const w = weekDays[now.getDay()];
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    clockDateEl.textContent = `${y}/${m}/${d} (${w})`;
    clockTimeEl.textContent = `${hh}:${mm}:${ss}`;
    clockUnixEl.textContent = Math.floor(now.getTime() / 1000);

    setTimeout(updateClock, 1000 - (now.getMilliseconds()));
  }
  updateClock();

  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      clockBox.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  copyUnixBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(clockUnixEl.textContent).then(() => {
      copyUnixBtn.textContent = "完了";
      setTimeout(() => (copyUnixBtn.textContent = "コピー"), 1200);
    });
  });

  // ==========================================
  // 4. 電卓（安全な数式パーサー搭載）
  // ==========================================
  const calcInput = document.getElementById("calc-input");
  const calcExpr = document.getElementById("calc-expr");
  const calcHistoryEl = document.getElementById("calc-history");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  let justEvaluated = false;

  function safeEvaluate(expr) {
    const cleaned = expr.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    if (!/^[0-9+\-*/().]+$/.test(cleaned)) throw new Error("Invalid");

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
      let val = parseFactor();
      while (cleaned[pos] === "*" || cleaned[pos] === "/") {
        const op = cleaned[pos++];
        const right = parseFactor();
        if (op === "/" && right === 0) throw new Error("ZeroDiv");
        val = op === "*" ? val * right : val / right;
      }
      return val;
    }
    function parseFactor() {
      if (cleaned[pos] === "+") { pos++; return parseFactor(); }
      if (cleaned[pos] === "-") { pos++; return -parseFactor(); }
      if (cleaned[pos] === "(") {
        pos++;
        const val = parseExpr();
        if (cleaned[pos++] !== ")") throw new Error("Paren");
        return val;
      }
      const start = pos;
      while (/[0-9.]/.test(cleaned[pos])) pos++;
      if (start === pos) throw new Error("Num");
      const num = Number(cleaned.slice(start, pos));
      if (Number.isNaN(num)) throw new Error("NaN");
      return num;
    }

    const res = parseExpr();
    if (pos !== cleaned.length || !Number.isFinite(res)) throw new Error("Syntax");
    return Math.round(res * 1e12) / 1e12;
  }

  function addHistory(expression, result) {
    const empty = calcHistoryEl.querySelector(".empty-msg");
    if (empty) empty.remove();

    const li = document.createElement("li");
    li.textContent = `${expression} = ${result}`;
    li.addEventListener("click", () => {
      calcInput.value = String(result);
      justEvaluated = true;
    });
    calcHistoryEl.prepend(li);
  }

  function handleCalcAction(val) {
    if (val === "C") {
      calcInput.value = "0";
      calcExpr.textContent = "";
      justEvaluated = false;
      return;
    }
    if (val === "BS") {
      if (calcInput.value.length <= 1 || calcInput.value === "エラー") {
        calcInput.value = "0";
      } else {
        calcInput.value = calcInput.value.slice(0, -1);
      }
      justEvaluated = false;
      return;
    }
    if (val === "=") {
      const raw = calcInput.value;
      try {
        const result = safeEvaluate(raw);
        calcExpr.textContent = `${raw} =`;
        calcInput.value = String(result);
        addHistory(raw, result);
        justEvaluated = true;
      } catch {
        calcInput.value = "エラー";
        justEvaluated = true;
      }
      return;
    }

    if (calcInput.value === "エラー") {
      calcInput.value = val;
      justEvaluated = false;
      return;
    }

    if (justEvaluated && /[0-9.(]/.test(val)) {
      calcInput.value = val;
    } else if (calcInput.value === "0" && /[0-9(]/.test(val)) {
      calcInput.value = val;
    } else {
      calcInput.value += val;
    }
    justEvaluated = false;
  }

  document.querySelectorAll(".calc-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleCalcAction(btn.dataset.val));
  });

  calcInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCalcAction("=");
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCalcAction("C");
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
});