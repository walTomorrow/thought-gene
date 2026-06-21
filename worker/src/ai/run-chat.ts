import type { ChatMessageInput } from "../../../shared/chat";
import { DEFAULT_AI_MODEL, type WorkerEnv } from "../types/env";

type WorkersAiChatResult = {
  response?: string;
};

/**
 * Calls Workers AI with a message list (conversation context).
 * projectId/branchId are accepted by the route layer for future branch-scoped prompts.
 */
export async function runChatModel(
  env: WorkerEnv,
  messages: ChatMessageInput[],
): Promise<string> {
  const model = env.CLOUDFLARE_AI_MODEL || DEFAULT_AI_MODEL;

  const result = (await env.AI.run(model, {
    messages,
  })) as WorkersAiChatResult;

  const reply = result.response?.trim();
  if (!reply) {
    throw new Error("Workers AI returned an empty response.");
  }

  return reply;
}
