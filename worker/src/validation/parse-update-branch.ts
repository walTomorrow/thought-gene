import type { UpdateBranchRequest } from "../../../shared/workspace";

type ParseResult =
  | { ok: true; value: UpdateBranchRequest }
  | { ok: false; error: string };

export function parseUpdateBranchRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;

  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  const hasTitle = typeof record.title === "string" && record.title.trim();
  const hasPurpose = typeof record.purpose === "string" && record.purpose.trim();

  if (!hasTitle && !hasPurpose) {
    return { ok: false, error: "At least one of title or purpose is required." };
  }

  const value: UpdateBranchRequest = {
    projectId: record.projectId.trim(),
  };

  if (hasTitle) {
    value.title = (record.title as string).trim();
  }

  if (hasPurpose) {
    value.purpose = (record.purpose as string).trim();
  }

  return { ok: true, value };
}
