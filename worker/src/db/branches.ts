import type { BranchRecord } from "../../../shared/workspace";
import { MAIN_BRANCH_PURPOSE, MAIN_BRANCH_TITLE } from "./constants";
import { mapBranchRow, newId, nowIso } from "./helpers";

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

export async function findMainBranch(
  db: D1Database,
  projectId: string,
): Promise<BranchRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, project_id, parent_branch_id, source_message_id, title, purpose,
              status, context_summary, closure_summary, created_at, updated_at, closed_at
       FROM branches
       WHERE project_id = ? AND title = ? AND parent_branch_id IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind(projectId, MAIN_BRANCH_TITLE)
    .first<BranchRow>();

  return result ? mapBranchRow(result) : null;
}

export async function createMainBranch(
  db: D1Database,
  projectId: string,
): Promise<BranchRecord> {
  const id = newId();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO branches (
         id, project_id, parent_branch_id, source_message_id, title, purpose,
         status, context_summary, closure_summary, created_at, updated_at, closed_at
       ) VALUES (?, ?, NULL, NULL, ?, ?, 'active', NULL, NULL, ?, ?, NULL)`,
    )
    .bind(id, projectId, MAIN_BRANCH_TITLE, MAIN_BRANCH_PURPOSE, timestamp, timestamp)
    .run();

  return {
    id,
    projectId,
    parentBranchId: null,
    sourceMessageId: null,
    title: MAIN_BRANCH_TITLE,
    purpose: MAIN_BRANCH_PURPOSE,
    status: "active",
    contextSummary: null,
    closureSummary: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: null,
  };
}

export async function getOrCreateMainBranch(
  db: D1Database,
  projectId: string,
): Promise<BranchRecord> {
  const existing = await findMainBranch(db, projectId);
  if (existing) {
    return existing;
  }

  return createMainBranch(db, projectId);
}

export async function getBranchById(
  db: D1Database,
  branchId: string,
): Promise<BranchRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, project_id, parent_branch_id, source_message_id, title, purpose,
              status, context_summary, closure_summary, created_at, updated_at, closed_at
       FROM branches
       WHERE id = ?`,
    )
    .bind(branchId)
    .first<BranchRow>();

  return result ? mapBranchRow(result) : null;
}

export async function branchBelongsToProject(
  db: D1Database,
  branchId: string,
  projectId: string,
): Promise<boolean> {
  const branch = await getBranchById(db, branchId);
  return branch?.projectId === projectId;
}

export async function listActiveBranchesByProject(
  db: D1Database,
  projectId: string,
): Promise<BranchRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, project_id, parent_branch_id, source_message_id, title, purpose,
              status, context_summary, closure_summary, created_at, updated_at, closed_at
       FROM branches
       WHERE project_id = ? AND status = 'active'
       ORDER BY CASE WHEN title = ? THEN 0 ELSE 1 END, created_at ASC`,
    )
    .bind(projectId, MAIN_BRANCH_TITLE)
    .all<BranchRow>();

  return (result.results ?? []).map(mapBranchRow);
}

export async function createBranch(
  db: D1Database,
  input: {
    projectId: string;
    parentBranchId: string;
    title: string;
    purpose: string;
  },
): Promise<BranchRecord> {
  const id = newId();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO branches (
         id, project_id, parent_branch_id, source_message_id, title, purpose,
         status, context_summary, closure_summary, created_at, updated_at, closed_at
       ) VALUES (?, ?, ?, NULL, ?, ?, 'active', NULL, NULL, ?, ?, NULL)`,
    )
    .bind(
      id,
      input.projectId,
      input.parentBranchId,
      input.title,
      input.purpose,
      timestamp,
      timestamp,
    )
    .run();

  return {
    id,
    projectId: input.projectId,
    parentBranchId: input.parentBranchId,
    sourceMessageId: null,
    title: input.title,
    purpose: input.purpose,
    status: "active",
    contextSummary: null,
    closureSummary: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: null,
  };
}
