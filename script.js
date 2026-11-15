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
  let currentTool = "clock";

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

  const initialHash = location.hash.replace("#", "");
  if (["clock", "calc", "stopwatch", "bpm", "base", "led", "rc", "device"].includes(initialHash)) {
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

  // 世界時計のカード枠を生成
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

  // 専用入力ビルダーを開く処理
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

  // 閉じ括弧の自動補完
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

    // 2秒以上空いたら自動リセット
    if (bpmAutoResetCheck.checked && tapTimes.length > 0) {
      if (now - tapTimes[tapTimes.length - 1] > 2000) {
        tapTimes = [];
      }
    }

    tapTimes.push(now);

    // ランプ点灯
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

  // 押した瞬間に反応させる（pointerdownでマウス・タッチ両対応）
  bpmTapBtn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    triggerBpmTap();
  });

  bpmResetBtn.addEventListener("click", resetBpm);

  // BPMタブ表示中のキーボードショートカット（Spaceでタップ、R/Escでリセット）
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
  // 7. 端末スペック表示（PC・スマホ対応）
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

    // ネットワーク情報
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const netType = conn ? `${conn.effectiveType || "不明"} (下り推定: ${conn.downlink ? conn.downlink + " Mbps" : "不明"})` : (navigator.onLine ? "オンライン（詳細非対応）" : "オフライン");

    // バッテリー情報
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

  // ==========================================
  // 8. 2・8・10・16進数変換
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

  // 簡易対応表 (0〜15) を生成
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
  // 9. LED 電流制限抵抗計算
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
  // 10. RCフィルター計算（3値のうち2入力で自動算出）
  // ==========================================
  const rcFields = {
    r: { input: document.getElementById("rc-r"), unit: document.getElementById("rc-r-unit") },
    c: { input: document.getElementById("rc-c"), unit: document.getElementById("rc-c-unit") },
    fc: { input: document.getElementById("rc-fc"), unit: document.getElementById("rc-fc-unit") }
  };
  const rcTauEl = document.getElementById("rc-tau");
  const rcClearBtn = document.getElementById("rc-clear-btn");

  // 直近にユーザーが手入力した最大2つのキーを保持
  let rcEditedOrder = [];

  function formatTau(sec) {
    if (!Number.isFinite(sec) || sec <= 0) return "---";
    if (sec >= 1) return `${sec.toPrecision(4)} s`;
    if (sec >= 1e-3) return `${(sec * 1e3).toPrecision(4)} ms`;
    if (sec >= 1e-6) return `${(sec * 1e6).toPrecision(4)} μs`;
    return `${(sec * 1e9).toPrecision(4)} ns`;
  }

  function updateRcFilter() {
    // 入力が空になったキーを履歴から除外
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
});