# Product Shot Studio

Windows desktop MVP for turning ordinary product photos into commercial e-commerce image sets with OpenAI, Google Gemini, and Stability AI image APIs.

## Features

- Electron + React + TypeScript desktop app
- Bring-your-own API keys with keytar first and Electron safeStorage fallback
- SQLite-backed task history through sql.js
- Product-preserving prompt presets:
  - White-background main image
  - Lifestyle scene
  - Texture/detail close-up
  - Marketing banner
- Provider adapter layer for OpenAI, Google, and Stability
- Local product image import, preview, generation history, retry, and export

## Run

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

## Windows Package

Build a double-clickable Windows app folder and zip package:

```powershell
npm.cmd run package:win
```

The packaged app is written to:

- `outputs/package/win-unpacked/Product Shot Studio.exe`
- `outputs/Product Shot Studio-0.1.0-win-x64.zip`

If native optional dependencies slow down installation, use the safeStorage fallback path:

```powershell
npm.cmd install --omit=optional --ignore-scripts
```

If Electron cannot download from GitHub in your network, set a mirror before installing:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd install
```

If `node_modules/electron/dist/electron.exe` is missing after installation:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd run ensure:electron
```

During development, run the renderer and Electron together:

```powershell
npm.cmd run dev
```

In a separate terminal after the TypeScript watcher emits `dist/main/main.js`:

```powershell
npm.cmd start
```

## Test

```powershell
npm.cmd test
npm.cmd run typecheck
```

## Live Provider Smoke

After setting a real provider API key, run one live generation through the same adapter used by the desktop app:

```powershell
$env:OPENAI_API_KEY="..."
npm.cmd run live:smoke -- openai
```

Other providers:

```powershell
$env:GEMINI_API_KEY="..."
npm.cmd run live:smoke -- google

$env:STABILITY_API_KEY="..."
npm.cmd run live:smoke -- stability
```

Outputs are written to `outputs/live-smoke/`.

## Notes

- API keys are stored locally and never written to SQLite.
- If `keytar` is unavailable on Windows, Electron `safeStorage` encrypts an app-local fallback secret file.
- Users are responsible for provider fees, image rights, and provider terms.
