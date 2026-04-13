# Agent Platform — Skills 模块设计规格

> MVP 阶段：聚焦 Skills 模块的创建、编辑、管理和平台内消费。

## 1. 项目定位

一个 Agent 定制化平台，让用户创建和管理符合 [agentskills.io](https://agentskills.io/) 开放标准的 Skills。创建好的 Skills 可被平台内 Agent 消费，也为未来的外部 Agent 消费预留扩展能力。

**MVP 范围：** 只做 Skills 模块。Agents、Prompts、MCP Servers 模块在导航栏中占位，但不实现。

## 2. 架构

```
┌─────────────────┐     MSAL.js      ┌──────────────┐
│  React + TS     │ ───── token ────→ │  Azure AD    │
│  (Vite)         │                   │  / Entra ID  │
│  Monaco Editor  │                   └──────────────┘
└────────┬────────┘
         │ Bearer Token
         ▼
┌─────────────────┐                   ┌──────────────┐
│  Python          │ ──── SDK ───────→ │  Azure Blob  │
│  FastAPI         │                   │  Storage     │
│  (App Service)   │                   │  (单 container)│
└─────────────────┘                   └──────────────┘
```

### 2.1 前端

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript | 成熟生态，团队内一致 |
| 构建 | Vite | 快速 HMR |
| UI 组件 | Radix UI + Tailwind CSS | 无样式 headless 组件 + 原子化 CSS |
| 代码编辑器 | Monaco Editor | VS Code 编辑器内核 |
| 数据请求 | TanStack React Query + Axios | 自带缓存和状态管理 |
| 表单 | React Hook Form + Zod | 创建向导的表单校验 |
| 路由 | React Router v7 | SPA 路由 |
| 单元测试 | Vitest | 组件级测试 |
| E2E 测试 | Playwright | MVP 后补 |

### 2.2 后端

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | Python FastAPI | 轻量高性能，async 支持 |
| 部署 | Azure App Service | 统一后端服务，模块化路由 |
| 存储 | Azure Blob Storage | 单 container，虚拟目录按用户隔离 |
| 认证 | Azure AD / Entra ID | MSAL.js 前端登录，后端验证 JWT token |
| 数据库 | 暂无 | 元数据从 Blob 文件解析，未来可加 |

### 2.3 API 路由规划

MVP 只实现 `/api/skills/`，其他路由预留：

```
/api/skills/           → Skills CRUD（MVP 实现）
/api/agents/           → 未来 Agent 模块
/api/prompts/          → 未来 Prompt 模块
/api/mcp/              → 未来 MCP 模块
```

### 2.4 存储结构

```
skills-container/
├── {user-object-id}/
│   ├── crm-opportunity/
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   ├── search_accounts.py
│   │   │   └── ...
│   │   ├── references/
│   │   └── assets/
│   └── data-processor/
│       └── ...
└── {another-user-id}/
    └── ...
```

- 用户通过 Azure AD 登录后，其 `object-id` 作为 Blob 虚拟目录前缀
- 每个 skill 一个子目录，目录名 = `SKILL.md` frontmatter 中的 `name` 字段
- 后端用当前用户身份访问 Blob，天然实现权限隔离

## 3. agentskills.io 规范要点

所有 Skill 必须遵循 agentskills.io 开放标准：

### 3.1 目录结构

```
skill-name/
├── SKILL.md          # 必需：元数据 + 指令
├── scripts/          # 可选：可执行脚本
├── references/       # 可选：参考文档
├── assets/           # 可选：模板、资源文件
└── ...               # 可自由扩展
```

### 3.2 SKILL.md Frontmatter 字段

| 字段 | 必需 | 约束 |
|------|------|------|
| `name` | 是 | 1-64 字符，小写字母+数字+连字符，不能以连字符开头/结尾，不能有连续连字符，必须与目录名一致 |
| `description` | 是 | 1-1024 字符，描述功能和触发条件 |
| `license` | 否 | 许可证名称或文件引用 |
| `compatibility` | 否 | 1-500 字符，环境要求 |
| `metadata` | 否 | 任意键值对（author, version 等） |
| `allowed-tools` | 否 | 空格分隔的工具列表（实验性） |

### 3.3 渐进式加载设计

1. **元数据**（~100 tokens）：`name` + `description`，启动时加载
2. **指令**（< 5000 tokens 推荐）：`SKILL.md` 正文，skill 激活时加载
3. **资源**（按需）：scripts/、references/、assets/ 中的文件

`SKILL.md` 正文建议 < 500 行，详细内容拆分到 references/ 中。

## 4. 前端页面设计

### 4.1 全局布局

- 左侧导航栏：64px 宽，图标模式，hover 展开到 220px
  - Skills（六角拼图图标）、Agents（机器人）、Prompts（对话气泡）、MCP Servers（插头）
  - 底部：通知、用户头像
- 顶栏：48px 高，面包屑导航
- 内容区：白色/浅灰背景

**设计参考：** 见 `docs/figma-*.jpg` 截图

### 4.2 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/skills` | SkillListPage | 所有 skill 卡片网格 |
| `/skills/new` | SkillCreatePage | 选模板 → 填基础信息 |
| `/skills/:name/edit` | SkillEditorPage | 类 VS Code 编辑器 |
| `/skills/:name` | SkillDetailPage | 只读预览 + 安装指引 |

### 4.3 Skills 列表页（`/skills`）

**功能：**
- 展示当前用户所有 skills 的卡片网格（3 列）
- 搜索框：按名称和描述模糊匹配
- 筛选下拉：按版本、作者等（未来扩展）
- "+ New Skill" 按钮 → 跳转创建向导
- 空状态卡片引导用户创建第一个 skill

**卡片信息：**
- Skill 图标（不同颜色区分类型）
- 名称（`name`，JetBrains Mono 字体）
- 描述摘要（`description` 截断，最多 2 行）
- 底部：版本徽章、作者头像+名称、许可证徽章
- 操作：点击卡片 → 详情页，"编辑" → 编辑器页，"..." → 更多操作（删除等）

**分页：** 底部简单分页，"Showing X of Y skills"

### 4.4 Skill 创建向导页（`/skills/new`）

**两步流程：**

**Step 1 — Choose Template：**
- 4 个模板卡片（2x2 网格）：
  1. **Blank Skeleton** — 标准骨架：SKILL.md + scripts/ + references/ + assets/
  2. **Script-based Skill** — 多脚本模板，适合 API 集成
  3. **Instruction-only Skill** — 纯指令，无脚本
  4. **MCP Integration** — 外部 API 调用模板，含鉴权样板代码
- 选中态：蓝色边框 + 勾号徽章
- 右侧预览面板：实时展示文件树 + 生成的 SKILL.md frontmatter 代码

**Step 2 — Basic Info：**
- 表单字段（React Hook Form + Zod 校验）：
  - `name`：必填，实时校验 agentskills.io 命名规则（小写+连字符，1-64 字符）
  - `description`：必填，textarea，最多 1024 字符，带字符计数
  - `license`：可选，下拉选择（MIT、Apache-2.0、Proprietary 等）
  - `author`：可选，默认填入当前用户名
  - `version`：可选，默认 "1.0"
- 底部："Create" 按钮 → 后端创建 skill 目录并写入 SKILL.md → 跳转编辑器页

### 4.5 Skill 编辑器页（`/skills/:name/edit`）

**核心体验：类 VS Code 的代码编辑界面**

**顶栏（44px，深色）：**
- 左侧：返回箭头、Skill 名称、版本徽章、保存状态指示（"Saved" 绿点 / "Unsaved" 琥珀点）
- 右侧："Validate" 按钮（校验 agentskills.io 规范合规性）、"Preview" 按钮、"Save" 按钮、更多操作

**三面板布局：**

1. **文件浏览器**（240px，深色背景）
   - 文件树展示 skill 目录结构
   - 文件/文件夹图标区分（文件夹琥珀色，文件蓝色）
   - 选中文件高亮（蓝色左边框 + 深色背景）
   - 底部工具栏：新建文件、新建文件夹、上传

2. **代码编辑器**（主区域，深色编辑器主题）
   - Monaco Editor 集成
   - 标签栏：多文件切换
   - 语法高亮：YAML frontmatter（粉色键、绿色值）、Markdown（蓝色标题、灰色文本）、Python 等
   - 行号栏
   - 当前行高亮

3. **底部状态栏**（24px）
   - 语言类型、编码、行列位置
   - agentskills.io 合规状态指示："agentskills.io compatible ✓"（绿色）

**关键交互：**
- 保存：Cmd+S 触发，调用后端 API 写入 Blob Storage
- 校验：点击 "Validate" 解析 SKILL.md frontmatter，检查 name/description 等必填字段、name 命名规则、description 长度
- 新建文件/文件夹：弹出内联输入框，输入名称后在对应目录下创建
- 上传：拖拽或点击上传文件到当前目录

### 4.6 Skill 详情/预览页（`/skills/:name`）

**Hero Header：**
- Skill 图标（渐变蓝背景方形圆角）
- 名称（28px，JetBrains Mono）
- 描述全文
- 元数据标签行：版本（蓝）、作者（灰）、许可证（绿）、兼容性（琥珀）
- 操作按钮：Edit（蓝色主按钮）、Download .skill、Delete（红色文字，与其他按钮间距更大防误触）

**双栏布局（65% / 35%）：**

左栏 — Markdown 渲染：
- 完整渲染 SKILL.md 正文内容
- 表格、代码块（深色背景 + 语法高亮 + 复制按钮）、有序/无序列表
- 标题带锚点链接

右栏 — 信息面板（sticky）：
- **File Structure** 卡片：文件树 + 文件大小/数量
- **Install this Skill** 卡片：Claude Code 安装命令（带复制按钮）、GitHub Copilot 安装指引、"Compatible with 16+ agents" 链接
- **Details** 卡片：创建时间、修改时间、总大小

## 5. 后端 API 设计

### 5.1 认证中间件

所有 `/api/*` 请求必须携带 `Authorization: Bearer <token>`。后端验证 Azure AD JWT token，提取用户 `oid`（object ID）作为 Blob 路径前缀。

### 5.2 Skills API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | 列出当前用户所有 skills |
| POST | `/api/skills` | 创建新 skill（接收模板类型 + 基础信息） |
| GET | `/api/skills/{name}` | 获取 skill 元数据和文件列表 |
| DELETE | `/api/skills/{name}` | 删除整个 skill |
| GET | `/api/skills/{name}/files/{path}` | 读取 skill 中的某个文件内容 |
| PUT | `/api/skills/{name}/files/{path}` | 创建或更新 skill 中的某个文件 |
| DELETE | `/api/skills/{name}/files/{path}` | 删除 skill 中的某个文件 |

### 5.3 列表接口响应示例

```json
GET /api/skills

{
  "skills": [
    {
      "name": "crm-opportunity",
      "description": "Manage Dynamics 365 CRM opportunities...",
      "license": "MIT",
      "metadata": { "author": "carvychen", "version": "2.0" },
      "file_count": 10,
      "total_size": 12400,
      "created_at": "2025-04-10T08:00:00Z",
      "modified_at": "2026-04-13T12:00:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 12
}
```

### 5.4 创建接口请求示例

```json
POST /api/skills

{
  "name": "my-new-skill",
  "description": "A skill that does...",
  "template": "blank",
  "license": "MIT",
  "metadata": {
    "author": "jiaweichen",
    "version": "1.0"
  }
}
```

后端处理流程：
1. 校验 `name` 符合 agentskills.io 命名规则
2. 检查 `{user-oid}/my-new-skill/` 不存在
3. 根据 `template` 类型生成骨架文件
4. 写入 SKILL.md（包含 frontmatter）到 Blob
5. 创建 scripts/、references/、assets/ 空目录占位文件
6. 返回创建成功 + skill 元数据

### 5.5 Validate 接口

```json
POST /api/skills/{name}/validate

Response:
{
  "valid": true,
  "errors": [],
  "warnings": [
    { "field": "compatibility", "message": "Consider adding compatibility info" }
  ]
}
```

校验规则基于 agentskills.io 规范：
- `name` 格式合规（小写+数字+连字符，1-64字符，不以连字符开头/结尾，无连续连字符）且与目录名一致
- `description` 非空且 ≤ 1024 字符
- `compatibility` 若有则 ≤ 500 字符
- `metadata` 若有则键值均为字符串
- SKILL.md 存在且 YAML frontmatter 可解析
- SKILL.md 正文建议 < 500 行（警告，不阻断）

## 6. 认证流程

```
1. 用户访问平台 → 前端检查本地是否有有效 token
2. 无 token → MSAL.js 重定向到 Azure AD 登录页
3. 用户登录成功 → 回调带回 authorization code
4. MSAL.js 用 code 换取 access token + id token
5. 前端存储 token，后续请求带 Authorization header
6. 后端中间件验证 JWT 签名、过期时间、audience
7. 从 token 中提取 oid 作为用户标识
8. 用 oid 作为 Blob Storage 虚拟目录前缀访问数据
```

需要在 Azure Portal 创建一个 App Registration：
- Redirect URI 配置前端地址（如 `http://localhost:5173` 开发环境，`https://platform.example.com` 生产环境）
- API permissions 添加 Azure Storage `user_impersonation` 权限
- 后端 scope 配置为自定义 API（如 `api://{client-id}/Skills.ReadWrite`）
- 前端 MSAL 配置 `loginScopes` 包含后端 API scope

## 7. 模板定义

### 7.1 Blank Skeleton

```
{name}/
├── SKILL.md          # frontmatter 填入用户输入的基础信息，正文为空
├── scripts/          # 空目录
├── references/       # 空目录
└── assets/           # 空目录
```

### 7.2 Script-based Skill

```
{name}/
├── SKILL.md          # frontmatter + 脚本使用说明模板
├── scripts/
│   └── main.py       # Python 脚本模板，含 argparse 样板代码
├── references/
│   └── REFERENCE.md  # API 参考模板
└── assets/
```

### 7.3 Instruction-only Skill

```
{name}/
├── SKILL.md          # frontmatter + 详细指令模板（步骤、示例、边界情况）
├── references/       # 空目录
└── assets/
```

### 7.4 MCP Integration

```
{name}/
├── SKILL.md          # frontmatter + MCP 集成说明模板
├── scripts/
│   └── client.py     # HTTP/MCP 客户端模板，含鉴权样板代码
├── references/
│   └── API.md        # 外部 API 文档模板
└── assets/
```

## 8. 未来扩展点（MVP 不实现）

- **外部消费 API**：通过 Azure AD OAuth 授权外部 Agent 只读访问 skills
- **版本管理**：Blob Storage 版本控制或 Git 集成
- **发布/审核流程**：skill 从 "draft" → "published" 的状态机
- **搜索引擎**：加入 CosmosDB 或 Azure AI Search 做全文检索
- **Agent 模块**：创建 Agent 并绑定 skills
- **Prompt 模块**：创建和管理 prompt templates
- **MCP Server 模块**：注册和管理 MCP servers
- **团队协作**：基于 Azure AD 组的 skill 共享
- **使用统计**：追踪 skill 的安装/调用次数

## 9. 设计参考文件

| 文件 | 说明 |
|------|------|
| `docs/figma-prompts.md` | Figma 设计生成 prompt |
| `docs/figma-Skills列表页.jpg` | 列表页设计稿 |
| `docs/figma-Skill创建向导页.jpg` | 创建向导设计稿 |
| `docs/figma-Skill编辑器页.jpg` | 编辑器页设计稿 |
| `docs/figma-Skill详情:预览页.jpg` | 详情预览页设计稿 |
| `crm-opportunity/` | 现有 skill 示例，作为测试数据 |
