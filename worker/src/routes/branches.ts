import { Hono } from "hono";
import { createProjectBranch } from "../services/branch-service";
import type { WorkerEnv } from "../types/env";
import { parseCreateBranchRequest } from "../validation/parse-create-branch";

const branchRoutes = new Hono<{ Bindings: WorkerEnv }>();

branchRoutes.post("/branches", async (context) => {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseCreateBranchRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const branch = await createProjectBranch(context.env, parsed.value);
    return context.json({ branch }, 201);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create branch.";
    const status = errorMessage.includes("not found") ? 404 : 500;
    return context.json({ error: errorMessage }, status);
  }
});

export { branchRoutes };
