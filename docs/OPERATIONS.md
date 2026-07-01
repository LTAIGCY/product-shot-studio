# 部署与运维

最后更新：2026-07-01

## 生产结构

- API 域名：`api.qingpaiai.com`。
- 官网域名：`qingpaiai.com` 和 `www.qingpaiai.com`。
- 后端 systemd 服务：`product-shot-studio`。
- 应用目录：`/home/ubuntu/product-shot-studio`。
- 后端工作目录：`/home/ubuntu/product-shot-studio/server`。
- SQLite 数据库：`/home/ubuntu/product-shot-studio/server/data/product-shot-studio.db`。
- Nginx：对外监听 80/443，API 转发到本机回环地址上的 Node 服务。

本文档不记录服务器 IP、SSH 私钥、密码、令牌或生产环境变量值。

## 健康检查

公网检查：

```bash
curl -fsS https://api.qingpaiai.com/health
```

服务器内部检查：

```bash
curl -fsS http://127.0.0.1:4317/health
sudo systemctl --no-pager --full status product-shot-studio
sudo journalctl -u product-shot-studio -n 100 --no-pager
sudo nginx -t
```

正常健康响应包含 `"ok":true`。域名根路径返回 404 是正常行为，API 没有定义首页路由。

## 标准更新流程

生产部署只使用已合并到 GitHub `main` 的提交。先备份数据库，再拉取和构建：

```bash
cd /home/ubuntu/product-shot-studio
git fetch origin
git switch main
git pull --ff-only origin main

npm ci
npm --prefix server ci
npm run server:build
```

如果 Prisma schema 有变更，先阅读 PR 的迁移说明并备份数据库，再执行项目指定的数据库初始化或迁移命令。不要在未审查 schema 的情况下对生产库运行强制重置。

重启并验证：

```bash
sudo systemctl restart product-shot-studio
sudo systemctl --no-pager --full status product-shot-studio
curl -fsS http://127.0.0.1:4317/health
curl -fsS https://api.qingpaiai.com/health
```

## SQLite 备份

在只有单个 Node 服务写入数据库的阶段，备份前应短暂停止服务，保证文件一致：

```bash
sudo systemctl stop product-shot-studio
mkdir -p /home/ubuntu/backups/product-shot-studio
cp server/data/product-shot-studio.db \
  /home/ubuntu/backups/product-shot-studio/product-shot-studio-$(date +%Y%m%d-%H%M%S).db
sudo systemctl start product-shot-studio
curl -fsS http://127.0.0.1:4317/health
```

至少保留每日、每周和每月备份，并把副本同步到独立存储。只存在同一台服务器上的备份不能抵御磁盘或实例故障。

## 恢复演练

1. 记录当前服务版本和数据库文件大小。
2. 停止 `product-shot-studio`。
3. 备份当前数据库，避免覆盖后无法回退。
4. 将选定备份复制到 `server/data/product-shot-studio.db`。
5. 校正文件所有者和权限。
6. 启动服务并检查 `/health`、管理员登录、用户数量和钱包汇总。
7. 将演练日期、备份版本和结果记录到运维日志。

## 回滚

代码回滚优先部署上一条已验证的 Git 提交，不在服务器上直接编辑源码。数据库 schema 发生变化时，代码和数据库必须按同一版本回滚；无法保证兼容时先停机并从备份恢复。

## 日志与监控

```bash
sudo journalctl -u product-shot-studio --since "1 hour ago" --no-pager
sudo journalctl -u nginx --since "1 hour ago" --no-pager
df -h
free -h
```

上线前应补充：

- 每分钟公网健康检查和连续失败告警。
- systemd 重启次数、5xx、磁盘、内存和证书到期告警。
- 日志轮转和敏感字段脱敏。
- SQLite 自动备份、异地同步和定期恢复演练。
- 支付回调与钱包交易对账告警。

## HTTPS 与 Nginx

修改 Nginx 配置后必须先执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

证书由 Certbot 管理。定期验证续期计时器和模拟续期：

```bash
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

后端 Node 端口应只监听回环地址，不直接暴露公网。云防火墙只开放必要的 SSH、HTTP 和 HTTPS 端口。

## 协作者访问

每位开发者必须生成自己的 SSH 密钥，只提交公钥。服务器为协作者创建独立 Linux 用户并按最小权限授权，禁止共享私钥、账号或管理员密码。离开项目时删除其公钥和账号，并审计近期登录记录。

## 故障处理顺序

1. 从外网检查 DNS、HTTPS 和 `/health`。
2. 在服务器检查 systemd 服务与日志。
3. 检查 Nginx 配置、证书和监听端口。
4. 检查磁盘、内存、数据库文件和权限。
5. 检查最近一次部署提交与环境变量是否匹配。
6. 无法快速修复时回滚上一稳定版本；涉及数据异常时先停止写入并保全数据库副本。
