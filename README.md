# Product Shot Studio

Product Shot Studio 是一个 Windows 桌面端 AI 商拍图工作流软件。当前版本支持图片生成、视频生成、个人中心、积分账本、历史记录、导出、更新公告，以及本地优先的后端监测后台。

## 当前结构

- 桌面端：Electron + React + TypeScript。
- 本地图片/任务库：sql.js，保存原图、生成图、视频和历史记录。
- 后端账本：`server/`，Fastify + Prisma + SQLite。
- 监测后台：浏览器打开 `http://127.0.0.1:4317/admin`。
- API Key：仍保存在用户本机安全存储中，不写入后端数据库。

## 安装依赖

在仓库根目录执行：

```powershell
npm.cmd install
npm.cmd --prefix server install
```

如果 Electron 下载慢，可以先设置镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd install
```

## 推荐打开方式

开发时建议把“后端账本服务”和“桌面软件”分成两个终端运行。这样桌面软件关掉后，后端监测后台和数据库服务不会跟着断。

终端 1：启动后端账本服务。

```powershell
cd C:\Users\Gcy\Documents\Codex\2026-06-03\goal\product-shot-studio-dev
npm.cmd run server:dev
```

保持这个终端不要关闭。后台地址：

```text
http://127.0.0.1:4317/admin
```

默认开发后台密码：

```text
admin123456
```

终端 2：启动桌面软件。

```powershell
cd C:\Users\Gcy\Documents\Codex\2026-06-03\goal\product-shot-studio-dev
npm.cmd run dev
```

也可以一条命令同时启动：

```powershell
npm.cmd run dev:all
```

现在 `dev:all` 不再因为 Electron 窗口关闭就主动杀掉后端。需要真正停止服务时，在终端按 `Ctrl+C`。

## 打包后打开

生成 Windows 可双击运行的目录和 zip：

```powershell
npm.cmd run package:win
```

打开：

```text
outputs/package/win-unpacked/Product Shot Studio.exe
```

## 后端与数据库是否已经完成

当前完成的是本地 MVP 版：

- 用户注册、登录、唯一账号 ID，以及允许重复的账号名。
- 密码哈希存储，不存明文密码。
- 钱包积分、充值记录、扣费记录。
- 生成任务、失败任务、审计事件。
- 浏览器监测后台。
- 用户在线/离线状态。

还没有完成的是正式商业生产版：

- 真实微信支付。
- 云端正式部署。
- 公网域名、HTTPS、鉴权加固。
- 托管数据库和自动备份。
- 把模型调用迁到后端代理，形成强约束扣费。

## 朋友能不能登录到你的后端

如果你朋友的软件仍然连接 `127.0.0.1:4317`，那它连接的是他自己电脑上的本地后端，你这边看不到。

如果要让你这边后台看到朋友登录，需要满足：

- 你这边后端服务部署在朋友能访问到的地址，例如云服务器、AutoDL 临时服务、同一局域网 IP 或带公网 IP 的机器。
- 朋友启动桌面软件前设置后端地址：

```powershell
$env:PRODUCT_STUDIO_BACKEND_URL="http://你的服务器IP或域名:4317"
npm.cmd run dev
```

之后朋友注册、登录、充值、扣费、生成失败记录都会进入同一个后端数据库，你这边后台就能看到。

注意：正式对外使用前不要直接裸露本地开发服务，需要加 HTTPS、强管理员密码、防火墙规则和备份策略。

## 后台里的状态是什么意思

- 账号状态：`active` 表示账号已启用，可以登录；它不是在线状态。
- 在线状态：桌面端登录后每 30 秒向后端发送一次心跳。超过约 90 秒没有心跳，或用户主动退出登录，就显示离线。
- 账号 ID：每个账号永久唯一；新账号为 `ps_` 开头。账号名允许重复，重名时必须使用账号 ID 登录。
- 密码状态：后台只显示是否已设置、加密算法和更新时间；管理员可以重置密码，但无法读取用户原密码。

## 常用命令

```powershell
npm.cmd run server:test
npm.cmd run server:build
npm.cmd run typecheck
npm.cmd run build
```

如果 Electron 运行文件缺失，可以执行：

```powershell
npm.cmd run ensure:electron
```

## 后期部署建议

第一阶段继续本地开发。后期可以把后端服务部署到 AutoDL 或普通云服务器，但正式账本数据库建议使用托管 PostgreSQL/MySQL，或者至少配置自动备份。AutoDL 更适合测试和临时部署，重要账本数据不要只依赖单实例本地盘。
