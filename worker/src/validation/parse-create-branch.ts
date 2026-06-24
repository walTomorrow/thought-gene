import type { CreateBranchRequest } from "../../../shared/workspace";

type ParseResult =
  | { ok: true; value: CreateBranchRequest }
  | { ok: false; error: string };

/**
 * Validates a create-branch request body.
 */
export function parseCreateBranchRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;

  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  if (typeof record.title !== "string" || !record.title.trim()) {
    return { ok: false, error: "title is required." };
  }

  if (typeof record.purpose !== "string" || !record.purpose.trim()) {
    return { ok: false, error: "purpose is required." };
  }

  const request: CreateBranchRequest = {
    projectId: record.projectId.trim(),
    title: record.title.trim(),
    purpose: record.purpose.trim(),
  };

  if (typeof record.parentBranchId === "string" && record.parentBranchId.trim()) {
    request.parentBranchId = record.parentBranchId.trim();
  }

  return { ok: true, value: request };
}
