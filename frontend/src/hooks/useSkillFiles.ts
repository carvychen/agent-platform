import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  readFile,
  writeFile,
  deleteFile,
  renameFile,
  deleteFolder,
} from "../api/skillsApi";
import type { SkillDetail } from "../types/skill";

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

export function useCreateFile(skillName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      writeFile(skillName, path, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", skillName] });
    },
  });
}

export function useDeleteFile(skillName: string) {
  const queryClient = useQueryClient();
  const queryKey = ["skills", skillName];
  return useMutation({
    mutationFn: (path: string) => deleteFile(skillName, path),
    onMutate: async (path) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SkillDetail>(queryKey);
      if (previous) {
        const fileToRemove = previous.files.find((f) => f.path === path);
        const sizeReduction = fileToRemove?.size ?? 0;
        queryClient.setQueryData<SkillDetail>(queryKey, {
          ...previous,
          files: previous.files.filter((f) => f.path !== path),
          file_count: previous.file_count - 1,
          total_size: previous.total_size - sizeReduction,
        });
      }
      return { previous };
    },
    onError: (_err, _path, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });
}

export function useRenameFile(skillName: string) {
  const queryClient = useQueryClient();
  const queryKey = ["skills", skillName];
  return useMutation({
    mutationFn: ({ oldPath, newPath }: { oldPath: string; newPath: string }) =>
      renameFile(skillName, oldPath, newPath),
    onMutate: async ({ oldPath, newPath }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SkillDetail>(queryKey);
      if (previous) {
        queryClient.setQueryData<SkillDetail>(queryKey, {
          ...previous,
          files: previous.files.map((f) =>
            f.path === oldPath ? { ...f, path: newPath } : f
          ),
        });
      }
      // Also invalidate the old file content cache
      queryClient.removeQueries({
        queryKey: ["skill-file", skillName, oldPath],
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });
}

export function useDeleteFolder(skillName: string) {
  const queryClient = useQueryClient();
  const queryKey = ["skills", skillName];
  return useMutation({
    mutationFn: (folderPath: string) => deleteFolder(skillName, folderPath),
    onMutate: async (folderPath) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SkillDetail>(queryKey);
      if (previous) {
        const prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";
        const remaining = previous.files.filter(
          (f) => !f.path.startsWith(prefix)
        );
        const removedSize = previous.files
          .filter((f) => f.path.startsWith(prefix))
          .reduce((sum, f) => sum + f.size, 0);
        queryClient.setQueryData<SkillDetail>(queryKey, {
          ...previous,
          files: remaining,
          file_count: remaining.length,
          total_size: previous.total_size - removedSize,
        });
      }
      return { previous };
    },
    onError: (_err, _folder, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });
}
