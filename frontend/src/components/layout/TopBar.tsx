import type { ReactNode } from "react";

interface TopBarProps {
  children: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-6 shrink-0">
      {children}
    </header>
  );
}
