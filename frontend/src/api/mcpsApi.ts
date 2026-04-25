import apiClient from "./axiosClient";
import type { Mcp, McpCreateRequest, McpListResponse, McpUpdateRequest } from "../types/mcp";

export async function listMcps(): Promise<McpListResponse> {
  const { data } = await apiClient.get<McpListResponse>("/mcps");
  return data;
}

export async function createMcp(req: McpCreateRequest): Promise<Mcp> {
  const { data } = await apiClient.post<Mcp>("/mcps", req);
  return data;
}

export async function getMcp(name: string): Promise<Mcp> {
  const { data } = await apiClient.get<Mcp>(`/mcps/${encodeURIComponent(name)}`);
  return data;
}

export async function updateMcp(name: string, req: McpUpdateRequest): Promise<Mcp> {
  const { data } = await apiClient.put<Mcp>(`/mcps/${encodeURIComponent(name)}`, req);
  return data;
}

export async function deleteMcp(name: string): Promise<void> {
  await apiClient.delete(`/mcps/${encodeURIComponent(name)}`);
}

export async function getMcpJsonSnippet(name: string): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(`/mcps/${encodeURIComponent(name)}/mcp-json`);
  return data;
}
