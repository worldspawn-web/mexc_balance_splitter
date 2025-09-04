<p align="center">
    <img src="public/preview.png" />
</p>

<h1 align="center">MEXC Balance Splitter</h1>

<p align="center">
    <i>Risk management is the key.</i>
</p>

## ✨ Features

- 📊 **Parse balance directly from the DOM** — no need for API keys.  
- 🧮 **Auto calculation**: 1% of balance → split into 3 equal legs.  
- 📋 **Copy buttons**: one-click copy for each leg or all three as JSON.  
- ⚙️ **Configurable**: pick any element with *Available Balance* via selector.  
- 🔢 **Rounding**: choose decimal precision.  
- 🪄 **Drag-and-drop overlay**: small widget floats above the MEXC UI.  
- 💻 **Optional Python Native Host**: provides high-precision calculations using `Decimal`. (Fallback to JavaScript is built-in.)

## 🔒 Privacy
- ✅ No data collection.
- ✅ No external requests.
- ✅ Settings (selector, decimals, panel position) are stored locally in `storage.local`.

## 🐈‍⬛ TODO

- [x] Google Chrome & Opera Support
- [ ] Adjustable percentage
- [ ] Adjustable amount of 'steps/legs'
- [ ] Auto-paste
- [ ] Better balance detection
- [ ] Multiple platforms support (Weex, BingX, Bybit)

## 🚀 Quick Start

### Development build (temporary add-on)

- Clone this repo:
   ```bash
   git clone https://github.com/worldspawn-web/mexc_balance_splitter.git
   cd mexc_balance_splitter
   ```

### Chrome & Opera

1. Open your browser (Chrome, Firefox, Opera).
2. Open your extensions tab by pasting one of the following links:
```
Chrome → chrome://extensions/
Opera → opera://extensions/
```
3. Make sure that `Developer Mode` is enabled.
4. Click `Load unpacked` and choose `extension-chromium` folder.
5. PROFIT?!

### Firefox

1. Open Firefox.
2. Go to `about:debugging#/runtime/this-firefox`
3. Click `Load Temporary Add-on...` and select `extension-firefox/manifest.json`.
4. PROFIT?!

## 🖥️ Native Host (optional)

For exact `Decimal` math, install the Python Native Host:

- Windows: run `native/install_windows.bat`.

- Linux/macOS: copy `native/mexc.balance.calculator.json` into your system’s native-messaging folder and point `path` to `python3 -u host.py`.

Without it, the extension still works using JavaScript fallback.
