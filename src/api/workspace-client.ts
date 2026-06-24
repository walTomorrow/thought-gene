import type { WorkspaceResponse } from "../../shared/workspace";

/**
 * Loads the default project, branch list, selected branch, and persisted messages.
 */
export async function fetchWorkspace(branchId?: string): Promise<WorkspaceResponse> {
  const url = branchId
    ? `/api/workspace?branchId=${encodeURIComponent(branchId)}`
    : "/api/workspace";

  const response = await fetch(url);

  const data = (await response.json()) as WorkspaceResponse | { error: string };

  if (!response.ok) {
    const errorMessage =
      "error" in data && data.error ? data.error : "Failed to load workspace.";
    throw new Error(errorMessage);
  }

  return data as WorkspaceResponse;
}
