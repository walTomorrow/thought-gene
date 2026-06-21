import type { WorkspaceResponse } from "../../../shared/workspace";
import type { WorkerEnv } from "../types/env";
import { getOrCreateMainBranch } from "../db/branches";
import { listMessagesByBranch } from "../db/messages";
import { getOrCreateDefaultProject } from "../db/projects";

/**
 * Loads the default workspace: project, main branch, and message history.
 * Creates the project and main branch on first access.
 */
export async function loadWorkspace(env: WorkerEnv): Promise<WorkspaceResponse> {
  const project = await getOrCreateDefaultProject(env.DB);
  const branch = await getOrCreateMainBranch(env.DB, project.id);
  const messages = await listMessagesByBranch(env.DB, branch.id);

  return { project, branch, messages };
}
