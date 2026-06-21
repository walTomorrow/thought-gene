/**
 * Shared chat API types used by the frontend and Worker.
 * Kept in /shared so both runtimes stay aligned without duplicating shapes.
 */

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessageInput = {
  role: MessageRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessageInput[];
  projectId?: string;
  branchId?: string;
};

export type ChatResponse = {
  reply: string;
};

export type ChatErrorResponse = {
  error: string;
};

/** Placeholder until project creation exists. */
export const DEFAULT_PROJECT_ID = "default-project";

/** Placeholder for the implicit main branch until branching exists. */
export const DEFAULT_BRANCH_ID = "main";

const VALID_ROLES: MessageRole[] = ["user", "assistant", "system"];

export function isMessageRole(value: string): value is MessageRole {
  return VALID_ROLES.includes(value as MessageRole);
}
