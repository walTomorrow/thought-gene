import type { ChatMessage } from "../../types/message";
import { MergeChatCard } from "../merges/MergeChatCard";

type MessageBubbleProps = {
  message: ChatMessage;
  projectId: string;
  highlighted?: boolean;
};

export function MessageBubble({
  message,
  projectId,
  highlighted = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isMergePacket = message.messageKind === "merge_packet";

  if (isMergePacket && message.mergeId) {
    return (
      <MergeChatCard
        projectId={projectId}
        mergeId={message.mergeId}
        teaser={message.content}
        highlighted={highlighted}
        messageId={message.id}
      />
    );
  }

  if (isMergePacket) {
    return (
      <article
        className={`merge-chat-card ${highlighted ? "message-bubble-highlighted" : ""}`}
        aria-label="Merged branch"
        data-message-id={message.id}
      >
        <div className="merge-chat-card-body">
          <p className="merge-chat-card-teaser">{message.content}</p>
        </div>
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
