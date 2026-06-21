import type { ChatRequest } from "../../../shared/chat";

type ParseResult =
  | { ok: true; value: ChatRequest }
  | { ok: false; error: string };

/**
 * Validates a chat turn request: project, branch, and new user content.
 */
export function parseChatRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;

  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  if (typeof record.branchId !== "string" || !record.branchId.trim()) {
    return { ok: false, error: "branchId is required." };
  }

  if (typeof record.content !== "string" || !record.content.trim()) {
    return { ok: false, error: "content is required." };
  }

  return {
    ok: true,
    value: {
      projectId: record.projectId.trim(),
      branchId: record.branchId.trim(),
      content: record.content.trim(),
    },
  };
}
