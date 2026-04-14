export interface SkillMetadata {
  author?: string;
  version?: string;
  [key: string]: string | undefined;
}

export interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: SkillMetadata;
  file_count: number;
  total_size: number;
  created_at: string;
  modified_at: string;
}

export interface SkillListResponse {
  skills: Skill[];
  total: number;
  page: number;
  page_size: number;
}

export interface SkillCreateRequest {
  name: string;
  description: string;
  template: "blank" | "script" | "instruction" | "mcp";
  license?: string;
  metadata?: SkillMetadata;
}

export interface SkillFile {
  path: string;
  is_directory: boolean;
  size: number;
}

export interface SkillDetail extends Skill {
  files: SkillFile[];
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export type UserRole = "SkillAdmin" | "SkillUser";

export interface CurrentUser {
  oid: string;
  name: string;
  email: string;
  tenant_id: string;
  roles: UserRole[];
}
