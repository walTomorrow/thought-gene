import type {
  BranchActionRequest,
  BranchActionResponse,
  CreateBranchRequest,
  CreateBranchResponse,
  UpdateBranchRequest,
  UpdateBranchResponse,
} from "../../shared/workspace";

async function parseJsonResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const data = (await response.json()) as T | { error: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      (data as { error: string }).error
        ? (data as { error: string }).error
        : fallbackError;
    throw new Error(errorMessage);
  }

  return data as T;
}

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

  return parseJsonResponse(response, "Failed to create branch.");
}

export async function updateBranch(
  branchId: string,
  request: UpdateBranchRequest,
): Promise<UpdateBranchResponse> {
  const response = await fetch(`/api/branches/${encodeURIComponent(branchId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse(response, "Failed to update branch.");
}

export async function closeBranch(
  branchId: string,
  request: BranchActionRequest,
): Promise<BranchActionResponse> {
  const response = await fetch(
    `/api/branches/${encodeURIComponent(branchId)}/close`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse(response, "Failed to close branch.");
}

export async function reopenBranch(
  branchId: string,
  request: BranchActionRequest,
): Promise<BranchActionResponse> {
  const response = await fetch(
    `/api/branches/${encodeURIComponent(branchId)}/reopen`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse(response, "Failed to reopen branch.");
}
