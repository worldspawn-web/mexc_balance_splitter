/* content.js (fixed: ignore overlay subtree, robust selector resolution) */
(function () {
  const ext = window.browser || window.chrome;
  const OVERLAY_ID = "mbs-overlay";
  const STORAGE_KEY = "mbs_settings";

  if (document.getElementById(OVERLAY_ID)) return; // prevent double-inject

  // --- UI overlay ---
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("data-mbs-overlay-root", ""); // mark subtree
  overlay.innerHTML = `
    <div id="mbs-header">
      <div class="mbs-pill">MEXC</div>
      <div id="mbs-title">1% Splitter</div>
      <button id="mbs-toggle" class="mbs-btn" title="Show/Hide settings">⚙</button>
      <button id="mbs-close" class="mbs-btn" title="Close">✕</button>
    </div>
    <div id="mbs-body">
      <div id="mbs-rows">
        <div class="mbs-label">Detected balance</div>
        <div class="mbs-value" id="mbs-balance">—</div>

        <div class="mbs-label">1% of balance</div>
        <div class="mbs-value" id="mbs-one">—</div>

        <div class="mbs-label">Leg A</div>
        <div class="mbs-value"><span id="mbs-leg1">—</span> <button data-copy="mbs-leg1" class="mbs-btn">Copy</button></div>

        <div class="mbs-label">Leg B</div>
        <div class="mbs-value"><span id="mbs-leg2">—</span> <button data-copy="mbs-leg2" class="mbs-btn">Copy</button></div>

        <div class="mbs-label">Leg C</div>
        <div class="mbs-value"><span id="mbs-leg3">—</span> <button data-copy="mbs-leg3" class="mbs-btn">Copy</button></div>
      </div>

      <div id="mbs-actions">
        <button id="mbs-pick" class="mbs-btn" title="Pick the balance element on the page">Pick element</button>
        <button id="mbs-refresh" class="mbs-btn" title="Re-read balance now">Refresh</button>
        <button id="mbs-copy-all" class="mbs-btn" title="Copy A/B/C as JSON">Copy A/B/C</button>
      </div>

      <div id="mbs-settings">
        <label class="mbs-label">CSS selector for balance element
          <input id="mbs-selector" type="text" placeholder="e.g. [data-balance] or .available-amount" />
        </label>
        <label class="mbs-label">Rounding decimals
          <input id="mbs-decimals" type="number" min="0" max="8" step="1" value="2" />
        </label>
        <div id="mbs-hint">Tip: Use "Pick element" to auto-fill the selector. The widget stores settings per-domain.</div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(overlay);

  // helpers to avoid overlay collisions
  const isInsideOverlay = (el) => !!el && (el === overlay || overlay.contains(el));

  // Draggable header
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
    one: overlay.querySelector("#mbs-one"),
    l1: overlay.querySelector("#mbs-leg1"),
    l2: overlay.querySelector("#mbs-leg2"),
    l3: overlay.querySelector("#mbs-leg3"),
    sel: overlay.querySelector("#mbs-selector"),
    dec: overlay.querySelector("#mbs-decimals"),
    set: overlay.querySelector("#mbs-settings"),
    toggle: overlay.querySelector("#mbs-toggle"),
    close: overlay.querySelector("#mbs-close"),
    pick: overlay.querySelector("#mbs-pick"),
    refresh: overlay.querySelector("#mbs-refresh"),
    copyAll: overlay.querySelector("#mbs-copy-all"),
  };

  // Load & persist settings (per-domain)
  const defaultSettings = { selector: "", decimals: 2, panelPos: { top: 12, left: 12 } };
  let settings = { ...defaultSettings };

  async function loadSettings() {
    return new Promise((resolve) => {
      try {
        const key = STORAGE_KEY + "|" + location.host;
        (ext.storage?.local || ext.storage).get(key, (res) => {
          settings = res[key] || { ...defaultSettings };
          els.sel.value = settings.selector || "";
          els.dec.value = settings.decimals ?? 2;
          if (settings.panelPos) {
            overlay.style.top = settings.panelPos.top + "px";
            overlay.style.left = settings.panelPos.left + "px";
          }
          resolve();
        });
      } catch (_e) { resolve(); }
    });
  }

  async function saveSettings() {
    return new Promise((resolve) => {
      try {
        const rect = overlay.getBoundingClientRect();
        settings.selector = els.sel.value.trim();
        settings.decimals = Math.max(0, Math.min(8, parseInt(els.dec.value || "2", 10)));
        settings.panelPos = { top: Math.round(rect.top), left: Math.round(rect.left) };
        const key = STORAGE_KEY + "|" + location.host;
        const obj = {}; obj[key] = settings;
        (ext.storage?.local || ext.storage).set(obj, () => resolve());
      } catch (_e) { resolve(); }
    });
  }

  // UI actions
  els.toggle.addEventListener("click", () => {
    els.set.style.display = els.set.style.display === "none" ? "block" : "none";
  });
  els.close.addEventListener("click", () => overlay.remove());
  els.sel.addEventListener("change", saveSettings);
  els.dec.addEventListener("change", () => { saveSettings(); computeAndRender(); });

  overlay.querySelectorAll("button[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-copy");
      const txt = overlay.querySelector("#" + id)?.textContent?.trim() || "";
      navigator.clipboard?.writeText(txt);
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 1200);
    });
  });
  els.copyAll.addEventListener("click", () => {
    const data = {
      legA: overlay.querySelector("#mbs-leg1")?.textContent?.trim(),
      legB: overlay.querySelector("#mbs-leg2")?.textContent?.trim(),
      legC: overlay.querySelector("#mbs-leg3")?.textContent?.trim(),
    };
    navigator.clipboard?.writeText(JSON.stringify(data));
    els.copyAll.textContent = "Copied JSON";
    setTimeout(() => (els.copyAll.textContent = "Copy A/B/C"), 1200);
  });

  // Element picker (overlay is click-through while picking)
  let picking = false;
  let lastHover;
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return "";
    const path = [];
    while (el && el.nodeType === 1) {
      let sel = el.nodeName.toLowerCase();
      if (el.id) { sel += "#" + el.id; path.unshift(sel); break; }
      let sib = el, nth = 1;
      while ((sib = sib.previousElementSibling)) {
        if (sib.nodeName.toLowerCase() === sel) nth++;
      }
      sel += `:nth-of-type(${nth})`;
      path.unshift(sel);
      el = el.parentElement;
    }
    return path.join(" > ");
  }
  function highlight(el, on) {
    if (!el) return;
    if (on) { el.__mbs_prevOutline = el.style.outline; el.style.outline = "2px solid #8aa8ff"; }
    else if ("__mbs_prevOutline" in el) { el.style.outline = el.__mbs_prevOutline; delete el.__mbs_prevOutline; }
  }
  els.pick.addEventListener("click", () => {
    picking = true;
    overlay.style.pointerEvents = "none";
    document.body.style.cursor = "crosshair";
  });
  document.addEventListener("mousemove", (e) => {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== lastHover) {
      highlight(lastHover, false);
      lastHover = el;
      highlight(lastHover, true);
    }
  }, true);
  document.addEventListener("click", async (e) => {
    if (!picking) return;
    e.preventDefault(); e.stopPropagation();
    picking = false;
    document.body.style.cursor = "";
    overlay.style.pointerEvents = "";
    highlight(lastHover, false);
    if (isInsideOverlay(lastHover)) return; // never allow picking overlay
    const sel = cssPath(lastHover);
    els.sel.value = sel;
    await saveSettings();
    computeAndRender();
  }, true);

  // Balance parsing
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
    for (const el of list) {
      if (!isInsideOverlay(el)) return el;
    }
    return null;
  }

  function findBalanceElement(selector) {
    // 1) exact selector outside overlay
    const bySel = resolveBySelector(selector);
    if (bySel) return bySel;

    // 2) heuristic search, but skip the overlay subtree
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
      // if element got detached or became part of overlay accidentally, re-resolve
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
    try {
      if (!el || isInsideOverlay(el)) return;
      const val = parseBalanceFromText(el.textContent || "");
      if (val !== null && val !== currentBalance) {
        currentBalance = val;
        els.balance.textContent = String(val);
        computeAndRender();
      }
    } catch (_e) {}
  }

  function computeAndRender() {
    if (currentBalance == null) return;
    const decimals = Math.max(0, Math.min(8, parseInt(els.dec.value || "2", 10)));
    try {
      ext.runtime.sendMessage(
        { type: "compute", balance: currentBalance, decimals },
        (resp) => {
          if (!resp) return;
          const one = resp.onePercent ?? currentBalance * 0.01;
          const [a, b, c] = resp.legs ?? [one / 3, one / 3, one / 3];
          els.one.textContent = one.toFixed(decimals);
          els.l1.textContent = a.toFixed(decimals);
          els.l2.textContent = b.toFixed(decimals);
          els.l3.textContent = c.toFixed(decimals);
        }
      );
    } catch (_e) {}
  }

  async function bootstrap() {
    await loadSettings();
    const el = findBalanceElement(settings.selector);
    if (el) { observe(el); updateBalance(el); }

    // If balance still unknown, retry periodically
    setInterval(() => {
      if (currentBalance == null) {
        const el2 = findBalanceElement(settings.selector);
        if (el2) { observe(el2); updateBalance(el2); }
      }
    }, 2000);

    els.refresh.addEventListener("click", () => {
      const el3 = findBalanceElement(settings.selector);
      if (el3) { observe(el3); updateBalance(el3); }
    });
  }

  bootstrap();
})();
