import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMcp, deleteMcp, getMcp, listMcps, updateMcp } from "../api/mcpsApi";
import type { McpCreateRequest, McpUpdateRequest } from "../types/mcp";

export function useMcpList() {
  return useQuery({
    queryKey: ["mcps"],
    queryFn: listMcps,
  });
}

export function useMcp(name: string | undefined) {
  return useQuery({
    queryKey: ["mcps", name],
    queryFn: () => getMcp(name as string),
    enabled: Boolean(name),
  });
}

export function useCreateMcp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: McpCreateRequest) => createMcp(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcps"] }),
  });
}

export function useUpdateMcp(name: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: McpUpdateRequest) => updateMcp(name, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      queryClient.invalidateQueries({ queryKey: ["mcps", name] });
    },
  });
}

export function useDeleteMcp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteMcp(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      queryClient.removeQueries({ queryKey: ["mcps", name] });
    },
  });
}
