import type { BranchSummary, WorkspaceResponse } from "../../../shared/workspace";
import type { WorkerEnv } from "../types/env";
import {
  getBranchById,
  getOrCreateMainBranch,
  listActiveBranchesByProject,
} from "../db/branches";
import { listMessagesByBranch } from "../db/messages";
import { getOrCreateDefaultProject } from "../db/projects";

function toBranchSummary(branch: {
  id: string;
  title: string;
  purpose: string;
  status: BranchSummary["status"];
  parentBranchId: string | null;
  createdAt: string;
}): BranchSummary {
  return {
    id: branch.id,
    title: branch.title,
    purpose: branch.purpose,
    status: branch.status,
    parentBranchId: branch.parentBranchId,
    createdAt: branch.createdAt,
  };
}

/**
 * Loads the default workspace: project, active branches, selected branch, and its messages.
 * Creates the project and Main branch on first access.
 */
export async function loadWorkspace(
  env: WorkerEnv,
  branchId?: string,
): Promise<WorkspaceResponse> {
  const project = await getOrCreateDefaultProject(env.DB);
  const mainBranch = await getOrCreateMainBranch(env.DB, project.id);

  let selectedBranch = mainBranch;
  if (branchId) {
    const requested = await getBranchById(env.DB, branchId);
    if (requested && requested.projectId === project.id && requested.status === "active") {
      selectedBranch = requested;
    }
  }

  const branches = await listActiveBranchesByProject(env.DB, project.id);
  const messages = await listMessagesByBranch(env.DB, selectedBranch.id);

  return {
    project,
    branches: branches.map(toBranchSummary),
    branch: selectedBranch,
    messages,
  };
}
