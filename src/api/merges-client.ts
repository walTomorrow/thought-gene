import type {
  ConfirmMergeRequest,
  ConfirmMergeResponse,
  GenerateMergeRequest,
  GenerateMergeResponse,
  GetMergeResponse,
  ListMergesResponse,
  MergePacket,
  UpdateMergeRequest,
  UpdateMergeResponse,
} from "../../shared/merge";

async function parseJsonResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const data = (await response.json()) as T | { error: string; code?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      (data as { error: string }).error
        ? (data as { error: string }).error
        : fallbackError;
    const error = new Error(errorMessage) as Error & { code?: string };
    if (
      typeof data === "object" &&
      data !== null &&
      "code" in data &&
      typeof (data as { code?: string }).code === "string"
    ) {
      error.code = (data as { code: string }).code;
    }
    throw error;
  }

  return data as T;
}

export async function listBranchMerges(
  childBranchId: string,
  projectId: string,
): Promise<ListMergesResponse> {
  const params = new URLSearchParams({ projectId });
  const response = await fetch(
    `/api/branches/${encodeURIComponent(childBranchId)}/merges?${params}`,
  );
  return parseJsonResponse(response, "Failed to load merge history.");
}

export async function getBranchMerge(
  mergeId: string,
  projectId: string,
): Promise<GetMergeResponse> {
  const params = new URLSearchParams({ projectId });
  const response = await fetch(
    `/api/merges/${encodeURIComponent(mergeId)}?${params}`,
  );
  return parseJsonResponse(response, "Failed to load merge.");
}

export async function generateBranchMerge(
  childBranchId: string,
  request: GenerateMergeRequest,
): Promise<GenerateMergeResponse> {
  const response = await fetch(
    `/api/branches/${encodeURIComponent(childBranchId)}/merges/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseJsonResponse(response, "Failed to generate merge packet.");
}

export async function updateBranchMerge(
  childBranchId: string,
  mergeId: string,
  request: UpdateMergeRequest,
): Promise<UpdateMergeResponse> {
  const response = await fetch(
    `/api/branches/${encodeURIComponent(childBranchId)}/merges/${encodeURIComponent(mergeId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseJsonResponse(response, "Failed to update merge draft.");
}

export async function confirmBranchMerge(
  childBranchId: string,
  mergeId: string,
  request: ConfirmMergeRequest,
): Promise<ConfirmMergeResponse> {
  const response = await fetch(
    `/api/branches/${encodeURIComponent(childBranchId)}/merges/${encodeURIComponent(mergeId)}/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseJsonResponse(response, "Failed to confirm merge.");
}

export async function discardBranchMerge(
  childBranchId: string,
  mergeId: string,
  projectId: string,
): Promise<void> {
  const params = new URLSearchParams({ projectId });
  const response = await fetch(
    `/api/branches/${encodeURIComponent(childBranchId)}/merges/${encodeURIComponent(mergeId)}?${params}`,
    { method: "DELETE" },
  );
  await parseJsonResponse(response, "Failed to discard merge draft.");
}

export type { MergePacket };
