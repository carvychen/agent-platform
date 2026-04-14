import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  FilePlus,
  FolderPlus as FolderPlusIcon,
} from "lucide-react";
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

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ---------- Context Menu ----------
interface ContextMenuProps {
  x: number;
  y: number;
  isDirectory: boolean;
  isProtected: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ContextMenu({
  x,
  y,
  isDirectory,
  isProtected,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  const items: { label: string; icon: React.ReactNode; action: () => void; danger?: boolean }[] = [];

  if (isDirectory) {
    items.push({ label: "New File", icon: <FilePlus className="w-3.5 h-3.5" />, action: onNewFile });
    items.push({ label: "New Folder", icon: <FolderPlusIcon className="w-3.5 h-3.5" />, action: onNewFolder });
  }
  if (!isProtected) {
    items.push({ label: "Rename", icon: <Pencil className="w-3.5 h-3.5" />, action: onRename });
    items.push({ label: "Delete", icon: <Trash2 className="w-3.5 h-3.5" />, action: onDelete, danger: true });
  }

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] py-1.5 bg-card border border-border rounded-lg shadow-lg shadow-black/8"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.action();
            onClose();
          }}
          className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors ${
            item.danger
              ? "text-danger hover:bg-danger/10"
              : "text-text-secondary hover:bg-surface hover:text-text-primary"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Inline Input ----------
interface InlineInputProps {
  depth: number;
  type: "file" | "folder" | "rename";
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function InlineInput({ depth, type, defaultValue = "", onConfirm, onCancel }: InlineInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (type === "rename" && defaultValue) {
      // Select filename without extension for rename
      const dotIdx = defaultValue.lastIndexOf(".");
      if (dotIdx > 0) {
        inputRef.current?.setSelectionRange(0, dotIdx);
      } else {
        inputRef.current?.select();
      }
    }
  }, [type, defaultValue]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div
      className="flex items-center h-7 px-2"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {type === "folder" ? (
        <Folder className="w-4 h-4 mr-2 text-amber-400/70 shrink-0" />
      ) : (
        <File className="w-4 h-4 mr-2 text-primary shrink-0" />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={handleSubmit}
        placeholder={type === "folder" ? "folder-name" : "filename.md"}
        className="flex-1 bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded px-1.5 py-0.5 text-sm text-text-primary outline-none font-mono"
      />
    </div>
  );
}

// ---------- FileTree Props ----------
export interface FileTreeProps {
  files: SkillFile[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile?: (path: string) => void;
  onCreateFolder?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}

// ---------- TreeItem ----------
function TreeItem({
  node,
  depth,
  selectedPath,
  onSelectFile,
  onContextMenu,
  creatingIn,
  renamingPath,
  onCreateConfirm,
  onRenameConfirm,
  onCancelInput,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  creatingIn: { parentPath: string; type: "file" | "folder" } | null;
  renamingPath: string | null;
  onCreateConfirm: (value: string) => void;
  onRenameConfirm: (value: string) => void;
  onCancelInput: () => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;
  const isRenaming = renamingPath === node.path;
  const isCreatingHere = creatingIn?.parentPath === node.path;

  // Auto-expand when creating inside this folder
  useEffect(() => {
    if (isCreatingHere) setExpanded(true);
  }, [isCreatingHere]);

  if (isRenaming) {
    return (
      <InlineInput
        depth={depth}
        type={node.isDirectory ? "folder" : "rename"}
        defaultValue={node.name}
        onConfirm={onRenameConfirm}
        onCancel={onCancelInput}
      />
    );
  }

  if (node.isDirectory) {
    return (
      <div>
        <div
          className="group flex items-center w-full h-7 text-sm text-text-secondary hover:bg-black/[0.04] transition-colors"
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center flex-1 h-full px-2"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 mr-1 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 mr-1 shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-amber-400/70 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-amber-400/70 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {/* Hover action: add file inside folder */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(
                { ...e, preventDefault: () => {} } as unknown as React.MouseEvent,
                { ...node, _quickCreate: "file" } as TreeNode & { _quickCreate: string }
              );
            }}
            className="hidden group-hover:flex items-center justify-center w-6 h-6 mr-1 text-text-muted hover:text-text-secondary"
            title="New file in folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {expanded && (
          <>
            {/* Create-in-folder input */}
            {isCreatingHere && (
              <InlineInput
                depth={depth + 1}
                type={creatingIn!.type}
                onConfirm={onCreateConfirm}
                onCancel={onCancelInput}
              />
            )}
            {sortNodes(node.children).map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onContextMenu={onContextMenu}
                creatingIn={creatingIn}
                renamingPath={renamingPath}
                onCreateConfirm={onCreateConfirm}
                onRenameConfirm={onRenameConfirm}
                onCancelInput={onCancelInput}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  // File node
  return (
    <button
      onClick={() => onSelectFile(node.path)}
      onContextMenu={(e) => onContextMenu(e, node)}
      className={`flex items-center w-full h-7 px-2 text-sm transition-colors ${
        isSelected
          ? "file-tree-selected text-text-primary"
          : "text-text-secondary hover:bg-black/[0.04] hover:text-text-primary"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <File className="w-4 h-4 mr-2 text-primary/60 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ---------- FileTree ----------
export function FileTree({
  files,
  selectedPath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
}: FileTreeProps) {
  const tree = buildTree(files);

  // State for creating at root level
  const [rootCreating, setRootCreating] = useState<"file" | "folder" | null>(null);
  const rootInputRef = useRef<HTMLInputElement>(null);
  const [rootNewName, setRootNewName] = useState("");

  // State for creating inside a folder
  const [creatingIn, setCreatingIn] = useState<{ parentPath: string; type: "file" | "folder" } | null>(null);

  // State for renaming
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode;
  } | null>(null);

  useEffect(() => {
    if (rootCreating) rootInputRef.current?.focus();
  }, [rootCreating]);

  // Protected paths that should not be renamed/deleted
  const isProtected = (path: string) => path === "SKILL.md";

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode & { _quickCreate?: string }) => {
      e.preventDefault();
      // Quick-create shortcut from hover button
      if (node._quickCreate === "file") {
        setCreatingIn({ parentPath: node.path, type: "file" });
        setContextMenu(null);
        return;
      }
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    },
    []
  );

  const handleCreateInFolder = (type: "file" | "folder") => {
    if (!contextMenu) return;
    setCreatingIn({ parentPath: contextMenu.node.path, type });
  };

  const handleCreateConfirm = (value: string) => {
    if (!creatingIn) return;
    const fullPath = `${creatingIn.parentPath}/${value}`;
    if (creatingIn.type === "file") {
      onCreateFile?.(fullPath);
    } else {
      onCreateFolder?.(fullPath);
    }
    setCreatingIn(null);
  };

  const handleStartRename = () => {
    if (!contextMenu) return;
    setRenamingPath(contextMenu.node.path);
  };

  const handleRenameConfirm = (newName: string) => {
    if (!renamingPath) return;
    const parts = renamingPath.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");
    if (newPath !== renamingPath) {
      onRenameFile?.(renamingPath, newPath);
    }
    setRenamingPath(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    const { node } = contextMenu;
    if (node.isDirectory) {
      onDeleteFolder?.(node.path);
    } else {
      onDeleteFile?.(node.path);
    }
  };

  const handleRootCreate = () => {
    const trimmed = rootNewName.trim();
    if (!trimmed) {
      setRootCreating(null);
      return;
    }
    if (rootCreating === "file") {
      onCreateFile?.(trimmed);
    } else if (rootCreating === "folder") {
      onCreateFolder?.(trimmed);
    }
    setRootNewName("");
    setRootCreating(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 text-[11px] uppercase tracking-wider text-text-muted font-semibold">
        Explorer
      </div>
      <div className="flex-1 overflow-auto">
        {sortNodes(tree).map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
            onContextMenu={handleContextMenu}
            creatingIn={creatingIn}
            renamingPath={renamingPath}
            onCreateConfirm={handleCreateConfirm}
            onRenameConfirm={handleRenameConfirm}
            onCancelInput={() => {
              setCreatingIn(null);
              setRenamingPath(null);
            }}
          />
        ))}
        {/* Root-level create input */}
        {rootCreating && (
          <div className="flex items-center h-7 px-2" style={{ paddingLeft: "8px" }}>
            {rootCreating === "folder" ? (
              <Folder className="w-4 h-4 mr-2 text-amber-400/70 shrink-0" />
            ) : (
              <File className="w-4 h-4 mr-2 text-primary shrink-0" />
            )}
            <input
              ref={rootInputRef}
              value={rootNewName}
              onChange={(e) => setRootNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRootCreate();
                if (e.key === "Escape") {
                  setRootCreating(null);
                  setRootNewName("");
                }
              }}
              onBlur={handleRootCreate}
              placeholder={rootCreating === "folder" ? "folder-name" : "filename.md"}
              className="flex-1 bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded px-1.5 py-0.5 text-sm text-text-primary outline-none font-mono"
            />
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex gap-1 p-2 border-t border-border">
        <button
          onClick={() => {
            setRootCreating("file");
            setRootNewName("");
          }}
          className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-black/[0.04] transition-colors"
          title="New File"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setRootCreating("folder");
            setRootNewName("");
          }}
          className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-black/[0.04] transition-colors"
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isDirectory={contextMenu.node.isDirectory}
          isProtected={isProtected(contextMenu.node.path)}
          onNewFile={() => handleCreateInFolder("file")}
          onNewFolder={() => handleCreateInFolder("folder")}
          onRename={handleStartRename}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
