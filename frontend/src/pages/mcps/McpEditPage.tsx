import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { useMcp, useUpdateMcp } from "../../hooks/useMcps";
import { useRoles } from "../../auth/useRoles";

const localHosts = new Set(["localhost", "127.0.0.1"]);

const schema = z.object({
  display_name: z.string().min(1, "Display name is required").max(80, "Max 80 characters"),
  description: z.string().min(1, "Description is required").max(500, "Max 500 characters"),
  endpoint_url: z
    .string()
    .min(1, "Endpoint URL is required")
    .refine((v) => {
      try {
        const u = new URL(v);
        if (u.protocol === "https:") return true;
        if (u.protocol === "http:" && localHosts.has(u.hostname)) return true;
        return false;
      } catch {
        return false;
      }
    }, "Must be https:// (or http:// for localhost / 127.0.0.1)"),
  transport: z.enum(["streamable-http", "sse", "stdio"]),
  auth_type: z.enum(["none", "bearer_static", "oauth_bearer_from_host"]),
});

type FormValues = z.infer<typeof schema>;

export function McpEditPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { canWrite, isLoading: rolesLoading } = useRoles();
  const { data: mcp, isLoading: mcpLoading, isError } = useMcp(name);
  const updateMutation = useUpdateMcp(name ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!rolesLoading && !canWrite) {
      navigate(`/mcps/${name}`, { replace: true });
    }
  }, [rolesLoading, canWrite, navigate, name]);

  useEffect(() => {
    if (mcp) {
      reset({
        display_name: mcp.display_name,
        description: mcp.description,
        endpoint_url: mcp.endpoint_url,
        transport: mcp.transport,
        auth_type: mcp.auth_type,
      });
    }
  }, [mcp, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateMutation.mutateAsync({
        ...values,
        metadata: mcp?.metadata, // preserved; edit form does not expose metadata today
      });
      navigate(`/mcps/${name}`);
    } catch (err: unknown) {
      console.error("Failed to update MCP", err);
    }
  };

  if (mcpLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (isError || !mcp) return <div className="p-8 text-error">MCP not found</div>;

  return (
    <>
      <TopBar>
        <Breadcrumb
          items={[
            { label: "MCPs", href: "/mcps" },
            { label: name!, href: `/mcps/${name}` },
            { label: "Edit" },
          ]}
        />
      </TopBar>

      <div className="flex-1 overflow-auto p-8">
        <button
          onClick={() => navigate(`/mcps/${name}`)}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="max-w-2xl">
          <h1 className="text-xl font-mono font-bold text-text-primary mb-1">Edit MCP</h1>
          <p className="text-sm text-text-muted mb-6">
            Update metadata for <span className="font-mono">{name}</span>.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field label="Slug (name)">
              <input
                value={name ?? ""}
                disabled
                data-testid="mcp-name-disabled"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm text-text-muted cursor-not-allowed"
              />
              <FieldHint>
                Slug cannot be renamed. To use a different slug, delete this MCP and register it
                again.
              </FieldHint>
            </Field>

            <Field label="Display name" error={errors.display_name?.message} required>
              <input
                {...register("display_name")}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </Field>

            <Field label="Description" error={errors.description?.message} required>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </Field>

            <Field label="Endpoint URL" error={errors.endpoint_url?.message} required>
              <input
                {...register("endpoint_url")}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-primary"
              />
              <FieldHint>
                Must be https://. Plain http:// is only accepted for localhost / 127.0.0.1.
              </FieldHint>
            </Field>

            <div className="grid grid-cols-2 gap-5">
              <Field label="Transport" error={errors.transport?.message}>
                <select
                  {...register("transport")}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="streamable-http">streamable-http</option>
                  <option value="sse">sse</option>
                  <option value="stdio">stdio</option>
                </select>
              </Field>

              <Field label="Auth type" error={errors.auth_type?.message}>
                <select
                  {...register("auth_type")}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="none">None</option>
                  <option value="bearer_static">Bearer token (client-provided)</option>
                  <option value="oauth_bearer_from_host">Host-mediated OAuth</option>
                </select>
              </Field>
            </div>

            {updateMutation.isError && (
              <div className="text-sm text-error">
                Failed to update MCP.{" "}
                {(updateMutation.error as Error)?.message ?? "Check the form and try again."}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/mcps/${name}`)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-text-muted">{children}</p>;
}
