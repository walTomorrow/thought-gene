import type { ChatRequest, ChatResponse, StoredMessage } from "../types/message";

/**
 * Sends one new user message for a project branch conversation.
 * Server loads history from D1 and persists both sides of the turn.
 */
export async function sendChatRequest(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = (await response.json()) as ChatResponse | { error: string };

  if (!response.ok) {
    const errorMessage =
      "error" in data && data.error ? data.error : "Chat request failed.";
    throw new Error(errorMessage);
  }

  return data as ChatResponse;
}

export type { StoredMessage };
