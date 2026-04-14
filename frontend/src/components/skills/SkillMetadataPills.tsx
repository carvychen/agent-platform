import { Tag, User, Scale, Cpu } from "lucide-react";

interface SkillMetadataPillsProps {
  version?: string;
  author?: string;
  license?: string;
  compatibility?: string;
}

export function SkillMetadataPills({ version, author, license, compatibility }: SkillMetadataPillsProps) {
  const items = [
    version && { icon: Tag, label: `v${version}` },
    author && { icon: User, label: author },
    license && { icon: Scale, label: license },
    compatibility && { icon: Cpu, label: compatibility },
  ].filter(Boolean) as { icon: typeof Tag; label: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <item.icon className="w-3 h-3" />
          <span className="max-w-60 truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
