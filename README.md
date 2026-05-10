# AI Note Keeper 📝🤖

AI 驱动的个人笔记知识库，支持 RAG 智能问答、语义搜索、文档解析、国际化与暗色模式。

一个全栈 TypeScript 项目，展示现代 AI 应用开发实践。

## ✨ 功能特性

- 🌐 **多 AI 提供商支持** - 8 家主流 AI 厂商，灵活切换
  - 🆓 Demo (Free) - 内置模拟，无需 API Key 即可体验
  - 🇺🇸 OpenAI (GPT-4o, GPT-4, GPT-3.5)
  - 🇨🇳 Kimi (Moonshot AI, 月之暗面)
  - 🇨🇳 DeepSeek (深度求索)
  - 🇨🇳 Zhipu (智谱 AI)
  - 🇨🇳 Qwen (通义千问, 阿里)
  - 🇨🇳 Doubao (豆包, 字节跳动)
  - 🌍 OpenRouter (多模型聚合平台)

- 📝 **多模式编辑器** - 支持四种编辑模式：
  - **Rich Text** - TipTap 富文本编辑器
  - **Markdown** - 原生 Markdown 编辑
  - **Preview** - 实时 Markdown 预览
  - **Split View** - 左右分屏，编辑与预览同步

- 📄 **文档导入** - 支持批量导入 .md / .txt / .docx 文件
- 🔍 **多层语义搜索** - 向量搜索 → 全文搜索 → 模糊匹配 → 关键词匹配，四级降级策略
- 💬 **RAG 智能问答** - 基于你的笔记内容进行 AI 问答
- ✍️ **AI 增强** - 智能摘要、关键词提取、笔记改写
- 🏷️ **分类标签** - 灵活组织你的笔记
- 🎨 **现代化 UI** - 基于 ShadCN UI 和 Tailwind CSS
- 🌓 **暗色模式** - 支持亮色 / 暗色 / 跟随系统三种主题
- 🌍 **国际化 (i18n)** - 支持中文 / English 双语切换
- 📋 **导入导出** - 完整支持 Markdown 格式
- 🔑 **API Key 动态管理** - 支持环境变量和数据库两种方式配置，设置页面实时增删

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript + Vite
- ShadCN UI + Tailwind CSS
- TipTap 富文本编辑器 + React Markdown (支持 GFM)
- @tailwindcss/typography (美化 Markdown 渲染)
- Zustand 状态管理
- React Router v6
- react-i18next + i18next (国际化)
- date-fns (日期格式化)
- lucide-react (图标)

### 后端
- Node.js + Express + TypeScript
- 统一 LLM 抽象层 - 8 家 AI 厂商统一 API (OpenAI SDK 兼容)
- LangChain.js (RAG 框架)
- JWT + bcryptjs 认证
- Zod 参数验证
- Multer 文件上传
- mammoth (Word 解析) + pdf-parse (PDF 解析)

### 数据层
- PostgreSQL (主数据存储 + 全文搜索 + 关键词索引)
- ChromaDB (向量存储，主用)
- Pinecone (向量存储，遗留兼容)
- 原生 SQL (pg Pool)，无 ORM

### 部署
- 前端: Vercel
- 后端: Render
- 数据库: Supabase (托管 PostgreSQL)

## 🚀 本地开发

### 前置要求
- Node.js 18+
- Docker & Docker Compose (本地 PostgreSQL)
- 任一主流 AI 厂商的 API Key (或使用内置 Demo 模式)

### 1. 克隆项目
```bash
git clone https://github.com/你的用户名/ai-note-keeper.git
cd ai-note-keeper
```

### 2. 使用 Docker 启动 PostgreSQL
```bash
docker-compose up -d
```

### 3. 后端设置
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入你的 API 密钥（至少配置一个 AI 提供商，或使用 Demo 模式）
npm run dev
```

### 4. 前端设置
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 5. 访问应用
- 前端: http://localhost:3001
- 后端 API: http://localhost:3000/api

## 📝 编辑器使用指南

### 四种编辑模式

| 模式 | 说明 |
|------|------|
| **Rich Text** | 所见即所得的富文本编辑，支持常用格式化工具，自动同步到 Markdown 格式 |
| **Markdown** | 原生 Markdown 语法编辑，支持 GFM 扩展语法 |
| **Preview** | 实时渲染 Markdown 预览，语法高亮，响应式排版 |
| **Split** | 左侧编辑，右侧预览，实时同步更新 |

### 支持的文件导入格式

| 格式 | 说明 |
|------|------|
| `.md` | Markdown 文件，自动识别标题并提取作为笔记标题 |
| `.txt` | 纯文本文件，自动识别第一行作为标题 |
| `.docx` | Word 文档（后端 mammoth 解析） |

## 🌐 AI 提供商配置

### 支持的 AI 厂商

| 厂商 | 环境变量 | 推荐模型 | Base URL |
|------|----------|----------|----------|
| **Demo** | 无需配置 | demo-chat | 内置模拟 |
| **OpenAI** | `OPENAI_API_KEY` | gpt-4o, gpt-3.5-turbo | api.openai.com/v1 |
| **Kimi** | `KIMI_API_KEY` | moonshot-v1-32k | api.moonshot.cn/v1 |
| **DeepSeek** | `DEEPSEEK_API_KEY` | deepseek-chat | api.deepseek.com |
| **智谱 AI** | `ZHIPU_API_KEY` | glm-4 | open.bigmodel.cn/api/paas/v4 |
| **通义千问** | `QWEN_API_KEY` | qwen-plus | dashscope.aliyuncs.com/compatible-mode/v1 |
| **豆包** | `DOUBAO_API_KEY` | doubao-pro-32k | ark.cn-beijing.volces.com/api/v3 |
| **OpenRouter** | `OPENROUTER_API_KEY` | openai/gpt-4o | openrouter.ai/api/v1 |

### 配置方法

**方式一：环境变量** - 在 `backend/.env` 中填入对应厂商的 API Key，系统启动时自动检测。

**方式二：设置页面** - 登录后进入 Settings 页面，在 API Key 管理区域动态添加/删除 API Key，保存后立即生效。

### 切换 AI 模型

1. 登录应用
2. 进入 Settings 页面
3. 选择 AI Provider（只显示已配置的提供商）
4. 选择具体模型
5. 点击 "Test Connection" 测试连接

## 📝 环境变量

### 后端 (`backend/.env`)
```env
# Environment
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ainotes

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_me_in_production

# Default LLM Configuration
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-3.5-turbo

# AI Provider API Keys (配置即启用)
OPENAI_API_KEY=your_openai_api_key_here
KIMI_API_KEY=your_kimi_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
ZHIPU_API_KEY=your_zhipu_api_key_here
QWEN_API_KEY=your_qwen_api_key_here
DOUBAO_API_KEY=your_doubao_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server
PORT=3000
```

### 前端 (`frontend/.env.local`)
```env
VITE_API_URL=http://localhost:3000/api
```

## 🎯 核心技术实现

### 统一 LLM 抽象层

所有 AI 厂商均通过 OpenAI SDK 统一接口调用（国内厂商兼容 OpenAI API 格式）：

1. **Provider 自动检测** - 启动时自动检测配置了哪些 AI 提供商（环境变量 + 数据库）
2. **模型动态加载** - 每个提供商的模型列表动态管理
3. **统一 API 调用** - Chat Completion API 统一适配
4. **Embedding 支持** - 向量嵌入接口统一（支持 OpenAI / Kimi / Zhipu / Qwen / Doubao / OpenRouter）
5. **Demo 模式** - 无需任何 API Key，LLM 返回模拟响应，Embedding 生成确定性伪向量

### 多层搜索策略

RAG 检索采用 4 层降级策略，确保搜索结果始终可用：

| 优先级 | 策略 | 说明 |
|--------|------|------|
| Layer 0 | ChromaDB 向量搜索 | 语义相似度匹配，最高优先级 |
| Layer 1 | PostgreSQL 全文搜索 | tsvector + tsquery，GIN 索引 |
| Layer 2 | ILIKE 模糊匹配 | 模糊关键词匹配 |
| Layer 3 | 关键词数组匹配 | tags / keywords GIN 索引 |

### RAG 流程

1. **文档处理** - 文本提取 → 分块 (500 字符，50 字符重叠) → 关键词提取
2. **向量化** - 每个文本块 → Embedding 模型 → 存储到 ChromaDB
3. **问答** - 用户问题 → 问题向量化 → 检索相似上下文 → 组装 Prompt → LLM 生成回答

### Markdown 编辑器实现

1. **双向转换** - Rich Text ↔ Markdown 自动转换
2. **实时渲染** - 使用 React Markdown + remark-gfm
3. **样式美化** - @tailwindcss/typography 提供专业排版
4. **数据持久化** - markdown_content 字段存储纯文本 Markdown

### 国际化 (i18n)

- 基于 react-i18next + i18next
- 支持中文 (zh-CN) / English (en)
- 自动检测浏览器语言，偏好持久化到 localStorage
- 按功能模块分组翻译文件 (common / auth / notes / chat / settings)

### 暗色模式

- 基于 CSS 变量 + Tailwind dark: 前缀
- 支持亮色 / 暗色 / 跟随系统三种模式
- 主题偏好持久化到 localStorage
- Header 快捷切换 + 设置页面完整配置

## 📊 项目结构

```
ai-note-keeper/
├── backend/
│   ├── src/
│   │   ├── config/              # 配置
│   │   │   ├── database.ts      # PostgreSQL 连接池
│   │   │   └── init.sql         # 数据库初始化 SQL
│   │   ├── controllers/         # 控制器
│   │   │   ├── authController.ts
│   │   │   ├── llmController.ts
│   │   │   ├── noteController.ts
│   │   │   └── ragController.ts
│   │   ├── middleware/          # 中间件
│   │   │   ├── auth.ts          # JWT 认证
│   │   │   └── errorHandler.ts  # 全局错误处理
│   │   ├── models/              # 数据模型
│   │   │   ├── Conversation.ts
│   │   │   ├── LLMConfig.ts
│   │   │   ├── Note.ts
│   │   │   └── User.ts
│   │   ├── routes/              # API 路由
│   │   │   ├── auth.ts
│   │   │   ├── llm.ts
│   │   │   ├── notes.ts
│   │   │   └── rag.ts
│   │   ├── services/            # 业务逻辑
│   │   │   ├── embeddingService.ts    # 向量嵌入 (ChromaDB)
│   │   │   ├── llmService.ts          # 多 LLM 提供商统一服务
│   │   │   └── vectorSearchService.ts # 多层搜索服务
│   │   ├── types/               # 类型定义
│   │   │   ├── index.ts
│   │   │   └── llm.ts               # LLM 类型和提供商配置
│   │   └── server.ts            # Express 入口
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # React 组件
│   │   │   └── ThemeToggle.tsx  # 主题切换组件
│   │   ├── i18n/                # 国际化
│   │   │   ├── index.ts         # i18n 初始化
│   │   │   ├── types.ts         # i18n 类型
│   │   │   └── locales/
│   │   │       ├── en/          # 英文翻译
│   │   │       └── zh-CN/       # 中文翻译
│   │   ├── pages/               # 页面
│   │   │   ├── Chat.tsx         # RAG 对话
│   │   │   ├── Home.tsx         # 首页 (笔记列表)
│   │   │   ├── Login.tsx
│   │   │   ├── NoteEditor.tsx   # 多模式编辑器
│   │   │   ├── Register.tsx
│   │   │   └── Settings.tsx     # 设置 (LLM / API Key / 主题 / 语言)
│   │   ├── services/            # API 封装
│   │   │   └── api.ts
│   │   ├── store/               # Zustand 状态管理
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useLLMStore.ts
│   │   │   ├── useNoteStore.ts
│   │   │   └── useThemeStore.ts
│   │   ├── types/               # 类型定义
│   │   │   └── index.ts
│   │   ├── utils/               # 工具函数
│   │   │   └── theme.ts         # 主题工具
│   │   ├── App.tsx              # 路由入口
│   │   ├── index.css            # 全局样式 (含暗色 CSS 变量)
│   │   └── main.tsx             # React 入口
│   └── package.json
├── docker-compose.yml           # PostgreSQL Docker 配置
└── README.md
```

## 📡 API 路由

### 认证 `/api/auth`
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |

### 笔记 `/api/notes`
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/notes` | 获取笔记列表 | 是 |
| GET | `/api/notes/search?q=xxx` | 搜索笔记 | 是 |
| GET | `/api/notes/:id` | 获取单个笔记 | 是 |
| POST | `/api/notes` | 创建笔记 | 是 |
| PUT | `/api/notes/:id` | 更新笔记 | 是 |
| DELETE | `/api/notes/:id` | 删除笔记 | 是 |

### LLM 管理 `/api/llm`
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/llm/providers` | 获取所有提供商 | 是 |
| GET | `/api/llm/models` | 获取所有可用模型 | 是 |
| GET | `/api/llm/models/:provider` | 获取指定提供商模型 | 是 |
| POST | `/api/llm/test` | 测试 LLM 连接 | 是 |
| POST | `/api/llm/chat` | 通用对话补全 | 是 |
| POST | `/api/llm/summary` | 生成笔记摘要 | 是 |
| POST | `/api/llm/keywords` | 提取笔记关键词 | 是 |
| POST | `/api/llm/rewrite` | 改写/优化笔记 | 是 |
| GET | `/api/llm/keys` | 获取 API Key 列表 (脱敏) | 是 |
| POST | `/api/llm/keys` | 保存 API Key | 是 |
| DELETE | `/api/llm/keys/:provider` | 删除 API Key | 是 |

### RAG 问答 `/api/rag`
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/rag/ask` | RAG 问答 | 是 |
| POST | `/api/rag/reindex` | 重新索引所有笔记 | 是 |
| GET | `/api/rag/conversations` | 获取对话列表 | 是 |
| GET | `/api/rag/conversations/:id` | 获取对话详情 | 是 |
| DELETE | `/api/rag/conversations/:id` | 删除对话 | 是 |

## 🗄️ 数据库表结构

### users
| 列名 | 类型 | 约束 |
|------|------|------|
| id | SERIAL | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP |

### notes
| 列名 | 类型 | 约束 |
|------|------|------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| content | TEXT | NOT NULL |
| markdown_content | TEXT | DEFAULT NULL |
| tags | TEXT[] | DEFAULT NULL |
| category | VARCHAR(100) | DEFAULT NULL |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP |

### conversations
| 列名 | 类型 | 约束 |
|------|------|------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE |
| title | VARCHAR(255) | DEFAULT 'New Conversation' |
| messages | JSONB | NOT NULL DEFAULT '[]' |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP |

### llm_configs
| 列名 | 类型 | 约束 |
|------|------|------|
| id | SERIAL | PRIMARY KEY |
| provider_key | VARCHAR(50) | UNIQUE NOT NULL |
| api_key | TEXT | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP |

### note_chunks
| 列名 | 类型 | 约束 |
|------|------|------|
| id | SERIAL | PRIMARY KEY |
| note_id | INTEGER | REFERENCES notes(id) ON DELETE CASCADE |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE |
| chunk_index | INTEGER | NOT NULL DEFAULT 0 |
| content | TEXT | NOT NULL |
| keywords | TEXT[] | DEFAULT NULL |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP |

## 🔧 更新日志

### v1.3.0 - 国际化 & 暗色模式

- ✅ 国际化支持 (react-i18next)，中文 / English 双语切换
- ✅ 暗色模式 (亮色 / 暗色 / 跟随系统)
- ✅ Header 主题快捷切换按钮
- ✅ 设置页面语言和主题配置
- ✅ 日期格式化本地化
- ✅ API Key 管理暗色模式适配

### v1.2.0 - 多 AI 提供商支持

- ✅ 统一 LLM 服务抽象层
- ✅ 支持 8 家 AI 提供商 (Demo / OpenAI / Kimi / DeepSeek / Zhipu / Qwen / Doubao / OpenRouter)
- ✅ 动态检测已配置的 AI 提供商
- ✅ Settings 页面可视化选择提供商和模型
- ✅ 连接测试功能
- ✅ API Key 动态管理 (环境变量 + 数据库)
- ✅ Demo 模式 (无需 API Key)

### v1.1.0 - Markdown 增强

- ✅ 四种编辑器模式切换
- ✅ React Markdown + GFM 支持
- ✅ @tailwindcss/typography 美化预览
- ✅ markdown_content 字段支持原生 Markdown 存储
- ✅ .md / .txt / .docx 文件导入
- ✅ 分屏实时预览模式

### v1.0.0 - 初始版本

- ✅ 基础笔记 CRUD
- ✅ JWT 认证
- ✅ RAG 智能问答
- ✅ ChromaDB 向量搜索
- ✅ 多层搜索策略

## 📄 License

MIT
