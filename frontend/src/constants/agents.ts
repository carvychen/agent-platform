export interface AgentTarget {
  id: string;
  label: string;
  projectPath: string;
  personalPath: string;
  compatPaths?: string[];
  note: string;
}

export const agents: AgentTarget[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    projectPath: ".claude/skills/{name}/",
    personalPath: "~/.claude/skills/{name}/",
    note: "Claude Code loads skills automatically on startup.",
  },
  {
    id: "copilot",
    label: "Copilot",
    projectPath: ".github/skills/{name}/",
    personalPath: "~/.copilot/skills/{name}/",
    compatPaths: [".agents/skills/{name}/", ".claude/skills/{name}/"],
    note: "Also reads .agents/skills/ and .claude/skills/.",
  },
  {
    id: "codex",
    label: "Codex",
    projectPath: ".codex/skills/{name}/",
    personalPath: "~/.codex/skills/{name}/",
    compatPaths: [".agents/skills/{name}/"],
    note: "Also reads .agents/skills/ for cross-agent compatibility.",
  },
  {
    id: "cursor",
    label: "Cursor",
    projectPath: ".cursor/skills/{name}/",
    personalPath: "~/.cursor/skills/{name}/",
    compatPaths: [".agents/skills/{name}/", ".claude/skills/{name}/"],
    note: "Also reads .agents/skills/ and .claude/skills/.",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    projectPath: ".windsurf/skills/{name}/",
    personalPath: "~/.codeium/windsurf/skills/{name}/",
    compatPaths: [".agents/skills/{name}/", ".claude/skills/{name}/"],
    note: "Also reads .agents/skills/ and .claude/skills/.",
  },
  {
    id: "opencode",
    label: "OpenCode",
    projectPath: ".opencode/skills/{name}/",
    personalPath: "~/.config/opencode/skills/{name}/",
    compatPaths: [".agents/skills/{name}/", ".claude/skills/{name}/"],
    note: "Also reads .agents/skills/ and .claude/skills/.",
  },
];
