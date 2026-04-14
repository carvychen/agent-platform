import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { type OnMount, loader } from "@monaco-editor/react";
import { ArrowLeft, Check, Eye, Save } from "lucide-react";
import { FileTree } from "../../components/skills/FileTree";
import { useSkillDetail, useValidateSkill } from "../../hooks/useSkills";
import {
  useFileContent,
  useSaveFile,
  useCreateFile,
  useDeleteFile,
  useRenameFile,
  useDeleteFolder,
} from "../../hooks/useSkillFiles";
import { useRoles } from "../../auth/useRoles";

// Register custom light editor theme matching the platform
loader.init().then((monaco) => {
  monaco.editor.defineTheme("skills-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9CA3AF", fontStyle: "italic" },
      { token: "keyword", foreground: "8250DF" },
      { token: "string", foreground: "0A6640" },
      { token: "number", foreground: "CF6D1E" },
      { token: "type", foreground: "6639BA" },
      { token: "function", foreground: "4E6BB5" },
      { token: "variable", foreground: "24292F" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#24292F",
      "editor.lineHighlightBackground": "#F6F8FA",
      "editor.lineHighlightBorder": "#F6F8FA",
      "editor.selectionBackground": "#7C9CF530",
      "editor.inactiveSelectionBackground": "#7C9CF518",
      "editorCursor.foreground": "#7C9CF5",
      "editorLineNumber.foreground": "#C4C8D4",
      "editorLineNumber.activeForeground": "#6B7280",
      "editorIndentGuide.background": "#E5E7EB80",
      "editorIndentGuide.activeBackground": "#D1D5DB",
      "editor.selectionHighlightBackground": "#7C9CF518",
      "editorBracketMatch.background": "#7C9CF520",
      "editorBracketMatch.border": "#7C9CF550",
      "editorGutter.background": "#FFFFFF",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#D1D5DB60",
      "scrollbarSlider.hoverBackground": "#D1D5DB90",
      "scrollbarSlider.activeBackground": "#D1D5DBB0",
      "minimap.background": "#FAFAFA",
      "editorOverviewRuler.border": "#E5E7EB00",
      "editorWidget.background": "#FFFFFF",
      "editorWidget.border": "#E5E7EB",
    },
  });
});

function getLanguage(path: string): string {
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (path.endsWith(".sh")) return "shell";
  return "plaintext";
}

export function SkillEditorPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { canWrite, isLoading: rolesLoading } = useRoles();
  const { data: skill } = useSkillDetail(name!);
  const [selectedFile, setSelectedFile] = useState<string | null>("SKILL.md");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const { data: fileContent } = useFileContent(name!, selectedFile);
  const saveMutation = useSaveFile(name!);
  const createFileMutation = useCreateFile(name!);
  const deleteFileMutation = useDeleteFile(name!);
  const renameMutation = useRenameFile(name!);
  const deleteFolderMutation = useDeleteFolder(name!);
  const validateMutation = useValidateSkill();

  // Keep a ref to the latest save handler to avoid stale closures in editor actions
  const saveHandlerRef = useRef<() => void>(() => undefined);

  // Redirect non-admin users to detail page
  useEffect(() => {
    if (!rolesLoading && !canWrite) {
      navigate(`/skills/${name}`, { replace: true });
    }
  }, [rolesLoading, canWrite, navigate, name]);

  // Sync fetched content to editor
  useEffect(() => {
    if (fileContent !== undefined) {
      setEditorContent(fileContent);
      setIsDirty(false);
    }
  }, [fileContent]);

  const handleSave = useCallback(() => {
    if (!selectedFile || !editorContent) return;
    saveMutation.mutate(
      { path: selectedFile, content: editorContent },
      { onSuccess: () => setIsDirty(false) }
    );
  }, [selectedFile, editorContent, saveMutation]);

  // Keep ref in sync with latest handleSave
  useEffect(() => {
    saveHandlerRef.current = handleSave;
  }, [handleSave]);

  const handleEditorMount: OnMount = (editor) => {
    // Cmd+S / Ctrl+S to save — use ref to always call the latest handler
    editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [2048 | 49], // Cmd+S
      run: () => {
        saveHandlerRef.current();
      },
    });
  };

  const handleValidate = useCallback(() => {
    if (name) validateMutation.mutate(name);
  }, [name, validateMutation]);

  const handleFileSelect = (path: string) => {
    if (path.endsWith(".gitkeep")) return;
    setSelectedFile(path);
  };

  const handleCreateFile = (path: string) => {
    createFileMutation.mutate(
      { path, content: "" },
      { onSuccess: () => setSelectedFile(path) }
    );
  };

  const handleCreateFolder = (path: string) => {
    // Create a .gitkeep file inside the folder to register it
    createFileMutation.mutate({ path: `${path}/.gitkeep`, content: "" });
  };

  const handleDeleteFile = (path: string) => {
    deleteFileMutation.mutate(path, {
      onSuccess: () => {
        if (selectedFile === path) setSelectedFile(null);
      },
    });
  };

  const handleDeleteFolder = (folderPath: string) => {
    deleteFolderMutation.mutate(folderPath, {
      onSuccess: () => {
        // If current file was inside the deleted folder, deselect
        if (selectedFile?.startsWith(folderPath + "/")) setSelectedFile(null);
      },
    });
  };

  const handleRenameFile = (oldPath: string, newPath: string) => {
    renameMutation.mutate(
      { oldPath, newPath },
      {
        onSuccess: () => {
          if (selectedFile === oldPath) setSelectedFile(newPath);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Editor top bar */}
      <div className="flex items-center justify-between h-12 px-4 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/skills/${name}`)}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border" />
          <span className="text-text-primary font-mono font-medium text-sm">{name}</span>
          {skill?.metadata?.version && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium">
              v{skill.metadata.version}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-xs ${isDirty ? "text-warning" : "text-success"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-warning" : "bg-success"}`} />
            {isDirty ? "Unsaved" : "Saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="editor-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md"
          >
            <Check className="w-3.5 h-3.5" /> Validate
          </button>
          <button
            onClick={() => navigate(`/skills/${name}`)}
            className="editor-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className="editor-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer */}
        <div className="w-60 bg-[#F6F8FA] border-r border-border shrink-0">
          {skill?.files && (
            <FileTree
              files={skill.files}
              selectedPath={selectedFile}
              onSelectFile={handleFileSelect}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
              onRenameFile={handleRenameFile}
            />
          )}
        </div>

        {/* Monaco editor */}
        <div className="flex-1 flex flex-col">
          {/* Tab bar */}
          {selectedFile && (
            <div className="flex items-center h-9 editor-tab-bar border-b border-border px-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-card rounded-t-md border border-b-0 border-border text-xs text-text-secondary font-mono">
                <span className="w-2 h-2 rounded-full bg-primary/40" />
                {selectedFile}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1">
            <Editor
              theme="skills-light"
              language={selectedFile ? getLanguage(selectedFile) : "plaintext"}
              value={editorContent}
              onChange={(value) => {
                setEditorContent(value ?? "");
                setIsDirty(true);
              }}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
                minimap: { enabled: true },
                lineNumbers: "on",
                renderLineHighlight: "line",
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                wordWrap: "on",
              }}
            />
          </div>

          {/* Status bar */}
          <div className="editor-status-bar flex items-center justify-between h-7 px-4 text-[11px] text-text-muted border-t border-border shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-text-secondary">{selectedFile ? getLanguage(selectedFile).charAt(0).toUpperCase() + getLanguage(selectedFile).slice(1) : ""}</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
              {validateMutation.data && (
                <span className={validateMutation.data.valid ? "text-success" : "text-danger"}>
                  agentskills.io {validateMutation.data.valid ? "compatible ✓" : "issues found"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
