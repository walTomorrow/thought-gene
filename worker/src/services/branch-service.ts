import type {
  BranchRecord,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "../../../shared/workspace";
import type { WorkerEnv } from "../types/env";
import {
  branchBelongsToProject,
  closeBranch as closeBranchRow,
  createBranch,
  getBranchById,
  getOrCreateMainBranch,
  reopenBranch as reopenBranchRow,
  updateBranch as updateBranchRow,
} from "../db/branches";
import { getProjectById } from "../db/projects";

/**
 * Creates a new active branch under a project.
 * parentBranchId defaults to the project's root branch.
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
    const rootBranch = await getOrCreateMainBranch(env.DB, input.projectId);
    parentBranchId = rootBranch.id;
  }

  return createBranch(env.DB, {
    projectId: input.projectId,
    parentBranchId,
    title: input.title,
    purpose: input.purpose,
  });
}

export async function updateProjectBranch(
  env: WorkerEnv,
  branchId: string,
  input: UpdateBranchRequest,
): Promise<BranchRecord> {
  const belongs = await branchBelongsToProject(env.DB, branchId, input.projectId);
  if (!belongs) {
    throw new Error("Branch not found for this project.");
  }

  const branch = await updateBranchRow(env.DB, branchId, {
    title: input.title,
    purpose: input.purpose,
  });

  if (!branch) {
    throw new Error("Branch not found.");
  }

  return branch;
}

export async function closeProjectBranch(
  env: WorkerEnv,
  branchId: string,
  projectId: string,
): Promise<BranchRecord> {
  const belongs = await branchBelongsToProject(env.DB, branchId, projectId);
  if (!belongs) {
    throw new Error("Branch not found for this project.");
  }

  const branch = await closeBranchRow(env.DB, branchId);
  if (!branch) {
    throw new Error("Branch not found.");
  }

  return branch;
}

export async function reopenProjectBranch(
  env: WorkerEnv,
  branchId: string,
  projectId: string,
): Promise<BranchRecord> {
  const belongs = await branchBelongsToProject(env.DB, branchId, projectId);
  if (!belongs) {
    throw new Error("Branch not found for this project.");
  }

  const branch = await reopenBranchRow(env.DB, branchId);
  if (!branch) {
    throw new Error("Branch not found.");
  }

  return branch;
}

export async function getRootBranchForProject(
  env: WorkerEnv,
  projectId: string,
): Promise<BranchRecord> {
  return getOrCreateMainBranch(env.DB, projectId);
}

export async function getBranchForProject(
  env: WorkerEnv,
  branchId: string,
  projectId: string,
): Promise<BranchRecord | null> {
  const branch = await getBranchById(env.DB, branchId);
  if (!branch || branch.projectId !== projectId) {
    return null;
  }
  return branch;
}
