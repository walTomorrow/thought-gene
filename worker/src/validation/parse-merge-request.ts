import type { MergePacket } from "../../../shared/merge";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseGenerateMergeRequest(
  body: unknown,
): ParseResult<{ projectId: string; replaceDraft: boolean }> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  return {
    ok: true,
    value: {
      projectId: record.projectId.trim(),
      replaceDraft: record.replaceDraft === true,
    },
  };
}

export function parseUpdateMergeRequest(
  body: unknown,
): ParseResult<{ projectId: string; packet: MergePacket }> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  if (!record.packet || typeof record.packet !== "object") {
    return { ok: false, error: "packet is required." };
  }

  return {
    ok: true,
    value: {
      projectId: record.projectId.trim(),
      packet: record.packet as MergePacket,
    },
  };
}

export function parseConfirmMergeRequest(
  body: unknown,
): ParseResult<{ projectId: string; closeChildAfter: boolean }> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.projectId !== "string" || !record.projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  return {
    ok: true,
    value: {
      projectId: record.projectId.trim(),
      closeChildAfter: record.closeChildAfter === true,
    },
  };
}

export function parseMergeProjectQuery(
  projectId: string | undefined,
): ParseResult<{ projectId: string }> {
  if (!projectId?.trim()) {
    return { ok: false, error: "projectId query parameter is required." };
  }

  return { ok: true, value: { projectId: projectId.trim() } };
}
