import { Hono } from "hono";
import { sendChatTurn } from "../services/chat-service";
import type { WorkerEnv } from "../types/env";
import { parseChatRequest } from "../validation/parse-chat-request";

const chatRoutes = new Hono<{ Bindings: WorkerEnv }>();

chatRoutes.post("/chat", async (context) => {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await sendChatTurn(context.env, parsed.value);
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate a response.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    if (errorMessage.includes("closed branch")) {
      return context.json({ error: errorMessage }, 400);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

export { chatRoutes };
