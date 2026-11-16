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

    currentTool = toolId;
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

  [sidebarHomeLink, mobileHomeLink].forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      history.replaceState(null, "", "#home");
      switchTool("home");
    });
  });

  toolLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.dataset.tool;
      history.replaceState(null, "", `#${id}`);
      switchTool(id);
    });
  });

  const allToolIds = [
    "home", "clock", "calc", "stopwatch", "bpm",
    "base", "led", "rc", "multivideo", "tonegen",
    "keymouse", "gamepad", "device", "hash", "charcount", "barcode"
  ];
  const initialHash = location.hash.replace("#", "");
  if (allToolIds.includes(initialHash)) {
    switchTool(initialHash);
  } else {
    switchTool("home");
  }

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
      const id = card.dataset.tool;
      history.replaceState(null, "", `#${id}`);
      switchTool(id);
    });
  });

  // ==========================================
  // 3. デジタル時計（シンプル / 詳細・世界時計）
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
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  let clockDetailOpen = false;

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
      if (clockDetailOpen) renderWorldClocks(new Date());
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
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    clockDateEl.textContent = `${y}/${m}/${d} (${w})`;
    clockTimeEl.textContent = `${hh}:${mm}:${ss}`;

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
    navigator.clipboard.writeText(clockUnixEl.textContent).then(() => {
      copyUnixBtn.textContent = "完了";
      setTimeout(() => (copyUnixBtn.textContent = "コピー"), 1200);
    });
  });

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

  function safeEvaluate(expr, vars = getCurrentVars()) {
    let cleaned = autoCloseParens(expr)
      .replace(/\s+/g, "")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/√\(/g, "sqrt(")
      .replace(/d\/dx\(/g, "diff(")
      .replace(/∫\(/g, "int(");

    cleaned = cleaned
      .replace(/(\d)(π|e|x|y|z|\(\vert{}asin\vert{}acos\vert{}atan\vert{}sin\vert{}cos\vert{}tan\vert{}log\vert{}ln\vert{}sqrt\vert{}abs\vert{}frac\vert{}diff\vert{}int\vert{}solve)/g, "$1*$2") .replace(/(\)|π|e|x|y|z)(\d|\(|π|e|x|y|z)/g, "$1*$2");

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
      let val = parsePower();
      while (cleaned[pos] === "P" || cleaned[pos] === "C") {
        const op = cleaned[pos++];
        const right = parsePower();
        val = op === "P" ? perm(val, right) : comb(val, right);
      }
      return val;
    }

    function parsePower() {
      let base = parseUnary();
      if (cleaned[pos] === "^") {
        pos++;
        const exp = parsePower();
        base = Math.pow(base, exp);
      }
      return base;
    }

    function parseUnary() {
      if (cleaned[pos] === "+") { pos++; return parseUnary(); }
      if (cleaned[pos] === "-") { pos++; return -parseUnary(); }
      return parsePostfix();
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

      const start = pos;
      while (/[0-9.]/.test(cleaned[pos])) pos++;
      if (start === pos) throw new Error("Num");
      const num = Number(cleaned.slice(start, pos));
      if (Number.isNaN(num)) throw new Error("NaN");
      return num;
    }

    const res = parseExpr();
    if (pos !== cleaned.length || !Number.isFinite(res)) throw new Error("Syntax");
    return Math.round(res * 1e10) / 1e10;
  }

  function addHistory(expression, result, fracText) {
    const empty = calcHistoryEl.querySelector(".empty-msg");
    if (empty) empty.remove();

    const li = document.createElement("li");
    li.textContent = fracText ? `${expression} = ${result} (${fracText.replace("= ", "")})` : `${expression} = ${result}`;
    li.addEventListener("click", () => {
      calcInput.value = String(result);
      calcFracSub.textContent = fracText;
      justEvaluated = true;
    });
    calcHistoryEl.prepend(li);
  }

  function handleCalcAction(val) {
    if (!val) return;
    if (val === "C") {
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
      const completed = autoCloseParens(
