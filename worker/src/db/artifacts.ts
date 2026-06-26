import type {
  ArtifactMetadataItem,
  ArtifactRecord,
  ArtifactStatus,
  ArtifactType,
} from "../../../shared/artifact";
import { newId, nowIso } from "./helpers";

type ArtifactRow = {
  id: string;
  project_id: string;
  type: string;
  status: string;
  title: string;
  body: string;
  reasoning: string | null;
  assumptions_json: string | null;
  risks_json: string | null;
  constraints_json: string | null;
  rejected_options_json: string | null;
  source_branch_id: string | null;
  source_merge_id: string | null;
  source_message_id: string | null;
  created_at: string;
  updated_at: string;
};

const ARTIFACT_SELECT = `SELECT id, project_id, type, status, title, body, reasoning,
  assumptions_json, risks_json, constraints_json, rejected_options_json,
  source_branch_id, source_merge_id, source_message_id, created_at, updated_at`;

function parseMetadataJson(raw: string | null): ArtifactMetadataItem[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is ArtifactMetadataItem => {
        return (
          !!item &&
          typeof item === "object" &&
          typeof (item as ArtifactMetadataItem).id === "string" &&
          typeof (item as ArtifactMetadataItem).title === "string" &&
          typeof (item as ArtifactMetadataItem).body === "string"
        );
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
      }));
  } catch {
    return [];
  }
}

function serializeMetadataJson(items: ArtifactMetadataItem[]): string | null {
  if (items.length === 0) {
    return null;
  }

  return JSON.stringify(items);
}

function mapArtifactRow(row: ArtifactRow): ArtifactRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as ArtifactType,
    status: row.status as ArtifactStatus,
    title: row.title,
    body: row.body,
    reasoning: row.reasoning,
    assumptions: parseMetadataJson(row.assumptions_json),
    risks: parseMetadataJson(row.risks_json),
    constraints: parseMetadataJson(row.constraints_json),
    rejectedOptions: parseMetadataJson(row.rejected_options_json),
    sourceBranchId: row.source_branch_id,
    sourceMergeId: row.source_merge_id,
    sourceMessageId: row.source_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ListArtifactsFilters = {
  projectId: string;
  sourceBranchId?: string;
  type?: ArtifactType;
  status?: ArtifactStatus;
};

export async function listArtifacts(
  db: D1Database,
  filters: ListArtifactsFilters,
): Promise<ArtifactRecord[]> {
  const conditions = ["project_id = ?"];
  const bindings: string[] = [filters.projectId];

  if (filters.sourceBranchId) {
    conditions.push("source_branch_id = ?");
    bindings.push(filters.sourceBranchId);
  }

  if (filters.type) {
    conditions.push("type = ?");
    bindings.push(filters.type);
  }

  if (filters.status) {
    conditions.push("status = ?");
    bindings.push(filters.status);
  }

  const result = await db
    .prepare(
      `${ARTIFACT_SELECT}
       FROM artifacts
       WHERE ${conditions.join(" AND ")}
       ORDER BY updated_at DESC`,
    )
    .bind(...bindings)
    .all<ArtifactRow>();

  return (result.results ?? []).map(mapArtifactRow);
}

export async function getArtifactById(
  db: D1Database,
  artifactId: string,
): Promise<ArtifactRecord | null> {
  const result = await db
    .prepare(`${ARTIFACT_SELECT} FROM artifacts WHERE id = ?`)
    .bind(artifactId)
    .first<ArtifactRow>();

  return result ? mapArtifactRow(result) : null;
}

export type CreateArtifactInput = {
  projectId: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  body: string;
  reasoning: string | null;
  assumptions: ArtifactMetadataItem[];
  risks: ArtifactMetadataItem[];
  constraints: ArtifactMetadataItem[];
  rejectedOptions: ArtifactMetadataItem[];
  sourceBranchId: string | null;
  sourceMergeId: string | null;
  sourceMessageId: string | null;
};

export async function createArtifact(
  db: D1Database,
  input: CreateArtifactInput,
): Promise<ArtifactRecord> {
  const id = newId();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO artifacts (
         id, project_id, type, status, title, body, reasoning,
         assumptions_json, risks_json, constraints_json, rejected_options_json,
         source_branch_id, source_merge_id, source_message_id,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.projectId,
      input.type,
      input.status,
      input.title,
      input.body,
      input.reasoning,
      serializeMetadataJson(input.assumptions),
      serializeMetadataJson(input.risks),
      serializeMetadataJson(input.constraints),
      serializeMetadataJson(input.rejectedOptions),
      input.sourceBranchId,
      input.sourceMergeId,
      input.sourceMessageId,
      timestamp,
      timestamp,
    )
    .run();

  return {
    id,
    projectId: input.projectId,
    type: input.type,
    status: input.status,
    title: input.title,
    body: input.body,
    reasoning: input.reasoning,
    assumptions: input.assumptions,
    risks: input.risks,
    constraints: input.constraints,
    rejectedOptions: input.rejectedOptions,
    sourceBranchId: input.sourceBranchId,
    sourceMergeId: input.sourceMergeId,
    sourceMessageId: input.sourceMessageId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export type UpdateArtifactInput = {
  type?: ArtifactType;
  status?: ArtifactStatus;
  title?: string;
  body?: string;
  reasoning?: string | null;
  assumptions?: ArtifactMetadataItem[];
  risks?: ArtifactMetadataItem[];
  constraints?: ArtifactMetadataItem[];
  rejectedOptions?: ArtifactMetadataItem[];
  sourceBranchId?: string | null;
  sourceMergeId?: string | null;
  sourceMessageId?: string | null;
};

export async function updateArtifact(
  db: D1Database,
  artifactId: string,
  input: UpdateArtifactInput,
): Promise<ArtifactRecord | null> {
  const existing = await getArtifactById(db, artifactId);
  if (!existing) {
    return null;
  }

  const updatedAt = nowIso();
  const next: ArtifactRecord = {
    ...existing,
    type: input.type ?? existing.type,
    status: input.status ?? existing.status,
    title: input.title ?? existing.title,
    body: input.body ?? existing.body,
    reasoning:
      input.reasoning !== undefined ? input.reasoning : existing.reasoning,
    assumptions: input.assumptions ?? existing.assumptions,
    risks: input.risks ?? existing.risks,
    constraints: input.constraints ?? existing.constraints,
    rejectedOptions: input.rejectedOptions ?? existing.rejectedOptions,
    sourceBranchId:
      input.sourceBranchId !== undefined
        ? input.sourceBranchId
        : existing.sourceBranchId,
    sourceMergeId:
      input.sourceMergeId !== undefined
        ? input.sourceMergeId
        : existing.sourceMergeId,
    sourceMessageId:
      input.sourceMessageId !== undefined
        ? input.sourceMessageId
        : existing.sourceMessageId,
    updatedAt,
  };

  await db
    .prepare(
      `UPDATE artifacts
       SET type = ?, status = ?, title = ?, body = ?, reasoning = ?,
           assumptions_json = ?, risks_json = ?, constraints_json = ?,
           rejected_options_json = ?,
           source_branch_id = ?, source_merge_id = ?, source_message_id = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      next.type,
      next.status,
      next.title,
      next.body,
      next.reasoning,
      serializeMetadataJson(next.assumptions),
      serializeMetadataJson(next.risks),
      serializeMetadataJson(next.constraints),
      serializeMetadataJson(next.rejectedOptions),
      next.sourceBranchId,
      next.sourceMergeId,
      next.sourceMessageId,
      updatedAt,
      artifactId,
    )
    .run();

  return next;
}
