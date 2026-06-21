import type { MessageRole } from "../../shared/chat";

export type {
  ChatErrorResponse,
  ChatMessageInput,
  ChatRequest,
  ChatResponse,
  MessageRole,
} from "../../shared/chat";

export {
  DEFAULT_BRANCH_ID,
  DEFAULT_PROJECT_ID,
} from "../../shared/chat";

/**
 * UI message with identity and timestamps.
 * projectId/branchId are set to placeholders for the implicit single conversation.
 */
export type ChatMessage = {
  id: string;
  projectId: string;
  branchId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};
