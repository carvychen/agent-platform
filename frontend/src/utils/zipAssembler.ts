import { zipSync } from "fflate";

const IGNORED = new Set([".DS_Store", "Thumbs.db"]);
const IGNORED_PREFIXES = ["__MACOSX/"];
const IGNORED_DIR_SEGMENTS = ["__pycache__", "node_modules", ".git"];

/**
 * Assemble a ZIP blob from browser FileList (from webkitdirectory input).
 * Strips the common root folder prefix so SKILL.md is at the ZIP root.
 */
export async function assembleZipFromFiles(files: FileList): Promise<Blob> {
  const entries: { path: string; data: Uint8Array }[] = [];

  for (const file of Array.from(files)) {
    const path = file.webkitRelativePath || file.name;
    const basename = path.split("/").pop() ?? "";

    if (IGNORED.has(basename)) continue;
    if (IGNORED_PREFIXES.some((p) => path.startsWith(p))) continue;
    const segments = path.split("/");
    if (segments.some((s) => IGNORED_DIR_SEGMENTS.includes(s))) continue;

    const buf = await file.arrayBuffer();
    // Skip binary files: try decoding as UTF-8, skip on failure
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(buf));
    } catch {
      continue;
    }
    entries.push({ path, data: new Uint8Array(buf) });
  }

  if (entries.length === 0) {
    throw new Error("No files found in the selected folder");
  }

  // Strip common root directory prefix
  const parts = entries.map((e) => e.path.split("/"));
  if (parts.every((p) => p.length > 1) && new Set(parts.map((p) => p[0])).size === 1) {
    const root = parts[0][0] + "/";
    for (const entry of entries) {
      entry.path = entry.path.slice(root.length);
    }
  }

  // Validate SKILL.md exists before uploading
  if (!entries.some((e) => e.path === "SKILL.md")) {
    throw new Error("Selected folder must contain a SKILL.md file at the root");
  }

  // Build fflate input
  const zipData: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    zipData[entry.path] = entry.data;
  }

  const zipped = zipSync(zipData);
  // fflate returns Uint8Array<ArrayBuffer>, but its declarations produce the
  // broader Uint8Array<ArrayBufferLike> under TS 6.x. BlobPart only accepts
  // the narrower form, so we narrow explicitly.
  return new Blob([zipped as Uint8Array<ArrayBuffer>], {
    type: "application/zip",
  });
}
