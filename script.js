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
  // 2. ツール切り替え＆バックグラウンド制御
  // ==========================================
  let currentTool = "clock";
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
    // ページを離れる際、バックグラウンド再生がOFFなら自動停止
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

  toolLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.dataset.tool;
      history.replaceState(null, "", `#${id}`);
      switchTool(id);
    });
  });

  const allToolIds = ["clock", "calc", "stopwatch", "bpm", "base", "led", "rc", "multivideo", "tonegen", "keymouse", "gamepad", "device"];
  const initialHash = location.hash.replace("#", "");
  if (allToolIds.includes(initialHash)) {
    switchTool(initialHash);
  }

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

  function pad(n) {
    return String(n).padStart(2, "0");
  }

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
      .replace(/(\d)(π|e|x|y|z|\(|asin|acos|atan|sin|cos|tan|log|ln|sqrt|abs|frac|diff|int|solve)/g, "$1*$2")
      .replace(/(\)|π|e|x|y|z)(\d|\(|π|e|x|y|z)/g, "$1*$2");

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
      const completed = autoCloseParens(calcInput.value);
      try {
        const result = safeEvaluate(completed);
        const fracText = toFractionString(result);
        calcExpr.textContent = `${completed} =`;
        calcInput.value = String(result);
        calcFracSub.textContent = fracText;
        addHistory(completed, result, fracText);
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

  calcInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCalcAction("EVAL");
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
      Object.values(baseInputs).forEach((el) => (el.value = ""));
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

  function calculateLedResistor() {
    const vcc = parseFloat(ledVccEl.value);
    const vf = parseFloat(ledVfEl.value);
    const ifMa = parseFloat(ledIfEl.value);
    const count = parseInt(ledCountEl.value, 10) || 1;

    if (Number.isNaN(vcc) || Number.isNaN(vf) || Number.isNaN(ifMa)) {
      ledResOhmEl.textContent = "--- Ω";
      ledResE24El.textContent = "---";
      ledResWattEl.textContent = "--- mW";
      ledErrorEl.textContent = "";
      return;
    }

    if (ifMa <= 0 || count < 1) {
      ledErrorEl.textContent = "電流と個数は1以上の正の数値を入力してください。";
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
          renderTgChannels();
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

  tgToggleBtn.addEventListener("click", () => {
    if (!tgPlaying) {
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
    } else {
      stopAllToneGen();
    }
  });

  // ==========================================
  // 12. キーボード・マウス動作確認（Caps / RShift / PrtSc 修正版）
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

  // JISキーボードや特殊キーの物理コード正規化
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

    kmLastKeyEl.textContent = `${displayKey} (${code} / loc:${e.location})`;

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

    // CapsLockは環境によってkeyupが来ないことがあるため自動リリース予約
    if (code === "CapsLock") {
      setTimeout(() => releaseKey("CapsLock"), 160);
    }
  }, true);

  window.addEventListener("keyup", (e) => {
    if (currentTool !== "keymouse") return;
    if (kmPreventCheck.checked) e.preventDefault();

    const code = normalizeKeyCode(e);

    // WindowsのPrintScreenや一部環境のCapsLockのようにkeydownなしでkeyupのみ飛ぶキーを救済
    if (!activeKeyCodes.has(code)) {
      recordKeyPress(e, code);
      setTimeout(() => releaseKey(code), 160);
      return;
    }

    releaseKey(code);
  }, true);

  window.addEventListener("blur", () => {
    activeKeyCodes.forEach((code) => {
      const keyEl = keyDomMap.get(code);
      if (keyEl) keyEl.classList.remove("active");
    });
    activeKeyCodes.clear();
    updateKeyCounts();
  });

  // マウス移動＆ポーリングレート計測
  let lastMouseTs = 0;
  let mouseIntervals = [];
  let maxMouseHz = 0;
  let mouseIdleTimer = null;

  function calcMedianHz(intervals) {
    if (intervals.length < 3) return null;
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median <= 0) return null;
    return Math.round(1000 / median);
  }

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
    const box = document.getElementById(`mbtn-${e.button}`);
    const svgPart = document.getElementById(`msvg-${e.button}`);
    if (box) box.classList.remove("active");
    if (svgPart) svgPart.classList.remove("active");
  });

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
  // 13. コントローラー動作確認（DualSenseビジュアル・ドリフト診断・軌道記録）
  // ==========================================
  const gpSelect = document.getElementById("gp-select");
  const gpRescanBtn = document.getElementById("gp-rescan-btn");
  const gpVibrateBtn = document.getElementById("gp-vibrate-btn");
  const gpEmptyCard = document.getElementById("gp-empty-card");
  const gpEnvStatusEl = document.getElementById("gp-env-status");
  const gpActiveArea = document.getElementById("gp-active-area");
  const gpNameEl = document.getElementById("gp-name");
  const gpMappingEl = document.getElementById("gp-mapping");

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

  // スティック軌道履歴と最大到達度
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
  window.addEventListener("gamepaddisconnected", refreshGamepadList);
  gpRescanBtn.addEventListener("click", refreshGamepadList);

  // テストモードの色リセット
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

  // スティック軌道クリア
  gpClearTrailBtn.addEventListener("click", () => {
    trailL = [];
    trailR = [];
    maxReachL = 0;
    maxReachR = 0;
  });

  // スティック軌道＆現在位置をCanvasへ描画
  function drawStickCanvas(canvas, x, y, trail) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 78;

    ctx.clearRect(0, 0, w, h);

    // 外周円・デッドゾーン目安円・十字線
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;

    // 外周 (1.0)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // ドリフト警告ライン (0.12)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.12, 0, Math.PI * 2);
    ctx.stroke();

    // 十字線
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // 軌道の描画
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

    // 現在のスティック位置ドット
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
      }

      const selectedIdx = parseInt(gpSelect.value, 10);
      const pad = pads.find((p) => p.index === selectedIdx) || pads[0];

      if (pad) {
        gpEmptyCard.classList.add("hidden");
        gpActiveArea.classList.remove("hidden");
        gpNameEl.textContent = pad.id;
        gpMappingEl.textContent = pad.mapping || "non-standard (Raw HID)";
        gpVibrateBtn.disabled = !pad.vibrationActuator;

        // スティック座標取得（DualSense Raw HID 接続時の軸補正含む）
        const lx = pad.axes[0] || 0;
        const ly = pad.axes[1] || 0;
        const rx = pad.axes[2] || 0;
        const useAxis5ForRy = pad.mapping !== "standard" && pad.axes.length >= 6 && Math.abs(pad.axes[5]) < 0.5 && Math.abs(pad.axes[3]) > 0.8;
        const ry = useAxis5ForRy ? (pad.axes[5] || 0) : (pad.axes[3] || 0);

        // 軌道ポイント追加（前回位置から少しでも動いたら記録）
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

        // L2 / R2 アナログトリガー押し込み量メーター更新
        const l2Val = pad.buttons[6] ? pad.buttons[6].value : 0;
        const r2Val = pad.buttons[7] ? pad.buttons[7].value : 0;
        gpL2ValEl.textContent = `${(l2Val * 100).toFixed(1)}% (${l2Val.toFixed(5)})`;
        gpL2BarEl.style.width = `${l2Val * 100}%`;
        gpR2ValEl.textContent = `${(r2Val * 100).toFixed(1)}% (${r2Val.toFixed(5)})`;
        gpR2BarEl.style.width = `${r2Val * 100}%`;

        // SVGコントローラー図の各ボタン更新
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

        // 全アナログ軸 (Axes) 詳細生値更新
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

        // 全ボタン詳細生値更新
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

  // コントローラーのポーリングレート計測（pad.timestamp の更新間隔から算出）
  let lastPadTs = 0;
  let padIntervals = [];
  let maxPadHz = 0;
  let padIdleCount = 0;

  setInterval(() => {
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
  }, 1);

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
    if (/Edg\/([0-9.]+)/.test(ua)) return `Microsoft Edge ${RegExp.$1}`;
    if (/OPR\/([0-9.]+)/.test(ua)) return `Opera ${RegExp.$1}`;
    if (/Chrome\/([0-9.]+)/.test(ua) && !/Edg/.test(ua)) return `Google Chrome ${RegExp.$1}`;
    if (/Firefox\/([0-9.]+)/.test(ua)) return `Mozilla Firefox ${RegExp.$1}`;
    if (/Version\/([0-9.]+).*Safari/.test(ua)) return `Safari ${RegExp.$1}`;
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
        li.innerHTML = `<span class="spec-key">${k}</span><span class="spec-val">${v}</span>`;
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
    navigator.clipboard.writeText(latestSpecText).then(() => {
      deviceCopyBtn.textContent = "コピー完了";
      setTimeout(() => (deviceCopyBtn.textContent = "情報をコピー"), 1200);
    });
  });
});