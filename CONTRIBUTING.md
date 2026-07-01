# 轻拍协作规范

本规范适用于项目负责人、协作者和 Codex。稳定代码只来自 GitHub `main`，生产服务器只部署已合并提交。

## 开始工作

```powershell
git switch main
git pull --ff-only origin main
git status --short --branch
```

工作区必须干净。为任务创建短期分支：

```powershell
git switch -c feature/简短任务名
```

Codex 分支使用 `codex/简短任务名`。修复可使用 `fix/`，文档可使用 `docs/`。不要直接向 `main` 提交。

## 并行开发

同一工作区同一时间只处理一个分支。需要同时开发时，为另一个任务创建独立 worktree：

```powershell
git worktree add ..\product-shot-studio-任务名 -b feature/任务名 main
```

不要让两个进程在同一工作区切换分支或修改同一文件。合并后移除不用的 worktree 和已完成分支。

## 开发与测试

安装依赖：

```powershell
npm.cmd install
npm.cmd --prefix server install
```

常用验证：

```powershell
npm.cmd test -- --run
npm.cmd run server:test
npm.cmd run typecheck
npm.cmd run build
```

测试范围随风险扩大：

- UI 文案或样式：对应页面检查和构建。
- 供应商适配：请求映射、错误归一化和 mock 集成测试。
- 账号、钱包、支付：并发、幂等、余额不足、失败回滚和多用户隔离测试。
- Prisma schema：迁移、旧数据兼容、备份与回滚验证。

## 提交规则

提交前检查：

```powershell
git status --short
git diff --check
git diff --staged
```

只暂存本任务文件。提交信息使用简短动词，例如：

```text
Add gallery comparison workflow
Fix wallet reservation rollback
Document production backup procedure
```

## Pull Request

PR 必须说明：

- 改了什么以及为什么。
- 用户可见影响和失败路径。
- 运行了哪些测试及结果。
- 是否涉及数据库、环境变量、部署、计费或安全。
- 回滚方式和仍存在的风险。

功能 PR 默认先建 Draft，完成自测后转为 Ready for review。至少一人检查代码、测试和截图后再合并。合并方式优先 Squash and merge，保持 `main` 历史清晰。

## 文档与发布

稳定事实更新到以下文档：

- 项目状态：`PROJECT_CONTEXT.md`。
- 架构变化：`docs/ARCHITECTURE.md`。
- 部署变化：`docs/OPERATIONS.md`。
- 优先级：`docs/ROADMAP.md`。
- 长期决策：`docs/DECISIONS.md`。
- 用户可见变化：`RELEASE_NOTES.md` 和应用内更新公告。

发布版本前更新 `package.json` 版本号，完成安装包、便携版、干净 Windows 环境和云端 API 兼容性测试。

## 安全红线

禁止提交或粘贴到 PR/聊天：

- SSH 私钥、API Key、访问令牌和管理员密码。
- `.env`、生产环境变量值、数据库文件和完整运行日志。
- 用户原图、生成素材、密码或其他个人数据。

仓库只允许记录域名、服务名、公开文档和公钥指纹。怀疑泄露时停止推送，通知项目负责人并立即轮换相关凭据。

## 服务器协作

每位开发者使用独立 SSH 密钥和独立 Linux 用户。生产更新只能从 `main` 拉取，不能在服务器直接编辑业务源码。部署、备份和恢复流程见 [docs/OPERATIONS.md](docs/OPERATIONS.md)。
