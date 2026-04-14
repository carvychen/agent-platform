import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

interface SplitButtonItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface SplitButtonProps {
  primaryLabel: string;
  primaryIcon?: ReactNode;
  primaryHref: string;
  items: SplitButtonItem[];
}

export function SplitButton({
  primaryLabel,
  primaryIcon,
  primaryHref,
  items,
}: SplitButtonProps) {
  return (
    <div className="inline-flex items-stretch rounded-lg overflow-hidden">
      <Link
        to={primaryHref}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
      >
        {primaryIcon}
        {primaryLabel}
      </Link>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="flex items-center px-2.5 bg-primary hover:bg-primary-hover text-white border-l border-white/25 transition-colors cursor-pointer"
            aria-label="More options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="min-w-[160px] bg-white rounded-lg border border-gray-200/80 py-1 z-50 dropdown-animate"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)" }}
          >
            {items.map((item) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={item.onClick}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
              >
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
