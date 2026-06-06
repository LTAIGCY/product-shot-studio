# Product Shot Studio

Windows desktop MVP for turning ordinary product photos into commercial e-commerce image sets with domestic image models such as Alibaba Bailian, Volcano Ark Doubao Seedream, and Tencent Hunyuan.

## Features

- Electron + React + TypeScript desktop app.
- Bring-your-own API keys with keytar first and Electron safeStorage fallback.
- Local image/video generation history through sql.js.
- Local-first ledger backend in `server/` with Fastify + Prisma + SQLite.
- Account, points balance, simulated recharge, usage reserve/commit/cancel and admin monitoring APIs.
- Browser admin dashboard at `http://127.0.0.1:4317/admin`.
- Product-preserving prompt presets:
  - White-background main image
  - Lifestyle scene
  - Texture/detail close-up
  - Marketing banner
  - Product poster

## Install

```powershell
npm.cmd install
npm.cmd --prefix server install
```

If native optional dependencies slow down installation, use the safeStorage fallback path:

```powershell
npm.cmd install --omit=optional --ignore-scripts
```

If Electron cannot download from GitHub in your network, set a mirror before installing:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd install
```

## Run Local Ledger Backend

During development, the desktop app reads account, wallet, recharge and usage data from the backend. You can start it manually:

```powershell
npm.cmd --prefix server run prisma:generate
npm.cmd --prefix server run db:init
npm.cmd run server:dev
```

Open the monitoring dashboard:

- `http://127.0.0.1:4317/admin`
- Default development password: `admin123456`

For real use, create `server/.env` from `server/.env.example` and change `ADMIN_PASSWORD` plus `TOKEN_SECRET`.

The packaged Windows app starts the bundled local backend automatically. The backend database is created under the app user data folder, so end users do not need to run `db:init`.

## Run Desktop App

In another terminal:

```powershell
npm.cmd run dev
```

Or run backend and desktop together:

```powershell
npm.cmd run dev:all
```

After `npm.cmd run build`, `npm.cmd start` can also auto-start the compiled local backend if `server/dist/index.js` exists:

```powershell
npm.cmd run build
npm.cmd start
```

If the backend is not running, login/wallet/recharge/generation will show:

```text
后端服务未连接，请先启动本地账本服务。
```

To point the desktop app to a future server:

```powershell
$env:PRODUCT_STUDIO_BACKEND_URL="http://your-server:4317"
npm.cmd run dev
```

When `PRODUCT_STUDIO_BACKEND_URL` or `PRODUCT_SHOT_BACKEND_URL` is set, the desktop app connects to that remote backend and does not start the local backend process.

## Windows Package

Build a double-clickable Windows app folder and zip package:

```powershell
npm.cmd run package:win
```

The packaged app is written to:

- `outputs/package/win-unpacked/Product Shot Studio.exe`
- `outputs/Product Shot Studio-0.2.1-win-x64.zip`

The package includes the backend runtime under `resources/backend/`, including `server/dist`, Prisma files and backend node modules.

## Test

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run server:test
npm.cmd run server:build
```

## Backend Deployment Note

First-stage development should keep the backend local. Later, the backend service can run on AutoDL or a normal cloud server, but formal account and payment ledger data should preferably live in a managed PostgreSQL/MySQL database or at least have automatic backups. AutoDL is suitable for testing or temporary service hosting; important ledger data should not rely on a single local disk without backups.

## Notes

- API keys are stored locally and never written to SQLite or the backend database.
- Backend passwords are never stored in plaintext; the server stores salt, hash, and hash algorithm.
- Current recharge is simulated for MVP. Real WeChat Pay needs merchant credentials, server-side order creation, payment callback verification, and idempotency controls.
- For real commercial billing, the future model calls should move behind the backend so users cannot bypass usage deduction by modifying desktop code.
