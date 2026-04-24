import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { useCreateMcp } from "../../hooks/useMcps";
import { useRoles } from "../../auth/useRoles";

// Same slug rule as the backend (app/mcps/models.py NAME_PATTERN) so
// client-side feedback matches the 422 the server would return.
const nameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const localHosts = new Set(["localhost", "127.0.0.1"]);

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Max 64 characters")
    .regex(nameRegex, "Lowercase letters, numbers, and hyphens only. No leading/trailing hyphen."),
  display_name: z.string().min(1, "Display name is required").max(80, "Max 80 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Max 500 characters"),
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

export function McpCreatePage() {
  const navigate = useNavigate();
  const { canWrite, isLoading: rolesLoading } = useRoles();
  const createMutation = useCreateMcp();

  useEffect(() => {
    if (!rolesLoading && !canWrite) {
      navigate("/mcps", { replace: true });
    }
  }, [rolesLoading, canWrite, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transport: "streamable-http",
      auth_type: "none",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync(values);
      navigate("/mcps");
    } catch (err: unknown) {
      // Let react-hook-form show errors; server-side 422 / 409 shown via toast
      // would be nice but is out of scope for this slice.
      console.error("Failed to create MCP", err);
    }
  };

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "MCPs", href: "/mcps" }, { label: "New" }]} />
      </TopBar>

      <div className="flex-1 overflow-auto p-8">
        <button
          onClick={() => navigate("/mcps")}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="max-w-2xl">
          <h1 className="text-xl font-mono font-bold text-text-primary mb-1">
            Register a new MCP
          </h1>
          <p className="text-sm text-text-muted mb-6">
            Register an external MCP server's URL so your tenant can discover and use it. The
            server itself stays where it's deployed — the platform only stores the metadata.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field label="Slug (name)" error={errors.name?.message} required>
              <input
                {...register("name")}
                placeholder="my-crm-mcp"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-primary"
              />
              <FieldHint>Lowercase letters, numbers, hyphens. Unique within your tenant.</FieldHint>
            </Field>

            <Field label="Display name" error={errors.display_name?.message} required>
              <input
                {...register("display_name")}
                placeholder="CRM MCP"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </Field>

            <Field label="Description" error={errors.description?.message} required>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="What this MCP server exposes and when to use it."
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </Field>

            <Field label="Endpoint URL" error={errors.endpoint_url?.message} required>
              <input
                {...register("endpoint_url")}
                placeholder="https://example.com/mcp"
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

            {createMutation.isError && (
              <div className="text-sm text-error">
                Failed to create MCP. {(createMutation.error as Error)?.message ?? "Check the form and try again."}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create MCP"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/mcps")}
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
