# Figma 修订 Prompts

## 修订 1：Skills 列表页

Based on the current Skills list page design, make these specific refinements:

1. **Card icon colors**: Give each skill card a different icon accent color to improve visual distinction:
   - crm-opportunity: Blue (#3B82F6)
   - data-processor: Purple (#8B5CF6)
   - api-helper: Amber (#F59E0B)
   - code-reviewer: Green (#10B981)
   - doc-generator: Pink (#EC4899)
   Each icon should sit in a matching light-tinted circle background (e.g., blue icon on #EFF6FF background).

2. **Show hover state on one card**: Make the "data-processor" card (second card) show its hover state:
   - Slightly elevated shadow: 0 4px 16px rgba(59,130,246,0.15)
   - A thin 1.5px border in #3B82F6 appears around the card
   - The card appears to lift slightly (translate up 2px effect)
   - Keep other cards in their normal state for contrast

3. **Empty state card refinement**: The "Create new skill" dashed card should have the "+" icon slightly larger (48px) and add a subtle hover hint text below: "or drag & drop a .skill file" in #9CA3AF, 12px.

---

## 修订 2：Skill 创建向导页

Based on the current creation wizard design, make these specific refinements:

1. **Enlarge the Preview panel code block**: The generated SKILL.md frontmatter preview in the right panel is too small. Make the code block area taller (at least 120px height) with larger font size (14px JetBrains Mono). The yaml content should be clearly readable:
   ```yaml
   ---
   name: my-skill
   description: ""
   license: MIT
   metadata:
     author: your-name
     version: "1.0"
   ---
   ```
   Use proper syntax highlighting: keys in pink (#F472B6), values in green (#34D399), delimiters (---) in gray (#6B7280).

2. **Template card icons**: Make the icons slightly larger (36px instead of current size) and give each a distinct color:
   - Blank Skeleton: Blue (#3B82F6)
   - Script-based Skill: Amber (#F59E0B)
   - Instruction-only Skill: Purple (#8B5CF6)
   - MCP Integration: Green (#10B981)

---

## 修订 3：Skill 编辑器页

Based on the current editor page design, make these specific refinements:

1. **Inactive tab contrast**: Make the "search_accounts.py" inactive tab darker (#12121F background) with dimmer text (#4B5563) to create stronger contrast with the active "SKILL.md" tab. The active tab should clearly stand out.

2. **Add minimap**: On the right edge of the code editor area (before any scrollbar), add a VS Code-style minimap:
   - Width: 60px
   - Semi-transparent rendering of the full document as tiny colored lines
   - A visible viewport indicator rectangle (semi-transparent white/blue overlay) showing which portion of the document is currently visible
   - The minimap should show abstract representations of the code: pink lines for yaml keys, green lines for values, blue lines for headings, gray lines for normal text

3. **Add right-click context menu** (as a floating overlay, shown near line 10 of the editor):
   - A small floating menu (180px wide, dark background #1B1B2F, 8px radius, subtle shadow):
     - "Cut" with Cmd+X shortcut hint
     - "Copy" with Cmd+C
     - "Paste" with Cmd+V
     - Separator line
     - "Format Document"
     - "Go to Definition"
   This shows that the editor has full IDE-like capabilities. Position it as if the user right-clicked on line 10.

---

## 修订 4：Skill 详情/预览页

Based on the current detail/preview page design, make these specific refinements:

1. **Add code block examples in the rendered markdown area**: Below the "Available Scripts" table, add a visible section showing:

   A heading "## Examples" followed by:

   A subheading "### List all hot opportunities:" and a code block below it:
   - Dark background (#1E1E2E), 12px border radius
   - Syntax highlighted bash command:
     `python scripts/list_opportunities.py --filter "opportunityratingcode eq 1"`
   - A small "Copy" icon button in the top-right corner of the code block
   - A thin 3px left border accent in blue (#3B82F6)

   Then another subheading "### Create a new deal:" with another code block:
     `python scripts/create_opportunity.py --name "Enterprise License" --account-id "Fourth Coffee" --estimatedvalue 85000`

   This demonstrates the documentation rendering quality.

2. **Button spacing**: Add more horizontal spacing (16px gap) between the "Edit", "Download .skill", and "Delete" buttons in the header. The "Delete" button should be further separated — add a 24px gap or a subtle vertical divider line before it to prevent accidental clicks.

3. **Install card enhancement**: In the right sidebar "Install this Skill" card, add a second install option below the Claude Code one:
   - Row 2: A small GitHub Copilot icon + text "Add to .github/skills/" with a copy button
   - Below both rows: "View all 16+ compatible agents →" as a clickable link in #3B82F6
