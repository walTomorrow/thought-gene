import type { MessageKind, MessageRole, StoredMessage } from "../../../shared/chat";
import { newId, nowIso } from "./helpers";

type MessageRow = {
  id: string;
  project_id: string;
  branch_id: string;
  role: string;
  content: string;
  message_kind: string;
  merge_id: string | null;
  created_at: string;
};

function mapMessageRow(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    projectId: row.project_id,
    branchId: row.branch_id,
    role: row.role as MessageRole,
    content: row.content,
    messageKind: row.message_kind as MessageKind,
    mergeId: row.merge_id,
    createdAt: row.created_at,
  };
}

const MESSAGE_SELECT = `SELECT id, project_id, branch_id, role, content, message_kind, merge_id, created_at`;

export async function listMessagesByBranch(
  db: D1Database,
  branchId: string,
): Promise<StoredMessage[]> {
  const result = await db
    .prepare(
      `${MESSAGE_SELECT}
       FROM messages
       WHERE branch_id = ?
       ORDER BY created_at ASC`,
    )
    .bind(branchId)
    .all<MessageRow>();

  return (result.results ?? []).map(mapMessageRow);
}

export async function getMessageById(
  db: D1Database,
  messageId: string,
): Promise<StoredMessage | null> {
  const result = await db
    .prepare(`${MESSAGE_SELECT} FROM messages WHERE id = ?`)
    .bind(messageId)
    .first<MessageRow>();

  return result ? mapMessageRow(result) : null;
}

export async function insertMessage(
  db: D1Database,
  input: {
    projectId: string;
    branchId: string;
    role: MessageRole;
    content: string;
    messageKind?: MessageKind;
    mergeId?: string | null;
  },
): Promise<StoredMessage> {
  const id = newId();
  const createdAt = nowIso();
  const messageKind = input.messageKind ?? "chat";
  const mergeId = input.mergeId ?? null;

  await db
    .prepare(
      `INSERT INTO messages (
         id, project_id, branch_id, role, content, message_kind, merge_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.projectId,
      input.branchId,
      input.role,
      input.content,
      messageKind,
      mergeId,
      createdAt,
    )
    .run();

  return {
    id,
    projectId: input.projectId,
    branchId: input.branchId,
    role: input.role,
    content: input.content,
    messageKind,
    mergeId,
    createdAt,
  };
}

export async function countChildMessagesAfter(
  db: D1Database,
  branchId: string,
  afterIso: string,
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM messages
       WHERE branch_id = ? AND created_at > ? AND message_kind = 'chat'`,
    )
    .bind(branchId, afterIso)
    .first<{ count: number }>();

  return result?.count ?? 0;
}
