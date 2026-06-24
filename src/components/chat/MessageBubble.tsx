import type { ChatMessage } from "../../types/message";

type MessageBubbleProps = {
  message: ChatMessage;
  highlighted?: boolean;
};

export function MessageBubble({ message, highlighted = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isMergePacket = message.messageKind === "merge_packet";

  if (isMergePacket) {
    return (
      <article
        className={`message-bubble message-bubble-merge ${highlighted ? "message-bubble-highlighted" : ""}`}
        aria-label="Merge packet"
        data-message-id={message.id}
      >
        <header className="message-bubble-header">Merge packet</header>
        <pre className="message-bubble-merge-content">{message.content}</pre>
      </article>
    );
  }

  if (!isUser && !isAssistant) {
    return null;
  }

  return (
    <article
      className={`message-bubble ${isUser ? "message-bubble-user" : "message-bubble-assistant"} ${highlighted ? "message-bubble-highlighted" : ""}`}
      aria-label={isUser ? "Your message" : "Assistant message"}
      data-message-id={message.id}
    >
      <header className="message-bubble-header">
        {isUser ? "You" : "Assistant"}
      </header>
      <p className="message-bubble-content">{message.content}</p>
    </article>
  );
}
