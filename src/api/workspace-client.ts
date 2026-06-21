import type { WorkspaceResponse } from "../../shared/workspace";

/**
 * Loads the default project, main branch, and persisted messages.
 */
export async function fetchWorkspace(): Promise<WorkspaceResponse> {
  const response = await fetch("/api/workspace");

  const data = (await response.json()) as WorkspaceResponse | { error: string };

  if (!response.ok) {
    const errorMessage =
      "error" in data && data.error ? data.error : "Failed to load workspace.";
    throw new Error(errorMessage);
  }

  return data as WorkspaceResponse;
}
