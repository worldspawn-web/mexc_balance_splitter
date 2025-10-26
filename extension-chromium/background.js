/* background.js — кроссбраузерный, MV2/MV3-совместимый */
const HOST_NAME = "mexc.balance.calculator";
const api = typeof browser !== "undefined" ? browser : chrome;

function computeLocally(balance, percent, steps, decimals) {
  const p = Math.max(0, Number(percent) || 0);
  const n = Math.max(1, Math.floor(Number(steps) || 1));
  const d = Math.max(0, Math.min(8, Math.floor(Number(decimals) || 2)));

  const factor = Math.pow(10, d);
  const target = Math.round(balance * (p / 100) * factor) / factor; // округляем общую сумму
  const base = target / n;

  // округляем каждую ногу
  let legs = Array.from({ length: n }, () => Math.round(base * factor) / factor);

  // корректируем, чтобы сумма ног === target
  let sum = legs.reduce((a, b) => a + b, 0);
  let diffUnits = Math.round((target - sum) * factor); // в минимальных единицах

  for (let i = 0; i < Math.abs(diffUnits); i++) {
    const idx = i % n;
    legs[idx] += (diffUnits > 0 ? 1 : -1) / factor;
  }

  return { target, legs };
}

async function computeViaNative(balance, percent, steps, decimals) {
  const payload = {
    action: "compute",
    balance,
    percent: Number(percent),
    steps: Math.floor(Number(steps)),
    decimals: Math.floor(Number(decimals)),
  };

  // Firefox-путь (browser.* вернёт промис), но безопасно и для Chromium
  try {
    if (api?.runtime?.sendNativeMessage && api !== chrome) {
      const resp = await api.runtime.sendNativeMessage(HOST_NAME, payload);
      return resp || null;
    }
  } catch (_e) {
    /* ignore */
  }

  // Chromium-стиль с callback
  return new Promise((resolve) => {
    try {
      api.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
        if (!response || (api.runtime.lastError && api.runtime.lastError.message)) {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    } catch (_e) {
      resolve(null);
    }
  });
}

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "compute") return;

  (async () => {
    const balance = Number(msg.balance);
    const percent = Number(msg.percent);
    const steps = Number(msg.steps);
    const decimals = Number(msg.decimals);

    // 1) пытаемся посчитать через native (если установлен и поддерживает новые поля)
    let result = await computeViaNative(balance, percent, steps, decimals);

    // Ожидаемый ответ нативки: { target, legs[] }
    const okNative =
      result &&
      Number.isFinite(result.target) &&
      Array.isArray(result.legs) &&
      result.legs.length > 0;

    if (!okNative) {
      // 2) локальный расчёт
      result = computeLocally(balance, percent, steps, decimals);
      result.__note = "Native host unavailable or incompatible; computed locally.";
    }

    try {
      sendResponse(result);
    } catch (_e) {
      /* ignore */
    }
  })();

  return true; // async
});
