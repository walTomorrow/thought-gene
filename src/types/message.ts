import type {
  ChatErrorResponse,
  ChatMessageInput,
  ChatRequest,
  ChatResponse,
  MessageRole,
  StoredMessage,
} from "../../shared/chat";

export type {
  ChatErrorResponse,
  ChatMessageInput,
  ChatRequest,
  ChatResponse,
  MessageRole,
  StoredMessage,
};

export type {
  BranchRecord,
  BranchStatus,
  BranchSummary,
  CreateBranchRequest,
  CreateBranchResponse,
  ProjectRecord,
  WorkspaceResponse,
} from "../../shared/workspace";

/** UI message — same shape as StoredMessage from the API. */
export type ChatMessage = StoredMessage;
