import type {
  BranchMergeRecord,
  BranchMergeStatus,
  BranchMergeSummary,
  MergePacket,
} from "../../../shared/merge";
import { newId, nowIso } from "./helpers";

type BranchMergeRow = {
  id: string;
  project_id: string;
  child_branch_id: string;
  parent_branch_id: string;
  merge_sequence: number;
  status: string;
  packet_json: string;
  rendered_markdown: string | null;
  parent_message_id: string | null;
  close_child_after: number;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
};

function mapBranchMergeRow(row: BranchMergeRow): BranchMergeRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    childBranchId: row.child_branch_id,
    parentBranchId: row.parent_branch_id,
    mergeSequence: row.merge_sequence,
    status: row.status as BranchMergeStatus,
    packet: JSON.parse(row.packet_json) as MergePacket,
    renderedMarkdown: row.rendered_markdown,
    parentMessageId: row.parent_message_id,
    closeChildAfter: row.close_child_after === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
  };
}

function mapBranchMergeSummary(row: BranchMergeRow): BranchMergeSummary {
  return {
    id: row.id,
    mergeSequence: row.merge_sequence,
    status: row.status as BranchMergeStatus,
    parentBranchId: row.parent_branch_id,
    parentMessageId: row.parent_message_id,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  };
}

export async function getNextMergeSequence(
  db: D1Database,
  childBranchId: string,
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COALESCE(MAX(merge_sequence), 0) AS max_sequence
       FROM branch_merges
       WHERE child_branch_id = ?`,
    )
    .bind(childBranchId)
    .first<{ max_sequence: number }>();

  return (result?.max_sequence ?? 0) + 1;
}

export async function findDraftMergeByChild(
  db: D1Database,
  childBranchId: string,
): Promise<BranchMergeRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, project_id, child_branch_id, parent_branch_id, merge_sequence,
              status, packet_json, rendered_markdown, parent_message_id,
              close_child_after, created_at, updated_at, confirmed_at
       FROM branch_merges
       WHERE child_branch_id = ? AND status = 'draft'
       LIMIT 1`,
    )
    .bind(childBranchId)
    .first<BranchMergeRow>();

  return result ? mapBranchMergeRow(result) : null;
}

export async function getBranchMergeById(
  db: D1Database,
  mergeId: string,
): Promise<BranchMergeRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, project_id, child_branch_id, parent_branch_id, merge_sequence,
              status, packet_json, rendered_markdown, parent_message_id,
              close_child_after, created_at, updated_at, confirmed_at
       FROM branch_merges
       WHERE id = ?`,
    )
    .bind(mergeId)
    .first<BranchMergeRow>();

  return result ? mapBranchMergeRow(result) : null;
}

export async function listMergesByChild(
  db: D1Database,
  childBranchId: string,
): Promise<BranchMergeSummary[]> {
  const result = await db
    .prepare(
      `SELECT id, project_id, child_branch_id, parent_branch_id, merge_sequence,
              status, packet_json, rendered_markdown, parent_message_id,
              close_child_after, created_at, updated_at, confirmed_at
       FROM branch_merges
       WHERE child_branch_id = ? AND status IN ('draft', 'confirmed')
       ORDER BY merge_sequence DESC`,
    )
    .bind(childBranchId)
    .all<BranchMergeRow>();

  return (result.results ?? []).map(mapBranchMergeSummary);
}

export async function listConfirmedMergesByChild(
  db: D1Database,
  childBranchId: string,
): Promise<BranchMergeRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, project_id, child_branch_id, parent_branch_id, merge_sequence,
              status, packet_json, rendered_markdown, parent_message_id,
              close_child_after, created_at, updated_at, confirmed_at
       FROM branch_merges
       WHERE child_branch_id = ? AND status = 'confirmed'
       ORDER BY merge_sequence ASC`,
    )
    .bind(childBranchId)
    .all<BranchMergeRow>();

  return (result.results ?? []).map(mapBranchMergeRow);
}

export async function discardDraftMerge(
  db: D1Database,
  mergeId: string,
): Promise<void> {
  const updatedAt = nowIso();
  await db
    .prepare(
      `UPDATE branch_merges
       SET status = 'discarded', updated_at = ?
       WHERE id = ? AND status = 'draft'`,
    )
    .bind(updatedAt, mergeId)
    .run();
}

export async function createDraftMerge(
  db: D1Database,
  input: {
    projectId: string;
    childBranchId: string;
    parentBranchId: string;
    mergeSequence: number;
    packet: MergePacket;
  },
): Promise<BranchMergeRecord> {
  const id = newId();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO branch_merges (
         id, project_id, child_branch_id, parent_branch_id, merge_sequence,
         status, packet_json, rendered_markdown, parent_message_id,
         close_child_after, created_at, updated_at, confirmed_at
       ) VALUES (?, ?, ?, ?, ?, 'draft', ?, NULL, NULL, 0, ?, ?, NULL)`,
    )
    .bind(
      id,
      input.projectId,
      input.childBranchId,
      input.parentBranchId,
      input.mergeSequence,
      JSON.stringify(input.packet),
      timestamp,
      timestamp,
    )
    .run();

  return {
    id,
    projectId: input.projectId,
    childBranchId: input.childBranchId,
    parentBranchId: input.parentBranchId,
    mergeSequence: input.mergeSequence,
    status: "draft",
    packet: input.packet,
    renderedMarkdown: null,
    parentMessageId: null,
    closeChildAfter: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    confirmedAt: null,
  };
}

export async function updateDraftMergePacket(
  db: D1Database,
  mergeId: string,
  packet: MergePacket,
): Promise<BranchMergeRecord | null> {
  const existing = await getBranchMergeById(db, mergeId);
  if (!existing || existing.status !== "draft") {
    return null;
  }

  const updatedAt = nowIso();
  await db
    .prepare(
      `UPDATE branch_merges
       SET packet_json = ?, updated_at = ?
       WHERE id = ? AND status = 'draft'`,
    )
    .bind(JSON.stringify(packet), updatedAt, mergeId)
    .run();

  return {
    ...existing,
    packet,
    updatedAt,
  };
}

export async function confirmBranchMerge(
  db: D1Database,
  input: {
    mergeId: string;
    renderedMarkdown: string;
    parentMessageId: string;
    closeChildAfter: boolean;
  },
): Promise<BranchMergeRecord | null> {
  const existing = await getBranchMergeById(db, input.mergeId);
  if (!existing || existing.status !== "draft") {
    return null;
  }

  const updatedAt = nowIso();
  await db
    .prepare(
      `UPDATE branch_merges
       SET status = 'confirmed',
           rendered_markdown = ?,
           parent_message_id = ?,
           close_child_after = ?,
           updated_at = ?,
           confirmed_at = ?
       WHERE id = ? AND status = 'draft'`,
    )
    .bind(
      input.renderedMarkdown,
      input.parentMessageId,
      input.closeChildAfter ? 1 : 0,
      updatedAt,
      updatedAt,
      input.mergeId,
    )
    .run();

  return {
    ...existing,
    status: "confirmed",
    renderedMarkdown: input.renderedMarkdown,
    parentMessageId: input.parentMessageId,
    closeChildAfter: input.closeChildAfter,
    updatedAt,
    confirmedAt: updatedAt,
  };
}

export async function getLastConfirmedMerge(
  db: D1Database,
  childBranchId: string,
): Promise<BranchMergeRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, project_id, child_branch_id, parent_branch_id, merge_sequence,
              status, packet_json, rendered_markdown, parent_message_id,
              close_child_after, created_at, updated_at, confirmed_at
       FROM branch_merges
       WHERE child_branch_id = ? AND status = 'confirmed'
       ORDER BY merge_sequence DESC
       LIMIT 1`,
    )
    .bind(childBranchId)
    .first<BranchMergeRow>();

  return result ? mapBranchMergeRow(result) : null;
}
