import type { StoredMessage } from "./chat";

export type ProjectRecord = {
  id: string;
  name: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BranchRecord = {
  id: string;
  projectId: string;
  parentBranchId: string | null;
  sourceMessageId: string | null;
  title: string;
  purpose: string;
  status: "active" | "ready_to_close" | "closed";
  contextSummary: string | null;
  closureSummary: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type WorkspaceResponse = {
  project: ProjectRecord;
  branch: BranchRecord;
  messages: StoredMessage[];
};
