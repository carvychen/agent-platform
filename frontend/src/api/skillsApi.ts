import apiClient from "./axiosClient";
import type {
  Skill,
  SkillListResponse,
  SkillDetail,
  SkillCreateRequest,
  ValidationResult,
  CurrentUser,
} from "../types/skill";

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/me");
  return data;
}

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

export async function renameFile(
  skillName: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  await apiClient.post(`/skills/${skillName}/files/${oldPath}/rename`, {
    new_path: newPath,
  });
}

export async function deleteFolder(
  skillName: string,
  folderPath: string
): Promise<void> {
  await apiClient.delete(`/skills/${skillName}/folders/${folderPath}`);
}

export async function downloadSkill(name: string): Promise<void> {
  const response = await apiClient.get(`/skills/${name}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface InstallTokenResponse {
  tar_url: string;
  sas_urls: string[];
  expires_in: number;
}

export async function getInstallToken(
  name: string
): Promise<InstallTokenResponse> {
  const { data } = await apiClient.post<InstallTokenResponse>(
    `/skills/${name}/install-token`
  );
  return data;
}

export async function validateSkill(
  name: string
): Promise<ValidationResult> {
  const { data } = await apiClient.post<ValidationResult>(
    `/skills/${name}/validate`
  );
  return data;
}

export async function importSkill(
  file: File | Blob,
  overwrite = false
): Promise<Skill> {
  const formData = new FormData();
  formData.append("file", file, "import.zip");
  const { data } = await apiClient.post<Skill>(
    `/skills/import?overwrite=${overwrite}`,
    formData
  );
  return data;
}
