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
  BranchActionRequest,
  BranchActionResponse,
  BranchRecord,
  BranchStatus,
  BranchSummary,
  CreateBranchRequest,
  CreateBranchResponse,
  ProjectRecord,
  UpdateBranchRequest,
  UpdateBranchResponse,
  WorkspaceResponse,
} from "../../shared/workspace";

export { isRootBranch } from "../../shared/workspace";

/** UI message — same shape as StoredMessage from the API. */
export type ChatMessage = StoredMessage;
