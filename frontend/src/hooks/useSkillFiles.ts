import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { readFile, writeFile } from "../api/skillsApi";

export function useFileContent(skillName: string, filePath: string | null) {
  return useQuery({
    queryKey: ["skill-file", skillName, filePath],
    queryFn: () => readFile(skillName, filePath!),
    enabled: !!filePath,
  });
}

export function useSaveFile(skillName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      writeFile(skillName, path, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["skill-file", skillName, variables.path],
      });
      queryClient.invalidateQueries({ queryKey: ["skills", skillName] });
    },
  });
}
