import type { ChatMessage } from "../../types/message";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // System messages are part of the MVP model but not shown in the UI yet.
  if (!isUser && !isAssistant) {
    return null;
  }

  return (
    <article
      className={`message-bubble ${isUser ? "message-bubble-user" : "message-bubble-assistant"}`}
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      <header className="message-bubble-header">
        {isUser ? "You" : "Assistant"}
      </header>
      <p className="message-bubble-content">{message.content}</p>
    </article>
  );
}
