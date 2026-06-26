import type {
  CreateProjectRequest,
  CreateProjectResponse,
  DeleteProjectResponse,
  ListProjectsResponse,
} from "../../shared/projects";

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

export async function listProjects(): Promise<ListProjectsResponse> {
  const response = await fetch("/api/projects");
  return parseJsonResponse(response, "Failed to load projects.");
}

export async function createProject(
  request: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseJsonResponse(response, "Failed to create project.");
}

export async function openProject(projectId: string): Promise<void> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/open`,
    { method: "POST" },
  );
  await parseJsonResponse(response, "Failed to open project.");
}

export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResponse> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    },
  );
  return parseJsonResponse(response, "Failed to delete project.");
}
