import { Hono } from "hono";
import {
  closeProjectBranch,
  createProjectBranch,
  reopenProjectBranch,
  updateProjectBranch,
} from "../services/branch-service";
import type { WorkerEnv } from "../types/env";
import { parseBranchActionRequest } from "../validation/parse-branch-action";
import { parseCreateBranchRequest } from "../validation/parse-create-branch";
import { parseUpdateBranchRequest } from "../validation/parse-update-branch";

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

branchRoutes.patch("/branches/:branchId", async (context) => {
  const branchId = context.req.param("branchId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseUpdateBranchRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const branch = await updateProjectBranch(context.env, branchId, parsed.value);
    return context.json({ branch });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update branch.";
    const status = errorMessage.includes("not found") ? 404 : 500;
    return context.json({ error: errorMessage }, status);
  }
});

branchRoutes.post("/branches/:branchId/close", async (context) => {
  const branchId = context.req.param("branchId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseBranchActionRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const branch = await closeProjectBranch(
      context.env,
      branchId,
      parsed.value.projectId,
    );
    return context.json({ branch });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to close branch.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    if (
      errorMessage.includes("cannot be closed") ||
      errorMessage.includes("already closed")
    ) {
      return context.json({ error: errorMessage }, 400);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

branchRoutes.post("/branches/:branchId/reopen", async (context) => {
  const branchId = context.req.param("branchId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseBranchActionRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const branch = await reopenProjectBranch(
      context.env,
      branchId,
      parsed.value.projectId,
    );
    return context.json({ branch });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reopen branch.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    if (errorMessage.includes("already active")) {
      return context.json({ error: errorMessage }, 400);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

export { branchRoutes };
