# Product Shot Studio

Windows 桌面 MVP：把普通产品照片生成适合电商和营销展示的商拍图片套装。当前模型供应商以国内图像模型为主，包括阿里百炼、火山方舟豆包 Seedream 和腾讯混元。

## 功能

- Electron + React + TypeScript 桌面应用。
- 用户自带 API Key，优先使用 keytar，失败时使用 Electron safeStorage 本机加密。
- 使用 sql.js 保存本地图片、视频和历史记录。
- `server/` 提供本地优先账本后端，技术栈为 Fastify + Prisma + SQLite。
- 后端统一管理账号、积分余额、模拟充值、生成预扣、成功扣费、失败释放和审计事件。
- 浏览器监测后台：`http://127.0.0.1:4317/admin`，支持实时刷新和审计事件查看。
- 图片输出套装：
  - 白底主图
  - 生活场景图
  - 质感特写图
  - 营销横图
  - 商品海报

## 安装

```powershell
npm.cmd install
npm.cmd --prefix server install
```

如果原生可选依赖安装较慢，可以使用 safeStorage 兜底方案：

```powershell
npm.cmd install --omit=optional --ignore-scripts
```

如果 Electron 下载受网络影响，可以先设置镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd install
```

## 启动本地账本后端

开发时桌面端会从后端读取账号、钱包、充值和扣费数据。可以手动启动：

```powershell
npm.cmd --prefix server run prisma:generate
npm.cmd --prefix server run db:init
npm.cmd run server:dev
```

监测后台：

- 地址：`http://127.0.0.1:4317/admin`
- 默认开发密码：`admin123456`

正式使用前，建议从 `server/.env.example` 创建 `server/.env`，并修改 `ADMIN_PASSWORD` 和 `TOKEN_SECRET`。

打包版 Windows 软件会自动启动随包附带的本地后端。后端数据库会创建在应用用户数据目录中，普通用户不需要手动执行 `db:init`。

后台登录后会每 5 秒自动刷新一次，并展示注册、登录、充值、预扣、扣费、取消释放和管理员调分等审计事件。

## 启动桌面端

另开一个终端：

```powershell
npm.cmd run dev
```

也可以同时启动后端和桌面端：

```powershell
npm.cmd run dev:all
```

完成构建后，`npm.cmd start` 也能在 `server/dist/index.js` 存在时自动启动编译后的本地后端：

```powershell
npm.cmd run build
npm.cmd start
```

如果后端未连接，登录、钱包、充值和生成扣费会显示：

```text
后端服务未连接，请先启动本地账本服务。
```

未来需要连接服务器后端时，可以设置：

```powershell
$env:PRODUCT_STUDIO_BACKEND_URL="http://your-server:4317"
npm.cmd run dev
```

设置 `PRODUCT_STUDIO_BACKEND_URL` 或 `PRODUCT_SHOT_BACKEND_URL` 后，桌面端会连接指定后端，不再自动启动本地后端进程。

## Windows 打包

构建可双击运行的 Windows 应用目录和 zip 包：

```powershell
npm.cmd run package:win
```

打包产物位置：

- `outputs/package/win-unpacked/Product Shot Studio.exe`
- `outputs/Product Shot Studio-0.2.2-win-x64.zip`

软件包会包含后端运行资源，位置为 `resources/backend/`，包括 `server/dist`、Prisma 文件和后端 `node_modules`。

## 测试

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run server:test
npm.cmd run server:build
```

## 后端部署建议

第一阶段建议保持本地运行后端。后续可以把后端服务部署到 AutoDL 或普通云服务器，但正式账号和支付账本数据建议优先放在托管 PostgreSQL/MySQL，或至少配置自动备份。AutoDL 适合测试或临时服务托管，重要账本数据不要只依赖单实例本地盘。

## 注意

- API Key 只保存在本机安全存储中，不写入 SQLite 或后端数据库。
- 后端不会明文存储密码，只保存盐值、哈希和哈希算法。
- 当前充值是 MVP 模拟充值。真实微信支付需要商户凭证、服务端订单创建、支付回调验签和幂等处理。
- 真实商业计费时，模型调用也应该移到后端代理执行，避免用户修改桌面端绕过扣费。
