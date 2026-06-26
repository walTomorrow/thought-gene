type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseCreateProjectRequest(
  body: unknown,
): ParseResult<{ name: string; summary?: string }> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.name !== "string" || !record.name.trim()) {
    return { ok: false, error: "name is required." };
  }

  const summary =
    typeof record.summary === "string" && record.summary.trim()
      ? record.summary.trim()
      : undefined;

  return {
    ok: true,
    value: {
      name: record.name.trim(),
      summary,
    },
  };
}

export function parseDeleteProjectRequest(
  body: unknown,
  projectId: string,
): ParseResult<{ projectId: string }> {
  if (!projectId.trim()) {
    return { ok: false, error: "projectId is required." };
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (
      typeof record.projectId === "string" &&
      record.projectId.trim() &&
      record.projectId.trim() !== projectId
    ) {
      return { ok: false, error: "projectId in body must match URL." };
    }
  }

  return { ok: true, value: { projectId } };
}

export function parseWorkspaceProjectQuery(
  projectId: string | undefined,
): ParseResult<{ projectId: string }> {
  if (!projectId?.trim()) {
    return { ok: false, error: "projectId query parameter is required." };
  }

  return { ok: true, value: { projectId: projectId.trim() } };
}
