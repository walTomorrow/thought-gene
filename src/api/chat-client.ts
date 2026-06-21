import type { ChatMessageInput, ChatRequest, ChatResponse } from "../types/message";

/**
 * Sends a conversation to the backend chat API.
 * Keeps fetch details out of React components so transport can change later.
 */
export async function sendChatRequest(request: ChatRequest): Promise<string> {
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

  return (data as ChatResponse).reply;
}

/** Maps UI messages to the API input shape (role + content only). */
export function toChatMessageInputs(
  messages: Array<{ role: ChatMessageInput["role"]; content: string }>,
): ChatMessageInput[] {
  return messages.map(({ role, content }) => ({ role, content }));
}
