import { useParams, useNavigate, Link } from "react-router-dom";
import { Pencil, Download, Trash2, File, Folder, Copy, Check } from "lucide-react";
import { useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { SkillMetadataPills } from "../../components/skills/SkillMetadataPills";
import { MarkdownRenderer } from "../../components/skills/MarkdownRenderer";
import { useSkillDetail, useDeleteSkill } from "../../hooks/useSkills";
import { useFileContent } from "../../hooks/useSkillFiles";

export function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: skill, isLoading } = useSkillDetail(name!);
  const { data: skillMdContent } = useFileContent(name!, "SKILL.md");
  const deleteMutation = useDeleteSkill();
  const [copied, setCopied] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete skill "${name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(name!);
    navigate("/skills");
  };

  const installCmd = `claude skill add ${name}`;
  const handleCopyInstall = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-mono text-sm font-bold">
                  &gt;_
                </div>
                <h1 className="text-2xl font-mono font-bold text-text-primary">{skill.name}</h1>
              </div>
              <p className="mt-2 text-sm text-text-secondary max-w-2xl">{skill.description}</p>
              <div className="mt-3">
                <SkillMetadataPills
                  version={skill.metadata?.version}
                  author={skill.metadata?.author}
                  license={skill.license || undefined}
                  compatibility={skill.compatibility || undefined}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/skills/${name}/edit`}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
              <button className="flex items-center gap-1.5 px-4 py-2 border border-border text-text-secondary hover:text-text-primary text-sm rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Download .skill
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-danger text-sm hover:bg-danger/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
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
              <div className="space-y-1.5 font-mono text-xs">
                {skill.files
                  ?.filter((f) => !f.path.endsWith(".gitkeep"))
                  .map((f) => (
                    <div key={f.path} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <File className="w-3 h-3" />
                        <span className="truncate">{f.path}</span>
                      </div>
                      <span className="text-text-muted text-[10px]">
                        {f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Install */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Download className="w-4 h-4" /> Install this Skill
              </h3>
              <div className="flex items-center gap-2 p-2 bg-surface rounded-lg">
                <code className="flex-1 text-xs font-mono text-text-secondary truncate">{installCmd}</code>
                <button onClick={handleCopyInstall} className="shrink-0 p-1 rounded hover:bg-border transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-primary hover:underline cursor-pointer">
                Compatible with 16+ agents via agentskills.io
              </p>
            </div>

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
