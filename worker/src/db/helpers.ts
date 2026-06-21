import type { BranchRecord } from "../../../shared/workspace";

type BranchRow = {
  id: string;
  project_id: string;
  parent_branch_id: string | null;
  source_message_id: string | null;
  title: string;
  purpose: string;
  status: string;
  context_summary: string | null;
  closure_summary: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export function mapBranchRow(row: BranchRow): BranchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    parentBranchId: row.parent_branch_id,
    sourceMessageId: row.source_message_id,
    title: row.title,
    purpose: row.purpose,
    status: row.status as BranchRecord["status"],
    contextSummary: row.context_summary,
    closureSummary: row.closure_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
