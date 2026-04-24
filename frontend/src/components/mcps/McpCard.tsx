import { Plug, Link as LinkIcon } from "lucide-react";
import type { Mcp } from "../../types/mcp";

const iconColors = [
  "bg-primary/10 text-primary",
  "bg-purple-500/10 text-purple-500",
  "bg-warning/10 text-warning",
  "bg-success/10 text-success",
  "bg-pink-500/10 text-pink-500",
];

const transportLabels: Record<Mcp["transport"], string> = {
  "streamable-http": "streamable-http",
  sse: "sse",
  stdio: "stdio",
};

const authLabels: Record<Mcp["auth_type"], string> = {
  none: "No auth",
  bearer_static: "Bearer token",
  oauth_bearer_from_host: "Host OAuth",
};

interface McpCardProps {
  mcp: Mcp;
  index: number;
}

export function McpCard({ mcp, index }: McpCardProps) {
  const colorClass = iconColors[index % iconColors.length];
  return (
    <div className="block p-5 bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)] border border-transparent">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Plug className="w-5 h-5" />
        </div>
      </div>

      <h3 className="mt-3 font-mono font-semibold text-text-primary">{mcp.display_name}</h3>
      <p className="mt-0.5 text-xs font-mono text-text-muted">{mcp.name}</p>

      <p className="mt-2 text-sm text-text-secondary line-clamp-2">{mcp.description}</p>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted truncate">
        <LinkIcon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate font-mono">{mcp.endpoint_url}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <span className="px-2 py-0.5 text-xs rounded bg-surface text-text-secondary font-mono">
          {transportLabels[mcp.transport]}
        </span>
        <span className="px-2 py-0.5 text-xs rounded bg-surface text-text-secondary">
          {authLabels[mcp.auth_type]}
        </span>
      </div>
    </div>
  );
}
