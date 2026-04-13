import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FolderPlus } from "lucide-react";
import type { SkillFile } from "../../types/skill";

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  size: number;
}

function buildTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path,
          isDirectory: !isLast,
          children: [],
          size: isLast ? file.size : 0,
        };
        current.push(node);
      }
      current = node.children;
    }
  }

  return root;
}

interface FileTreeProps {
  files: SkillFile[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center w-full h-7 px-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mr-1 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mr-1 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          node.children
            .sort((a, b) => {
              if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center w-full h-7 px-2 text-sm transition-colors ${
        isSelected
          ? "bg-white/10 text-white border-l-2 border-primary"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <File className="w-4 h-4 mr-2 text-primary shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ files, selectedPath, onSelectFile }: FileTreeProps) {
  const tree = buildTree(files);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
        Explorer
      </div>
      <div className="flex-1 overflow-auto">
        {tree
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
      </div>
      <div className="flex gap-1 p-2 border-t border-white/10">
        <button className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5">
          <Plus className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5">
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
