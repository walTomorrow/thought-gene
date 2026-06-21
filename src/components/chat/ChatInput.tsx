import { useState, type FormEvent, type KeyboardEvent } from "react";

type ChatInputProps = {
  onSend: (text: string) => Promise<void>;
  disabled: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  async function submitMessage() {
    const value = text.trim();
    if (!value) {
      return;
    }

    setText("");
    await onSend(value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="chat-message">
        Message
      </label>
      <textarea
        id="chat-message"
        className="chat-input-field"
        rows={3}
        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button className="chat-input-send" type="submit" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  );
}
