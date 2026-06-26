import { Hono } from "hono";
import {
  createProjectWithRootBranch,
  deleteProject,
  listProjects,
  openProject,
} from "../services/project-service";
import type { WorkerEnv } from "../types/env";
import {
  parseCreateProjectRequest,
  parseDeleteProjectRequest,
} from "../validation/parse-project-request";

const projectRoutes = new Hono<{ Bindings: WorkerEnv }>();

projectRoutes.get("/projects", async (context) => {
  try {
    const result = await listProjects(context.env);
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list projects.";
    return context.json({ error: errorMessage }, 500);
  }
});

projectRoutes.post("/projects", async (context) => {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseCreateProjectRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await createProjectWithRootBranch(
      context.env,
      parsed.value,
    );
    return context.json(result, 201);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create project.";
    return context.json({ error: errorMessage }, 500);
  }
});

projectRoutes.post("/projects/:projectId/open", async (context) => {
  const projectId = context.req.param("projectId");

  try {
    await openProject(context.env, projectId);
    return context.json({ ok: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to open project.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

projectRoutes.delete("/projects/:projectId", async (context) => {
  const projectId = context.req.param("projectId");
  let body: unknown = {};

  try {
    const text = await context.req.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseDeleteProjectRequest(body, projectId);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await deleteProject(context.env, projectId);
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete project.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

export { projectRoutes };
