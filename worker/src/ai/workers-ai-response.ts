/**
 * Normalizes Workers AI model outputs across models and response modes.
 * Chat models usually return { response: string }, but JSON-oriented
 * outputs may return { response: object } instead.
 */
export function extractWorkersAiText(result: unknown): string {
  if (typeof result === "string") {
    return result.trim();
  }

  if (!result || typeof result !== "object") {
    return "";
  }

  const record = result as Record<string, unknown>;

  if ("response" in record) {
    const response = record.response;
    if (typeof response === "string") {
      return response.trim();
    }
    if (response && typeof response === "object") {
      return JSON.stringify(response);
    }
  }

  if (typeof record.text === "string") {
    return record.text.trim();
  }

  if (record.result && typeof record.result === "object") {
    return extractWorkersAiText(record.result);
  }

  return "";
}

/** Returns parsed JSON when Workers AI already returned a structured object. */
export function extractWorkersAiJsonValue(result: unknown): unknown {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;
  const response = record.response;

  if (response && typeof response === "object" && !Array.isArray(response)) {
    return response;
  }

  if (record.result && typeof record.result === "object") {
    return extractWorkersAiJsonValue(record.result);
  }

  return null;
}
