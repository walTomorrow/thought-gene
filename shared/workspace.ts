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
  closedAt?: string | null;
};

export type WorkspaceResponse = {
  project: ProjectRecord;
  branches: BranchSummary[];
  closedBranches: BranchSummary[];
  branch: BranchRecord;
  messages: StoredMessage[];
  isReadOnly: boolean;
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

export type UpdateBranchRequest = {
  projectId: string;
  title?: string;
  purpose?: string;
};

export type UpdateBranchResponse = {
  branch: BranchRecord;
};

export type BranchActionRequest = {
  projectId: string;
};

export type BranchActionResponse = {
  branch: BranchRecord;
};

/** Root project branch: parent_branch_id IS NULL in D1. */
export function isRootBranch(branch: {
  parentBranchId: string | null;
}): boolean {
  return branch.parentBranchId === null;
}
