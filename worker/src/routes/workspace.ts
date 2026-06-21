import { Hono } from "hono";
import { loadWorkspace } from "../services/workspace-service";
import type { WorkerEnv } from "../types/env";

const workspaceRoutes = new Hono<{ Bindings: WorkerEnv }>();

workspaceRoutes.get("/workspace", async (context) => {
  try {
    const workspace = await loadWorkspace(context.env);
    return context.json(workspace);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load workspace.";
    return context.json({ error: errorMessage }, 500);
  }
});

export { workspaceRoutes };
