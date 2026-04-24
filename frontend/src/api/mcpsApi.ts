import apiClient from "./axiosClient";
import type { Mcp, McpCreateRequest, McpListResponse } from "../types/mcp";

export async function listMcps(): Promise<McpListResponse> {
  const { data } = await apiClient.get<McpListResponse>("/mcps");
  return data;
}

export async function createMcp(req: McpCreateRequest): Promise<Mcp> {
  const { data } = await apiClient.post<Mcp>("/mcps", req);
  return data;
}
