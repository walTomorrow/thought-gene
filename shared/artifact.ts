/**
 * Project artifact types shared by frontend and Worker.
 */

export const ARTIFACT_TYPES = [
  "decision",
  "requirement",
  "open_question",
  "deferred_work",
  "future_goal",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_STATUSES = [
  "suggested",
  "accepted",
  "resolved",
  "deferred",
  "superseded",
  "dropped",
] as const;

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

/** Supporting metadata on artifacts (not top-level artifact types). */
export type ArtifactMetadataItem = {
  id: string;
  title: string;
  body: string;
};

export type ArtifactRecord = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type ListArtifactsResponse = {
  artifacts: ArtifactRecord[];
};

export type GetArtifactResponse = {
  artifact: ArtifactRecord;
};

export type CreateArtifactRequest = {
  projectId: string;
  type: ArtifactType;
  title: string;
  body?: string;
  reasoning?: string;
  assumptions?: ArtifactMetadataItem[];
  risks?: ArtifactMetadataItem[];
  constraints?: ArtifactMetadataItem[];
  rejectedOptions?: ArtifactMetadataItem[];
  status?: ArtifactStatus;
  sourceBranchId?: string;
  sourceMergeId?: string;
  sourceMessageId?: string;
};

export type CreateArtifactResponse = {
  artifact: ArtifactRecord;
};

export type UpdateArtifactRequest = {
  projectId: string;
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

export type UpdateArtifactResponse = {
  artifact: ArtifactRecord;
};

export type ArtifactActionRequest = {
  projectId: string;
  reasoning?: string;
};

export type ArtifactActionResponse = {
  artifact: ArtifactRecord;
};

export function newArtifactMetadataItemId(): string {
  return crypto.randomUUID();
}

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value);
}

export function isArtifactStatus(value: string): value is ArtifactStatus {
  return (ARTIFACT_STATUSES as readonly string[]).includes(value);
}
