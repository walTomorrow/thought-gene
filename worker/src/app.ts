import { Hono } from "hono";
import { chatRoutes } from "./routes/chat";
import type { WorkerEnv } from "./types/env";

/**
 * Root Hono application for API routes.
 * Frontend static assets are served separately by Cloudflare Assets.
 */
const app = new Hono<{ Bindings: WorkerEnv }>();

app.route("/api", chatRoutes);

export default app;
