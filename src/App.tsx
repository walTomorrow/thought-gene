import { ChatPanel } from "./components/chat/ChatPanel";
import { useWorkspace } from "./hooks/use-workspace";

export default function App() {
  const { workspace, isLoading, error, reload, clearError } = useWorkspace();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Thought Gene</h1>
        <p className="app-subtitle">
          {workspace
            ? `${workspace.project.name} · ${workspace.branch.title}`
            : "Loading workspace…"}
        </p>
      </header>
      <main className="app-main">
        {isLoading && (
          <div className="workspace-status" role="status">
            <p>Loading conversation…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="workspace-status workspace-status-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void reload()}>
              Retry
            </button>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {!isLoading && workspace && (
          <ChatPanel
            projectId={workspace.project.id}
            branchId={workspace.branch.id}
            initialMessages={workspace.messages}
          />
        )}
      </main>
    </div>
  );
}
