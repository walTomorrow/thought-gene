import { Hono } from "hono";
import { branchRoutes } from "./routes/branches";
import { chatRoutes } from "./routes/chat";
import { workspaceRoutes } from "./routes/workspace";
import type { WorkerEnv } from "./types/env";

/**
 * Root Hono application for API routes.
 * Frontend static assets are served separately by Cloudflare Assets.
 */
const app = new Hono<{ Bindings: WorkerEnv }>();

app.route("/api", workspaceRoutes);
app.route("/api", branchRoutes);
app.route("/api", chatRoutes);

export default app;
