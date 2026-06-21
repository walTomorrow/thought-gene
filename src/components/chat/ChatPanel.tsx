import { useChat } from "../../hooks/use-chat";
import { ChatInput } from "./ChatInput";
import { ChatStatus } from "./ChatStatus";
import { MessageList } from "./MessageList";

/**
 * Composes the chat UI: message history, status, and input.
 * This is the main extension point for future branch/project UI.
 */
export function ChatPanel() {
  const { messages, isLoading, error, sendMessage, clearError } = useChat();

  return (
    <section className="chat-panel" aria-label="Chat">
      <MessageList messages={messages} />
      <ChatStatus
        isLoading={isLoading}
        error={error}
        onDismissError={clearError}
      />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </section>
  );
}
