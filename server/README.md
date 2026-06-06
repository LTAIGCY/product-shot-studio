# Product Shot Studio 本地账本服务

这是 Product Shot Studio 的本地优先后端 MVP。它负责账号、积分余额、模拟充值、生成预扣、成功扣费、失败释放和后台监测。

## 技术栈

- Node.js + TypeScript
- Fastify HTTP API
- Prisma ORM
- SQLite 数据库：`server/data/product-shot-studio.db`

## 初始化

```powershell
npm.cmd --prefix server install
npm.cmd --prefix server run prisma:generate
npm.cmd --prefix server run db:init
```

建议创建 `server/.env`：

```powershell
Copy-Item server\.env.example server\.env
```

然后修改：

```text
ADMIN_PASSWORD="请改成强密码"
TOKEN_SECRET="请改成随机长密钥"
```

## 启动

```powershell
npm.cmd run server:dev
```

服务地址：

- API: `http://127.0.0.1:4317`
- 监测后台: `http://127.0.0.1:4317/admin`

后端启动时会自动创建所需数据表。`db:init` 仍可用于开发时手动初始化或修复本地数据库。

打包版桌面端会自动启动随包附带的后端，不需要用户单独打开命令行启动服务。

## 核心接口

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/wallet`
- `GET /api/wallet/transactions`
- `POST /api/recharge/simulate`
- `POST /api/usage/reserve`
- `POST /api/usage/commit`
- `POST /api/usage/cancel`
- `POST /admin/login`
- `GET /admin/overview`
- `GET /admin/users`
- `GET /admin/users/:id`
- `GET /admin/users/:id/transactions`
- `GET /admin/jobs`
- `GET /admin/recharges`
- `POST /admin/users/:id/adjust-points`

## 扣费流程

1. 桌面端生成前调用 `reserve`，后端检查可用积分并冻结预计积分。
2. 模型生成成功后调用 `commit`，按实际成功结果扣费并释放冻结积分。
3. 模型失败或取消时调用 `cancel`，只释放冻结积分，不扣费。

## 数据安全

- 用户名在数据库中唯一。
- 密码不明文存储，只保存 `password_hash`、`password_salt`、`password_algo`。
- API Key 不进入后端数据库，仍由桌面端本机安全存储。
- 第一版是本地开发账本，不能防止恶意修改桌面端源码绕过扣费。真实商业计费时，应把模型调用也迁到后端代理执行。

## AutoDL 说明

后期可以把 Fastify 后端部署到 AutoDL 或普通云服务器上。正式账本数据库建议放到托管 PostgreSQL/MySQL，或至少建立自动备份。AutoDL 适合测试和临时服务，重要账本数据不要只放在单实例本地盘。
