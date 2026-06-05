# AI Note Keeper

AI Note Keeper 是一个全栈 TypeScript 笔记知识库项目，支持富文本/Markdown 笔记、全文与向量检索、RAG 问答、AI 摘要、图片附件、邮箱验证码注册和生产级部署流程。

## 功能概览

- 笔记管理：创建、编辑、删除、搜索笔记，支持标签、分类和 Markdown 内容。
- 多模式编辑：富文本、Markdown、预览、分屏编辑。
- 文件导入：支持 Markdown、纯文本、Word 文档等笔记导入。
- 图片附件：通过鉴权接口上传和访问图片，服务端校验 MIME、魔数和大小限制。
- RAG 问答：基于用户自己的笔记检索上下文并生成带引用的回答。
- 多层检索：ChromaDB 向量检索、PostgreSQL 全文检索、模糊匹配和关键词降级。
- AI 能力：摘要、关键词提取、改写、对话问答。
- 用户级 API Key：LLM 和 Embedding key 只属于当前用户，不支持服务器全局共享 provider key。
- 安全能力：邮箱验证码注册、密码和 API key 请求加密、CORS 白名单、Helmet、限流、请求体大小限制。
- 运维能力：数据库迁移、健康检查、结构化日志、Prometheus metrics、PM2/Nginx 部署、日志轮转和 release 清理。

## 技术栈

前端：

- React 18
- TypeScript
- Vite
- Tailwind CSS
- TipTap
- Zustand
- React Router
- react-i18next
- lucide-react

后端：

- Node.js
- Express
- TypeScript
- PostgreSQL
- ChromaDB
- OpenAI SDK 兼容接口
- JWT + bcryptjs
- Nodemailer
- Multer
- Pino
- prom-client

工程化：

- Vitest 单元测试
- Playwright E2E
- SQL migrations
- GitHub Actions build/package/deploy
- PM2
- Nginx
- Cloudflare Full strict 证书配置

## 本地启动

推荐使用一键脚本：

```powershell
.\start-dev.ps1
```

脚本会：

- 从 `deploy/iac/local.backend.env.example` 初始化 `backend/.env`
- 从 `deploy/iac/local.frontend.env.example` 初始化 `frontend/.env.local`
- 启动本地 PostgreSQL 和 ChromaDB
- 初始化数据库 schema
- 启动后端和前端开发服务

默认地址：

- 前端：`http://localhost:4002`
- 后端：`http://localhost:4000/api`
- ChromaDB：`http://localhost:8000`
- PostgreSQL：`localhost:5432`

也可以手动启动：

```bash
docker compose up -d
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run dev
npm --prefix frontend run dev
```

## 配置规则

配置分层在 `deploy/iac` 下维护：

- `common.backend.env`：可提交的后端公共默认配置。
- `local.backend.env.example`：本地后端私有配置模板。
- `local.frontend.env.example`：本地前端私有配置模板。
- `production.backend.env.example`：生产后端私有配置模板。
- `production.frontend.env`：生产前端公开构建配置。

规则：

- 本地私有配置只放在 `backend/.env` 和 `frontend/.env.local`，不要提交。
- 生产私有配置只放在 GitHub Secrets 和服务器 `/opt/ai-note-keeper/backend/.env`。
- LLM 和 Embedding provider API key 不写入服务器全局环境变量。
- 用户登录后在 Settings 中配置自己的 API key，后端运行时只允许使用 demo 或当前用户自己的 key。

## 数据库迁移

迁移文件位于 `backend/migrations`，每个版本包含 `*.up.sql` 和 `*.down.sql`。

```bash
npm --prefix backend run build
npm --prefix backend run migrate
npm --prefix backend run migrate:rollback
```

已应用迁移记录在 `schema_migrations` 表。

当前关键迁移：

- `002_email_verification_codes`：邮箱验证码表。
- `003_note_attachments`：图片附件表。
- `004_note_summary_cache`：AI 摘要缓存字段。
- `005_user_scoped_api_keys`：LLM/Embedding key 按用户隔离。
- `006_assign_legacy_api_keys_to_owner`：将历史全局 key 迁移到 `1206677183@qq.com` 用户下。

## 测试与验证

常用命令：

```bash
npm --prefix backend test -- --run
npm --prefix backend run build
npm --prefix frontend test -- --run
npm --prefix frontend run build
node scripts/security/scan-secrets.mjs
```

E2E 和 RAG eval 在 GitHub Actions 的 Build Package 流程中执行。

## 部署流程

不要从本机直接部署服务器。标准流程是：

1. 推送代码到 GitHub。
2. 等待 GitHub Actions 的 **Build Package** 通过。
3. 从 workflow summary 复制 package id。
4. 手动运行 **Deploy Package**，输入 package id。

Build Package 会执行：

- secret scan
- 前后端依赖安装
- 前后端测试和覆盖率检查
- lint
- 前后端构建
- 数据库迁移验证
- Playwright E2E
- RAG eval
- release package smoke test
- 上传 package artifact

Deploy Package 会：

- 根据 package id 下载 artifact
- 上传到 ECS
- 解压到 `/opt/ai-note-keeper/releases/<package-id>`
- 复制生产 `.env`
- 安装生产依赖
- 执行数据库迁移
- 切换 frontend/backend symlink
- 更新 Nginx 配置
- reload PM2 和 Nginx
- 执行 `/health/ready` smoke test
- 失败时自动回滚 symlink
- 清理旧 release 和过期日志

详细部署说明见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## API 概览

认证：

- `POST /api/auth/verification-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

笔记：

- `GET /api/notes`
- `GET /api/notes/search`
- `GET /api/notes/:id`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

附件：

- `POST /api/attachments/images`
- `GET /api/attachments/:id`
- `DELETE /api/attachments/:id`

LLM：

- `GET /api/llm/providers`
- `GET /api/llm/models`
- `POST /api/llm/test`
- `POST /api/llm/chat`
- `POST /api/llm/summary`
- `POST /api/llm/keywords`
- `POST /api/llm/rewrite`
- `GET /api/llm/keys`
- `POST /api/llm/keys`
- `DELETE /api/llm/keys/:provider`

Embedding：

- `GET /api/embedding/providers`
- `GET /api/embedding/models`
- `POST /api/embedding/test`
- `GET /api/embedding/keys`
- `POST /api/embedding/keys`
- `DELETE /api/embedding/keys/:provider`

RAG：

- `POST /api/rag/ask`
- `POST /api/rag/reindex`
- `GET /api/rag/conversations`
- `GET /api/rag/conversations/:id`
- `DELETE /api/rag/conversations/:id`

运维：

- `GET /health/live`
- `GET /health/ready`
- `GET /health`
- `GET /metrics`

## 项目结构

```text
ai-note-keeper/
  backend/
    migrations/
    src/
      config/
      controllers/
      middleware/
      models/
      observability/
      routes/
      services/
      types/
  deploy/
    iac/
    nginx.cloudflare.conf
    nginx.conf
    setup-ecs.sh
  frontend/
    src/
      components/
      i18n/
      pages/
      services/
      store/
      types/
      utils/
  scripts/
    security/
  docker-compose.yml
  start-dev.ps1
  VERSIONING.md
```

## 版本策略

项目使用语义化版本：

- Patch：bug fix、小型安全修复、配置修正。
- Minor：向后兼容的新能力、质量基线、生产化能力。
- Major：架构或数据模型破坏性变化。

详细版本记录见 [VERSIONING.md](VERSIONING.md)。

## 简历亮点

- 全栈 RAG 笔记系统：React + Express + PostgreSQL + ChromaDB。
- 用户级 LLM/Embedding key 隔离，避免多租户密钥泄漏。
- 邮箱验证码注册、敏感字段前后端加密传输、API key AES-GCM 加密存储。
- 图片附件鉴权上传与访问控制，服务端 MIME 和 magic-byte 校验。
- SQL migration 体系支持 schema 可追踪演进和 CI 初始化一致性。
- GitHub Actions 实现测试、构建、E2E、RAG eval、制品打包、按包号部署和失败回滚。
- PM2/Nginx/Cloudflare 部署，包含日志轮转、旧 release 清理、健康检查和 metrics。

## License

MIT
