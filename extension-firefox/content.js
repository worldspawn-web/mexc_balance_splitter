/* content.js — добавлены настройки процента и шагов + обновлён UI */
(function () {
  const ext = window.browser || window.chrome;
  const OVERLAY_ID = "mbs-overlay";
  const STORAGE_KEY = "mbs_settings";

  if (document.getElementById(OVERLAY_ID)) return;

  // ---------- UI ----------
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("data-mbs-overlay-root", "");
  overlay.innerHTML = `
    <div id="mbs-header">
      <div id="mbs-accent-dot" aria-hidden="true"></div>
      <div id="mbs-title">Balance Splitter</div>
      <button id="mbs-toggle" class="mbs-btn icon" title="Settings" aria-label="Settings">⚙</button>
      <button id="mbs-close" class="mbs-btn icon" title="Close" aria-label="Close">✕</button>
    </div>

    <div id="mbs-body">
      <div id="mbs-summary">
        <div class="row">
          <div class="label">Detected balance</div>
          <div class="value" id="mbs-balance">—</div>
        </div>
        <div class="row">
          <div class="label"><span id="mbs-percent-label">1</span>% of balance</div>
          <div class="value" id="mbs-target">—</div>
        </div>
      </div>

      <div id="mbs-legs"></div>

      <div id="mbs-actions">
        <button id="mbs-pick" class="mbs-btn">Pick element</button>
        <button id="mbs-refresh" class="mbs-btn">Refresh</button>
        <button id="mbs-copy-all" class="mbs-btn">Copy legs (JSON)</button>
      </div>

      <div id="mbs-settings">
        <div class="setcol">
          <label class="mbs-label">CSS selector
            <input id="mbs-selector" type="text" placeholder="e.g. [data-balance] or .available-amount" />
          </label>

          <div class="twocol">
            <label class="mbs-label">Percent
              <input id="mbs-percent" type="number" min="0" max="100" step="0.1" value="1" />
            </label>
            <label class="mbs-label">Steps
              <input id="mbs-steps" type="number" min="1" max="20" step="1" value="3" />
            </label>
          </div>

          <div class="twocol">
            <label class="mbs-label">Decimals
              <input id="mbs-decimals" type="number" min="0" max="8" step="1" value="2" />
            </label>
            <label class="mbs-label">Accent color
              <input id="mbs-accent" type="color" value="#1e90ff" />
            </label>
          </div>

          <div id="mbs-hint">Tip: pick the balance element on the page, then adjust percent/steps. Settings are stored per-domain.</div>
        </div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(overlay);

  // ---------- Theming (glass + dark + accent) ----------
  // Можно позже менять акцент под биржу.
  const rootStyle = overlay.style;
  const isInsideOverlay = (el) => !!el && (el === overlay || overlay.contains(el));

  // ---------- Drag ----------
  (function makeDraggable() {
    const header = overlay.querySelector("#mbs-header");
    let startX = 0, startY = 0, origX = 0, origY = 0, dragging = false;
    header.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = overlay.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      overlay.style.left = Math.max(6, origX + dx) + "px";
      overlay.style.top  = Math.max(6, origY + dy) + "px";
    });
    document.addEventListener("mouseup", async () => {
      if (!dragging) return;
      dragging = false;
      await saveSettings();
    });
  })();

  const els = {
    balance: overlay.querySelector("#mbs-balance"),
    target: overlay.querySelector("#mbs-target"),
    legsWrap: overlay.querySelector("#mbs-legs"),
    percentLabel: overlay.querySelector("#mbs-percent-label"),

    sel: overlay.querySelector("#mbs-selector"),
    dec: overlay.querySelector("#mbs-decimals"),
    percent: overlay.querySelector("#mbs-percent"),
    steps: overlay.querySelector("#mbs-steps"),
    accent: overlay.querySelector("#mbs-accent"),

    set: overlay.querySelector("#mbs-settings"),
    toggle: overlay.querySelector("#mbs-toggle"),
    close: overlay.querySelector("#mbs-close"),
    pick: overlay.querySelector("#mbs-pick"),
    refresh: overlay.querySelector("#mbs-refresh"),
    copyAll: overlay.querySelector("#mbs-copy-all"),
    accentDot: overlay.querySelector("#mbs-accent-dot"),
  };

  // ---------- Settings ----------
  const defaultSettings = {
    selector: "",
    decimals: 2,
    percent: 1,
    steps: 3,
    accent: "#1e90ff" // MEXC-синий по умолчанию (можно настроить)
  };
  let settings = { ...defaultSettings };

  function storageKey() { return `${STORAGE_KEY}|${location.host}`; }

  async function loadSettings() {
    return new Promise((resolve) => {
      try {
        (ext.storage?.local || ext.storage).get(storageKey(), (res) => {
          settings = res[storageKey()] || { ...defaultSettings };
          els.sel.value = settings.selector || "";
          els.dec.value = settings.decimals ?? 2;
          els.percent.value = settings.percent ?? 1;
          els.steps.value = settings.steps ?? 3;
          els.accent.value = settings.accent || defaultSettings.accent;
          applyAccent(els.accent.value);
          els.percentLabel.textContent = String(els.percent.value || 1);
          resolve();
        });
      } catch (_e) { resolve(); }
    });
  }

  async function saveSettings() {
    return new Promise((resolve) => {
      try {
        settings.selector = els.sel.value.trim();
        settings.decimals = clampInt(els.dec.value, 0, 8, 2);
        settings.percent = clampNumber(els.percent.value, 0, 100, 1);
        settings.steps = clampInt(els.steps.value, 1, 20, 3);
        settings.accent = els.accent.value || defaultSettings.accent;
        const obj = {}; obj[storageKey()] = settings;
        (ext.storage?.local || ext.storage).set(obj, () => resolve());
      } catch (_e) { resolve(); }
    });
  }

  function clampInt(v, min, max, def) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, n));
    }
  function clampNumber(v, min, max, def) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, n));
  }

  function applyAccent(hex) {
    overlay.style.setProperty("--mbs-accent", hex);
  }

  // UI actions
  els.toggle.addEventListener("click", () => {
    const show = els.set.style.display !== "block";
    els.set.style.display = show ? "block" : "none";
  });
  els.close.addEventListener("click", () => overlay.remove());

  [els.sel, els.dec, els.percent, els.steps, els.accent].forEach((input) => {
    input.addEventListener("change", async () => {
      if (input === els.accent) applyAccent(els.accent.value);
      await saveSettings();
      if (input === els.percent) {
        els.percentLabel.textContent = String(els.percent.value || 1);
      }
      computeAndRender();
    });
  });

  els.copyAll.addEventListener("click", () => {
    const legs = Array.from(overlay.querySelectorAll(".leg .value"))
      .map((el) => el.textContent.trim());
    const data = { percent: Number(els.percent.value || 1), steps: Number(els.steps.value || 3), legs };
    navigator.clipboard?.writeText(JSON.stringify(data));
    els.copyAll.textContent = "Copied JSON";
    setTimeout(() => (els.copyAll.textContent = "Copy legs (JSON)"), 1200);
  });

  // ---------- Element picker ----------
  let picking = false, lastHover;
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return "";
    const path = [];
    while (el && el.nodeType === 1) {
      let sel = el.nodeName.toLowerCase();
      if (el.id) { sel += "#" + el.id; path.unshift(sel); break; }
      let sib = el, nth = 1;
      while ((sib = sib.previousElementSibling)) if (sib.nodeName.toLowerCase() === sel) nth++;
      sel += `:nth-of-type(${nth})`;
      path.unshift(sel);
      el = el.parentElement;
    }
    return path.join(" > ");
  }
  function highlight(el, on) {
    if (!el) return;
    if (on) { el.__mbs_prevOutline = el.style.outline; el.style.outline = "2px solid var(--mbs-accent, #1e90ff)"; }
    else if ("__mbs_prevOutline" in el) { el.style.outline = el.__mbs_prevOutline; delete el.__mbs_prevOutline; }
  }
  els.pick.addEventListener("click", () => {
    picking = true; overlay.style.pointerEvents = "none"; document.body.style.cursor = "crosshair";
  });
  document.addEventListener("mousemove", (e) => {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== lastHover) { highlight(lastHover, false); lastHover = el; highlight(lastHover, true); }
  }, true);
  document.addEventListener("click", async (e) => {
    if (!picking) return;
    e.preventDefault(); e.stopPropagation();
    picking = false; document.body.style.cursor = ""; overlay.style.pointerEvents = ""; highlight(lastHover, false);
    if (lastHover && !isInsideOverlay(lastHover)) {
      els.sel.value = cssPath(lastHover);
      await saveSettings();
      computeAndRender();
    }
  }, true);

  // ---------- Balance parsing ----------
  function parseBalanceFromText(txt) {
    if (!txt) return null;
    txt = txt.replace(/\s+/g, " ").trim();
    txt = txt.replace(/(USDT|USD|\$)/gi, "");
    const m = txt.match(/[-+]?\d{1,3}(?:[ ,.]?\d{3})*(?:[.,]\d+)?/);
    if (!m) return null;
    let num = m[0].replace(/ /g, "");
    if (num.includes(",") && num.includes(".")) num = num.replace(/,/g, "");
    else if (num.includes(",")) num = num.replace(",", ".");
    num = num.replace(/,/g, "");
    const val = parseFloat(num);
    return Number.isFinite(val) ? val : null;
  }
  function resolveBySelector(selector) {
    if (!selector) return null;
    let list;
    try { list = Array.from(document.querySelectorAll(selector)); } catch (_e) { return null; }
    for (const el of list) if (!isInsideOverlay(el)) return el;
    return null;
  }
  function findBalanceElement(selector) {
    const bySel = resolveBySelector(selector);
    if (bySel) return bySel;
    const candidates = Array.from(
      document.querySelectorAll('[class*="available"],[class*="balance"],[data-balance],span,div')
    ).slice(0, 2000);
    for (const el of candidates) {
      if (isInsideOverlay(el)) continue;
      const txt = (el.textContent || "").toLowerCase();
      if (/(available|balance|доступно|баланс|equity|assets)/.test(txt)) {
        const val = parseBalanceFromText(el.textContent);
        if (val !== null && val > 0) return el;
      }
    }
    return null;
  }

  let currentBalance = null;
  let observedEl = null;
  let observer = null;

  function observe(el) {
    if (observer) observer.disconnect();
    observedEl = el;
    observer = new MutationObserver(() => {
      if (!observedEl || !document.contains(observedEl) || isInsideOverlay(observedEl)) {
        const re = findBalanceElement(settings.selector);
        if (re) { observe(re); updateBalance(re); }
        return;
      }
      updateBalance(observedEl);
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
  }

  function updateBalance(el) {
    const val = parseBalanceFromText(el?.textContent || "");
    if (val !== null && val !== currentBalance) {
      currentBalance = val;
      els.balance.textContent = String(val);
      computeAndRender();
    }
  }

  // Локальный фолбэк
  function localCompute(balance, percent, steps, decimals) {
    const d = Math.max(0, Math.min(8, Math.floor(Number(decimals) || 2)));
    const p = Math.max(0, Number(percent) || 0);
    const n = Math.max(1, Math.floor(Number(steps) || 1));
    const factor = Math.pow(10, d);
    const target = Math.round(balance * (p / 100) * factor) / factor;
    const base = target / n;
    let legs = Array.from({ length: n }, () => Math.round(base * factor) / factor);
    let sum = legs.reduce((a, b) => a + b, 0);
    let diffUnits = Math.round((target - sum) * factor);
    for (let i = 0; i < Math.abs(diffUnits); i++) legs[i % n] += (diffUnits > 0 ? 1 : -1) / factor;
    return { target, legs };
  }

  function renderLegs(legs, decimals) {
    els.legsWrap.innerHTML = "";
    legs.forEach((v, i) => {
      const row = document.createElement("div");
      row.className = "leg";
      row.innerHTML = `
        <div class="label">Leg ${i + 1}</div>
        <div class="value">${Number(v).toFixed(decimals)}</div>
        <button class="mbs-btn ghost" data-copy="${i}">Copy</button>
      `;
      els.legsWrap.appendChild(row);
    });
    els.legsWrap.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-copy"));
        const value = els.legsWrap.querySelectorAll(".leg .value")[idx]?.textContent?.trim() || "";
        navigator.clipboard?.writeText(value);
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      });
    });
  }

  function computeAndRender() {
    if (currentBalance == null) return;
    const decimals = clampInt(els.dec.value, 0, 8, 2);
    const percent = clampNumber(els.percent.value, 0, 100, 1);
    const steps = clampInt(els.steps.value, 1, 20, 3);

    // подпись «x% of balance»
    els.percentLabel.textContent = String(percent);

    let done = false;
    // таймаут-фолбэк
    const fallbackTimer = setTimeout(() => {
      if (done) return;
      const { target, legs } = localCompute(currentBalance, percent, steps, decimals);
      els.target.textContent = Number(target).toFixed(decimals);
      renderLegs(legs, decimals);
      done = true;
    }, 400);

    try {
      ext.runtime.sendMessage(
        { type: "compute", balance: currentBalance, percent, steps, decimals },
        (resp) => {
          if (done) return;
          clearTimeout(fallbackTimer);

          let target, legs;
          if (!resp || !Number.isFinite(resp.target) || !Array.isArray(resp.legs)) {
            ({ target, legs } = localCompute(currentBalance, percent, steps, decimals));
          } else {
            target = Number(resp.target);
            legs = resp.legs.map(Number);
          }
          els.target.textContent = target.toFixed(decimals);
          renderLegs(legs, decimals);
          done = true;
        }
      );
    } catch (_e) {
      // фолбэк сработает
    }
  }

  async function bootstrap() {
    await loadSettings();
    applyAccent(settings.accent || defaultSettings.accent);

    // CSS-переменные (для ситуации если overlay.css ещё не обновлён)
    overlay.style.setProperty("--mbs-accent", settings.accent || defaultSettings.accent);

    const el = findBalanceElement(settings.selector);
    if (el) { observe(el); updateBalance(el); }
    els.refresh.addEventListener("click", () => {
      const el2 = findBalanceElement(settings.selector);
      if (el2) { observe(el2); updateBalance(el2); }
    });
  }

  bootstrap();
})();
