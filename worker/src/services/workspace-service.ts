import type { BranchSummary, WorkspaceResponse } from "../../../shared/workspace";
import type { WorkerEnv } from "../types/env";
import {
  getOrCreateMainBranch,
  listActiveBranchesByProject,
  listClosedBranchesByProject,
} from "../db/branches";
import { listMessagesByBranch } from "../db/messages";
import { getProjectById, touchProjectUpdatedAt } from "../db/projects";
import { getBranchForProject } from "./branch-service";

function toBranchSummary(branch: {
  id: string;
  title: string;
  purpose: string;
  status: BranchSummary["status"];
  parentBranchId: string | null;
  createdAt: string;
  closedAt: string | null;
}): BranchSummary {
  return {
    id: branch.id,
    title: branch.title,
    purpose: branch.purpose,
    status: branch.status,
    parentBranchId: branch.parentBranchId,
    createdAt: branch.createdAt,
    closedAt: branch.closedAt,
  };
}

/**
 * Loads a project workspace: branch lists, selected branch, and messages.
 */
export async function loadWorkspace(
  env: WorkerEnv,
  projectId: string,
  branchId?: string,
): Promise<WorkspaceResponse> {
  const project = await getProjectById(env.DB, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const rootBranch = await getOrCreateMainBranch(env.DB, project.id);

  let selectedBranch = rootBranch;
  if (branchId) {
    const requested = await getBranchForProject(env, branchId, project.id);
    if (requested) {
      selectedBranch = requested;
    }
  }

  await touchProjectUpdatedAt(env.DB, project.id);

  const activeBranches = await listActiveBranchesByProject(env.DB, project.id);
  const closedBranches = await listClosedBranchesByProject(env.DB, project.id);
  const messages = await listMessagesByBranch(env.DB, selectedBranch.id);
  const isReadOnly = selectedBranch.status === "closed";

  return {
    project: {
      ...project,
      updatedAt: new Date().toISOString(),
    },
    branches: activeBranches.map(toBranchSummary),
    closedBranches: closedBranches.map(toBranchSummary),
    branch: selectedBranch,
    messages,
    isReadOnly,
  };
}
