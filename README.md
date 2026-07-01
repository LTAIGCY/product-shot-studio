# Product Shot Studio

Product Shot Studio 是一个 Windows 桌面端 AI 商拍图工作流软件。当前版本支持图片生成、视频生成、个人中心、积分账本、历史记录、导出、更新公告，以及本地优先的后端监测后台。

## 项目文档

- [项目上下文与当前状态](PROJECT_CONTEXT.md)
- [系统架构](docs/ARCHITECTURE.md)
- [部署与运维](docs/OPERATIONS.md)
- [产品路线图](docs/ROADMAP.md)
- [重要决策](docs/DECISIONS.md)
- [协作与 PR 规范](CONTRIBUTING.md)
- [版本更新记录](RELEASE_NOTES.md)

## 当前结构

- 桌面端：Electron + React + TypeScript。
- 本地图片/任务库：sql.js，保存原图、生成图、视频和历史记录。
- 后端账本：`server/`，Fastify + Prisma + SQLite。
- 云端监测后台：浏览器打开 `https://api.qingpaiai.com/admin`。
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

云端账本服务由腾讯云服务器独立运行，关闭桌面软件或开发电脑不会中断后端。开发时只需要启动桌面软件：

```powershell
cd C:\Users\Gcy\Documents\Codex\2026-06-03\goal\product-shot-studio-dev
npm.cmd run dev
```

兼容原有打开习惯的命令：

```powershell
npm.cmd run dev:all
```

`dev` 和 `dev:all` 均默认连接 `https://api.qingpaiai.com`。需要在本机启动隔离账本进行后端开发时使用：

```powershell
npm.cmd run dev:local
```

本地监测后台地址为 `http://127.0.0.1:4317/admin`，开发默认密码为 `admin123456`。本地账本只用于开发测试，不会与云端正式数据共享。

## 打包后打开

生成 Windows 可双击运行的目录和 zip：

```powershell
npm.cmd run package:win
```

打开：

```text
outputs/package/win-unpacked/Product Shot Studio.exe
```

## 后端与数据库状态

当前已经部署云端 MVP：

- 用户注册、登录、唯一账号 ID，以及允许重复的账号名。
- 密码哈希存储，不存明文密码。
- 钱包积分、充值记录、扣费记录。
- 生成任务、失败任务、审计事件。
- 浏览器监测后台。
- 用户在线/离线状态。

正式商业生产版仍需完成：

- 真实微信支付。
- SQLite 自动备份和恢复演练，后续迁移托管数据库。
- 支付回调验签、订单幂等、退款和对账。
- 完整监控、告警、日志轮转和自动部署。
- 把模型调用迁到后端代理，形成强约束扣费。

## 朋友能不能登录到你的后端

当前桌面软件默认连接 `https://api.qingpaiai.com`。你和朋友使用最新源码或后续打包版本时，注册、登录、积分、扣费和生成任务会进入同一个云端账本，你可以在监测后台查看。

只有主动使用 `npm.cmd run dev:local` 或通过环境变量指定 `127.0.0.1:4317` 时，软件才会连接当前电脑的隔离本地账本。

云端已经启用 HTTPS、强管理员密码和防火墙规则；正式开放付费功能前仍需补充数据库自动备份、支付回调验签、订单幂等和对账机制。

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

## 生产运维

云端 API 已部署为独立 systemd 服务，并通过 Nginx 和 HTTPS 对外提供。服务器更新、SQLite 备份、恢复、监控和故障处理见 [部署与运维](docs/OPERATIONS.md)。生产服务器只部署已合并到 `main` 的提交。
