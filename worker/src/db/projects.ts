import type { ProjectListItem, ProjectRecord } from "../../../shared/projects";
import { newId, nowIso } from "./helpers";

type ProjectRow = {
  id: string;
  name: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectListRow = ProjectRow & {
  branch_count: number;
  decisions: number;
  open_questions: number;
  deferred_work: number;
  last_activity: string | null;
};

function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProjectListRow(row: ProjectListRow): ProjectListItem {
  return {
    ...mapProjectRow(row),
    branchCount: row.branch_count,
    memory: {
      decisions: row.decisions,
      openQuestions: row.open_questions,
      deferredWork: row.deferred_work,
    },
    lastActivity: row.last_activity,
  };
}

const PROJECT_SELECT = `SELECT id, name, summary, created_at, updated_at`;

const LIST_PROJECTS_SQL = `
  SELECT
    p.id,
    p.name,
    p.summary,
    p.created_at,
    p.updated_at,
    (SELECT COUNT(*) FROM branches b WHERE b.project_id = p.id) AS branch_count,
    (SELECT COUNT(*) FROM artifacts a
      WHERE a.project_id = p.id AND a.type = 'decision'
        AND a.status NOT IN ('dropped', 'superseded')) AS decisions,
    (SELECT COUNT(*) FROM artifacts a
      WHERE a.project_id = p.id AND a.type = 'open_question'
        AND a.status NOT IN ('dropped', 'superseded', 'resolved')) AS open_questions,
    (SELECT COUNT(*) FROM artifacts a
      WHERE a.project_id = p.id AND a.type = 'deferred_work'
        AND a.status NOT IN ('dropped', 'superseded', 'resolved')) AS deferred_work,
    (SELECT m.content FROM messages m
      WHERE m.project_id = p.id
      ORDER BY m.created_at DESC
      LIMIT 1) AS last_activity
  FROM projects p
  ORDER BY p.updated_at DESC
`;

export async function listProjectsWithStats(
  db: D1Database,
): Promise<ProjectListItem[]> {
  const result = await db.prepare(LIST_PROJECTS_SQL).all<ProjectListRow>();
  return (result.results ?? []).map(mapProjectListRow);
}

export async function createProject(
  db: D1Database,
  input: { name: string; summary?: string | null },
): Promise<ProjectRecord> {
  const id = newId();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO projects (id, name, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, input.name, input.summary ?? null, timestamp, timestamp)
    .run();

  return {
    id,
    name: input.name,
    summary: input.summary ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function getProjectById(
  db: D1Database,
  projectId: string,
): Promise<ProjectRecord | null> {
  const result = await db
    .prepare(`${PROJECT_SELECT} FROM projects WHERE id = ?`)
    .bind(projectId)
    .first<ProjectRow>();

  return result ? mapProjectRow(result) : null;
}

export async function touchProjectUpdatedAt(
  db: D1Database,
  projectId: string,
): Promise<void> {
  const updatedAt = nowIso();
  await db
    .prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`)
    .bind(updatedAt, projectId)
    .run();
}

export async function deleteProjectById(
  db: D1Database,
  projectId: string,
): Promise<boolean> {
  const existing = await getProjectById(db, projectId);
  if (!existing) {
    return false;
  }

  await db.batch([
    db
      .prepare(`DELETE FROM artifacts WHERE project_id = ?`)
      .bind(projectId),
    db
      .prepare(
        `UPDATE branch_merges SET parent_message_id = NULL WHERE project_id = ?`,
      )
      .bind(projectId),
    db
      .prepare(`UPDATE messages SET merge_id = NULL WHERE project_id = ?`)
      .bind(projectId),
    db
      .prepare(`DELETE FROM branch_merges WHERE project_id = ?`)
      .bind(projectId),
    db.prepare(`DELETE FROM messages WHERE project_id = ?`).bind(projectId),
    db
      .prepare(
        `UPDATE branches SET parent_branch_id = NULL WHERE project_id = ?`,
      )
      .bind(projectId),
    db.prepare(`DELETE FROM branches WHERE project_id = ?`).bind(projectId),
    db.prepare(`DELETE FROM projects WHERE id = ?`).bind(projectId),
  ]);

  return true;
}
