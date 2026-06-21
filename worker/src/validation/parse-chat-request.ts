import {
  DEFAULT_BRANCH_ID,
  DEFAULT_PROJECT_ID,
  type ChatMessageInput,
  isMessageRole,
} from "../../../shared/chat";

export type ParsedChatRequest = {
  messages: ChatMessageInput[];
  projectId: string;
  branchId: string;
};

type ParseResult =
  | { ok: true; value: ParsedChatRequest }
  | { ok: false; error: string };

/**
 * Validates and normalizes an incoming chat request body.
 * Keeps HTTP handlers thin and centralizes request-shape rules.
 */
export function parseChatRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;

  if (!Array.isArray(record.messages) || record.messages.length === 0) {
    return { ok: false, error: "At least one message is required." };
  }

  const messages: ChatMessageInput[] = [];

  for (const item of record.messages) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Each message must be an object." };
    }

    const message = item as Record<string, unknown>;

    if (typeof message.role !== "string" || !isMessageRole(message.role)) {
      return {
        ok: false,
        error: 'Each message must have role "user", "assistant", or "system".',
      };
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      return { ok: false, error: "Each message must have non-empty content." };
    }

    messages.push({ role: message.role, content: message.content.trim() });
  }

  const projectId =
    typeof record.projectId === "string" && record.projectId.trim()
      ? record.projectId.trim()
      : DEFAULT_PROJECT_ID;

  const branchId =
    typeof record.branchId === "string" && record.branchId.trim()
      ? record.branchId.trim()
      : DEFAULT_BRANCH_ID;

  return {
    ok: true,
    value: { messages, projectId, branchId },
  };
}
