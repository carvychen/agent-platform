import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Terminal, BookOpen, Plug, ArrowRight, Folder, File } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { TemplateCard } from "../../components/skills/TemplateCard";
import { useCreateSkill } from "../../hooks/useSkills";
import { useRoles } from "../../auth/useRoles";

const templates = [
  {
    id: "blank" as const,
    icon: <FileText className="w-8 h-8 text-primary" />,
    title: "Blank Skeleton",
    description: "Standard structure with SKILL.md, scripts/, references/, assets/",
    tree: "SKILL.md\nscripts/\nreferences/\nassets/",
  },
  {
    id: "script" as const,
    icon: <Terminal className="w-8 h-8 text-warning" />,
    title: "Script-based Skill",
    description: "Multiple executable scripts with CLI arguments. Ideal for API integrations and data processing.",
    tree: "SKILL.md\nscripts/\n  main.py\nreferences/\n  REFERENCE.md\nassets/",
  },
  {
    id: "instruction" as const,
    icon: <BookOpen className="w-8 h-8 text-purple-500" />,
    title: "Instruction-only Skill",
    description: "Pure prompt engineering — only SKILL.md with detailed agent instructions. No scripts needed.",
    tree: "SKILL.md\nreferences/\nassets/",
  },
  {
    id: "mcp" as const,
    icon: <Plug className="w-8 h-8 text-success" />,
    title: "MCP Integration",
    description: "Scripts that call external APIs and MCP servers. Includes authentication boilerplate code.",
    tree: "SKILL.md\nscripts/\n  client.py\nreferences/\n  API.md\nassets/",
  },
];

const nameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const basicInfoSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Max 64 characters")
    .regex(nameRegex, "Lowercase letters, numbers, and hyphens only. Cannot start/end with hyphen.")
    .refine((v) => !v.includes("--"), "Cannot contain consecutive hyphens"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(1024, "Max 1024 characters"),
  license: z.string().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;

export function SkillCreatePage() {
  const navigate = useNavigate();
  const { canWrite, isLoading: rolesLoading } = useRoles();
  const createMutation = useCreateSkill();
  const [step, setStep] = useState<1 | 2>(1);

  // Redirect non-admin users to skills list
  useEffect(() => {
    if (!rolesLoading && !canWrite) {
      navigate("/skills", { replace: true });
    }
  }, [rolesLoading, canWrite, navigate]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: { license: "MIT", version: "1.0" },
  });

  const descriptionLength = watch("description")?.length ?? 0;
  const currentTemplate = templates.find((t) => t.id === selectedTemplate)!;

  const onSubmit = async (data: BasicInfoForm) => {
    const metadata: Record<string, string> = {};
    if (data.author) metadata.author = data.author;
    if (data.version) metadata.version = data.version;

    try {
      await createMutation.mutateAsync({
        name: data.name,
        description: data.description,
        template: selectedTemplate as "blank" | "script" | "instruction" | "mcp",
        license: data.license || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      navigate(`/skills/${data.name}/edit`);
    } catch {
      // Error is captured in createMutation.error — displayed in the form
    }
  };

  return (
    <>
      <TopBar>
        <Breadcrumb
          items={[
            { label: "Skills", href: "/skills" },
            { label: "New Skill" },
          ]}
        />
      </TopBar>

      <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? "bg-primary text-white" : "bg-border text-text-muted"}`}>
              1
            </div>
            <span className={`font-mono text-sm ${step >= 1 ? "text-text-primary" : "text-text-muted"}`}>
              Choose Template
            </span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? "bg-primary text-white" : "bg-border text-text-muted"}`}>
              2
            </div>
            <span className={`font-mono text-sm ${step >= 2 ? "text-text-primary" : "text-text-muted"}`}>
              Basic Info
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="flex gap-8">
            {/* Template cards */}
            <div className="flex-1">
              <h2 className="text-lg font-medium text-text-primary mb-1">Choose a starting point</h2>
              <p className="text-sm text-text-secondary mb-6">
                Select a template that matches your use case. You can customize everything later.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    icon={t.icon}
                    title={t.title}
                    description={t.description}
                    selected={selectedTemplate === t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                  />
                ))}
              </div>
            </div>

            {/* Preview panel — GitHub-style */}
            <div className="w-80">
              <div className="border border-border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F6F8FA] border-b border-border">
                  <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                  </svg>
                  <span className="text-sm font-semibold text-text-primary">Template structure</span>
                </div>

                {/* File tree rows */}
                <div className="divide-y divide-border">
                  {currentTemplate.tree.split("\n").map((line, i) => {
                    const trimmed = line.replace(/^\s+/, "");
                    const isDir = trimmed.endsWith("/");
                    const name = isDir ? trimmed.slice(0, -1) : trimmed;
                    const indent = (line.length - line.trimStart().length) / 2;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[#F6F8FA] transition-colors"
                        style={{ paddingLeft: `${16 + indent * 20}px` }}
                      >
                        {isDir ? (
                          <Folder className="w-4 h-4 text-[#54AEFF] shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-text-muted shrink-0" />
                        )}
                        <span className={`font-mono text-[13px] ${isDir ? "text-text-primary" : "text-text-primary"}`}>
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Frontmatter section — separate card */}
              <div className="mt-3 border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F6F8FA] border-b border-border">
                  <File className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-medium text-text-secondary">SKILL.md</span>
                  <span className="ml-auto text-[10px] text-text-muted bg-border/60 px-1.5 py-0.5 rounded-full font-medium">frontmatter</span>
                </div>
                <div className="bg-white text-sm font-mono leading-relaxed">
                  {[
                    { num: 1, text: "---", color: "text-text-muted" },
                    { num: 2, text: "name: my-skill", color: "" },
                    { num: 3, text: 'description: ""', color: "" },
                    { num: 4, text: "---", color: "text-text-muted" },
                  ].map((line) => (
                    <div key={line.num} className="flex hover:bg-[#F6F8FA] transition-colors">
                      <span className="w-10 shrink-0 text-right pr-3 text-xs text-text-muted select-none py-0.5">{line.num}</span>
                      <span className={`text-[13px] py-0.5 ${line.color || "text-text-primary"}`}>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
            <h2 className="text-lg font-medium text-text-primary mb-6">Basic information</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  {...register("name")}
                  className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="my-awesome-skill"
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
                <p className="mt-1 text-xs text-text-muted">Lowercase letters, numbers, and hyphens. 1-64 chars.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="Describe what this skill does and when to use it..."
                />
                <div className="flex justify-between mt-1">
                  {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
                  <span className="text-xs text-text-muted ml-auto">{descriptionLength}/1024</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">License</label>
                  <select
                    {...register("license")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="MIT">MIT</option>
                    <option value="Apache-2.0">Apache 2.0</option>
                    <option value="Proprietary">Proprietary</option>
                    <option value="">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Author</label>
                  <input
                    {...register("author")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="your-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Version</label>
                  <input
                    {...register("version")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="1.0"
                  />
                </div>
              </div>
            </div>

            {createMutation.isError && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create skill. Please check you are logged in and try again."}
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                Back
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Skill"}
              </button>
            </div>
          </form>
        )}

        {/* Bottom bar for Step 1 */}
        {step === 1 && (
          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => navigate("/skills")}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
