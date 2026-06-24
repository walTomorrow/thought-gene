import { useChat } from "../../hooks/use-chat";
import type { ChatMessage } from "../../types/message";
import { ChatInput } from "./ChatInput";
import { ChatStatus } from "./ChatStatus";
import { MessageList } from "./MessageList";

type ChatPanelProps = {
  projectId: string;
  branchId: string;
  initialMessages: ChatMessage[];
  disabled?: boolean;
};

/**
 * Composes the chat UI: message history, status, and input.
 */
export function ChatPanel({
  projectId,
  branchId,
  initialMessages,
  disabled = false,
}: ChatPanelProps) {
  const { messages, isLoading, error, sendMessage, clearError } = useChat({
    projectId,
    branchId,
    initialMessages,
  });

  const inputDisabled = disabled || isLoading;

  return (
    <section className="chat-panel" aria-label="Chat">
      <MessageList messages={messages} />
      <ChatStatus
        isLoading={isLoading}
        error={error}
        onDismissError={clearError}
      />
      <ChatInput onSend={sendMessage} disabled={inputDisabled} />
    </section>
  );
}
