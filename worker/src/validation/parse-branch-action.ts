import type { BranchActionRequest } from "../../../shared/workspace";

type ParseResult =
  | { ok: true; value: BranchActionRequest }
  | { ok: false; error: string };

export function parseBranchActionRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;

  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  return {
    ok: true,
    value: { projectId: record.projectId.trim() },
  };
}
