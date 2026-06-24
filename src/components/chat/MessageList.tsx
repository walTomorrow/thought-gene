import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../types/message";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: ChatMessage[];
  highlightMessageId?: string | null;
};

export function MessageList({
  messages,
  highlightMessageId = null,
}: MessageListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!highlightMessageId || !listRef.current) {
      return;
    }

    const target = listRef.current.querySelector(
      `[data-message-id="${highlightMessageId}"]`,
    );
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightMessageId, messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <p>Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <ul className="message-list" aria-live="polite" ref={listRef}>
      {messages.map((message) => (
        <li key={message.id}>
          <MessageBubble
            message={message}
            highlighted={message.id === highlightMessageId}
          />
        </li>
      ))}
    </ul>
  );
}
