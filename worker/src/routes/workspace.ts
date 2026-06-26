import { Hono } from "hono";
import { loadWorkspace } from "../services/workspace-service";
import type { WorkerEnv } from "../types/env";
import { parseWorkspaceProjectQuery } from "../validation/parse-project-request";

const workspaceRoutes = new Hono<{ Bindings: WorkerEnv }>();

workspaceRoutes.get("/workspace", async (context) => {
  const projectParsed = parseWorkspaceProjectQuery(
    context.req.query("projectId"),
  );
  if (!projectParsed.ok) {
    return context.json({ error: projectParsed.error }, 400);
  }

  const branchId = context.req.query("branchId");

  try {
    const workspace = await loadWorkspace(
      context.env,
      projectParsed.value.projectId,
      branchId,
    );
    return context.json(workspace);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load workspace.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

export { workspaceRoutes };
