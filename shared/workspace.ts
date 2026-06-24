import type { StoredMessage } from "./chat";

export type ProjectRecord = {
  id: string;
  name: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BranchStatus = "active" | "ready_to_close" | "closed";

export type BranchRecord = {
  id: string;
  projectId: string;
  parentBranchId: string | null;
  sourceMessageId: string | null;
  title: string;
  purpose: string;
  status: BranchStatus;
  contextSummary: string | null;
  closureSummary: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

/** Lightweight branch row for lists and switchers. */
export type BranchSummary = {
  id: string;
  title: string;
  purpose: string;
  status: BranchStatus;
  parentBranchId: string | null;
  createdAt: string;
};

export type WorkspaceResponse = {
  project: ProjectRecord;
  branches: BranchSummary[];
  branch: BranchRecord;
  messages: StoredMessage[];
};

export type CreateBranchRequest = {
  projectId: string;
  title: string;
  purpose: string;
  parentBranchId?: string;
};

export type CreateBranchResponse = {
  branch: BranchRecord;
};
