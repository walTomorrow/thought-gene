import type { BranchRecord, CreateBranchRequest } from "../../../shared/workspace";
import type { WorkerEnv } from "../types/env";
import {
  branchBelongsToProject,
  createBranch,
  getOrCreateMainBranch,
} from "../db/branches";
import { getProjectById } from "../db/projects";

/**
 * Creates a new active branch under a project.
 * parentBranchId defaults to the project's Main branch.
 */
export async function createProjectBranch(
  env: WorkerEnv,
  input: CreateBranchRequest,
): Promise<BranchRecord> {
  const project = await getProjectById(env.DB, input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  let parentBranchId = input.parentBranchId;
  if (parentBranchId) {
    const belongs = await branchBelongsToProject(
      env.DB,
      parentBranchId,
      input.projectId,
    );
    if (!belongs) {
      throw new Error("Parent branch not found for this project.");
    }
  } else {
    const mainBranch = await getOrCreateMainBranch(env.DB, input.projectId);
    parentBranchId = mainBranch.id;
  }

  return createBranch(env.DB, {
    projectId: input.projectId,
    parentBranchId,
    title: input.title,
    purpose: input.purpose,
  });
}
