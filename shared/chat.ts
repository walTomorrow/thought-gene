/**
 * Shared chat API types used by the frontend and Worker.
 */

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessageInput = {
  role: MessageRole;
  content: string;
};

/** Persisted message returned by the API. */
export type StoredMessage = {
  id: string;
  projectId: string;
  branchId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

/** Send one new user turn; history is loaded from D1 on the server. */
export type ChatRequest = {
  projectId: string;
  branchId: string;
  content: string;
};

export type ChatResponse = {
  reply: string;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
};

export type ChatErrorResponse = {
  error: string;
};

const VALID_ROLES: MessageRole[] = ["user", "assistant", "system"];

export function isMessageRole(value: string): value is MessageRole {
  return VALID_ROLES.includes(value as MessageRole);
}
