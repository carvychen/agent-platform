import { useParams, useNavigate, Link } from "react-router-dom";
import { Pencil, Trash2, Link as LinkIcon, Clock } from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { useMcp, useDeleteMcp } from "../../hooks/useMcps";
import { useRoles } from "../../auth/useRoles";

const transportLabels: Record<string, string> = {
  "streamable-http": "streamable-http",
  sse: "sse",
  stdio: "stdio",
};

const authLabels: Record<string, string> = {
  none: "No auth",
  bearer_static: "Bearer token (client-provided)",
  oauth_bearer_from_host: "Host-mediated OAuth",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function McpDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: mcp, isLoading, isError } = useMcp(name);
  const deleteMutation = useDeleteMcp();
  const { canWrite } = useRoles();

  const handleDelete = async () => {
    if (!name) return;
    if (!confirm(`Delete MCP "${name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(name);
    navigate("/mcps");
  };

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (isError || !mcp) return <div className="p-8 text-error">MCP not found</div>;

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "MCPs", href: "/mcps" }, { label: name! }]} />
      </TopBar>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          <div className="flex items-start justify-between mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-mono font-bold text-text-primary truncate">
                {mcp.display_name}
              </h1>
              <p className="mt-1 text-sm font-mono text-text-muted">{mcp.name}</p>
            </div>

            {canWrite && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/mcps/${encodeURIComponent(mcp.name)}/edit`}
                  data-testid="edit-mcp-button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  data-testid="delete-mcp-button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-error hover:border-error/50 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6 bg-card rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)]">
            <DetailField label="Description">
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{mcp.description}</p>
            </DetailField>

            <DetailField label="Endpoint URL">
              <div className="flex items-center gap-2 text-sm font-mono text-text-primary">
                <LinkIcon className="w-4 h-4 text-text-muted shrink-0" />
                <span className="break-all">{mcp.endpoint_url}</span>
              </div>
            </DetailField>

            <div className="grid grid-cols-2 gap-6">
              <DetailField label="Transport">
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-surface text-text-secondary font-mono">
                  {transportLabels[mcp.transport] ?? mcp.transport}
                </span>
              </DetailField>

              <DetailField label="Auth type">
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-surface text-text-secondary">
                  {authLabels[mcp.auth_type] ?? mcp.auth_type}
                </span>
              </DetailField>
            </div>

            <DetailField label="Source">
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-surface text-text-secondary font-mono">
                {mcp.source}
              </span>
            </DetailField>

            {mcp.metadata && Object.keys(mcp.metadata).length > 0 && (
              <DetailField label="Metadata">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-mono">
                  {Object.entries(mcp.metadata).map(([k, v]) => (
                    <>
                      <dt key={`k-${k}`} className="text-text-muted">{k}</dt>
                      <dd key={`v-${k}`} className="text-text-primary break-all">{v ?? ""}</dd>
                    </>
                  ))}
                </dl>
              </DetailField>
            )}

            <div className="grid grid-cols-2 gap-6 pt-3 border-t border-border">
              <DetailField label="Created">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  <span data-testid="mcp-created-at">{formatTimestamp(mcp.created_at)}</span>
                </div>
              </DetailField>
              <DetailField label="Updated">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  <span data-testid="mcp-updated-at">{formatTimestamp(mcp.updated_at)}</span>
                </div>
              </DetailField>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-text-muted mb-1.5">{label}</div>
      {children}
    </div>
  );
}
