# Agent Platform — Skills 模块设计规格 (v2)

> Updated: 2026-04-14 — 基于 MVP 实际实现重写，反映当前架构和确认的增强计划。

## 1. 项目定位

一个 Agent 定制化平台，让用户创建和管理符合 [agentskills.io](https://agentskills.io/) 开放标准的 Skills。创建好的 Skills 可被平台内 Agent 消费（通过安装令牌和 tar 下载），也为未来的外部 Agent 消费预留扩展能力。

**当前范围：** Skills 模块，含完整 CRUD、导入/导出、多 Agent 安装引导、RBAC 角色控制。Agents、Prompts、MCP Servers 模块在导航栏中占位，暂不实现。

## 2. 架构

```
┌──────────────────────┐     MSAL.js      ┌──────────────┐
│  React 18 + TS       │ ──── token ────→ │  Azure AD    │
│  (Vite)              │                   │  / Entra ID  │
│  Monaco Editor       │                   │  (App Roles) │
└──────────┬───────────┘                   └──────────────┘
           │ Bearer Token
           ▼
┌──────────────────────┐                   ┌──────────────┐
│  Python FastAPI       │ ── SDK ────────→ │  Azure Blob  │
│  (App Service)        │  DefaultAzure    │  Storage     │
│  RBAC: Admin / User   │  Credential      │  (单 container)│
└──────────────────────┘                   └──────────────┘
```

### 2.1 前端技术栈

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript | SPA 架构 |
| 构建 | Vite | HMR 快速开发 |
| UI | Tailwind CSS 4 + Lucide Icons | 原子化 CSS + 图标库 |
| 代码编辑器 | Monaco Editor (`@monaco-editor/react`) | VS Code 编辑器内核 |
| 数据请求 | TanStack React Query + Axios | 缓存/乐观更新 + HTTP 客户端 |
| 表单 | React Hook Form + Zod | 创建向导表单校验 |
| 路由 | React Router v7 | SPA 路由 |
| 认证 | `@azure/msal-browser` + `@azure/msal-react` | Azure AD 登录 |
| Markdown | `react-markdown` + `remark-gfm` + `react-syntax-highlighter` | SKILL.md 渲染 |
| 其他 | `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` | 工具库 |

### 2.2 后端技术栈

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | Python FastAPI | async 高性能 |
| 部署 | Azure App Service | 统一后端 |
| 存储 | Azure Blob Storage | 单 container，`DefaultAzureCredential` 认证 |
| 认证 | Azure AD / Entra ID JWT | 后端校验 Bearer Token |
| 授权 | App Roles (SkillAdmin / SkillUser) | 基于 Azure AD 应用角色的 RBAC |
| 验证 | `pyyaml` + 自定义 `skill_validator` | agentskills.io 合规校验 |
| 令牌 | 内存令牌存储 (`install_token.py`) | 短期一次性安装令牌 |

### 2.3 认证与授权

#### 认证流程

```
1. 用户访问平台 → AuthProvider 初始化 MSAL
2. MSAL.initialize() + handleRedirectPromise() 处理回调
3. 无有效账户 → MSAL 重定向到 Azure AD 登录页
4. 登录成功 → MSAL 获取 access token（含 roles claim）
5. 前端 Axios 拦截器自动附加 Authorization: Bearer <token>
6. 后端 get_current_user 依赖验证 JWT 签名、issuer
7. 从 token 提取 oid、tid（tenant_id）、roles
8. tid 作为 Blob Storage 虚拟目录前缀，实现租户隔离
```

#### RBAC 角色

| 角色 | 权限 | 端点 |
|------|------|------|
| `SkillAdmin` | 读 + 写 + 删除 + 导入 | 所有端点 |
| `SkillUser` | 只读 + 下载 + 安装 | GET 端点 + download/install-token/validate |

后端通过 `require_admin` 和 `require_any_role` FastAPI 依赖实现：
- `require_any_role`：SkillAdmin 或 SkillUser 均可访问
- `require_admin`：仅 SkillAdmin 可访问

前端通过 `useRoles()` hook 获取当前用户角色，条件渲染写操作按钮。

#### UserInfo 数据结构

```python
@dataclass
class UserInfo:
    oid: str           # Azure AD object ID
    tenant_id: str     # Azure AD tenant ID（Blob 路径前缀）
    name: str
    email: str
    roles: list[str]   # ["SkillAdmin"] 或 ["SkillUser"]
```

### 2.4 存储结构

```
skills-container/
├── {tenant-id}/
│   ├── crm-opportunity/
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   ├── search_accounts.py
│   │   │   └── .gitkeep
│   │   ├── references/
│   │   └── assets/
│   └── data-processor/
│       └── ...
└── {another-tenant-id}/
    └── ...
```

- 以 `tenant_id`（Azure AD 租户 ID）作为 Blob 虚拟目录前缀
- 同一租户内所有用户共享 skills 命名空间
- 每个 skill 一个子目录，目录名 = `SKILL.md` frontmatter 中的 `name`
- 空目录通过 `.gitkeep` 文件占位

### 2.5 API 端点

#### 读取端点（SkillAdmin + SkillUser）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | 列出当前租户所有 skills |
| GET | `/api/skills/{name}` | 获取 skill 元数据和文件列表 |
| GET | `/api/skills/{name}/files/{path}` | 读取文件内容 |
| GET | `/api/skills/{name}/download` | 下载 skill 为 ZIP |
| GET | `/api/skills/{name}/tar?token=` | 通过安装令牌下载 tar.gz（无需 auth） |
| POST | `/api/skills/{name}/install-token` | 生成短期安装令牌 + SAS URLs |
| POST | `/api/skills/{name}/validate` | 校验 SKILL.md 合规性 |

#### 写入端点（仅 SkillAdmin）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/skills` | 创建新 skill（模板 + 基础信息） |
| POST | `/api/skills/import` | 从 ZIP 导入 skill |
| DELETE | `/api/skills/{name}` | 删除整个 skill |
| PUT | `/api/skills/{name}/files/{path}` | 创建或更新文件 |
| DELETE | `/api/skills/{name}/files/{path}` | 删除文件 |
| POST | `/api/skills/{name}/files/{path}/rename` | 重命名文件 |
| DELETE | `/api/skills/{name}/folders/{path}` | 删除整个文件夹 |

#### 通用端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查（无需 auth） |
| GET | `/api/me` | 当前用户信息（oid/name/email/tenant_id/roles） |

### 2.6 关键限制

| 限制 | 值 |
|------|-----|
| ZIP 导入最大体积 | 10 MB |
| 单文件最大体积 | 1 MB |
| 单 skill 最大文件数 | 100 |
| 保留 skill 名 | `import`, `new`, `search` |
| 安装令牌有效期 | 300 秒，单次使用 |

## 3. agentskills.io 规范要点

（规范本身不变，此处记录平台如何执行合规校验）

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
| `name` | 是 | 1-64 字符，`/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`，无连续连字符，必须与目录名一致 |
| `description` | 是 | 1-1024 字符 |
| `license` | 否 | 许可证名称 |
| `compatibility` | 否 | 1-500 字符，环境要求 |
| `metadata` | 否 | 任意键值对（author, version 等） |

### 3.3 平台校验实现

`POST /api/skills/{name}/validate` 执行以下检查：

**Errors（阻断）：**
- `name` 格式不合规
- `name` 与目录名不一致
- `description` 缺失或超长
- `compatibility` 超长

**Warnings（提示）：**
- `compatibility` 未填写
- SKILL.md 正文超过 500 行

## 4. 前端页面设计

### 4.1 全局布局

**Sidebar（`Sidebar.tsx`）：**
- 收起宽度 64px，hover 展开到 224px
- 导航项：Skills（Puzzle）、Agents（Bot）、Prompts（MessageSquare）、MCP Servers（Plug）
- 底部：通知铃铛、用户头像（首字母）、登录/登出
- 当前页高亮：左侧蓝色边框 + 浅色背景

**TopBar（`TopBar.tsx`）：**
- 48px 高，面包屑导航
- 可接收自定义 children

**AppLayout（`AppLayout.tsx`）：**
- Sidebar + TopBar + `<Outlet />` 内容区

> **Enhancement: 未实现路由占位页**
> Agents/Prompts/MCP 路由点击后显示空白。需要添加 "Coming Soon" 占位页或禁用导航项。

### 4.2 页面路由

| 路径 | 页面 | 组件 |
|------|------|------|
| `/` | 重定向 | → `/skills` |
| `/skills` | Skills 列表 | `SkillListPage` |
| `/skills/new` | 创建向导 | `SkillCreatePage` |
| `/skills/:name/edit` | 编辑器 | `SkillEditorPage` |
| `/skills/:name` | 详情/预览 | `SkillDetailPage` |

> **Enhancement: 路由守卫**
> 当前所有路由对未登录用户可见（API 返回 401 但页面渲染）。需要添加 `ProtectedRoute` 组件。

### 4.3 Skills 列表页

**已实现功能：**
- 3 列卡片网格
- 搜索框：按名称 + 描述模糊匹配
- "+ New Skill" 按钮（SkillAdmin 可见）+ Import Skill 下拉
- 导入 skill 弹窗（`ImportSkillDialog`）：ZIP 上传 + 覆盖确认
- 空状态引导卡片
- "Showing X of Y skills" 计数

**卡片内容（`SkillCard.tsx`）：**
- 彩色图标（5 色轮换）
- 名称（mono 字体）
- 描述（截断 2 行）
- 元数据徽章：版本、作者、许可证（`SkillMetadataPills`）
- 操作：点击 → 详情页，"..." 菜单含编辑/删除

> **Enhancement: 分页**
> 后端已返回 `page`/`page_size`，前端需添加翻页控件。

> **Enhancement: 筛选**
> 添加筛选下拉（按版本、作者等），初期可做 disabled 占位。

### 4.4 创建向导页

**两步流程已实现：**

**Step 1 — Choose Template：**
- 4 个模板卡片（`TemplateCard`）：Blank Skeleton、Script-based、Instruction-only、MCP Integration
- 选中态：蓝色边框 + 勾号
- 右侧预览：文件树 + frontmatter 代码块

**Step 2 — Basic Info：**
- 表单字段（React Hook Form + Zod）：name（实时校验）、description（字符计数）、license（下拉）、author、version
- 默认值：license=MIT, version=1.0
- 创建 → 调 API → 跳转编辑器

**权限：** 非 SkillAdmin 自动重定向回列表页

> **Enhancement: 预览面板动态化**
> 当前 frontmatter 预览为静态 mock，不随模板选择和用户输入变化。

> **Enhancement: Author 预填**
> author 字段应默认填入当前用户名。

### 4.5 编辑器页

**核心体验：类 VS Code 深色编辑界面，已实现。**

**顶栏（48px，深色 `#1B1B2F`）：**
- 左：返回箭头、Skill 名称（mono）、版本徽章、保存状态（绿点 Saved / 琥珀点 Unsaved）
- 右：Validate 按钮、Preview 按钮、Save 按钮

**三面板布局：**

1. **文件浏览器（240px，`FileTree.tsx`）：**
   - 文件树展示 skill 目录结构
   - 文件夹/文件图标区分
   - 选中文件高亮
   - 右键上下文菜单：重命名、删除
   - 底部工具栏：新建文件、新建文件夹

2. **代码编辑器（主区域）：**
   - Monaco Editor，自定义 `skills-dark` 主题
   - 语法高亮：Markdown/YAML/Python/JS/TS/JSON/Shell
   - Cmd+S / Ctrl+S 保存
   - 单文件标签栏

3. **状态栏（24px）：**
   - 语言类型、编码（UTF-8）
   - agentskills.io 校验结果（点 Validate 后显示）

**权限：** 非 SkillAdmin 重定向到详情页

> **Enhancement: 多标签页**
> 当前只能打开一个文件，需支持多标签页切换。

> **Enhancement: 文件上传**
> 编辑器中无法上传文件到 skill 目录，需支持拖拽或点击上传。

> **Enhancement: 行列号**
> 状态栏需显示光标位置（Ln/Col）。

> **Enhancement: 未保存离开警告**
> 编辑器有未保存内容时，浏览器关闭/刷新或站内导航应弹出确认提示。

> **Enhancement: 快捷键面板**
> 添加快捷键帮助弹窗（Cmd+?），展示 Save、Quick Open 等可用快捷键。

### 4.6 详情/预览页

**已实现：**

**Hero Header：**
- 渐变色图标 + 名称（28px mono）+ 描述全文
- 元数据标签行（`SkillMetadataPills`）
- 操作按钮：Edit（蓝）、Export 下拉（ZIP + 多 Agent 安装命令）、Delete（红，间距防误触）

**双栏布局：**

左栏 — Markdown 渲染（`MarkdownRenderer.tsx`）：
- `react-markdown` + `remark-gfm` + `react-syntax-highlighter`
- 代码块：语法高亮 + 复制按钮
- 表格、列表、标题渲染
- 自动剥离 SKILL.md frontmatter

右栏 — 信息面板：
- **File Structure** 卡片：展开式只读文件树 + 文件大小
- **How to Use** 卡片（`InstallGuide.tsx`）：6 个 Agent 的安装路径（Claude Code、Copilot、Codex、Cursor、Windsurf、OpenCode），含复制按钮
- **Export** 卡片（`ExportDropdown.tsx`）：ZIP 下载 + tar URL 生成
- **Details** 卡片：创建时间、修改时间、总大小、文件数

> **Enhancement: 右栏 sticky**
> 右栏需添加 `position: sticky` 使其在滚动时固定。

> **Enhancement: 标题锚点**
> Markdown 标题需添加 `id` 属性和锚点链接图标。


## 5. 模板定义

4 种内建模板，创建 skill 时选择：

| 模板 | 生成文件 | 适用场景 |
|------|----------|----------|
| `blank` | SKILL.md + scripts/ + references/ + assets/ | 通用骨架 |
| `script` | SKILL.md + scripts/main.py + references/REFERENCE.md + assets/ | 多脚本 API 集成 |
| `instruction` | SKILL.md + references/ + assets/ | 纯指令，无脚本 |
| `mcp` | SKILL.md + scripts/client.py + references/API.md + assets/ | 外部 API/MCP 调用 |

模板通过 `_render_template()` 将用户输入（name/description/license/metadata）插入模板文件。

## 6. 导入/导出

### 6.1 导出

- **ZIP 下载**：`GET /api/skills/{name}/download`，排除 `.gitkeep` 文件
- **Tar.gz 下载**：`GET /api/skills/{name}/tar?token=`，通过安装令牌访问（无需 Bearer token），用于 CLI 安装

### 6.2 导入

- **ZIP 上传**：`POST /api/skills/import`，支持 `?overwrite=true`
- 自动检测 ZIP 中的根目录，提取 SKILL.md frontmatter 中的 `name` 作为 skill 名
- 校验 name 合规性，检查文件数和单文件大小限制
- 忽略 `__MACOSX`、`.git`、`__pycache__`、`node_modules`、以 `.` 开头的文件
- 覆盖模式：上传新文件后删除旧 skill 中不存在于 ZIP 的文件

### 6.3 安装令牌

- `POST /api/skills/{name}/install-token` 生成 300 秒有效的一次性令牌
- 返回 `tar_url`（用于 CLI 安装）和 `sas_urls`（Blob SAS 直接访问链接）
- 令牌存储在内存 `InstallTokenStore` 中

## 7. 安全要求

以下安全要求已在代码审查中确认，需要在后续迭代中修复：

### 7.1 JWT 校验

- **当前问题**：`verify_aud=False` 禁用了 `python-jose` 的受众校验，改为手动字符串比较
- **要求**：恢复 `jwt.decode()` 原生 `audience` 参数，传入 `[azure_ad_audience, azure_ad_client_id]`

### 7.2 路径遍历防护

- **当前问题**：`file_path` 和 `skill_name` 未做 `../` 规范化检查
- **要求**：在 `_blob_path()` 中添加 `posixpath.normpath` 校验，拒绝含 `..` 的路径

### 7.3 HTML 净化

- **当前问题**：`MarkdownRenderer` 使用 `rehype-raw` 渲染原始 HTML，存在 XSS 风险
- **要求**：替换为 `rehype-sanitize`

### 7.4 JWKS 缓存

- **当前问题**：JWKS 缓存永不过期，Azure AD 密钥轮换后导致全员 401
- **要求**：添加 24 小时 TTL + 缓存未命中时自动刷新

### 7.5 内容大小限制

- **当前问题**：`FileWriteRequest.content` 无大小限制
- **要求**：添加 `max_length=1_048_576`（1 MB）

### 7.6 CORS 收窄

- **当前问题**：`allow_methods=["*"]`, `allow_headers=["*"]`
- **要求**：改为白名单 `["GET", "POST", "PUT", "DELETE", "OPTIONS"]` 和 `["Authorization", "Content-Type", "Accept"]`

### 7.7 保留名检查

- **当前问题**：`RESERVED_SKILL_NAMES` 已定义但 `create_skill` 和 `import_skill` 中未检查
- **要求**：在创建和导入时显式检查

## 8. 已知 Bug

以下 Bug 已在代码审查中确认，需要在后续迭代中修复：

| # | 位置 | 问题 |
|---|------|------|
| 1 | `SkillEditorPage.tsx:106` | `!editorContent` 判断阻止保存空文件 |
| 2 | `SkillEditorPage.tsx:98-103` | React Query refetch 覆盖编辑器未保存内容 |
| 3 | `FileTree.tsx:192-201` | Escape 取消重命名后 onBlur 仍触发提交 |
| 4 | `MarkdownRenderer.tsx:53-57` | frontmatter 剥离逻辑在文档含 `---` 分隔线时出错 |
| 5 | `test_auth.py` | UserInfo 增加 tenant_id 后测试未更新 |
| 6 | `test_blob_storage.py` | `_user_prefix` 重命名为 `_tenant_prefix` 后测试未更新 |
| 7 | `useSkillFiles.ts` | `useDeleteFile`/`useRenameFile`/`useDeleteFolder` 的 optimistic update 缺少 `onSettled` 缓存同步，成功时不会与服务端重新对齐 |
| 8 | `axiosClient.ts:39` | `acquireTokenSilent` 失败后返回 `null`，Axios 拦截器静默发送无认证请求，导致 401 |

## 9. 项目文件结构

### 后端

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, router, /api/health, /api/me
│   ├── config.py                  # Settings (blob, Azure AD, CORS)
│   ├── auth/
│   │   ├── __init__.py
│   │   └── dependencies.py        # JWT 校验, UserInfo, RBAC 依赖
│   ├── routers/
│   │   ├── __init__.py
│   │   └── skills.py              # 13+ 端点, 模板, ZIP 导入/导出
│   ├── services/
│   │   ├── __init__.py
│   │   ├── blob_storage.py        # BlobStorageService (CRUD, SAS, 并行操作)
│   │   ├── skill_validator.py     # agentskills.io 命名和 frontmatter 校验
│   │   └── install_token.py       # 内存安装令牌存储
│   └── models/
│       ├── __init__.py
│       └── skill.py               # Pydantic 模型 (Create, FileWrite, FileRename)
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_skill_validator.py
│   └── test_blob_storage.py
├── requirements.txt
├── requirements-dev.txt
└── .env.example
```

### 前端

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                            # Router + Auth + QueryClient
│   ├── index.css                          # Tailwind 主题 (自定义色板 + 字体)
│   ├── auth/
│   │   ├── msalConfig.ts                  # MSAL 配置
│   │   ├── AuthProvider.tsx               # MSAL 初始化 + ready gate
│   │   ├── useAuth.ts                     # login/logout/getAccessToken hook
│   │   └── useRoles.ts                    # RBAC hook (isAdmin, canRead, canWrite)
│   ├── api/
│   │   ├── axiosClient.ts                 # Axios + token 缓存 + 请求去重
│   │   └── skillsApi.ts                   # 15 个 API 函数
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── skills/
│   │   │   ├── SkillCard.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── FileTree.tsx               # 文件树 + 右键菜单 + 内联编辑
│   │   │   ├── SkillMetadataPills.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── InstallGuide.tsx           # 多 Agent 安装引导
│   │   │   ├── ExportDropdown.tsx         # 导出下拉
│   │   │   └── ImportSkillDialog.tsx      # 导入弹窗
│   │   └── ui/
│   │       ├── SearchInput.tsx
│   │       ├── Breadcrumb.tsx
│   │       ├── EmptyState.tsx
│   │       └── SplitButton.tsx
│   ├── pages/
│   │   └── skills/
│   │       ├── SkillListPage.tsx
│   │       ├── SkillCreatePage.tsx
│   │       ├── SkillEditorPage.tsx
│   │       └── SkillDetailPage.tsx
│   ├── hooks/
│   │   ├── useSkills.ts                   # React Query hooks (list/detail/create/delete/validate/import)
│   │   └── useSkillFiles.ts               # React Query hooks (read/write/delete/rename file, delete folder)
│   ├── types/
│   │   └── skill.ts                       # TypeScript 类型定义
│   ├── constants/
│   │   └── agents.ts                      # 6 个支持的 Agent 定义
│   └── utils/
│       └── zipAssembler.ts                # 浏览器端 ZIP 组装
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## 10. 基础设施改进

### 10.1 健康检查增强

- **当前状态**：`/api/health` 返回简单的固定响应，不检查依赖服务
- **要求**：增加 Blob Storage 连通性检查，启动时校验必需环境变量，返回结构化状态 `{"status": "healthy", "blob_storage": "connected"}`

### 10.2 结构化日志

- **当前状态**：无统一日志方案
- **要求**：添加 JSON 格式结构化日志，记录认证失败、Blob 错误、导入/导出操作，包含请求关联 ID，不记录 token、文件内容或 PII

## 11. 未来扩展点（暂不实现）

- **Agent 模块**：创建 Agent 并绑定 skills
- **Prompt 模块**：创建和管理 prompt templates
- **MCP Server 模块**：注册和管理 MCP servers
- **版本管理**：Blob Storage 版本控制或 Git 集成
- **发布/审核流程**：draft → published 状态机
- **全文搜索**：CosmosDB 或 Azure AI Search
- **团队协作**：基于 Azure AD 组的 skill 共享
- **使用统计**：追踪 skill 安装/调用次数
- **外部消费 API**：OAuth 授权外部 Agent 只读访问
