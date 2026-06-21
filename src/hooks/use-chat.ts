import { useCallback, useState } from "react";
import { sendChatRequest, toChatMessageInputs } from "../api/chat-client";
import {
  DEFAULT_BRANCH_ID,
  DEFAULT_PROJECT_ID,
  type ChatMessage,
} from "../types/message";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    projectId: DEFAULT_PROJECT_ID,
    branchId: DEFAULT_BRANCH_ID,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

type UseChatResult = {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
};

/**
 * Manages in-memory chat state for a single conversation.
 * Sends full message history to the API using the shared ChatRequest shape.
 */
export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const userMessage = createMessage("user", trimmed);
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setIsLoading(true);
      setError(null);

      try {
        const reply = await sendChatRequest({
          messages: toChatMessageInputs(nextMessages),
          projectId: DEFAULT_PROJECT_ID,
          branchId: DEFAULT_BRANCH_ID,
        });
        const assistantMessage = createMessage("assistant", reply);
        setMessages((current) => [...current, assistantMessage]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearError };
}
