import type { ChatResponse } from "../../../shared/chat";
import type { WorkerEnv } from "../types/env";
import { runChatModel } from "../ai/run-chat";
import { getBranchById } from "../db/branches";
import { insertMessage, listMessagesByBranch } from "../db/messages";
import { getProjectById } from "../db/projects";

type ChatTurnInput = {
  projectId: string;
  branchId: string;
  content: string;
};

/**
 * Persists a user message, generates an assistant reply from stored history,
 * persists the assistant message, and returns both records.
 */
export async function sendChatTurn(
  env: WorkerEnv,
  input: ChatTurnInput,
): Promise<ChatResponse> {
  const project = await getProjectById(env.DB, input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const branch = await getBranchById(env.DB, input.branchId);
  if (!branch || branch.projectId !== input.projectId) {
    throw new Error("Branch not found for this project.");
  }

  if (branch.status !== "active") {
    throw new Error("Cannot send messages to a closed branch.");
  }

  const userMessage = await insertMessage(env.DB, {
    projectId: input.projectId,
    branchId: input.branchId,
    role: "user",
    content: input.content,
  });

  const history = await listMessagesByBranch(env.DB, input.branchId);
  const aiMessages = history.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const reply = await runChatModel(env, aiMessages);

  const assistantMessage = await insertMessage(env.DB, {
    projectId: input.projectId,
    branchId: input.branchId,
    role: "assistant",
    content: reply,
  });

  return { reply, userMessage, assistantMessage };
}
