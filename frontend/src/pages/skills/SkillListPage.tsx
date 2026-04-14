import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload } from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { SearchInput } from "../../components/ui/SearchInput";
import { SkillCard } from "../../components/skills/SkillCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { SplitButton } from "../../components/ui/SplitButton";
import { ImportSkillDialog } from "../../components/skills/ImportSkillDialog";
import { useSkillList, useDeleteSkill } from "../../hooks/useSkills";
import { useRoles } from "../../auth/useRoles";

export function SkillListPage() {
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading } = useSkillList();
  const deleteMutation = useDeleteSkill();
  const navigate = useNavigate();
  const { canWrite } = useRoles();

  const skills = data?.skills ?? [];
  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "Skills" }]} />
      </TopBar>

      <div className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-mono font-bold text-text-primary">Skills</h1>
            <span className="text-sm text-text-muted">{data?.total ?? 0} skills</span>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search skills..." />
            {canWrite && (
              <SplitButton
                primaryLabel="New Skill"
                primaryIcon={<Plus className="w-4 h-4" />}
                primaryHref="/skills/new"
                items={[
                  {
                    label: "Import Skill",
                    icon: <Upload className="w-4 h-4" />,
                    onClick: () => setImportOpen(true),
                  },
                ]}
              />
            )}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-text-muted">Loading...</div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map((skill, i) => (
              <SkillCard
                key={skill.name}
                skill={skill}
                index={i}
                canWrite={canWrite}
                onDelete={(name) => deleteMutation.mutate(name)}
              />
            ))}
            {canWrite && <EmptyState />}
          </div>
        )}

        {/* Footer */}
        {data && (
          <div className="mt-6 text-sm text-text-muted">
            Showing {filtered.length} of {data.total} skills
          </div>
        )}
      </div>

      <ImportSkillDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={(name) => navigate(`/skills/${name}/edit`)}
      />
    </>
  );
}
