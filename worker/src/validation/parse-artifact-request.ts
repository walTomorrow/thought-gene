import type {
  ArtifactMetadataItem,
  ArtifactStatus,
  ArtifactType,
} from "../../../shared/artifact";
import {
  ARTIFACT_STATUSES,
  ARTIFACT_TYPES,
  isArtifactStatus,
  isArtifactType,
} from "../../../shared/artifact";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function parseProjectId(record: Record<string, unknown>): string | null {
  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return null;
  }

  return record.projectId.trim();
}

function parseMetadataItems(
  value: unknown,
  fieldName: string,
): ParseResult<ArtifactMetadataItem[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: `${fieldName} must be an array.` };
  }

  const items: ArtifactMetadataItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: `${fieldName} items must be objects.` };
    }

    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id.trim()) {
      return { ok: false, error: `${fieldName} items require a non-empty id.` };
    }

    if (typeof item.title !== "string") {
      return { ok: false, error: `${fieldName} items require title.` };
    }

    if (typeof item.body !== "string") {
      return { ok: false, error: `${fieldName} items require body.` };
    }

    items.push({
      id: item.id.trim(),
      title: item.title,
      body: item.body,
    });
  }

  return { ok: true, value: items };
}

function parseArtifactType(value: unknown): ParseResult<ArtifactType> {
  if (typeof value !== "string" || !isArtifactType(value)) {
    return {
      ok: false,
      error: `type must be one of: ${ARTIFACT_TYPES.join(", ")}.`,
    };
  }

  return { ok: true, value };
}

function parseArtifactStatus(value: unknown): ParseResult<ArtifactStatus> {
  if (typeof value !== "string" || !isArtifactStatus(value)) {
    return {
      ok: false,
      error: `status must be one of: ${ARTIFACT_STATUSES.join(", ")}.`,
    };
  }

  return { ok: true, value };
}

export function parseArtifactProjectQuery(
  projectId: string | undefined,
): ParseResult<{ projectId: string }> {
  if (!projectId?.trim()) {
    return { ok: false, error: "projectId query parameter is required." };
  }

  return { ok: true, value: { projectId: projectId.trim() } };
}

export function parseListArtifactsQuery(query: {
  projectId?: string;
  sourceBranchId?: string;
  type?: string;
  status?: string;
}): ParseResult<{
  projectId: string;
  sourceBranchId?: string;
  type?: ArtifactType;
  status?: ArtifactStatus;
}> {
  const projectParsed = parseArtifactProjectQuery(query.projectId);
  if (!projectParsed.ok) {
    return projectParsed;
  }

  const value: {
    projectId: string;
    sourceBranchId?: string;
    type?: ArtifactType;
    status?: ArtifactStatus;
  } = {
    projectId: projectParsed.value.projectId,
  };

  if (query.sourceBranchId?.trim()) {
    value.sourceBranchId = query.sourceBranchId.trim();
  }

  if (query.type !== undefined) {
    const typeParsed = parseArtifactType(query.type);
    if (!typeParsed.ok) {
      return typeParsed;
    }
    value.type = typeParsed.value;
  }

  if (query.status !== undefined) {
    const statusParsed = parseArtifactStatus(query.status);
    if (!statusParsed.ok) {
      return statusParsed;
    }
    value.status = statusParsed.value;
  }

  return { ok: true, value };
}

export function parseCreateArtifactRequest(
  body: unknown,
): ParseResult<{
  projectId: string;
  type: ArtifactType;
  title: string;
  body: string;
  reasoning: string | null;
  assumptions: ArtifactMetadataItem[];
  risks: ArtifactMetadataItem[];
  constraints: ArtifactMetadataItem[];
  rejectedOptions: ArtifactMetadataItem[];
  status: ArtifactStatus;
  sourceBranchId: string | null;
  sourceMergeId: string | null;
  sourceMessageId: string | null;
}> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const projectId = parseProjectId(record);
  if (!projectId) {
    return { ok: false, error: "projectId is required." };
  }

  const typeParsed = parseArtifactType(record.type);
  if (!typeParsed.ok) {
    return typeParsed;
  }

  if (typeof record.title !== "string" || !record.title.trim()) {
    return { ok: false, error: "title is required." };
  }

  let status: ArtifactStatus = "suggested";
  if (record.status !== undefined) {
    const statusParsed = parseArtifactStatus(record.status);
    if (!statusParsed.ok) {
      return statusParsed;
    }
    status = statusParsed.value;
  }

  const assumptionsParsed = parseMetadataItems(record.assumptions, "assumptions");
  if (!assumptionsParsed.ok) {
    return assumptionsParsed;
  }

  const risksParsed = parseMetadataItems(record.risks, "risks");
  if (!risksParsed.ok) {
    return risksParsed;
  }

  const constraintsParsed = parseMetadataItems(record.constraints, "constraints");
  if (!constraintsParsed.ok) {
    return constraintsParsed;
  }

  const rejectedParsed = parseMetadataItems(
    record.rejectedOptions,
    "rejectedOptions",
  );
  if (!rejectedParsed.ok) {
    return rejectedParsed;
  }

  return {
    ok: true,
    value: {
      projectId,
      type: typeParsed.value,
      title: record.title.trim(),
      body: typeof record.body === "string" ? record.body : "",
      reasoning:
        typeof record.reasoning === "string" ? record.reasoning : null,
      assumptions: assumptionsParsed.value ?? [],
      risks: risksParsed.value ?? [],
      constraints: constraintsParsed.value ?? [],
      rejectedOptions: rejectedParsed.value ?? [],
      status,
      sourceBranchId:
        typeof record.sourceBranchId === "string" && record.sourceBranchId.trim()
          ? record.sourceBranchId.trim()
          : null,
      sourceMergeId:
        typeof record.sourceMergeId === "string" && record.sourceMergeId.trim()
          ? record.sourceMergeId.trim()
          : null,
      sourceMessageId:
        typeof record.sourceMessageId === "string" &&
        record.sourceMessageId.trim()
          ? record.sourceMessageId.trim()
          : null,
    },
  };
}

export function parseUpdateArtifactRequest(
  body: unknown,
): ParseResult<{
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
}> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const projectId = parseProjectId(record);
  if (!projectId) {
    return { ok: false, error: "projectId is required." };
  }

  const value: {
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
  } = { projectId };

  if (record.type !== undefined) {
    const typeParsed = parseArtifactType(record.type);
    if (!typeParsed.ok) {
      return typeParsed;
    }
    value.type = typeParsed.value;
  }

  if (record.status !== undefined) {
    const statusParsed = parseArtifactStatus(record.status);
    if (!statusParsed.ok) {
      return statusParsed;
    }
    value.status = statusParsed.value;
  }

  if (record.title !== undefined) {
    if (typeof record.title !== "string" || !record.title.trim()) {
      return { ok: false, error: "title cannot be empty." };
    }
    value.title = record.title.trim();
  }

  if (record.body !== undefined) {
    if (typeof record.body !== "string") {
      return { ok: false, error: "body must be a string." };
    }
    value.body = record.body;
  }

  if (record.reasoning !== undefined) {
    value.reasoning =
      record.reasoning === null
        ? null
        : typeof record.reasoning === "string"
          ? record.reasoning
          : undefined;
    if (value.reasoning === undefined) {
      return { ok: false, error: "reasoning must be a string or null." };
    }
  }

  const assumptionsParsed = parseMetadataItems(record.assumptions, "assumptions");
  if (!assumptionsParsed.ok) {
    return assumptionsParsed;
  }
  if (assumptionsParsed.value !== undefined) {
    value.assumptions = assumptionsParsed.value;
  }

  const risksParsed = parseMetadataItems(record.risks, "risks");
  if (!risksParsed.ok) {
    return risksParsed;
  }
  if (risksParsed.value !== undefined) {
    value.risks = risksParsed.value;
  }

  const constraintsParsed = parseMetadataItems(record.constraints, "constraints");
  if (!constraintsParsed.ok) {
    return constraintsParsed;
  }
  if (constraintsParsed.value !== undefined) {
    value.constraints = constraintsParsed.value;
  }

  const rejectedParsed = parseMetadataItems(
    record.rejectedOptions,
    "rejectedOptions",
  );
  if (!rejectedParsed.ok) {
    return rejectedParsed;
  }
  if (rejectedParsed.value !== undefined) {
    value.rejectedOptions = rejectedParsed.value;
  }

  if (record.sourceBranchId !== undefined) {
    value.sourceBranchId =
      record.sourceBranchId === null
        ? null
        : typeof record.sourceBranchId === "string" &&
            record.sourceBranchId.trim()
          ? record.sourceBranchId.trim()
          : undefined;
    if (value.sourceBranchId === undefined) {
      return { ok: false, error: "sourceBranchId must be a string or null." };
    }
  }

  if (record.sourceMergeId !== undefined) {
    value.sourceMergeId =
      record.sourceMergeId === null
        ? null
        : typeof record.sourceMergeId === "string" && record.sourceMergeId.trim()
          ? record.sourceMergeId.trim()
          : undefined;
    if (value.sourceMergeId === undefined) {
      return { ok: false, error: "sourceMergeId must be a string or null." };
    }
  }

  if (record.sourceMessageId !== undefined) {
    value.sourceMessageId =
      record.sourceMessageId === null
        ? null
        : typeof record.sourceMessageId === "string" &&
            record.sourceMessageId.trim()
          ? record.sourceMessageId.trim()
          : undefined;
    if (value.sourceMessageId === undefined) {
      return { ok: false, error: "sourceMessageId must be a string or null." };
    }
  }

  const hasUpdate =
    value.type !== undefined ||
    value.status !== undefined ||
    value.title !== undefined ||
    value.body !== undefined ||
    value.reasoning !== undefined ||
    value.assumptions !== undefined ||
    value.risks !== undefined ||
    value.constraints !== undefined ||
    value.rejectedOptions !== undefined ||
    value.sourceBranchId !== undefined ||
    value.sourceMergeId !== undefined ||
    value.sourceMessageId !== undefined;

  if (!hasUpdate) {
    return { ok: false, error: "At least one field must be provided to update." };
  }

  return { ok: true, value };
}

export function parseArtifactActionRequest(
  body: unknown,
): ParseResult<{ projectId: string; reasoning?: string }> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const projectId = parseProjectId(record);
  if (!projectId) {
    return { ok: false, error: "projectId is required." };
  }

  return {
    ok: true,
    value: {
      projectId,
      reasoning:
        typeof record.reasoning === "string" ? record.reasoning : undefined,
    },
  };
}
