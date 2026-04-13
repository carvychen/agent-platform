interface SkillMetadataPillsProps {
  version?: string;
  author?: string;
  license?: string;
  compatibility?: string;
}

const pillStyles = {
  version: "bg-primary/10 text-primary",
  author: "bg-surface text-text-secondary",
  license: "bg-success/10 text-success",
  compatibility: "bg-warning/10 text-warning",
} as const;

export function SkillMetadataPills({ version, author, license, compatibility }: SkillMetadataPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {version && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.version}`}>
          v{version}
        </span>
      )}
      {author && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.author}`}>
          {author}
        </span>
      )}
      {license && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.license}`}>
          {license}
        </span>
      )}
      {compatibility && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.compatibility}`}>
          {compatibility}
        </span>
      )}
    </div>
  );
}
