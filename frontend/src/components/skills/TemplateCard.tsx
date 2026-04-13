import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface TemplateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function TemplateCard({ icon, title, description, selected, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-text-muted"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-mono font-semibold text-text-primary text-sm">{title}</h3>
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">{description}</p>
    </button>
  );
}
