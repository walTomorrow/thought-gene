import type {
  CreateBranchRequest,
  CreateBranchResponse,
} from "../../shared/workspace";

/**
 * Creates a new branch under a project.
 */
export async function createBranch(
  request: CreateBranchRequest,
): Promise<CreateBranchResponse> {
  const response = await fetch("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = (await response.json()) as CreateBranchResponse | { error: string };

  if (!response.ok) {
    const errorMessage =
      "error" in data && data.error ? data.error : "Failed to create branch.";
    throw new Error(errorMessage);
  }

  return data as CreateBranchResponse;
}
