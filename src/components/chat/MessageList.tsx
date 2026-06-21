import type { ChatMessage } from "../../types/message";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <p>Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <ul className="message-list" aria-live="polite">
      {messages.map((message) => (
        <li key={message.id}>
          <MessageBubble message={message} />
        </li>
      ))}
    </ul>
  );
}
