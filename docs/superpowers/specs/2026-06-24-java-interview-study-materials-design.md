# Java 后端面试学习材料设计

## 目标

为 1 年工作经验的初级 Java 后端岗位准备两份可独立使用、相互引用的学习资料：

1. Java 后端面试题库。
2. AI Note Keeper 项目知识学习手册。

求职主线是 Java 后端，AI Note Keeper 用于证明后端工程能力、完整项目经验和 AI 应用落地能力，不将候选人包装为算法工程师。

## 交付文件

### `docs/interview/java-backend-interview-question-bank.md`

题库按知识域组织，便于查漏补缺和重复刷题：

1. Java 基础与面向对象。
2. 集合与泛型。
3. 异常、反射、注解和 I/O。
4. 并发编程。
5. JVM。
6. Spring、Spring MVC、Spring Boot。
7. MyBatis 与事务。
8. MySQL 与 SQL 优化。
9. Redis 与缓存。
10. 消息队列。
11. Elasticsearch。
12. HTTP、网络与 Linux。
13. Docker、Git 与 CI/CD。
14. 系统设计和故障排查场景题。
15. AI Note Keeper 项目追问题。

重点题目采用统一结构：

- **问题**
- **30 秒回答**：面试时先给结论。
- **展开讲解**：用于理解原理和应对追问。
- **常见追问**
- **回答边界**：提醒哪些内容不能夸大。

题量以初级岗位高频内容为主，不追求百科全书式覆盖。基础题给出准确原理，场景题强调分析路径。

### `docs/interview/ai-note-keeper-project-handbook.md`

手册按“能讲清项目”而不是按目录逐文件罗列：

1. 项目定位和业务价值。
2. 1 分钟、3 分钟项目介绍。
3. 总体架构与关键请求链路。
4. 用户认证和会话安全。
5. 请求字段加密与用户级 Provider Key。
6. 笔记数据模型、数据库迁移和用户隔离。
7. RAG 基础知识。
8. 项目的索引、召回、降级和引用链路。
9. RAG 质量评估与可观测性。
10. 健康检查、日志和 Prometheus 指标。
11. 单元测试、E2E 与 CI/CD。
12. 生产部署、配置分层、回滚和存储清理。
13. 项目难点、设计取舍和故障复盘。
14. 面试官可能连续追问的问题树。
15. 当前不足和合理演进方向。

每个模块明确标识：

- **项目已实现**：可以在面试中直接陈述。
- **设计原因**：解释为什么这样做。
- **局限与改进**：体现判断力，但不能说成已经落地。
- **对应源码**：给出关键文件，方便回看代码。

## 14 天学习索引

两份文档开头都包含相同的学习顺序：

| 天数 | Java 主线 | 项目主线 |
| --- | --- | --- |
| 1 | Java 基础、集合 | 项目定位、架构、介绍稿 |
| 2 | 异常、I/O、反射 | Express 分层与请求链路 |
| 3 | 并发基础 | 认证、JWT、Cookie、CSRF |
| 4 | JVM | 请求加密、密钥存储 |
| 5 | Spring 核心 | 数据模型、迁移、用户隔离 |
| 6 | Spring Boot、MVC | RAG 与 Embedding 基础 |
| 7 | MyBatis、事务 | 索引和向量召回 |
| 8 | MySQL、索引 | 多层检索降级与引用 |
| 9 | Redis、缓存 | RAG eval 与 metrics |
| 10 | 消息队列 | 日志、健康检查、可观测性 |
| 11 | Elasticsearch | 测试体系与 E2E |
| 12 | HTTP、Linux | CI/CD、部署、回滚 |
| 13 | Docker、Git、场景题 | 难点、取舍、不足 |
| 14 | 综合模拟题 | 项目连续追问模拟 |

## 内容依据

项目知识以当前仓库为主要证据，重点参考：

- `README.md`
- `docs/technical-retrospective.md`
- `docs/rag-retrieval-experiments.md`
- `DEPLOYMENT.md`
- `backend/src/server.ts`
- `backend/src/controllers`
- `backend/src/services/vectorSearchService.ts`
- `backend/src/services/embeddingService.ts`
- `backend/src/services/healthService.ts`
- `backend/src/middleware`
- `backend/src/config`
- `backend/src/observability`
- `backend/src/evals/ragEval.ts`
- `backend/migrations`
- `frontend/e2e/core-flow.spec.ts`
- `.github/workflows`
- `scripts/iac`

如果文档描述与代码不一致，以当前代码为准。

## 准确性约束

1. 不虚构并发量、用户量、性能提升百分比或业务收益。
2. 不把 TypeScript/Express 项目描述成 Java/Spring Boot 项目。
3. 可以用 Java 技术栈类比项目设计，但必须明确是“类比”。
4. 区分 PostgreSQL 全文检索、模糊匹配、关键词匹配和 ChromaDB 向量检索。
5. 区分 `/health/live` 与 `/health/ready`。
6. 区分请求传输加密、数据库密钥加密、HTTPS 和密码哈希。
7. 区分单元测试、集成/E2E、RAG eval 和部署 smoke test。
8. 当前不足必须写成改进方向，不能写成已完成能力。

## 完成标准

- 两份文档均可独立阅读。
- 至少覆盖初级 Java 后端面试的主要高频领域。
- 项目手册能够支持 1 分钟和 3 分钟介绍，以及 15 分钟以上连续追问。
- 每个核心项目结论都能追溯到仓库实现或明确标注为改进建议。
- 不覆盖或修改现有业务代码和用户未提交的工作区改动。
