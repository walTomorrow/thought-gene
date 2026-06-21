import { Hono } from "hono";
import { runChatModel } from "../ai/run-chat";
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

  const { messages } = parsed.value;
  // projectId and branchId are normalized in parseChatRequest for future branch-scoped context.

  try {
    const reply = await runChatModel(context.env, messages);
    return context.json({ reply });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate a response.";
    return context.json({ error: errorMessage }, 500);
  }
});

export { chatRoutes };
