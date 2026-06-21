import type { ProjectRecord } from "../../../shared/workspace";
import { DEFAULT_PROJECT_NAME } from "./constants";
import { newId, nowIso } from "./helpers";

type ProjectRow = {
  id: string;
  name: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
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

export async function findDefaultProject(db: D1Database): Promise<ProjectRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, name, summary, created_at, updated_at
       FROM projects
       WHERE name = ?
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind(DEFAULT_PROJECT_NAME)
    .first<ProjectRow>();

  return result ? mapProjectRow(result) : null;
}

export async function createProject(db: D1Database, name: string): Promise<ProjectRecord> {
  const id = newId();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO projects (id, name, summary, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?)`,
    )
    .bind(id, name, timestamp, timestamp)
    .run();

  return {
    id,
    name,
    summary: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function getOrCreateDefaultProject(db: D1Database): Promise<ProjectRecord> {
  const existing = await findDefaultProject(db);
  if (existing) {
    return existing;
  }

  return createProject(db, DEFAULT_PROJECT_NAME);
}

export async function getProjectById(
  db: D1Database,
  projectId: string,
): Promise<ProjectRecord | null> {
  const result = await db
    .prepare(
      `SELECT id, name, summary, created_at, updated_at
       FROM projects
       WHERE id = ?`,
    )
    .bind(projectId)
    .first<ProjectRow>();

  return result ? mapProjectRow(result) : null;
}
