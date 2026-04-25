export type McpTransport = "streamable-http" | "sse" | "stdio";
export type McpAuthType = "none" | "bearer_static" | "oauth_bearer_from_host";
export type McpSource = "external" | "platform_authored";

export interface McpMetadata {
  [key: string]: string | undefined;
}

export interface Mcp {
  name: string;
  display_name: string;
  description: string;
  endpoint_url: string;
  transport: McpTransport;
  auth_type: McpAuthType;
  source: McpSource;
  metadata?: McpMetadata;
  created_at: string;
  updated_at: string;
}

export interface McpListResponse {
  mcps: Mcp[];
}

export interface McpCreateRequest {
  name: string;
  display_name: string;
  description: string;
  endpoint_url: string;
  transport: McpTransport;
  auth_type: McpAuthType;
  metadata?: McpMetadata;
}

// PUT body — omits immutable fields (name / source / created_at / updated_at).
// Backend rejects the immutable keys via pydantic `extra='forbid'`.
export interface McpUpdateRequest {
  display_name: string;
  description: string;
  endpoint_url: string;
  transport: McpTransport;
  auth_type: McpAuthType;
  metadata?: McpMetadata;
}
