import { Hono } from "hono";
import {
  createProjectArtifact,
  dropProjectArtifact,
  getProjectArtifact,
  listBranchArtifacts,
  listProjectArtifacts,
  resolveProjectArtifact,
  updateProjectArtifact,
} from "../services/artifact-service";
import type { WorkerEnv } from "../types/env";
import {
  parseArtifactActionRequest,
  parseArtifactProjectQuery,
  parseCreateArtifactRequest,
  parseListArtifactsQuery,
  parseUpdateArtifactRequest,
} from "../validation/parse-artifact-request";

const artifactRoutes = new Hono<{ Bindings: WorkerEnv }>();

artifactRoutes.get("/artifacts", async (context) => {
  const parsed = parseListArtifactsQuery({
    projectId: context.req.query("projectId"),
    sourceBranchId: context.req.query("sourceBranchId"),
    type: context.req.query("type"),
    status: context.req.query("status"),
  });

  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await listProjectArtifacts(context.env, parsed.value);
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list artifacts.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

artifactRoutes.get("/artifacts/:artifactId", async (context) => {
  const artifactId = context.req.param("artifactId");
  const parsed = parseArtifactProjectQuery(context.req.query("projectId"));
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await getProjectArtifact(
      context.env,
      artifactId,
      parsed.value.projectId,
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load artifact.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

artifactRoutes.get("/branches/:branchId/artifacts", async (context) => {
  const branchId = context.req.param("branchId");
  const parsed = parseListArtifactsQuery({
    projectId: context.req.query("projectId"),
    type: context.req.query("type"),
    status: context.req.query("status"),
  });

  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await listBranchArtifacts(
      context.env,
      branchId,
      parsed.value.projectId,
      {
        type: parsed.value.type,
        status: parsed.value.status,
      },
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list branch artifacts.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

artifactRoutes.post("/artifacts", async (context) => {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseCreateArtifactRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await createProjectArtifact(context.env, parsed.value);
    return context.json(result, 201);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create artifact.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

artifactRoutes.patch("/artifacts/:artifactId", async (context) => {
  const artifactId = context.req.param("artifactId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseUpdateArtifactRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await updateProjectArtifact(
      context.env,
      artifactId,
      parsed.value,
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update artifact.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

artifactRoutes.post("/artifacts/:artifactId/resolve", async (context) => {
  const artifactId = context.req.param("artifactId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseArtifactActionRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await resolveProjectArtifact(
      context.env,
      artifactId,
      parsed.value.projectId,
      parsed.value.reasoning,
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to resolve artifact.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

artifactRoutes.post("/artifacts/:artifactId/drop", async (context) => {
  const artifactId = context.req.param("artifactId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseArtifactActionRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await dropProjectArtifact(
      context.env,
      artifactId,
      parsed.value.projectId,
      parsed.value.reasoning,
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to drop artifact.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

export { artifactRoutes };
