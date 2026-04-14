import { useState } from "react";
import { Copy, Check, BookOpen, Download, FolderOpen } from "lucide-react";
import { agents } from "../../constants/agents";

interface UseGuideProps {
  skillName: string;
  skillMdContent?: string;
  onExport?: () => void;
}

export function UseGuide({ skillName, onExport }: UseGuideProps) {
  const [activeAgent, setActiveAgent] = useState("claude-code");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const agent = agents.find((a) => a.id === activeAgent)!;

  const resolvePath = (template: string) => template.replace("{name}", skillName);

  const handleCopyPath = (path: string) => {
    const resolved = resolvePath(path);
    navigator.clipboard.writeText(resolved);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4" /> How to Use
      </h3>

      {/* Agent tabs */}
      <div className="grid grid-cols-3 gap-1 mb-3 p-0.5 bg-surface rounded-lg">
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setActiveAgent(a.id);
              setCopiedPath(null);
            }}
            className={`px-1.5 py-1.5 text-[10px] font-medium rounded-md transition-colors truncate ${
              activeAgent === a.id
                ? "bg-card text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Step 1: Export ZIP */}
      <div className="space-y-2.5">
        <div>
          <div className="flex items-start gap-1.5 mb-1.5">
            <span className="w-4 h-4 rounded-full bg-border text-text-muted text-[10px] font-bold flex items-center justify-center shrink-0 mt-px">
              1
            </span>
            <span className="text-[11px] text-text-secondary leading-snug">
              Export skill as ZIP
            </span>
          </div>
          <button
            onClick={onExport}
            className="flex items-center justify-between w-full p-2.5 bg-surface rounded-lg ml-[22px] group hover:bg-surface/80 transition-colors"
            style={{ width: "calc(100% - 22px)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Download className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="text-[11px] font-mono text-text-secondary">
                {skillName}.zip
              </span>
            </div>
            <span className="text-[10px] text-primary font-medium shrink-0 ml-2">
              Export
            </span>
          </button>
        </div>

        {/* Step 2: Extract to path */}
        <div>
          <div className="flex items-start gap-1.5 mb-1.5">
            <span className="w-4 h-4 rounded-full bg-border text-text-muted text-[10px] font-bold flex items-center justify-center shrink-0 mt-px">
              2
            </span>
            <span className="text-[11px] text-text-secondary leading-snug">
              Extract to skill directory
            </span>
          </div>
          <div
            className="ml-[22px] space-y-1.5"
            style={{ width: "calc(100% - 22px)" }}
          >
            {/* Project path */}
            <PathRow
              label="Project scope"
              path={agent.projectPath}
              skillName={skillName}
              isCopied={copiedPath === agent.projectPath}
              onCopy={() => handleCopyPath(agent.projectPath)}
              primary
            />
            {/* Personal path */}
            <PathRow
              label="Personal (global)"
              path={agent.personalPath}
              skillName={skillName}
              isCopied={copiedPath === agent.personalPath}
              onCopy={() => handleCopyPath(agent.personalPath)}
            />
          </div>
        </div>

        <p className="ml-[22px] text-[10px] text-text-muted">{agent.note}</p>

        {/* Compatible paths */}
        {agent.compatPaths && agent.compatPaths.length > 0 && (
          <details className="ml-[22px] group" style={{ width: "calc(100% - 22px)" }}>
            <summary className="text-[10px] text-text-muted cursor-pointer hover:text-text-secondary select-none">
              Cross-agent compatible paths
            </summary>
            <div className="mt-1.5 space-y-1">
              {agent.compatPaths.map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-1.5 px-2 py-1 bg-surface/50 rounded text-[10px] font-mono text-text-muted"
                >
                  <FolderOpen className="w-2.5 h-2.5 shrink-0" />
                  <span className="break-all">{resolvePath(p)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function PathRow({
  label,
  path,
  skillName,
  isCopied,
  onCopy,
  primary,
}: {
  label: string;
  path: string;
  skillName: string;
  isCopied: boolean;
  onCopy: () => void;
  primary?: boolean;
}) {
  const resolved = path.replace("{name}", skillName);

  return (
    <button
      onClick={onCopy}
      className="w-full p-2 bg-surface rounded-lg text-left group hover:bg-surface/80 transition-colors"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-text-muted">{label}</span>
        <span className="shrink-0">
          {isCopied ? (
            <Check className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <FolderOpen
          className={`w-3 h-3 shrink-0 ${primary ? "text-primary" : "text-text-muted"}`}
        />
        <code
          className={`text-[11px] font-mono break-all ${
            primary ? "text-text-primary" : "text-text-secondary"
          }`}
        >
          {resolved}
        </code>
      </div>
    </button>
  );
}
