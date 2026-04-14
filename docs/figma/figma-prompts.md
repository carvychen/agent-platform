# Skills 模块 Figma 设计 Prompts

## 通用设计规范（所有页面共享）

- 设计尺寸：1440 x 900（桌面端）
- 美学方向：**"Developer Studio"** — 介于 Linear.app 的克制精致和 Vercel Dashboard 的工程感之间。不是传统企业后台的沉闷，而是让开发者觉得"这工具懂我"的高级感
- 配色体系：深色侧边导航（#0F0F1A）+ 浅色内容区（#FAFAFA），主色调为冷蓝（#3B82F6），辅助色为薄荷绿（#10B981）用于成功状态，琥珀色（#F59E0B）用于警告
- 字体：标题用 **JetBrains Mono**（体现开发者身份），正文用 **DM Sans**（清晰现代）
- 圆角：卡片 12px，按钮 8px，输入框 8px
- 阴影：细腻的双层阴影 — 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)
- 左侧全局导航栏（64px 宽，图标模式 + hover 展开到 220px）：
  - 顶部：一个六边形 Logo 图标，hover 显示 "Agent Platform"
  - 导航图标（上到下）：Skills（六角拼图图标，当前高亮，左侧有 3px 蓝色指示条），Agents（机器人图标），Prompts（对话气泡图标），MCP Servers（插头连接图标）
  - 底部分隔线后：通知铃铛图标（带小红点），用户头像圆圈（带绿色在线状态点），hover 显示 "Jiawei Chen"
- 全局导航和内容区之间有 1px 的 #E5E7EB 分割线
- 所有页面顶部有一个 48px 高的顶栏，显示面包屑导航

---

## Prompt 1：Skills 列表页

Design a premium developer dashboard for managing AI agent skills. This is the main listing page of a skill management platform. Desktop layout, 1440x900.

**Color & Typography:**
- Background: #FAFAFA for content area
- Cards: Pure white #FFFFFF with subtle double-layer shadow (0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04))
- Primary accent: #3B82F6 (blue)
- Headings: JetBrains Mono font, dark #0F0F1A
- Body text: DM Sans font, #6B7280 for secondary text
- Card corners: 12px radius

**Left sidebar (64px wide, #0F0F1A background, icons only):**
- Top: Hexagonal logo icon in blue gradient
- Vertically centered icon navigation with 32px spacing:
  - Puzzle-piece icon (Skills) — highlighted with a 3px blue (#3B82F6) left border indicator and subtle blue glow background
  - Robot icon (Agents) — dimmed #6B7280
  - Chat-bubble icon (Prompts) — dimmed
  - Plug icon (MCP Servers) — dimmed
- Bottom section (separated by thin line): Bell icon with tiny red notification dot, User avatar circle (32px) with green online status dot at bottom-right

**Top bar (48px height, white background, bottom border 1px #E5E7EB):**
- Left: Page title "Skills" in JetBrains Mono, 20px, bold, #0F0F1A. Next to it, a small count badge "12 skills" in #6B7280
- Right side: Search input with magnifying glass icon (240px wide, #F3F4F6 background, 8px radius, placeholder "Search skills..."), Filter dropdown button with funnel icon, and a prominent "+ New Skill" button (blue #3B82F6 background, white text, 8px radius, subtle shadow)

**Content grid (3 columns, gap 20px, padding 32px):**

Card 1 (normal state):
- Top-left corner: A small colored dot (green #10B981) indicating "active" status
- Skill icon: A terminal/console icon in a 40px circle with light blue (#EFF6FF) background
- Name: "crm-opportunity" in JetBrains Mono, 16px, bold
- Description: "Manage Dynamics 365 CRM opportunities including listing, searching, creating..." in DM Sans, 14px, #6B7280, max 2 lines with ellipsis
- Metadata row at bottom: Version pill "v2.0" (light gray background #F3F4F6, 4px radius), author "carvychen" with tiny avatar, license "MIT" badge
- Bottom-right: "..." three-dot menu icon, very subtle

Card 2 (hover state — show this card slightly elevated):
- Same structure but with: elevated shadow (0 4px 12px rgba(59,130,246,0.15)), a thin 1px #3B82F6 border appears, background stays white

Card 3-5: Similar cards with different names: "data-processor", "api-helper", "code-reviewer"

Card 6 (empty state): Dashed 2px border (#D1D5DB), no fill, centered "+" icon (48px, #9CA3AF) with text "Create new skill" below it in #9CA3AF

**Bottom of content area:**
- Left: "Showing 5 of 12 skills" in #9CA3AF, DM Sans 13px
- Right: Pagination dots or simple "1 2 3 >" navigation

**Subtle background detail:** The content area has a very faint dot grid pattern (opacity 0.03) to add texture without distraction.

Overall feel: Linear.app meets Vercel Dashboard. Premium, precise, developer-focused. Every element feels intentional.

---

## Prompt 2：Skill 创建向导页

Design a skill creation wizard for an AI agent platform following the agentskills.io open standard. Desktop layout, 1440x900. This is a focused creation flow — clean, confident, no clutter.

**Same sidebar and color system as Prompt 1.**

**Top bar (48px):**
- Breadcrumb: "Skills" (clickable, #3B82F6) → chevron → "New Skill" (#0F0F1A)
- Right side: "Cancel" text link in #6B7280

**Step indicator (centered, 64px below top bar):**
- Horizontal stepper with 2 steps connected by a line:
  - Step 1: Blue circle with "1" inside, label "Choose Template" below in JetBrains Mono — active state, blue colored
  - Connecting line: left half blue (completed), right half gray
  - Step 2: Gray circle with "2" inside, label "Basic Info" below — inactive state, #D1D5DB colored
- The stepper line has a subtle gradient transition from blue to gray

**Main content — two column layout (60% / 40%):**

Left column — Template selection:
- Section heading: "Choose a starting point" in DM Sans, 18px, #0F0F1A
- Subtext: "Select a template that matches your use case. You can customize everything later." in #6B7280, 14px

- 4 template cards stacked in a 2x2 grid (each ~280px wide, 160px tall):

  Card 1 (SELECTED state — has 2px blue border and light blue background #F0F7FF):
  - Icon: Empty document outline icon, 32px, #3B82F6
  - Title: "Blank Skeleton" in JetBrains Mono, 15px, bold
  - Description: "Standard structure with SKILL.md, scripts/, references/, assets/" in DM Sans, 13px, #6B7280
  - Small checkmark badge in top-right corner (blue circle with white check)

  Card 2 (unselected — white bg, 1px #E5E7EB border):
  - Icon: Terminal/command-line icon, 32px, #6B7280
  - Title: "Script-based Skill"
  - Description: "Multiple executable scripts with CLI arguments. Ideal for API integrations and data processing."

  Card 3 (unselected):
  - Icon: Document with lines icon, 32px, #6B7280
  - Title: "Instruction-only Skill"
  - Description: "Pure prompt engineering — only SKILL.md with detailed agent instructions. No scripts needed."

  Card 4 (unselected):
  - Icon: Plug/connection icon, 32px, #6B7280
  - Title: "MCP Integration"
  - Description: "Scripts that call external APIs and MCP servers. Includes authentication boilerplate code."

Right column — Live preview panel:
- Card with #F8FAFC background, 1px #E5E7EB border, 12px radius
- Header: "Preview" label with an eye icon, #9CA3AF
- File tree visualization (monospace JetBrains Mono font, 13px):
  ```
  blank-skeleton/
  ├── SKILL.md
  ├── scripts/
  ├── references/
  └── assets/
  ```
  - Folder icons in #F59E0B (amber), file icons in #3B82F6 (blue)
  - The SKILL.md line has a subtle highlight background showing it's the key file
- Below the tree: A small preview of what the generated SKILL.md frontmatter will look like, shown as a mini code block with syntax highlighting:
  ```yaml
  ---
  name: my-skill
  description: ""
  ---
  ```

**Bottom action bar (64px, separated by top border 1px #E5E7EB):**
- Right-aligned: "Cancel" text button (#6B7280), "Next →" primary button (blue, with right arrow)

Overall feel: Focused wizard flow. The template selection feels like choosing a character in a well-designed game — clear visual hierarchy, one obvious selected state, informative but not overwhelming.

---

## Prompt 3：Skill 编辑器页

Design a professional code editor page for editing AI agent skills. Desktop layout, 1440x900. This is the core creative workspace — it should feel like a premium, focused IDE experience embedded in the web platform.

**Left sidebar: Collapsed to icon-only mode (48px wide, #0F0F1A). Same icons as other pages.**

**Editor top bar (44px height, #1B1B2F background):**
- Left cluster: Back arrow icon (white, clickable), then a 1px vertical divider, then skill name "crm-opportunity" in JetBrains Mono 14px white bold, version badge "v2.0" as a tiny pill (12px, #3B82F6 background, white text), status indicator "Saved" with a green dot or "Unsaved" with an amber dot
- Right cluster: "Validate" button (outline style, white border, white text, with a checkmark icon — this validates the SKILL.md against agentskills.io spec), "Preview" button (outline), "Save" button (solid blue #3B82F6), vertical divider, "..." more menu icon

**Main editor area — split into 3 panels:**

Panel 1 — File Explorer (240px wide, #16162A background):
- Header bar: "EXPLORER" label in 11px uppercase tracking-wider #8B8BA7, with a collapse chevron icon on the right
- Skill name as root: "crm-opportunity" with a folder icon, slightly bolder
- File tree with 20px indent per level, 28px row height:
  - 📄 SKILL.md — SELECTED state: #1E293B background highlight with left 2px blue border, white text, markdown file icon in blue
  - 📁 scripts/ — folder icon in amber #F59E0B, expanded with disclosure triangle
    - 📄 search_accounts.py — python file icon (blue/yellow), #C9CCD6 text
    - 📄 search_contacts.py
    - 📄 list_opportunities.py
    - 📄 create_opportunity.py
    - 📄 update_opportunity.py
    - 📄 delete_opportunity.py
  - 📁 references/ — collapsed, with "(1)" count badge in #6B7280
  - 📁 assets/ — collapsed, with "(0)" count badge, slightly dimmer
- Bottom toolbar: Two icon buttons in a row — "New File" (file+ icon) and "New Folder" (folder+ icon), #6B7280, hover turns white. Also an "Upload" cloud-upload icon.

Panel 2 — Code Editor (main area, fills remaining space, #1E1E2E background):
- Tab bar (36px height, #16162A background):
  - Active tab: "SKILL.md" with markdown icon, white text, #1E1E2E background (matching editor), with a tiny close X on hover
  - Inactive tab: "search_accounts.py" with python icon, #6B7280 text, slightly darker background
  - Right end of tab bar: split-view icon button (for future side-by-side editing)

- Editor content (Monaco Editor style, dark theme):
  - Line numbers: #4B5563 color, right-aligned in a 48px gutter
  - Current line (line 1): subtle highlight background #252538
  - Content showing SKILL.md with syntax highlighting:
    - Line 1: `---` in #6B7280
    - Line 2: `name:` in #F472B6 (pink key), `crm-opportunity` in #34D399 (green string)
    - Line 3: `description:` in #F472B6, the value string in #34D399
    - Line 4: `license:` in #F472B6, `MIT` in #34D399
    - Line 5: `compatibility:` in #F472B6, value in #34D399
    - Line 6: `metadata:` in #F472B6
    - Line 7: `  author:` in #F472B6 (indented), `carvychen` in #34D399
    - Line 8: `  version:` in #F472B6, `"2.0"` in #34D399
    - Line 9: `---` in #6B7280
    - Line 10: empty
    - Line 11: `# CRM Opportunity Management` in #60A5FA bold (heading)
    - Line 12: empty
    - Line 13: `Manage Dynamics 365 CRM opportunities via the Dataverse Web API.` in #D1D5DB (normal text)
    - Lines 14-30: More markdown content showing ## sections, table markup, code blocks
  - Right edge: A minimap scrollbar visualization (like VS Code) showing the document structure in miniature

- Status bar (24px height, #0F0F1A background):
  - Left: "Markdown" language label, separator dot, "UTF-8" encoding, separator dot, "Ln 11, Col 1"
  - Right: "agentskills.io compatible ✓" in #10B981 (green) — this is a validation status showing the skill conforms to the spec

Panel 3 — Right sidebar (collapsed by default, can be opened):
- A thin 32px tab on the right edge labeled vertically "METADATA" — clicking it would expand a metadata panel. Show it collapsed.

**Subtle details:**
- A thin 1px separator line between file explorer and editor
- The editor area has a very subtle noise texture at 1% opacity
- File tree items show a hover state with #1E293B background

Overall feel: This is where developers will spend most of their time. It should feel as good as VS Code but integrated seamlessly into the web platform. Dark, focused, professional. The syntax highlighting should be beautiful with the pink/green/blue color scheme on dark background.

---

## Prompt 4：Skill 详情/预览页

Design a skill detail and preview page for an AI agent platform. Desktop layout, 1440x900. This page renders the skill's documentation beautifully — think npm package page meets GitHub README, but more refined.

**Same sidebar (64px, icon mode) and top bar as Prompt 1.**

**Top bar breadcrumb:** "Skills" (clickable, #3B82F6) → "crm-opportunity" (#0F0F1A)

**Hero header section (padding 32px, white background, bottom border):**
- Left side:
  - Skill icon: Terminal icon in a 48px rounded square with gradient blue background (#3B82F6 → #2563EB)
  - Next to icon: Skill name "crm-opportunity" in JetBrains Mono, 28px, bold, #0F0F1A
  - Below name: Description "Manage Dynamics 365 CRM opportunities including listing, searching, creating, updating, and deleting deals." in DM Sans, 15px, #6B7280
  - Metadata pills row (8px gap):
    - "v2.0" version pill (blue background #EFF6FF, blue text #3B82F6)
    - "carvychen" author pill with tiny avatar (gray background #F3F4F6)
    - "MIT" license pill (green background #F0FDF4, green text #10B981)
    - "Python 3.10+" compatibility pill (amber background #FFFBEB, amber text #F59E0B)
- Right side: "Edit" primary button (blue), "Download .skill" secondary button (outline), "Delete" ghost button (red text #EF4444, no border, subtle)

**Two-column layout below hero (padding 32px, gap 32px):**

Left column (65% width) — Rendered Markdown:
- Beautiful typography rendering of the SKILL.md body content:
  - H1: "CRM Opportunity Management" in JetBrains Mono, 24px, bold, #0F0F1A, with a subtle bottom border
  - H2: "Available Scripts" in JetBrains Mono, 18px, bold, with a small "#" anchor link icon on hover
  - Table: Clean table with alternating row backgrounds (#FAFAFA / white), 1px #E5E7EB borders, header row in bold with #F3F4F6 background. Columns: Script, Description, Required Args, Optional Args
  - H2: "Workflow: Resolving Names to GUIDs" with ordered list items, clean spacing
  - H2: "Examples" section with code blocks:
    - Code blocks have #1E1E2E dark background, 12px radius, JetBrains Mono font
    - Syntax highlighted bash commands
    - A "Copy" icon button in the top-right of each code block
  - H2: "Common Issues" with sub-sections as H3

Right column (35% width) — Info sidebar (sticky, scrolls with page):

  Card 1 — "File Structure" (white bg, 12px radius, subtle shadow):
  - Header: "File Structure" with folder icon, DM Sans 14px bold
  - Tree view (compact, JetBrains Mono 13px):
    - 📄 SKILL.md (with file size "3.2 KB" in gray)
    - 📁 scripts/ — "6 files" badge
    - 📁 references/ — "1 file" badge
    - 📁 assets/ — "empty" in dimmed text

  Card 2 — "Install" (white bg, 12px radius, subtle shadow):
  - Header: "Install this Skill" with download icon
  - Row 1: Claude Code logo (small) + command field showing `claude skill install ...` with copy button
  - Row 2: GitHub Copilot logo (small) + instruction text
  - Row 3: "Compatible with 16+ agents" link text in #3B82F6 (referencing agentskills.io ecosystem)

  Card 3 — "Details" (white bg, 12px radius):
  - Key-value list:
    - Created: Apr 10, 2025
    - Last modified: Apr 13, 2026
    - Total size: 12.4 KB
    - Files: 10
    - Standard: agentskills.io v1.0

**Subtle details:**
- Smooth scroll behavior
- Code blocks have a subtle left border accent (3px, #3B82F6)
- The right sidebar cards have 16px gap between them
- Links in the rendered markdown are #3B82F6 with underline on hover

Overall feel: A beautifully rendered documentation page. The skill's content should be the star — typography, spacing, and code formatting should make it a pleasure to read. Think of the best README you've ever seen on GitHub, but with better design.
