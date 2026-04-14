import { useRef, useState } from "react";
import { ChevronDown, Download, Terminal, Check, HardDrive, Loader2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  downloadSkill,
  getInstallToken,
  type InstallTokenResponse,
} from "../../api/skillsApi";
import { agents } from "../../constants/agents";

interface ExportDropdownProps {
  skillName: string;
}

export function ExportDropdown({ skillName }: ExportDropdownProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const tokenCache = useRef<{ data: InstallTokenResponse; ts: number } | null>(
    null
  );

  const resolvePath = (template: string) =>
    template.replace("{name}", skillName);

  const showError = (id: string) => {
    setErrorId(id);
    setTimeout(() => setErrorId(null), 2000);
  };

  /** Return cached token if still fresh (< 4 min), otherwise fetch a new one. */
  const getToken = async (): Promise<InstallTokenResponse> => {
    const cache = tokenCache.current;
    if (cache && Date.now() - cache.ts < 4 * 60 * 1000) {
      return cache.data;
    }
    const data = await getInstallToken(skillName);
    tokenCache.current = { data, ts: Date.now() };
    return data;
  };

  const handleDropdownOpen = (open: boolean) => {
    if (open) {
      // Pre-fetch token when dropdown opens so clicks are instant
      getToken().catch(() => {});
    }
  };

  const handleInstallCommand = async (agentId: string, projectPath: string) => {
    try {
      setLoadingId(agentId);
      const { tar_url } = await getToken();
      const dest = resolvePath(projectPath);
      const command = `mkdir -p ${dest} && curl -sL "${tar_url}" | tar -xz -C ${dest}`;
      await navigator.clipboard.writeText(command);
      setCopiedId(agentId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showError(agentId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleAzcopyCommand = async () => {
    try {
      setLoadingId("azcopy");
      const { sas_urls } = await getToken();
      if (!sas_urls.length) {
        showError("azcopy");
        return;
      }
      const dest = resolvePath(agents[0].projectPath);
      const command = sas_urls
        .map((url) => `azcopy copy "${url}" "${dest}"`)
        .join(" && \\\n");
      await navigator.clipboard.writeText(command);
      setCopiedId("azcopy");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showError("azcopy");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <DropdownMenu.Root onOpenChange={handleDropdownOpen}>
      <div className="inline-flex items-stretch rounded-lg border border-border">
        <button
          onClick={() => downloadSkill(skillName)}
          className="flex items-center gap-1.5 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface text-sm font-medium rounded-l-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <div className="w-px bg-border" />
        <DropdownMenu.Trigger asChild>
          <button
            className="flex items-center px-2.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-r-lg transition-colors cursor-pointer"
            aria-label="Export options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu.Trigger>
      </div>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="min-w-[220px] bg-white rounded-lg border border-gray-200/80 py-1 z-50 dropdown-animate"
            style={{
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <DropdownMenu.Item
              onSelect={() => downloadSkill(skillName)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />

            <DropdownMenu.Label className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Copy install command
            </DropdownMenu.Label>

            {agents.map((agent) => (
              <DropdownMenu.Item
                key={agent.id}
                onSelect={(e) => {
                  e.preventDefault();
                  handleInstallCommand(agent.id, agent.projectPath);
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
              >
                {copiedId === agent.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : errorId === agent.id ? (
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                ) : loadingId === agent.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Terminal className="w-3.5 h-3.5" />
                )}
                <span className="flex-1">
                  {copiedId === agent.id
                    ? "Copied!"
                    : errorId === agent.id
                      ? "Failed to copy"
                      : agent.label}
                </span>
              </DropdownMenu.Item>
            ))}

            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                handleInstallCommand("custom", "<target-path>/skills/{name}/");
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
            >
              {copiedId === "custom" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : errorId === "custom" ? (
                <Terminal className="w-3.5 h-3.5 text-red-400" />
              ) : loadingId === "custom" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Terminal className="w-3.5 h-3.5" />
              )}
              <span className="flex-1">
                {copiedId === "custom"
                  ? "Copied!"
                  : errorId === "custom"
                    ? "Failed to copy"
                    : "Custom path"}
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />

            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                handleAzcopyCommand();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 cursor-pointer outline-none transition-colors"
            >
              {copiedId === "azcopy" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : errorId === "azcopy" ? (
                <HardDrive className="w-3.5 h-3.5 text-red-400" />
              ) : loadingId === "azcopy" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              <span className="flex-1">
                {copiedId === "azcopy"
                  ? "Copied!"
                  : errorId === "azcopy"
                    ? "SAS URL unavailable"
                    : "Copy azcopy command"}
              </span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
