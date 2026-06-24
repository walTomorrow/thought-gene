import { BranchList } from "./components/branches/BranchList";
import { CreateBranchForm } from "./components/branches/CreateBranchForm";
import { ChatPanel } from "./components/chat/ChatPanel";
import { useWorkspace } from "./hooks/use-workspace";

export default function App() {
  const {
    workspace,
    isLoading,
    isSwitching,
    isCreating,
    error,
    selectBranch,
    createBranch,
    reload,
    clearError,
  } = useWorkspace();

  const branchBusy = isSwitching || isCreating;

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
          <div className="workspace-layout">
            <aside className="branch-sidebar">
              <BranchList
                branches={workspace.branches}
                activeBranchId={workspace.branch.id}
                disabled={branchBusy}
                onSelect={(branchId) => void selectBranch(branchId)}
              />
              <CreateBranchForm
                disabled={branchBusy}
                onCreate={createBranch}
              />
            </aside>
            <div className="workspace-chat">
              {isSwitching && (
                <div className="workspace-status workspace-status-inline" role="status">
                  <p>Switching branch…</p>
                </div>
              )}
              <ChatPanel
                key={workspace.branch.id}
                projectId={workspace.project.id}
                branchId={workspace.branch.id}
                initialMessages={workspace.messages}
                disabled={branchBusy}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
