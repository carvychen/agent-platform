import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSkills,
  getSkill,
  createSkill,
  deleteSkill,
  validateSkill,
} from "../api/skillsApi";
import type { SkillCreateRequest } from "../types/skill";

export function useSkillList() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: listSkills,
  });
}

export function useSkillDetail(name: string) {
  return useQuery({
    queryKey: ["skills", name],
    queryFn: () => getSkill(name),
    enabled: !!name,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SkillCreateRequest) => createSkill(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteSkill(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useValidateSkill() {
  return useMutation({
    mutationFn: (name: string) => validateSkill(name),
  });
}
