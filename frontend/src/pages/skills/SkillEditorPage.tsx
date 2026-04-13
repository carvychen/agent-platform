import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { type OnMount } from "@monaco-editor/react";
import { ArrowLeft, Check, Eye, Save } from "lucide-react";
import { FileTree } from "../../components/skills/FileTree";
import { useSkillDetail, useValidateSkill } from "../../hooks/useSkills";
import { useFileContent, useSaveFile } from "../../hooks/useSkillFiles";

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
  const { data: skill } = useSkillDetail(name!);
  const [selectedFile, setSelectedFile] = useState<string | null>("SKILL.md");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const { data: fileContent } = useFileContent(name!, selectedFile);
  const saveMutation = useSaveFile(name!);
  const validateMutation = useValidateSkill();

  // Keep a ref to the latest save handler to avoid stale closures in editor actions
  const saveHandlerRef = useRef<() => void>(() => undefined);

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

  return (
    <div className="flex flex-col h-screen">
      {/* Editor top bar */}
      <div className="flex items-center justify-between h-11 px-4 bg-editor-topbar border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/skills/${name}`)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-mono font-semibold text-sm">{name}</span>
          {skill?.metadata?.version && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-white font-medium">
              v{skill.metadata.version}
            </span>
          )}
          <span className={`flex items-center gap-1 text-xs ${isDirty ? "text-warning" : "text-success"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-warning" : "bg-success"}`} />
            {isDirty ? "Unsaved" : "Saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-md transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Validate
          </button>
          <button
            onClick={() => navigate(`/skills/${name}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-md transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary-hover text-white rounded-md transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer */}
        <div className="w-60 bg-editor-panel border-r border-white/10 shrink-0">
          {skill?.files && (
            <FileTree
              files={skill.files}
              selectedPath={selectedFile}
              onSelectFile={handleFileSelect}
            />
          )}
        </div>

        {/* Monaco editor */}
        <div className="flex-1 flex flex-col">
          {/* Tab bar */}
          {selectedFile && (
            <div className="flex items-center h-9 bg-editor-panel border-b border-white/10 px-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-editor-bg rounded-t text-xs text-white font-mono">
                {selectedFile}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1">
            <Editor
              theme="vs-dark"
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
          <div className="flex items-center justify-between h-6 px-3 bg-sidebar text-[11px] text-gray-500 shrink-0">
            <div className="flex items-center gap-3">
              <span>{selectedFile ? getLanguage(selectedFile).charAt(0).toUpperCase() + getLanguage(selectedFile).slice(1) : ""}</span>
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
