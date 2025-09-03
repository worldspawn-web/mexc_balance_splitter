/* background.js - MV3 service worker */
const HOST_NAME = "mexc.balance.calculator";

function computeLocally(balance, decimals) {
  const one = balance * 0.01;
  const per = one / 3;
  const factor = Math.pow(10, decimals ?? 2);
  const oneRounded = Math.round(one * factor) / factor;
  let legs = [per, per, per].map((v) => Math.round(v * factor) / factor);

  // ensure sum equals rounded 1%
  let sum = legs.reduce((a, b) => a + b, 0);
  let diffUnits = Math.round((oneRounded - sum) * factor);
  for (let i = 0; i < Math.abs(diffUnits); i++) {
    legs[i % 3] += (diffUnits > 0 ? 1 : -1) / factor;
  }
  return { onePercent: oneRounded, legs };
}

async function computeViaNative(balance, decimals) {
  const payload = { action: "compute", balance, decimals: decimals ?? 2 };

  try {
    if (browser?.runtime?.sendNativeMessage) {
      return await browser.runtime.sendNativeMessage(HOST_NAME, payload);
    }
  } catch (_e) {
    // ignore and try chrome-fallback
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({
            __error: chrome.runtime.lastError?.message || "No response",
          });
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      resolve({ __error: e?.message || String(e) });
    }
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "compute") {
    (async () => {
      // try native first
      let result = await computeViaNative(msg.balance, msg.decimals);
      if (!result || result.__error) {
        result = computeLocally(msg.balance, msg.decimals);
        result.__note = "Native host unavailable; computed locally in JS.";
      }
      sendResponse(result);
    })();
    return true; // async
  }
});
