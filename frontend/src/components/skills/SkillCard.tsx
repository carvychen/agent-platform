import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import type { Skill } from "../../types/skill";
import { SkillMetadataPills } from "./SkillMetadataPills";

const iconColors = [
  "bg-primary/10 text-primary",
  "bg-purple-500/10 text-purple-500",
  "bg-warning/10 text-warning",
  "bg-success/10 text-success",
  "bg-pink-500/10 text-pink-500",
];

interface SkillCardProps {
  skill: Skill;
  index: number;
  onDelete: (name: string) => void;
}

export function SkillCard({ skill, index, onDelete: _onDelete }: SkillCardProps) {
  const colorClass = iconColors[index % iconColors.length];

  return (
    <Link
      to={`/skills/${skill.name}`}
      className="block p-5 bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)] hover:border-primary border border-transparent transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorClass}`}>
          &gt;_
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface transition-all"
        >
          <MoreHorizontal className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      <h3 className="mt-3 font-mono font-semibold text-text-primary">{skill.name}</h3>

      <p className="mt-1 text-sm text-text-secondary line-clamp-2">{skill.description}</p>

      <div className="mt-4">
        <SkillMetadataPills
          version={skill.metadata?.version}
          author={skill.metadata?.author}
          license={skill.license || undefined}
        />
      </div>
    </Link>
  );
}
