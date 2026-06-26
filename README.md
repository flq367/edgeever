# EdgeEver

> **EdgeEver: A self-hosted, Cloudflare-native Evernote alternative.**
>
> **EdgeEver：基于 Cloudflare 全家桶自托管的开源『印象笔记』。**

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/msh01/edgeever">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" />
  </a>
</p>

<p align="center">
  点击上方按钮进入 Cloudflare 部署向导；Cloudflare 会根据 wrangler 配置创建并绑定 D1/R2 资源，执行构建、D1 migration 和 Worker 部署。
</p>

EdgeEver 是一个完全开源、支持自部署、面向人类和 AI Agent 的现代笔记工作区。

它致敬经典印象笔记的大屏三栏交互：笔记本目录、笔记列表、主编辑区。但 EdgeEver 不想复刻臃肿的旧时代套件，而是用 Cloudflare 的边缘网络、轻量前端、开放 API、MCP 和 CLI，把笔记系统重新做成一个可自托管、可编程、可被 AI 读写的个人知识库底座。

## 产品定位

EdgeEver 是一个现代个人知识库，面向三类一等用户：

- **人类用户**：在专注的三栏界面中捕获、整理、编辑、搜索、合并笔记。
- **AI Agent**：通过 REST API、MCP 或 CLI 读取、搜索、新建、追加、合并和整理笔记，而不是模拟点击 UI。
- **自部署用户**：把完整系统部署到自己的 Cloudflare 账号下，用很低的运维成本拥有自己的笔记后端。

EdgeEver 的目标不是再做一个大而全的效率套件，而是做一个锋利、轻快、开放的笔记核心：本地优先的体验，全球同步的部署，面向 AI 的明确接口。

## 项目背景

经典印象笔记有一个至今仍然优秀的设计：大屏三栏工作流。

```text
笔记本目录 -> 笔记列表 -> 编辑器
```

这个布局依旧是浏览个人资料库、整理长期知识、快速切换上下文的高效方式。但现代笔记系统需要一个新的技术底座：

- 笔记内容应该可读、可导出、可迁移。
- 前端应该是轻量 SPA/PWA，而不是不必要的重型服务端应用。
- 图片和附件应该进入对象存储，而不是塞进不透明的数据块。
- 搜索应该建立在清晰的数据模型之上。
- AI Agent 应该拥有显式、受权限控制的接口，而不是伪装成人类用户。
- 自托管应该对个人开发者足够现实。

EdgeEver 要做的就是这个版本：经典的信息架构，现代的边缘基础设施，从第一天起就为 Agent 读写做好准备。

## 核心体验

- **桌面三栏布局**：笔记本树、笔记卡片流、富文本编辑器。
- **无限级嵌套笔记本**：通过 `parent_id` 支持多级目录树。
- **Markdown 友好的富文本编辑**：TipTap/ProseMirror JSON 作为权威编辑器格式，Markdown 作为 Agent、CLI 和导出格式。
- **PWA 响应式布局**：桌面端三栏，移动端自动折叠为单栏。
- **多选合并笔记**：选中多条笔记后创建一条合并后的新笔记，用 Markdown 分割线连接内容，原笔记软删除，资源引用重新指向新笔记。
- **Headless 能力**：REST、MCP 和 CLI 共享同一套核心服务。
- **资源模型**：图片和附件存入 R2，D1 保存资源元数据和笔记关联关系。

## 架构规划

```text
edgeever/
├── apps/
│   ├── web/          # Vite + React PWA
│   └── api/          # Cloudflare Worker + Hono
├── packages/
│   └── shared/       # 共享类型、Zod schema、内容格式转换
├── migrations/       # Cloudflare D1 SQL 迁移
├── docs/
├── tailwind.config.ts
└── wrangler.toml     # Worker、Assets、D1、R2 绑定配置
```

目标运行形态是一个 Cloudflare Worker：

- `/api/v1/*` 提供 REST API。
- `/mcp` 提供远程 MCP Streamable HTTP 入口。
- Workers Assets 从 `apps/web/dist` 托管构建后的 SPA。
- D1 存储笔记本、笔记元数据、正文记录、搜索索引、Token、修订记录和审计事件。
- R2 存储图片和附件。

## 技术栈

### 工程工具链

- **Bun**：包管理器、脚本运行入口和 monorepo workspace 工具。

### 前端

- **Vite**：轻量 SPA 构建工具。
- **React**：应用 UI 层。
- **Tailwind CSS**：原子化样式系统。
- **shadcn/ui**：可组合、可访问的 UI 组件基础。
- **TipTap**：基于 ProseMirror 的富文本编辑器核心。
- **TanStack Query**：API 缓存、乐观更新、重试和服务端状态管理。
- **Dexie**：基于 IndexedDB 的离线缓存和本地草稿队列。
- **Zod**：前后端共享数据校验。

### 后端

- **Cloudflare Workers**：边缘运行时。
- **Hono**：轻量、快速的 HTTP 路由框架。
- **Cloudflare D1**：SQLite 语义的关系型数据库。
- **Cloudflare R2**：图片和附件对象存储。
- **D1 FTS5**：全文搜索能力。
- **Wrangler**：本地开发、迁移和部署工具。

### Agent 与开发者接口

- **REST API**：供 Web、CLI 和第三方集成调用。
- **MCP Streamable HTTP**：通过 `/mcp` 暴露给支持远程 MCP 的客户端。
- **本地 stdio MCP Server**：通过 EdgeEver CLI 启动，供桌面 AI 工具接入。
- **CLI**：用于脚本化、导入导出和终端工作流。

## 内容存储策略

EdgeEver 不应该只把 Markdown 当作唯一真实格式。

```text
content_json      TipTap/ProseMirror 文档，权威编辑器格式
content_markdown  Agent、CLI、导入导出、diff 使用的格式
content_text      全文搜索、摘要、embedding 使用的纯文本
```

浏览器编辑器写入 TipTap JSON，并派生 Markdown 和纯文本。MCP 与 CLI 可以接受 Markdown 输入，但服务端需要把 Markdown 转换并校验为权威的 TipTap JSON 后再入库。

## Cloudflare 初始化

公开仓库可以直接通过上方 **Deploy to Cloudflare** 按钮进入部署向导。Cloudflare 会读取 `wrangler.toml`，为 D1/R2 等绑定创建或配置所需资源，并使用 `package.json` 中的 `deploy` 脚本执行 D1 migration 与 Worker 部署。你仍需要登录 Cloudflare、授权 GitHub/GitLab 连接，并确认仓库名、Worker 名和资源名；如果你的账号里已经存在同名 Worker 或仓库，把项目名改成一个唯一名称即可。

`.env.example` 在 Deploy Button 语义下是 Worker Secret 模板。当前 EdgeEver 不需要运行时密钥，所以一键部署时不需要填写 `CLOUDFLARE_ACCOUNT_ID` 或 `CLOUDFLARE_API_TOKEN`。

如果你更喜欢 CLI 部署，先创建本机环境文件：

```sh
cp .env.local.example .env.local
```

`.env.local` 已被 `.gitignore` 忽略，用来保存本机 Cloudflare 账号、资源名称、API Token 等部署参数。不要把它提交到公开仓库。

创建 D1 数据库和 R2 存储桶：

```sh
bunx wrangler d1 create edgeever
bunx wrangler r2 bucket create edgeever-resources
```

把 D1 创建命令返回的 `database_id` 填入本机 `.env.local` 的 `EDGE_EVER_D1_DATABASE_ID`。部署脚本会在运行时生成临时 `.wrangler.generated.toml`，不需要把个人 D1 ID 提交到公开仓库。

如果你把 Worker 连接到 GitHub 并开启 Cloudflare 自动构建，需要在 Cloudflare 的 Build Variables 里设置：

```text
EDGE_EVER_D1_DATABASE_ID=<你的 D1 database_id>
```

## 多实例部署

EdgeEver 推荐用多个 Worker + 多套 D1/R2 来做实例隔离。比如私人实例和公开演示实例：

```text
tianma.edgeever.org -> edgeever-tianma -> edgeever-tianma D1 + edgeever-tianma-resources R2
demo.edgeever.org   -> edgeever-demo   -> edgeever-demo D1   + edgeever-demo-resources R2
```

本地 `.env.local` 可以按 `.env.local.example` 填入实例专属变量：

```text
EDGE_EVER_TIANMA_WORKER_NAME=edgeever-tianma
EDGE_EVER_TIANMA_CUSTOM_DOMAIN=tianma.edgeever.org
EDGE_EVER_TIANMA_D1_DATABASE_ID=<tianma D1 database_id>
EDGE_EVER_TIANMA_R2_BUCKET_NAME=edgeever-tianma-resources

EDGE_EVER_DEMO_WORKER_NAME=edgeever-demo
EDGE_EVER_DEMO_CUSTOM_DOMAIN=demo.edgeever.org
EDGE_EVER_DEMO_D1_DATABASE_ID=<demo D1 database_id>
EDGE_EVER_DEMO_R2_BUCKET_NAME=edgeever-demo-resources
```

部署单个实例：

```sh
bun run deploy:tianma
bun run deploy:demo
```

同时部署两个实例：

```sh
bun run deploy:all
```

如果用 Cloudflare Git 自动构建，每个 Worker 都可以连接同一个 GitHub 仓库，但需要分别配置自己的 Build Variables。至少要设置：

```text
EDGE_EVER_WORKER_NAME=<实例 Worker 名>
EDGE_EVER_CUSTOM_DOMAIN=<实例域名>
EDGE_EVER_D1_DATABASE_ID=<实例 D1 database_id>
EDGE_EVER_R2_BUCKET_NAME=<实例 R2 bucket>
EDGE_EVER_R2_PREVIEW_BUCKET_NAME=<实例 R2 preview bucket>
```

应用本地迁移：

```sh
bunx wrangler d1 migrations apply DB --local
```

应用远程迁移：

```sh
bunx wrangler d1 migrations apply DB --remote
```

## 本地开发

安装依赖：

```sh
bun install
```

应用本地 D1 迁移：

```sh
bun run db:migrate:local
```

同时启动 Worker API 和 Vite 前端：

```sh
bun run dev
```

也可以分开启动：

```sh
bun run dev:api
bun run dev:web
```

常用校验：

```sh
bun run typecheck
bun run build
```

## 当前阶段

当前已经具备第一条可运行纵向切片：

- Bun monorepo 基础工程。
- D1 初始 schema：支持嵌套笔记本、笔记正文拆表、FTS5 搜索、资源、修订、审计、软删除和合并字段。
- Hono REST API：笔记本列表/创建/更新/删除，笔记列表/创建/读取/更新/删除，搜索，多选合并。
- Vite React PWA：桌面三栏布局，移动端单栏切换，递归笔记本树，笔记卡片流，TipTap 编辑器，标签和本地草稿备份。
- 基础 `wrangler.toml`：配置 Workers Assets、D1、R2 和 `/api/*`、`/mcp` Worker-first 路由。

后续阶段会继续补完整 MCP Server、CLI、资源上传、认证 Token、导入导出和更完整的 Markdown 双向转换。

## 项目原则

- **默认开放**：数据应该可读、可导出、可脚本化。
- **为 Agent 准备，但不牺牲人类体验**：人类使用最好的 UI，Agent 使用明确的 API。
- **边缘原生，而不是边缘噱头**：只在 Cloudflare 真正降低部署和运维复杂度的地方使用它。
- **内容可迁移**：Markdown 很重要，但结构化编辑器 JSON 才能保护富文本保真度。
- **软删除和可审计**：破坏性操作必须可追踪、可恢复。
- **小模块，清边界**：UI、REST、MCP、CLI 共享核心行为，而不是重复实现。
