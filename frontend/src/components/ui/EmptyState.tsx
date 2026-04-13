import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyState() {
  return (
    <Link
      to="/skills/new"
      className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
    >
      <Plus className="w-12 h-12 text-text-muted" />
      <span className="mt-2 text-sm text-text-muted">Create new skill</span>
    </Link>
  );
}
