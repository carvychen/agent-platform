import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMcp, listMcps } from "../api/mcpsApi";
import type { McpCreateRequest } from "../types/mcp";

export function useMcpList() {
  return useQuery({
    queryKey: ["mcps"],
    queryFn: listMcps,
  });
}

export function useCreateMcp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: McpCreateRequest) => createMcp(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcps"] }),
  });
}
