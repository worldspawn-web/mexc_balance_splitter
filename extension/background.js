/* background.js (MV2) */
const HOST_NAME = "mexc.balance.calculator";
const api = typeof browser !== "undefined" ? browser : chrome;

function toFixedParts(balance, decimals) {
  const oneRaw = balance * 0.01;
  const factor = Math.pow(10, Number.isFinite(decimals) ? decimals : 2);
  const one = Math.round(oneRaw * factor) / factor;
  let leg = one / 3;
  let legs = [leg, leg, leg].map((v) => Math.round(v * factor) / factor);
  // корректируем, чтобы сумма === one
  let sum = legs.reduce((a, b) => a + b, 0);
  let diffUnits = Math.round((one - sum) * factor);
  for (let i = 0; i < Math.abs(diffUnits); i++) {
    legs[i % 3] += (diffUnits > 0 ? 1 : -1) / factor;
  }
  return { onePercent: one, legs };
}

async function computeViaNative(balance, decimals) {
  const payload = { action: "compute", balance, decimals: decimals ?? 2 };
  // Firefox-стиль
  if (api?.runtime?.sendNativeMessage && api !== chrome) {
    try {
      return await api.runtime.sendNativeMessage(HOST_NAME, payload);
    } catch (_e) {
      return null;
    }
  }
  // Chrome-стиль
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
    const decimals = Number.isFinite(Number(msg.decimals)) ? Number(msg.decimals) : 2;

    let result = null;
    // 1) пытаемся через native host
    result = await computeViaNative(balance, decimals);
    // 2) если не удалось — считаем локально
    if (!result) {
      result = toFixedParts(balance, decimals);
      result.__note = "Native host unavailable; computed locally in background.";
    }
    try { sendResponse(result); } catch (_e) {}
  })();

  return true; // async
});
