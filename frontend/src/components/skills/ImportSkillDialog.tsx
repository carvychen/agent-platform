import { useState, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Upload,
  FolderOpen,
  FileArchive,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useImportSkill } from "../../hooks/useSkills";
import { assembleZipFromFiles } from "../../utils/zipAssembler";
import axios from "axios";

declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

type ImportState = "idle" | "ready" | "importing" | "conflict" | "error";

interface ImportSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (skillName: string) => void;
}

function parseApiError(error: unknown): string[] {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((d: string | { message: string }) =>
        typeof d === "string" ? d : d.message
      );
    }
    if (typeof detail === "string") return [detail];
    if (typeof detail === "object" && detail?.message) return [detail.message];
  }
  if (error instanceof Error) return [error.message];
  return ["An unexpected error occurred"];
}

export function ImportSkillDialog({
  open,
  onClose,
  onSuccess,
}: ImportSkillDialogProps) {
  const [mode, setMode] = useState<"zip" | "folder">("folder");
  const [state, setState] = useState<ImportState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [conflictName, setConflictName] = useState("");

  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportSkill();

  const reset = useCallback(() => {
    setState("idle");
    setSelectedFile(null);
    setFileName("");
    setFileCount(0);
    setErrors([]);
    setConflictName("");
    if (zipInputRef.current) zipInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    setFileCount(1);
    setState("ready");
    setErrors([]);
  };

  const handleFolderSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const blob = await assembleZipFromFiles(files);
      setSelectedFile(blob);
      // Show the folder name from the first file's relative path
      const firstPath = files[0].webkitRelativePath || files[0].name;
      setFileName(firstPath.split("/")[0] || "selected folder");
      setFileCount(files.length);
      setState("ready");
      setErrors([]);
    } catch (err) {
      setErrors(parseApiError(err));
      setState("error");
    }
  };

  const doImport = async (overwrite = false) => {
    if (!selectedFile || state === "importing") return;

    setState("importing");
    setErrors([]);

    try {
      const skill = await importMutation.mutateAsync({
        file: selectedFile,
        overwrite,
      });
      handleClose();
      onSuccess(skill.name);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data?.detail;
        const name =
          typeof detail === "object" && detail?.skill_name
            ? detail.skill_name
            : "this skill";
        setConflictName(name);
        setState("conflict");
      } else {
        setErrors(parseApiError(err));
        setState("error");
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 z-50">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-mono font-bold text-text-primary">
              Import Skill
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Conflict confirmation */}
          {state === "conflict" ? (
            <div>
              <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg mb-6">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Skill "{conflictName}" already exists
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    This will replace all files in the existing skill. This
                    action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setState("ready");
                    setConflictName("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => doImport(true)}
                  className="px-4 py-2 bg-warning hover:bg-warning/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Overwrite
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    if (mode !== "zip") {
                      setMode("zip");
                      reset();
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    mode === "zip"
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-text-muted hover:text-text-primary border border-border"
                  }`}
                >
                  <FileArchive className="w-4 h-4" />
                  ZIP File
                </button>
                <button
                  onClick={() => {
                    if (mode !== "folder") {
                      setMode("folder");
                      reset();
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    mode === "folder"
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-text-muted hover:text-text-primary border border-border"
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Folder
                </button>
              </div>

              {/* Drop zone */}
              <div
                onClick={() =>
                  mode === "zip"
                    ? zipInputRef.current?.click()
                    : folderInputRef.current?.click()
                }
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-surface/50 transition-colors mb-4"
              >
                {selectedFile ? (
                  <>
                    {mode === "zip" ? (
                      <FileArchive className="w-8 h-8 text-primary" />
                    ) : (
                      <FolderOpen className="w-8 h-8 text-primary" />
                    )}
                    <div className="text-center">
                      <p className="text-sm font-medium text-text-primary">
                        {fileName}
                      </p>
                      {mode === "folder" && (
                        <p className="text-xs text-text-muted mt-1">
                          {fileCount} files
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reset();
                      }}
                      className="text-xs text-text-muted hover:text-text-primary"
                    >
                      Change selection
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-text-muted" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-text-primary">
                        {mode === "zip"
                          ? "Click to select a ZIP file"
                          : "Click to select a skill folder"}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Must contain a valid SKILL.md at the root
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Visually hidden file inputs (sr-only instead of hidden so .click() works inside Radix Dialog) */}
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipSelect}
                className="sr-only"
              />
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                multiple
                onChange={handleFolderSelect}
                className="sr-only"
              />

              {/* Error display */}
              {errors.length > 0 && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg mb-4">
                  {errors.map((e, i) => (
                    <p key={i} className="text-sm text-danger">
                      {e}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => doImport()}
                  disabled={state !== "ready" && state !== "error"}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {state === "importing" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Import
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
