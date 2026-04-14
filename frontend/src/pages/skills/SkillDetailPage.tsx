import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Pencil, Trash2, File, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { ExportDropdown } from "../../components/skills/ExportDropdown";
import { UseGuide } from "../../components/skills/InstallGuide";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { SkillMetadataPills } from "../../components/skills/SkillMetadataPills";
import { MarkdownRenderer } from "../../components/skills/MarkdownRenderer";
import { useSkillDetail, useDeleteSkill } from "../../hooks/useSkills";
import { useFileContent } from "../../hooks/useSkillFiles";
import { downloadSkill } from "../../api/skillsApi";
import { useRoles } from "../../auth/useRoles";

// -- Lightweight read-only file tree for the detail sidebar --

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  size: number;
}

function buildTree(files: { path: string; size: number }[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      let node = current.find((n) => n.name === name);
      if (!node) {
        node = { name, path, isDirectory: !isLast, children: [], size: isLast ? file.size : 0 };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function ReadOnlyTreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full min-w-0 py-0.5 text-text-secondary hover:text-text-primary transition-colors"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-text-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-text-muted" />
          )}
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          sortNodes(node.children).map((child) => (
            <ReadOnlyTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 min-w-0 py-0.5"
      style={{ paddingLeft: `${depth * 14 + 16}px` }}
    >
      <File className="w-3 h-3 shrink-0 text-text-secondary" />
      <span className="truncate text-text-secondary flex-1 min-w-0">{node.name}</span>
      <span className="text-text-muted text-[10px] shrink-0 whitespace-nowrap">
        {node.size > 1024 ? `${(node.size / 1024).toFixed(1)} KB` : `${node.size} B`}
      </span>
    </div>
  );
}

export function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: skill, isLoading } = useSkillDetail(name!);
  const { data: skillMdContent } = useFileContent(name!, "SKILL.md");
  const deleteMutation = useDeleteSkill();
  const { canWrite } = useRoles();

  const handleDelete = async () => {
    if (!confirm(`Delete skill "${name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(name!);
    navigate("/skills");
  };

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (!skill) return <div className="p-8 text-danger">Skill not found</div>;

  const fileCount = skill.files?.filter((f) => !f.path.endsWith(".gitkeep")).length ?? 0;

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "Skills", href: "/skills" }, { label: name! }]} />
      </TopBar>

      <div className="flex-1 overflow-auto">
        {/* Hero header */}
        <div className="px-8 py-6 bg-card border-b border-border">
          <div className="flex items-start gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-mono text-sm font-bold shrink-0">
                  &gt;_
                </div>
                <h1 className="text-2xl font-mono font-bold text-text-primary">{skill.name}</h1>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{skill.description}</p>
              <div className="mt-3">
                <SkillMetadataPills
                  version={skill.metadata?.version}
                  author={skill.metadata?.author}
                  license={skill.license || undefined}
                  compatibility={skill.compatibility || undefined}
                />
              </div>
            </div>
            <div className="w-72 shrink-0 flex items-center justify-end gap-2">
              {canWrite && (
                <Link
                  to={`/skills/${name}/edit`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
              )}
              <ExportDropdown skillName={name!} />
              {canWrite && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-4 py-2 text-danger text-sm border border-danger/40 hover:bg-danger/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="flex gap-8 px-8 py-6">
          {/* Left: Markdown content */}
          <div className="flex-1 min-w-0">
            {skillMdContent && <MarkdownRenderer content={skillMdContent} />}
          </div>

          {/* Right: Info sidebar */}
          <div className="w-72 shrink-0 space-y-4">
            {/* File structure */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Folder className="w-4 h-4" /> File Structure
              </h3>
              <div className="font-mono text-xs">
                {sortNodes(
                  buildTree(skill.files?.filter((f) => !f.path.endsWith(".gitkeep")) ?? [])
                ).map((node) => (
                  <ReadOnlyTreeItem key={node.path} node={node} depth={0} />
                ))}
              </div>
            </div>

            {/* Install */}
            <UseGuide
              skillName={name!}
              onExport={() => downloadSkill(name!)}
            />

            {/* Details */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Details</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Created</dt>
                  <dd className="text-text-secondary">{skill.created_at ? new Date(skill.created_at).toLocaleDateString() : "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Last modified</dt>
                  <dd className="text-text-secondary">{skill.modified_at ? new Date(skill.modified_at).toLocaleDateString() : "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Total size</dt>
                  <dd className="text-text-secondary">{skill.total_size ? `${(skill.total_size / 1024).toFixed(1)} KB` : "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Files</dt>
                  <dd className="text-text-secondary">{fileCount}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
