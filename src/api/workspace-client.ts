import type { WorkspaceResponse } from "../../shared/workspace";

/**
 * Loads a project workspace: branch list, selected branch, and persisted messages.
 */
export async function fetchWorkspace(
  projectId: string,
  branchId?: string,
): Promise<WorkspaceResponse> {
  const params = new URLSearchParams({ projectId });
  if (branchId) {
    params.set("branchId", branchId);
  }

  const response = await fetch(`/api/workspace?${params}`);

  const data = (await response.json()) as WorkspaceResponse | { error: string };

  if (!response.ok) {
    const errorMessage =
      "error" in data && data.error ? data.error : "Failed to load workspace.";
    throw new Error(errorMessage);
  }

  return data as WorkspaceResponse;
}
