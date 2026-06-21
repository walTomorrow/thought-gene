import { useCallback, useEffect, useState } from "react";
import { sendChatRequest } from "../api/chat-client";
import type { ChatMessage } from "../types/message";

type UseChatOptions = {
  projectId: string;
  branchId: string;
  initialMessages: ChatMessage[];
};

type UseChatResult = {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
};

/**
 * Manages chat state backed by D1 through the chat API.
 */
export function useChat({
  projectId,
  branchId,
  initialMessages,
}: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [projectId, branchId, initialMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await sendChatRequest({
          projectId,
          branchId,
          content: trimmed,
        });
        setMessages((current) => [
          ...current,
          result.userMessage,
          result.assistantMessage,
        ]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [branchId, isLoading, projectId],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearError };
}
