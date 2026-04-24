import { useEffect, useState } from "react";
import { Construction, ExternalLink } from "lucide-react";

/**
 * Renders a "Coming Soon" card backed by a real backend stub endpoint.
 *
 * Fetches `/api/{module}` on mount and displays the contract's `detail` +
 * a link to the `tracking` issue. The endpoint is expected to return HTTP
 * 501 with a JSON body of shape:
 *   { status_code: 501, module: string, detail: string, tracking: string }
 *
 * Deleted when each hub ships a real implementation (future slices).
 */
interface ComingSoonResponse {
  status_code: number;
  module: string;
  detail: string;
  tracking: string;
}

interface ComingSoonProps {
  module: "mcps" | "prompts" | "agents";
  displayName: string;
}

export function ComingSoon({ module, displayName }: ComingSoonProps) {
  const [data, setData] = useState<ComingSoonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/${module}`)
      .then(async (res) => {
        const body = (await res.json()) as ComingSoonResponse;
        if (res.status !== 501 || body.module !== module) {
          throw new Error(
            `Unexpected response from /api/${module}: ${res.status}`,
          );
        }
        setData(body);
      })
      .catch((e: Error) => setError(e.message));
  }, [module]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Construction className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mb-2 font-mono text-xl font-bold text-text-primary">
          {displayName} Hub
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          {error
            ? `Could not reach the ${displayName} Hub endpoint: ${error}`
            : data?.detail ?? "Loading…"}
        </p>
        {data?.tracking && (
          <a
            href={data.tracking}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Track progress
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
