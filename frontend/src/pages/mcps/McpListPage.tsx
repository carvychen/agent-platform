import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Plug } from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { SearchInput } from "../../components/ui/SearchInput";
import { McpCard } from "../../components/mcps/McpCard";
import { useMcpList } from "../../hooks/useMcps";
import { useRoles } from "../../auth/useRoles";

export function McpListPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useMcpList();
  const { canWrite } = useRoles();

  const mcps = data?.mcps ?? [];
  const q = search.toLowerCase();
  const filtered = mcps.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.display_name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
  );

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "MCPs" }]} />
      </TopBar>

      <div className="flex-1 overflow-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-mono font-bold text-text-primary">MCPs</h1>
            <span className="text-sm text-text-muted">{mcps.length} registered</span>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search MCPs..." />
            {canWrite && (
              <Link
                to="/mcps/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New MCP
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex w-16 h-16 rounded-full bg-surface items-center justify-center mb-4">
              <Plug className="w-8 h-8 text-text-muted" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">No MCPs registered yet</h2>
            <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
              {canWrite
                ? "Register an external MCP server's URL to catalog it for your tenant."
                : "Ask a SkillAdmin to register MCP servers for your tenant."}
            </p>
            {canWrite && (
              <Link
                to="/mcps/new"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Register your first MCP
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map((mcp, i) => (
              <McpCard key={mcp.name} mcp={mcp} index={i} />
            ))}
          </div>
        )}

        {mcps.length > 0 && (
          <div className="mt-6 text-sm text-text-muted">
            Showing {filtered.length} of {mcps.length} MCPs
          </div>
        )}
      </div>
    </>
  );
}
