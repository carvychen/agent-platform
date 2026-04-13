import apiClient from "./axiosClient";
import type {
  Skill,
  SkillListResponse,
  SkillDetail,
  SkillCreateRequest,
  ValidationResult,
} from "../types/skill";

export async function listSkills(): Promise<SkillListResponse> {
  const { data } = await apiClient.get<SkillListResponse>("/skills");
  return data;
}

export async function getSkill(name: string): Promise<SkillDetail> {
  const { data } = await apiClient.get<SkillDetail>(`/skills/${name}`);
  return data;
}

export async function createSkill(req: SkillCreateRequest): Promise<Skill> {
  const { data } = await apiClient.post<Skill>("/skills", req);
  return data;
}

export async function deleteSkill(name: string): Promise<void> {
  await apiClient.delete(`/skills/${name}`);
}

export async function readFile(
  skillName: string,
  filePath: string
): Promise<string> {
  const { data } = await apiClient.get<{ path: string; content: string }>(
    `/skills/${skillName}/files/${filePath}`
  );
  return data.content;
}

export async function writeFile(
  skillName: string,
  filePath: string,
  content: string
): Promise<void> {
  await apiClient.put(`/skills/${skillName}/files/${filePath}`, { content });
}

export async function deleteFile(
  skillName: string,
  filePath: string
): Promise<void> {
  await apiClient.delete(`/skills/${skillName}/files/${filePath}`);
}

export async function validateSkill(
  name: string
): Promise<ValidationResult> {
  const { data } = await apiClient.post<ValidationResult>(
    `/skills/${name}/validate`
  );
  return data;
}
