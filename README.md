# AI Note Keeper

AI Note Keeper 是一个全栈 TypeScript 笔记知识库项目，支持富文本/Markdown 笔记、全文与向量检索、RAG 问答、AI 总结、图片附件、邮箱验证码注册、用户级 Provider Key、安全加固和 GitHub Actions 打包部署。

## 功能概览

- 笔记管理：创建、编辑、删除、搜索笔记，支持标签、分类和 Markdown 内容。
- 多模式编辑：富文本、Markdown、预览、分屏编辑。
- 文件导入：支持 Markdown、纯文本和 Word 文档导入。
- 图片附件：通过鉴权接口上传和访问图片，服务端校验 MIME、魔数和大小限制。
- RAG 问答：基于当前用户笔记检索上下文并生成带引用的回答。
- 多层检索：ChromaDB 向量检索、PostgreSQL 全文检索、模糊匹配和关键词降级。
- 用户级 API Key：LLM 和 Embedding key 只属于当前用户，不使用服务器全局共享 provider key。
- 安全能力：邮箱验证码注册、密码/API key 请求加密、CORS 白名单、Helmet、限流和请求体大小限制。
- 运维能力：数据库迁移、健康检查、结构化日志、Prometheus metrics、PM2/Nginx 部署、日志轮转和 release 清理。

## 技术栈

前端：React 18、TypeScript、Vite、Tailwind CSS、TipTap、Zustand、React Router、react-i18next。

后端：Node.js、Express、TypeScript、PostgreSQL、ChromaDB、OpenAI SDK 兼容接口、JWT、bcryptjs、Nodemailer、Multer、Pino、prom-client。

工程化：Vitest、Playwright E2E、SQL migrations、GitHub Actions build/package/deploy、PM2、Nginx、Cloudflare Full strict。

## 本地启动

推荐使用一键脚本：

```powershell
.\start-dev.ps1
```

脚本会：

- 通过 `deploy/iac` 渲染 `backend/.env` 和 `frontend/.env.local`。
- 启动本地 PostgreSQL 和 ChromaDB。
- 初始化数据库 schema。
- 启动后端和前端开发服务。

默认地址：

- 前端：`http://localhost:4002`
- 后端：`http://localhost:4000/api`
- ChromaDB：`http://localhost:8000`
- PostgreSQL：`localhost:5432`

也可以手动启动：

```bash
docker compose up -d
node scripts/iac/render-env.mjs --env local --target backend --out backend/.env --allow-example-private
node scripts/iac/render-env.mjs --env local --target frontend --out frontend/.env.local --allow-example-private
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run dev
npm --prefix frontend run dev
```

## 配置规则

配置分层维护在 `deploy/iac`：

- `common.<target>.env`：可提交的跨环境公共默认值。
- `<env>.<target>.public.env`：可提交的环境公开配置。
- `<env>.<target>.private.env.example`：可提交的私有配置模板。
- `private/<env>.<target>.env`：真实私有配置，已被 Git 忽略。

渲染顺序是 common、public、private。生产前端必须使用 `VITE_API_URL=/api`，避免 HTTPS 页面请求 HTTP API 导致 mixed content。

验证配置：

```bash
node scripts/iac/check-env.mjs
```

LLM 和 Embedding provider API key 不写入服务器全局环境变量。用户登录后在 Settings 中配置自己的 API key，后端只允许 demo 或当前用户自己的 key。

## 数据库迁移

迁移文件位于 `backend/migrations`，每个版本包含 `*.up.sql` 和 `*.down.sql`。

```bash
npm --prefix backend run build
npm --prefix backend run migrate
npm --prefix backend run migrate:rollback
```

已应用迁移记录在 `schema_migrations` 表。

## 测试与验证

常用命令：

```bash
node scripts/security/scan-secrets.mjs
node scripts/iac/check-env.mjs
npm --prefix backend test -- --run
npm --prefix backend run build
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

E2E 和 RAG eval 在 GitHub Actions 的 **Build Package** 流程中执行。

## 部署流程

不要从本机直接部署服务器。标准流程是：

1. 推送代码到 GitHub。
2. 等待 GitHub Actions 的 **Build Package** 通过。
3. 从 workflow summary 复制 package id。
4. 手动运行 **Deploy Package**，输入 package id。

Build Package 会执行 secret scan、IaC 渲染校验、前后端测试、覆盖率检查、lint、构建、数据库迁移验证、Playwright E2E、RAG eval、release package smoke test 和 artifact 上传。

Deploy Package 会根据 package id 下载 artifact，上传到 ECS，解压到 `/opt/ai-note-keeper/releases/<package-id>`，复制 `/opt/ai-note-keeper/shared/backend.env`，安装生产依赖，执行迁移，切换 symlink，reload PM2/Nginx，执行 `/health/ready` smoke test，并在失败时回滚到上一版。

详细部署说明见 [DEPLOYMENT.md](DEPLOYMENT.md)。
