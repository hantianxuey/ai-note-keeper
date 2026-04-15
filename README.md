# AI Note Keeper 📝🤖

AI驱动的个人笔记知识库，支持RAG智能问答、语义搜索、文档解析。

一个全栈TypeScript项目，展示现代AI应用开发实践。

## ✨ 功能特性

- 📝 **富文本笔记** - 使用TipTap编辑器，支持Markdown
- 📄 **文档导入** - 上传PDF/Word自动提取文本
- 🔍 **语义搜索** - 基于向量嵌入的智能搜索
- 💬 **RAG智能问答** - 基于你的笔记内容进行AI问答
- ✍️ **AI增强** - 智能摘要、关键词提取、笔记改写
- 🏷️ **分类标签** - 灵活组织你的笔记
- 🎨 **现代化UI** - 基于ShadCN UI和Tailwind CSS

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript + Vite
- ShadCN UI + Tailwind CSS
- TipTap富文本编辑器
- Zustand状态管理
- React Router

### 后端
- Node.js + Express + TypeScript
- LangChain.js (RAG框架)
- JWT认证
- Multer文件上传

### 数据层
- PostgreSQL (主数据存储)
- Pinecone (向量存储)
- OpenAI API (Embedding + LLM)

### 部署
- 前端: Vercel
- 后端: Render
- 数据库: Supabase (托管PostgreSQL)

## 🚀 本地开发

### 前置要求
- Node.js 18+
- Docker & Docker Compose (可选，本地PostgreSQL)
- OpenAI API Key
- Pinecone API Key

### 1. 克隆项目
```bash
git clone https://github.com/你的用户名/ai-note-keeper.git
cd ai-note-keeper
```

### 2. 后端设置
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入你的API密钥
npm run dev
```

### 3. 前端设置
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 4. 使用Docker启动PostgreSQL
```bash
docker-compose up -d
```

## 📝 环境变量

### 后端 (`backend/.env`)
```
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/ainotes
JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=ai-notes
PINECONE_ENVIRONMENT=gcp-starter
PORT=3000
```

### 前端 (`frontend/.env.local`)
```
VITE_API_URL=http://localhost:3000/api
```

## 🎯 核心技术实现

### RAG流程

1. **文档处理**: PDF/Word → 文本提取 → LangChain分块
2. **向量化**: 每个文本块 → OpenAI Embedding → 存储到Pinecone
3. **问答**: 用户问题 → 问题向量化 → 检索相似上下文 → 组装Prompt → LLM生成回答

### 关键参数
- 分块大小: 500 tokens
- 块重叠: 100 tokens
- 检索Top-K: 3-5

## 📊 项目结构

```
ai-note-keeper/
├── backend/
│   └── src/
│       ├── config/          # 配置
│       ├── middleware/      # JWT认证、错误处理
│       ├── models/          # 数据模型
│       ├── routes/          # API路由
│       ├── controllers/     # 控制器
│       └── services/        # 业务逻辑
│           ├── documentParser.ts  # 文档解析
│           ├── ragService.ts      # RAG核心
│           ├── vectorStore.ts     # 向量存储
│           └── aiService.ts       # AI功能
└── frontend/
    └── src/
        ├── store/           # 状态管理
        ├── components/      # React组件
        ├── pages/           # 页面
        └── services/        # API封装
```

## 🎓 学习收获

这个项目展示了：
- 如何构建完整的全栈AI应用
- RAG检索增强生成的实际实现
- 向量数据库的使用场景
- 现代TypeScript工程实践
- 前后端分离架构设计

## 📄 License

MIT

## 👨‍💻 作者

[你的名字] - [你的邮箱]
