import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  canWrite?: boolean;
  onDelete: (name: string) => void;
}

export function SkillCard({ skill, index, canWrite = false, onDelete }: SkillCardProps) {
  const colorClass = iconColors[index % iconColors.length];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <Link
      to={`/skills/${skill.name}`}
      className="block p-5 bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)] hover:border-primary border border-transparent transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorClass}`}>
          &gt;_
        </div>
        {canWrite && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface transition-all"
            >
              <MoreHorizontal className="w-4 h-4 text-text-muted" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-50 w-36 bg-card border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    navigate(`/skills/${skill.name}/edit`);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (confirm(`Delete skill "${skill.name}"?`)) {
                      onDelete(skill.name);
                    }
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-surface transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
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
