import type {
  CreateProjectResponse,
  DeleteProjectResponse,
  ListProjectsResponse,
} from "../../../shared/projects";
import type { WorkerEnv } from "../types/env";
import { getOrCreateMainBranch } from "../db/branches";
import {
  createProject,
  deleteProjectById,
  getProjectById,
  listProjectsWithStats,
  touchProjectUpdatedAt,
} from "../db/projects";

export async function listProjects(
  env: WorkerEnv,
): Promise<ListProjectsResponse> {
  const projects = await listProjectsWithStats(env.DB);
  return { projects };
}

export async function createProjectWithRootBranch(
  env: WorkerEnv,
  input: { name: string; summary?: string },
): Promise<CreateProjectResponse> {
  const project = await createProject(env.DB, {
    name: input.name,
    summary: input.summary,
  });
  const rootBranch = await getOrCreateMainBranch(env.DB, project.id);

  return {
    project,
    rootBranchId: rootBranch.id,
  };
}

export async function openProject(
  env: WorkerEnv,
  projectId: string,
): Promise<void> {
  const project = await getProjectById(env.DB, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  await touchProjectUpdatedAt(env.DB, projectId);
}

export async function deleteProject(
  env: WorkerEnv,
  projectId: string,
): Promise<DeleteProjectResponse> {
  const deleted = await deleteProjectById(env.DB, projectId);
  if (!deleted) {
    throw new Error("Project not found.");
  }

  return { ok: true };
}
