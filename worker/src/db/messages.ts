import type { MessageRole, StoredMessage } from "../../../shared/chat";
import { newId, nowIso } from "./helpers";

type MessageRow = {
  id: string;
  project_id: string;
  branch_id: string;
  role: string;
  content: string;
  created_at: string;
};

function mapMessageRow(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    projectId: row.project_id,
    branchId: row.branch_id,
    role: row.role as MessageRole,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function listMessagesByBranch(
  db: D1Database,
  branchId: string,
): Promise<StoredMessage[]> {
  const result = await db
    .prepare(
      `SELECT id, project_id, branch_id, role, content, created_at
       FROM messages
       WHERE branch_id = ?
       ORDER BY created_at ASC`,
    )
    .bind(branchId)
    .all<MessageRow>();

  return (result.results ?? []).map(mapMessageRow);
}

export async function insertMessage(
  db: D1Database,
  input: {
    projectId: string;
    branchId: string;
    role: MessageRole;
    content: string;
  },
): Promise<StoredMessage> {
  const id = newId();
  const createdAt = nowIso();

  await db
    .prepare(
      `INSERT INTO messages (id, project_id, branch_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.projectId, input.branchId, input.role, input.content, createdAt)
    .run();

  return {
    id,
    projectId: input.projectId,
    branchId: input.branchId,
    role: input.role,
    content: input.content,
    createdAt,
  };
}
