import { BranchDetailsPanel } from "./components/branches/BranchDetailsPanel";
import { BranchList } from "./components/branches/BranchList";
import { ClosedBranchList } from "./components/branches/ClosedBranchList";
import { CreateBranchForm } from "./components/branches/CreateBranchForm";
import { ChatPanel } from "./components/chat/ChatPanel";
import { useWorkspace } from "./hooks/use-workspace";

export default function App() {
  const {
    workspace,
    isLoading,
    isSwitching,
    isCreating,
    isUpdating,
    error,
    selectBranch,
    createBranch,
    updateBranch,
    closeBranch,
    reopenBranch,
    reload,
    clearError,
  } = useWorkspace();

  const branchBusy = isSwitching || isCreating || isUpdating;

  const branchLabel = workspace
    ? workspace.isReadOnly
      ? `${workspace.branch.title} (closed)`
      : workspace.branch.title
    : "";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Thought Gene</h1>
        <p className="app-subtitle">
          {workspace
            ? `${workspace.project.name} · ${branchLabel}`
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
              <ClosedBranchList
                branches={workspace.closedBranches}
                activeBranchId={workspace.branch.id}
                disabled={branchBusy}
                onSelect={(branchId) => void selectBranch(branchId)}
              />
              <CreateBranchForm
                disabled={branchBusy || workspace.isReadOnly}
                onCreate={createBranch}
              />
              <BranchDetailsPanel
                branch={workspace.branch}
                isReadOnly={workspace.isReadOnly}
                disabled={branchBusy}
                onUpdate={updateBranch}
                onClose={closeBranch}
                onReopen={reopenBranch}
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
                readOnly={workspace.isReadOnly}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
