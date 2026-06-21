type ChatStatusProps = {
  isLoading: boolean;
  error: string | null;
  onDismissError: () => void;
};

export function ChatStatus({ isLoading, error, onDismissError }: ChatStatusProps) {
  if (!isLoading && !error) {
    return null;
  }

  return (
    <div className="chat-status" role="status">
      {isLoading && <p className="chat-status-loading">Assistant is thinking…</p>}
      {error && (
        <div className="chat-status-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
